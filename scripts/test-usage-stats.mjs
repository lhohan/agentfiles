#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  TIME_INTERVAL_OPTIONS,
  createArtifactReport,
  createArtifactReports,
  createCollector,
  entryMatchesTimeInterval,
  formatEventDetail,
  formatPromptDetail,
  normalizeTimeInterval,
  promptDisplayFromEntry,
} from "../agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs";

const usageStatsSource = readFileSync("agents/pi/.pi/agent/extensions/usage-stats.ts", "utf-8");

function names(rows) {
  return rows.map((row) => row.name);
}

function usageFixtureHome() {
  const home = mkdtempSync(join(tmpdir(), "pi-usage-report-test-"));
  const agentDir = join(home, ".pi", "agent");
  mkdirSync(agentDir, { recursive: true });
  const now = Date.parse("2026-04-27T12:00:00Z");
  const entries = [
    { t: now - 3000, event: "session_start", reason: "new" },
    { t: now - 2000, event: "custom_tool_called", tool: "web_search", extension: "bx" },
    { t: now - 1000, event: "extension_command_invoked", name: "/review", extension: "pi-prompt-template-model", args: "foo" },
    { t: now, event: "extension_inventory", extension: "unused-extension" },
  ];
  writeFileSync(
    join(agentDir, "usage-stats.jsonl"),
    `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  );
  return home;
}

{
  assert.deepEqual(TIME_INTERVAL_OPTIONS.map((option) => option.value), [
    "today",
    "last 3 days",
    "last 7 days",
    "last 10 days",
    "last 30 days",
    "last 90 days",
    "last year",
    "all",
  ]);
  assert.equal(normalizeTimeInterval(), "all");
  assert.equal(normalizeTimeInterval("LAST 7 DAYS"), "last 7 days");
  assert.throws(() => normalizeTimeInterval("last week"), /Invalid time interval/);
  assert.equal(usageStatsSource.includes("prefix.length >= 32"), false);
  assert.equal(usageStatsSource.includes("prefix.length < 32"), false);
  // Title-based matching anchor: extractTitle must exist in the extension
  assert.equal(usageStatsSource.includes("function extractTitle"), true);
}

{
  const now = Date.parse("2026-04-27T12:00:00Z");
  const inside = { t: now - 6 * 24 * 60 * 60 * 1000 };
  const outside = { t: now - 8 * 24 * 60 * 60 * 1000 };

  assert.equal(entryMatchesTimeInterval(inside, "last 7 days", now), true);
  assert.equal(entryMatchesTimeInterval(outside, "last 7 days", now), false);
  assert.equal(entryMatchesTimeInterval(outside, "all", now), true);
  assert.equal(entryMatchesTimeInterval({ event: "missing_timestamp" }, "last 7 days", now), false);
}

{
  const counts = new Map([
    ["beta", 7],
    ["alpha", 7],
    ["used", 2],
  ]);
  const inventory = [
    "alpha",
    "beta",
    "used",
    "zero-a",
    "zero-b",
    "zero-c",
    "zero-d",
    "zero-e",
    "zero-f",
    "zero-g",
    "zero-h",
    "zero-i",
  ];

  const report = createArtifactReport({
    id: "test",
    label: "Test Artifacts",
    itemLabel: "Artifact",
    counts,
    inventory,
    inventoryDiscovered: true,
  });

  assert.deepEqual(names(report.full), [
    "alpha",
    "beta",
    "used",
    "zero-a",
    "zero-b",
    "zero-c",
    "zero-d",
    "zero-e",
    "zero-f",
    "zero-g",
    "zero-h",
    "zero-i",
  ]);
  assert.deepEqual(report.full.map((row) => row.count), [7, 7, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(report.most.length, 10);
  assert.equal(report.least.length, 2);
  assert.deepEqual(names(report.least), ["zero-h", "zero-i"]);
  assert.equal(names(report.most).some((name) => names(report.least).includes(name)), false);
}

{
  const report = createArtifactReport({
    id: "tools",
    label: "Custom Tools",
    itemLabel: "Tool",
    counts: new Map([["observed-tool", 3]]),
    inventory: [],
    inventoryDiscovered: false,
  });

  assert.deepEqual(names(report.full), ["observed-tool"]);
  assert.equal(report.inventoryDiscovered, false);
  assert.equal(report.includesZeroUse, false);
}

{
  const counters = {
    promptInvoked: new Map([["plan", 4]]),
    skillLoaded: new Map([["detect-jujutsu", 2]]),
    customToolCalled: new Map([["web_search", 5]]),
    modelUsed: new Map([["openai/gpt-test", 1]]),
  };

  const reports = createArtifactReports(counters, {
    inventories: {
      prompts: ["plan", "review"],
      skills: ["detect-jujutsu", "unused-skill"],
      customTools: [],
      enabledModels: [],
    },
    discovered: {
      prompts: true,
      skills: true,
      customTools: false,
      enabledModels: false,
    },
  });

  assert.equal(reports.length, 4);
  assert.equal(reports.find((r) => r.id === "enabledModels")?.label, "Enabled Models");
  assert.equal(reports.find((r) => r.id === "enabledModels")?.includesZeroUse, false);
  assert.deepEqual(names(reports.find((r) => r.id === "prompts").full), ["plan", "review"]);
}

{
  const { counters, processEntry } = createCollector();
  processEntry({ event: "custom_tool_called", tool: "web_search", extension: "bx" });
  processEntry({ event: "extension_command_invoked", name: "/review", extension: "pi-prompt-template-model" });

  const reports = createArtifactReports(counters, {
    inventories: {
      prompts: [],
      skills: [],
      customTools: ["web_search"],
      enabledModels: [],
    },
    discovered: {
      prompts: false,
      skills: false,
      customTools: true,
      enabledModels: false,
    },
  });

  assert.deepEqual(names(reports.find((r) => r.id === "customTools").full), ["web_search (bx)"]);
  assert.equal(formatEventDetail({ event: "custom_tool_called", tool: "web_search", extension: "bx" }), 'tool="web_search (bx)"');
  assert.equal(formatEventDetail({ event: "extension_command_invoked", name: "/review", extension: "pi-prompt-template-model" }), 'name="/review (pi-prompt-template-model)"');
}

// ── Prompt title tracking ────────────────────────────────────────────

{
  // promptDisplayFromEntry includes the title when present
  const entry = { name: "implement", promptTitle: "Implement Mode", sourceInfo: { path: "/p/implement.md" } };
  const display = promptDisplayFromEntry(entry);
  assert.equal(display.name, "implement");
  assert.equal(display.title, "Implement Mode");
}

{
  // formatPromptDetail includes title when available
  assert.equal(
    formatPromptDetail({ name: "implement", promptTitle: "Implement Mode" }),
    'name="implement" title="Implement Mode"',
  );
}

{
  // formatPromptDetail omits title when absent
  assert.equal(
    formatPromptDetail({ name: "plan" }),
    'name="plan"',
  );
}

{
  // collector stores promptTitles from prompt_invoked entries
  const { counters, processEntry } = createCollector();
  processEntry({ event: "prompt_invoked", name: "implement", promptTitle: "Implement Mode" });
  processEntry({ event: "prompt_invoked", name: "plan", promptTitle: "Plan Mode" });
  processEntry({ event: "prompt_invoked", name: "implement", promptTitle: "Implement Mode" });
  assert.equal(counters.promptInvoked.get("implement"), 2);
  assert.equal(counters.promptInvoked.get("plan"), 1);
  assert.equal(counters.promptTitles.get("implement"), "Implement Mode");
  assert.equal(counters.promptTitles.get("plan"), "Plan Mode");
  // First-seen title persists when the same name appears again
  assert.equal(counters.promptTitles.size, 2);
}

{
  // collector does not store promptTitles when promptTitle is absent
  const { counters, processEntry } = createCollector();
  processEntry({ event: "prompt_invoked", name: "legacy-prompt" });
  assert.equal(counters.promptTitles.has("legacy-prompt"), false);
}

{
  // createArtifactReports displays title alongside name for prompts
  const { counters, processEntry } = createCollector();
  processEntry({ event: "prompt_invoked", name: "implement", promptTitle: "Implement Mode" });
  processEntry({ event: "prompt_invoked", name: "plan", promptTitle: "Plan Mode" });

  const reports = createArtifactReports(counters, {
    inventories: {
      prompts: ["implement", "plan", "review"],
      skills: [],
      customTools: [],
      enabledModels: [],
    },
    discovered: {
      prompts: true,
      skills: false,
      customTools: false,
      enabledModels: false,
    },
  });

  const promptReport = reports.find((r) => r.id === "prompts");
  const displayNames = promptReport.full.map((row) => row.name);
  // Display names include title + name
  const planRow = displayNames.find((n) => n.startsWith("Plan Mode"));
  const implementRow = displayNames.find((n) => n.startsWith("Implement Mode"));
  assert.ok(planRow, 'Plan Mode should appear in display names');
  assert.ok(implementRow, 'Implement Mode should appear in display names');
  // review has no title, so it uses raw name
  assert.ok(displayNames.includes("review"), 'review should appear as raw name');
}

{
  const home = usageFixtureHome();
  const outputPath = "/tmp/pi-usage-report-layout-test.html";
  rmSync(outputPath, { force: true });
  execFileSync("node", [
    "agents/pi/.pi/agent/bin/pi-usage-report-html",
    `--output=${outputPath}`,
    "--recent=5",
  ], { env: { ...process.env, HOME: home }, stdio: "ignore" });
  const html = readFileSync(outputPath, "utf-8");

  assert.match(html, /Artifact Usage at a Glance/);
  assert.match(html, /summary-bar-fill/);
  assert.match(html, /<select id="interval-selector"/);
  assert.match(html, /<option value="last 7 days">last 7 days<\/option>/);
  assert.match(html, /data-interval-panel="last 7 days"/);
  assert.match(html, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(html, /web_search \(bx\)/);
  assert.match(html, /\/review \(pi-prompt-template-model\)/);
  assert.equal(html.includes("Extensions Used"), false);
  assert.equal(html.includes("<h2><span class=\"icon\">📝</span> Top Prompts</h2>"), false);
  assert.ok(html.indexOf("Activity Timeline") < html.indexOf("Artifact Usage at a Glance"));
  assert.ok(html.indexOf("Models Used") < html.indexOf("Top 10 Most-Used"));
  assert.ok(html.indexOf("Skills Used") > html.indexOf("Models Used"));
  assert.ok(html.indexOf("Skills Used") < html.indexOf("Top 10 Most-Used"));
  rmSync(home, { recursive: true, force: true });
}

{
  const home = usageFixtureHome();
  const report = execFileSync("node", [
    "agents/pi/.pi/agent/bin/pi-usage-report",
    "--recent=5",
  ], { env: { ...process.env, HOME: home }, encoding: "utf-8" });

  assert.match(report, /web_search \(bx\)/);
  assert.match(report, /\/review \(pi-prompt-template-model\)/);
  assert.equal(report.includes("Extensions Used"), false);
  rmSync(home, { recursive: true, force: true });
}

{
  const help = execFileSync("node", [
    "agents/pi/.pi/agent/bin/pi-usage-report",
    "--help",
  ], { encoding: "utf-8" });

  assert.match(help, /--interval=<interval>/);
  assert.match(help, /last 3 days, last 7 days, last 10 days/);
}

console.log("usage-stats reporter tests passed");
