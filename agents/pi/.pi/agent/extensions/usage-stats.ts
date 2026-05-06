import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Usage Statistics Extension
 *
 * Collects anonymous usage statistics for skills, loaded extensions,
 * extension commands, custom tools, and model usage.
 *
 * Data is written as append-only JSONL to ~/.pi/agent/usage-stats.jsonl.
 *
 * Doc sync checklist (update docs when changing):
 * - events tracked and their schemas
 * - stats file path
 * - flush behaviour
 * - built-in tool exclusion list
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
  const base = path.split(/[\\/]/).pop();
  return base ? base.replace(/\.[^.]+$/, "") : undefined;
}

export default function usageStatsExtension(pi: ExtensionAPI) {
  const collector = new StatsCollector(STATS_PATH);
  let allToolsCache: Array<{ name: string; sourceInfo?: { path?: string; source?: string } }> = [];

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

  // --- Input events: skills and commands ---
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

    const commands = pi.getCommands();
    const cmd = commands.find(
      (c) => c.name === name || c.name.startsWith(`${name}:`),
    );

    if (cmd) {
      switch (cmd.source) {
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

  // --- Session lifecycle ---
  pi.on("session_start", async (event) => {
    refreshToolsCache();
    recordExtensionInventory();

    collector.record("session_start", {
      reason: event.reason,
      hasPreviousSession: !!event.previousSessionFile,
    });
  });

  // --- Flush on shutdown ---
  pi.on("session_shutdown", async () => {
    collector.flush();
  });
}
