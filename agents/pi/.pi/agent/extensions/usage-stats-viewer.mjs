#!/usr/bin/env node
/**
 * Usage Statistics Viewer
 *
 * Reads ~/.pi/agent/usage-stats.jsonl and prints aggregated usage
 * statistics for Pi sessions.
 *
 * Usage:
 *   node usage-stats-viewer.mjs
 *   node usage-stats-viewer.mjs --recent
 *   node usage-stats-viewer.mjs --event=skill_invoked
 *   node usage-stats-viewer.mjs --top=5
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { basename, dirname } from "node:path";

const STATS_PATH = `${process.env.HOME}/.pi/agent/usage-stats.jsonl`;

const counters = {
  skillInvoked: new Map(),
  promptInvoked: new Map(),
  extensionCommandInvoked: new Map(),
  skillCommandInvoked: new Map(),
  customToolCalled: new Map(),
  skillLoaded: new Map(),
  modelUsed: new Map(),
  modelSelect: new Map(),
  sessionStart: 0,
  resourcesDiscovered: { prompts: 0 },
};

const recent = [];

function skillNameFromPath(path) {
  if (!path || typeof path !== "string") return path;
  const name = basename(dirname(path));
  if (name && name !== ".") return name;
  return path;
}

function processEntry(entry) {
  recent.push(entry);
  if (recent.length > 1000) recent.shift();

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

function printTable(title, map, topN) {
  const entries = Array.from(map.entries());
  if (entries.length === 0) return;
  entries.sort((a, b) => b[1] - a[1]);
  const limited = topN ? entries.slice(0, topN) : entries;
  const maxKey = Math.max(...limited.map(([k]) => k.length), 4);

  console.log(`\n${title}`);
  console.log(`${"Item".padEnd(maxKey)}  Count`);
  console.log(`${"-".repeat(maxKey)}  -----`);
  for (const [key, count] of limited) {
    console.log(`${key.padEnd(maxKey)}  ${count}`);
  }
  if (entries.length > limited.length) {
    console.log(`... and ${entries.length - limited.length} more`);
  }
}

function printRecent(count) {
  if (recent.length === 0) return;
  console.log(`\n--- Recent Events (last ${Math.min(count, recent.length)}) ---`);
  for (const entry of recent.slice(-count)) {
    const time = new Date(entry.t).toISOString();
    const detail = JSON.stringify(
      Object.fromEntries(
        Object.entries(entry).filter(([k]) => k !== "t" && k !== "event"),
      ),
    );
    console.log(`[${time}] ${entry.event} ${detail}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showRecent =
    args.includes("--recent") || args.some((a) => a.startsWith("--recent="));
  const recentCount = Number(
    args.find((a) => a.startsWith("--recent="))?.slice(9) || 50,
  );
  const filterEvent = args.find((a) => a.startsWith("--event="))?.slice(8);
  const topN = Number(args.find((a) => a.startsWith("--top="))?.slice(6) || 20);

  let lineCount = 0;

  try {
    const rl = createInterface({
      input: createReadStream(STATS_PATH),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      lineCount++;
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (filterEvent && entry.event !== filterEvent) continue;
        processEntry(entry);
      } catch {
        // skip malformed lines
      }
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`Stats file not found: ${STATS_PATH}`);
      console.error("Run Pi with the usage-stats extension first.");
      process.exit(1);
    }
    throw err;
  }

  console.log("=== Pi Usage Statistics ===\n");
  console.log(`Lines processed: ${lineCount}`);
  console.log(`Events matched:  ${recent.length}`);
  console.log();
  console.log(`Sessions started: ${counters.sessionStart}`);

  console.log(`\nPrompt resources discovered (cumulative): ${counters.resourcesDiscovered.prompts}`);

  printTable("Top Skills Invoked", counters.skillInvoked, topN);
  printTable("Top Prompts Invoked", counters.promptInvoked, topN);
  printTable("Top Extension Commands", counters.extensionCommandInvoked, topN);
  printTable("Top Skill Commands", counters.skillCommandInvoked, topN);
  printTable("Top Custom Tools", counters.customToolCalled, topN);
  printTable("Top Models Used", counters.modelUsed, topN);
  printTable("Top Skills Loaded (implicit)", counters.skillLoaded, topN);

  if (showRecent) {
    printRecent(recentCount);
  }
}

main();
