import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

/**
 * Usage Statistics Extension
 *
 * Collects anonymous usage statistics for skills, prompt templates,
 * loaded extensions, extension commands, custom tools, and model selections.
 *
 * Data is written as append-only JSONL to ~/.pi/agent/usage-stats.jsonl.
 *
 * Doc sync checklist (update docs when changing):
 * - events tracked and their schemas
 * - stats file path
 * - flush behaviour
 * - built-in tool exclusion list
 * - model_used vs model_select semantics
 * - skill_loaded grouping by skill name in viewer
 * - extension_loaded grouping by extension name in viewer
 * - extension_inventory / extension_used semantics
 */

const STATS_PATH = `${process.env.HOME}/.pi/agent/usage-stats.jsonl`;

const BUILTIN_TOOLS = new Set([
  "read",
  "bash",
  "edit",
  "write",
  "grep",
  "find",
  "ls",
]);

interface StatsEntry {
  t: number;
  event: string;
  [key: string]: unknown;
}

class StatsCollector {
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
    try {
      mkdirSync(dirname(path), { recursive: true });
    } catch {
      // ignore
    }
  }

  record(event: string, detail: Record<string, unknown>) {
    const entry: StatsEntry = { t: Date.now(), event, ...detail };
    this.buffer.push(JSON.stringify(entry));
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 2000);
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.buffer.length === 0) return;
    const batch = this.buffer.join("\n") + "\n";
    try {
      const fs = require("node:fs");
      fs.appendFileSync(this.path, batch);
      this.buffer = [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[usage-stats] flush failed: ${msg}`);
    }
  }
}

function extensionNameFromPath(path: string): string | undefined {
  if (!path) return undefined;
  const parts = path.split(/[\\/]/);
  const extIdx = parts.indexOf("extensions");
  if (extIdx !== -1 && extIdx + 1 < parts.length) {
    return parts[extIdx + 1].replace(/\.[^.]+$/, "");
  }
  const nmIdx = parts.indexOf("node_modules");
  if (nmIdx !== -1 && nmIdx + 1 < parts.length) {
    return parts[nmIdx + 1];
  }
  return basename(path).replace(/\.[^.]+$/, "");
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown.trim();
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown.trim();
  return markdown.slice(end + 5).trim();
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

interface PromptEntry {
  name: string;
  prefix: string;
  sourceInfo?: { path?: string; source?: string; scope?: string; origin?: string };
}

type PromptIndex = {
  names: Set<string>;
  prompts: Map<string, PromptEntry>;
  signatures: Array<PromptEntry>;
};

function buildPromptIndex(pi: ExtensionAPI): PromptIndex {
  const names = new Set<string>();
  const prompts = new Map<string, PromptEntry>();
  const signatures: Array<PromptEntry> = [];

  for (const cmd of pi.getCommands()) {
    if (cmd.source !== "prompt") continue;
    names.add(cmd.name);

    const entry: PromptEntry = {
      name: cmd.name,
      prefix: "",
      sourceInfo: cmd.sourceInfo,
    };

    if (cmd.sourceInfo?.path) {
      try {
        const raw = readFileSync(cmd.sourceInfo.path, "utf-8");
        const body = stripFrontmatter(raw);
        const normalized = normalizeText(body);
        if (normalized.length > 0) {
          entry.prefix = normalized.slice(0, 180);
          signatures.push(entry);
        }
      } catch {
        // ignore unreadable prompt files
      }
    }

    prompts.set(cmd.name, entry);
  }

  return { names, prompts, signatures };
}

function scanPromptDir(
  dir: string,
  scope: "user" | "project",
  visitedDirectories = new Set<string>(),
): Array<{ name: string; path: string; prefix: string; scope: "user" | "project" }> {
  const results: Array<{ name: string; path: string; prefix: string; scope: "user" | "project" }> = [];
  if (!existsSync(dir)) return results;

  let canonicalDir: string;
  try {
    canonicalDir = realpathSync(dir);
  } catch {
    return results;
  }
  if (visitedDirectories.has(canonicalDir)) return results;
  visitedDirectories.add(canonicalDir);

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    let isFile = entry.isFile();
    let isDirectory = entry.isDirectory();

    if (entry.isSymbolicLink()) {
      try {
        const stats = statSync(fullPath);
        isFile = stats.isFile();
        isDirectory = stats.isDirectory();
      } catch {
        continue;
      }
    }

    if (isDirectory) {
      results.push(...scanPromptDir(fullPath, scope, visitedDirectories));
      continue;
    }
    if (!isFile || !entry.name.endsWith(".md")) continue;

    try {
      const raw = readFileSync(fullPath, "utf-8");
      if (!raw.startsWith("---\n")) continue;
      const end = raw.indexOf("\n---\n", 4);
      if (end === -1) continue;

      const frontmatter = raw.slice(4, end);
      const hasManagedField = /^(model|chain|skill|thinking|fresh|loop|converge|parallel|worktree|subagent|inheritContext|rotate|workers|reviewers|finalApplier|bestOfN|cwd)\s*:/m.test(frontmatter);
      if (!hasManagedField) continue;

      const body = raw.slice(end + 5);
      const normalized = normalizeText(body);
      if (normalized.length === 0) continue;

      results.push({
        name: entry.name.slice(0, -3),
        path: fullPath,
        prefix: normalized.slice(0, 180),
        scope,
      });
    } catch {
      // ignore unreadable files
    }
  }

  return results;
}

function buildExtensionManagedPromptIndex(): PromptIndex {
  const names = new Set<string>();
  const prompts = new Map<string, PromptEntry>();
  const signatures: Array<PromptEntry> = [];

  const globalDir = join(homedir(), ".pi", "agent", "prompts");
  const projectDir = resolve(process.cwd(), ".pi", "prompts");

  for (const { name, path, prefix, scope } of scanPromptDir(globalDir, "user")) {
    names.add(name);
    const entry: PromptEntry = {
      name,
      prefix,
      sourceInfo: { path, source: "prompt", scope, origin: "pi-prompt-template-model" },
    };
    prompts.set(name, entry);
    if (prefix.length >= 32) signatures.push(entry);
  }

  for (const { name, path, prefix, scope } of scanPromptDir(projectDir, "project")) {
    names.add(name);
    const entry: PromptEntry = {
      name,
      prefix,
      sourceInfo: { path, source: "prompt", scope, origin: "pi-prompt-template-model" },
    };
    // Project overrides user
    prompts.set(name, entry);
    if (prefix.length >= 32) {
      const existingIdx = signatures.findIndex((s) => s.name === name);
      if (existingIdx !== -1) signatures.splice(existingIdx, 1);
      signatures.push(entry);
    }
  }

  return { names, prompts, signatures };
}

export default function usageStatsExtension(pi: ExtensionAPI) {
  const collector = new StatsCollector(STATS_PATH);
  let promptIndex: PromptIndex = { names: new Set<string>(), prompts: new Map<string, PromptEntry>(), signatures: [] };
  const recentPromptInvocations = new Map<string, number>();
  let allToolsCache: Array<{ name: string; sourceInfo?: { path?: string; source?: string } }> = [];

  const rememberPromptInvocation = (name: string) => {
    recentPromptInvocations.set(name, Date.now());
  };

  const wasPromptRecentlyRecorded = (name: string, windowMs = 3000): boolean => {
    const seenAt = recentPromptInvocations.get(name);
    if (!seenAt) return false;
    return Date.now() - seenAt < windowMs;
  };

  const recordPromptInvocation = (
    name: string,
    opts: { sourceInfo?: { path?: string; source?: string; scope?: string; origin?: string }; args?: string; inferred?: boolean; extension?: string } = {},
  ) => {
    const detail: Record<string, unknown> = { name };
    if (opts.sourceInfo) {
      detail.sourceInfo = opts.sourceInfo;
    }
    if (opts.args) {
      detail.args = opts.args;
    }
    if (opts.inferred) {
      detail.inferred = true;
    }
    if (opts.extension) {
      detail.extension = opts.extension;
    }
    collector.record("prompt_invoked", detail);
    rememberPromptInvocation(name);
  };

  const refreshPromptIndex = () => {
    promptIndex = buildPromptIndex(pi);
  };

  let extManagedPromptIndex: PromptIndex = { names: new Set<string>(), prompts: new Map<string, PromptEntry>(), signatures: [] };

  const refreshExtManagedPromptIndex = () => {
    extManagedPromptIndex = buildExtensionManagedPromptIndex();
  };

  const refreshToolsCache = () => {
    try {
      allToolsCache = pi.getAllTools();
    } catch {
      allToolsCache = [];
    }
  };

  const recordExtensionInventory = () => {
    const seen = new Set<string>();

    for (const cmd of pi.getCommands()) {
      if (cmd.source === "extension" && cmd.sourceInfo?.path) {
        const name = extensionNameFromPath(cmd.sourceInfo.path);
        if (name) seen.add(name);
      }
    }

    for (const tool of allToolsCache) {
      const src = tool.sourceInfo?.source;
      if (src && src !== "builtin" && src !== "sdk" && tool.sourceInfo?.path) {
        const name = extensionNameFromPath(tool.sourceInfo.path);
        if (name) seen.add(name);
      }
    }

    for (const name of seen) {
      collector.record("extension_inventory", { extension: name });
    }
  };

  collector.record("extension_loaded", { extension: "usage-stats" });

  // --- Input events: skills, prompts, commands ---
  pi.on("input", async (event) => {
    const text = event.text.trim();
    if (!text.startsWith("/")) return;

    const parts = text.split(/\s+/);
    const name = parts[0].slice(1);
    const args = parts.slice(1).join(" ") || undefined;

    if (text.startsWith("/skill:")) {
      const skillName = parts[0].slice("/skill:".length);
      collector.record("skill_invoked", { name: skillName, args });
      return;
    }

    if (promptIndex.names.size === 0) {
      refreshPromptIndex();
    }

    if (promptIndex.names.has(name)) {
      const entry = promptIndex.prompts.get(name);
      recordPromptInvocation(name, { sourceInfo: entry?.sourceInfo, args });
      return;
    }

    const commands = pi.getCommands();
    const cmd = commands.find(
      (c) => c.name === name || c.name.startsWith(`${name}:`),
    );

    if (cmd) {
      switch (cmd.source) {
        case "prompt":
          recordPromptInvocation(cmd.name, { sourceInfo: cmd.sourceInfo, args });
          break;
        case "extension": {
          const extName = cmd.sourceInfo?.path
            ? extensionNameFromPath(cmd.sourceInfo.path)
            : undefined;
          collector.record("extension_command_invoked", {
            name: cmd.name,
            args,
            extension: extName,
          });
          break;
        }
        case "skill":
          collector.record("skill_command_invoked", {
            name: cmd.name,
            args,
          });
          break;
        default:
          collector.record("command_invoked", {
            name: cmd.name,
            args,
            source: cmd.source,
          });
      }
    } else {
      collector.record("unknown_command", { name, args });
    }
  });

  // --- Tool calls: custom tools and implicit skill reads ---
  pi.on("tool_call", async (event) => {
    if (event.toolName === "read" && event.input.path?.endsWith("SKILL.md")) {
      collector.record("skill_loaded", { path: event.input.path });
      return;
    }

    if (!BUILTIN_TOOLS.has(event.toolName)) {
      if (allToolsCache.length === 0) refreshToolsCache();
      const tool = allToolsCache.find((t) => t.name === event.toolName);
      const extName = tool?.sourceInfo?.path
        ? extensionNameFromPath(tool.sourceInfo.path)
        : undefined;
      collector.record("custom_tool_called", {
        tool: event.toolName,
        extension: extName,
      });
    }
  });

  // --- Model usage (once per agent run) ---
  let modelUsedRecorded = false;

  pi.on("agent_start", async () => {
    modelUsedRecorded = false;
  });

  pi.on("before_provider_request", async (_event, ctx) => {
    if (modelUsedRecorded) return;
    const model = ctx.model;
    if (!model) return;
    collector.record("model_used", {
      model: `${model.provider}/${model.id}`,
    });
    modelUsedRecorded = true;
  });

  // --- Model selection (raw telemetry) ---
  pi.on("model_select", async (event) => {
    collector.record("model_select", {
      model: `${event.model.provider}/${event.model.id}`,
      previousModel: event.previousModel
        ? `${event.previousModel.provider}/${event.previousModel.id}`
        : undefined,
      source: event.source,
    });
  });

  // --- Session lifecycle ---
  pi.on("session_start", async (event) => {
    refreshPromptIndex();
    refreshExtManagedPromptIndex();
    refreshToolsCache();
    recordExtensionInventory();

    collector.record("session_start", {
      reason: event.reason,
      hasPreviousSession: !!event.previousSessionFile,
    });
  });

  // --- Prompt fallback detection ---
  // Some extension-command flows can bypass `input` interception.
  // This fallback inspects the final prompt text before the agent starts and
  // matches it against known prompt template prefixes.
  // Native Pi prompts are checked first; extension-managed prompts second.
  pi.on("before_agent_start", async (event) => {
    if (promptIndex.signatures.length === 0) {
      refreshPromptIndex();
    }
    if (extManagedPromptIndex.signatures.length === 0) {
      refreshExtManagedPromptIndex();
    }

    const normalizedPrompt = normalizeText(event.prompt);
    if (normalizedPrompt.length === 0) return;

    for (const sig of promptIndex.signatures) {
      if (!sig.prefix || sig.prefix.length < 32) continue;
      if (!normalizedPrompt.startsWith(sig.prefix)) continue;
      if (wasPromptRecentlyRecorded(sig.name)) continue;

      recordPromptInvocation(sig.name, {
        sourceInfo: sig.sourceInfo,
        inferred: true,
      });
      return;
    }

    for (const sig of extManagedPromptIndex.signatures) {
      if (!sig.prefix || sig.prefix.length < 32) continue;
      if (!normalizedPrompt.startsWith(sig.prefix)) continue;
      if (wasPromptRecentlyRecorded(sig.name)) continue;

      recordPromptInvocation(sig.name, {
        sourceInfo: sig.sourceInfo,
        extension: "pi-prompt-template-model",
        inferred: true,
      });
      return;
    }
  });

  // --- Flush on shutdown ---
  pi.on("session_shutdown", async () => {
    collector.flush();
  });
}
