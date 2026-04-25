import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

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

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown.trim();
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown.trim();
  return markdown.slice(end + 5).trim();
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

type PromptIndex = {
  names: Set<string>;
  signatures: Array<{ name: string; prefix: string }>;
};

function buildPromptIndex(pi: ExtensionAPI): PromptIndex {
  const names = new Set<string>();
  const signatures: Array<{ name: string; prefix: string }> = [];

  for (const cmd of pi.getCommands()) {
    if (cmd.source !== "prompt") continue;
    names.add(cmd.name);

    try {
      const raw = readFileSync(cmd.sourceInfo.path, "utf-8");
      const body = stripFrontmatter(raw);
      const normalized = normalizeText(body);
      if (normalized.length > 0) {
        signatures.push({ name: cmd.name, prefix: normalized.slice(0, 180) });
      }
    } catch {
      // ignore unreadable prompt files
    }
  }

  return { names, signatures };
}

export default function usageStatsExtension(pi: ExtensionAPI) {
  const collector = new StatsCollector(STATS_PATH);
  let promptIndex: PromptIndex = { names: new Set<string>(), signatures: [] };
  const recentPromptInvocations = new Map<string, number>();

  const rememberPromptInvocation = (name: string) => {
    recentPromptInvocations.set(name, Date.now());
  };

  const wasPromptRecentlyRecorded = (name: string, windowMs = 3000): boolean => {
    const seenAt = recentPromptInvocations.get(name);
    if (!seenAt) return false;
    return Date.now() - seenAt < windowMs;
  };

  const refreshPromptIndex = () => {
    promptIndex = buildPromptIndex(pi);
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
      collector.record("prompt_invoked", { name, args });
      rememberPromptInvocation(name);
      return;
    }

    const commands = pi.getCommands();
    const cmd = commands.find(
      (c) => c.name === name || c.name.startsWith(`${name}:`),
    );

    if (cmd) {
      switch (cmd.source) {
        case "prompt":
          collector.record("prompt_invoked", { name: cmd.name, args });
          rememberPromptInvocation(cmd.name);
          break;
        case "extension":
          collector.record("extension_command_invoked", {
            name: cmd.name,
            args,
          });
          break;
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
      collector.record("custom_tool_called", { tool: event.toolName });
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

    collector.record("session_start", {
      reason: event.reason,
      hasPreviousSession: !!event.previousSessionFile,
    });
  });

  // --- Prompt fallback detection ---
  // Some extension-command flows can bypass `input` interception.
  // This fallback inspects the final prompt text before the agent starts and
  // matches it against known prompt template prefixes.
  pi.on("before_agent_start", async (event) => {
    if (promptIndex.signatures.length === 0) {
      refreshPromptIndex();
    }

    const normalizedPrompt = normalizeText(event.prompt);
    if (normalizedPrompt.length === 0) return;

    for (const sig of promptIndex.signatures) {
      if (!sig.prefix || sig.prefix.length < 32) continue;
      if (!normalizedPrompt.startsWith(sig.prefix)) continue;
      if (wasPromptRecentlyRecorded(sig.name)) continue;

      collector.record("prompt_invoked", {
        name: sig.name,
        inferred: true,
      });
      rememberPromptInvocation(sig.name);
      break;
    }
  });

  // --- Flush on shutdown ---
  pi.on("session_shutdown", async () => {
    collector.flush();
  });
}
