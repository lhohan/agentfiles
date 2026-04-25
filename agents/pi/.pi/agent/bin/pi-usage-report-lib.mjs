/**
 * Shared usage statistics parsing library.
 *
 * Consumed by both the terminal reporter (pi-usage-report)
 * and the HTML reporter (pi-usage-report-html).
 *
 * When adding a new event type in usage-stats.ts, update
 * createCollector().processEntry below so both reporters stay in sync.
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { basename, dirname } from "node:path";

export const STATS_PATH = `${process.env.HOME}/.pi/agent/usage-stats.jsonl`;

export function skillNameFromPath(path) {
  if (!path || typeof path !== "string") return path;
  const name = basename(dirname(path));
  if (name && name !== ".") return name;
  return path;
}

function extensionNameFromEntry(entry) {
  if (!entry || typeof entry !== "object") return "unknown";
  if (typeof entry.extension === "string" && entry.extension) return entry.extension;
  if (typeof entry.name === "string" && entry.name) return entry.name;
  if (typeof entry.extensionName === "string" && entry.extensionName) return entry.extensionName;
  if (typeof entry.extensionPath === "string" && entry.extensionPath) {
    return basename(entry.extensionPath).replace(/\.[^.]+$/, "");
  }
  if (typeof entry.path === "string" && entry.path) {
    return basename(entry.path).replace(/\.[^.]+$/, "");
  }
  return "unknown";
}

export function createCollector({ trackTimeline = false } = {}) {
  const counters = {
    skillInvoked: new Map(),
    promptInvoked: new Map(),
    extensionCommandInvoked: new Map(),
    extensionLoaded: new Map(),
    skillCommandInvoked: new Map(),
    customToolCalled: new Map(),
    skillLoaded: new Map(),
    modelUsed: new Map(),
    modelSelect: new Map(),
    sessionStart: 0,
    resourcesDiscovered: { prompts: 0 },
  };

  const recent = [];
  const timeline = trackTimeline ? [] : null;

  function processEntry(entry) {
    recent.push(entry);
    if (recent.length > 1000) recent.shift();

    if (timeline) {
      timeline.push(entry);
    }

    switch (entry.event) {
      case "skill_loaded":
        counters.skillLoaded.set(
          skillNameFromPath(entry.path),
          (counters.skillLoaded.get(skillNameFromPath(entry.path)) || 0) + 1,
        );
        break;
      case "skill_invoked":
        counters.skillInvoked.set(
          entry.name,
          (counters.skillInvoked.get(entry.name) || 0) + 1,
        );
        break;
      case "prompt_invoked":
        counters.promptInvoked.set(
          entry.name,
          (counters.promptInvoked.get(entry.name) || 0) + 1,
        );
        break;
      case "extension_command_invoked":
        counters.extensionCommandInvoked.set(
          entry.name,
          (counters.extensionCommandInvoked.get(entry.name) || 0) + 1,
        );
        break;
      case "extension_loaded":
      case "EXTENSION_LOADED": {
        const extension = extensionNameFromEntry(entry);
        counters.extensionLoaded.set(
          extension,
          (counters.extensionLoaded.get(extension) || 0) + 1,
        );
        break;
      }
      case "skill_command_invoked":
        counters.skillCommandInvoked.set(
          entry.name,
          (counters.skillCommandInvoked.get(entry.name) || 0) + 1,
        );
        break;
      case "custom_tool_called":
        counters.customToolCalled.set(
          entry.tool,
          (counters.customToolCalled.get(entry.tool) || 0) + 1,
        );
        break;
      case "model_used":
        counters.modelUsed.set(
          entry.model,
          (counters.modelUsed.get(entry.model) || 0) + 1,
        );
        break;
      case "model_select":
        counters.modelSelect.set(
          entry.model,
          (counters.modelSelect.get(entry.model) || 0) + 1,
        );
        break;
      case "session_start":
        counters.sessionStart++;
        break;
      case "resources_discovered":
        counters.resourcesDiscovered.prompts += entry.promptCount || 0;
        break;
    }
  }

  return { counters, recent, timeline, processEntry };
}

export function sortMap(map) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * Read the stats file line-by-line, yielding parsed entries.
 * Skips blank lines and malformed JSON silently.
 */
export async function* readStatsEntries(path) {
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // skip malformed lines
    }
  }
}
