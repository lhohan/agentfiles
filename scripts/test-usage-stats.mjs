#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  TIME_INTERVAL_OPTIONS,
  createArtifactReport,
  createArtifactReports,
  entryMatchesTimeInterval,
  normalizeTimeInterval,
} from "../agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs";

function names(rows) {
  return rows.map((row) => row.name);
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
  const outputPath = "/tmp/pi-usage-report-layout-test.html";
  rmSync(outputPath, { force: true });
  execFileSync("node", [
    "agents/pi/.pi/agent/bin/pi-usage-report-html",
    `--output=${outputPath}`,
    "--recent=5",
  ], { stdio: "ignore" });
  const html = readFileSync(outputPath, "utf-8");

  assert.match(html, /Artifact Usage at a Glance/);
  assert.match(html, /summary-bar-fill/);
  assert.match(html, /<select id="interval-selector"/);
  assert.match(html, /<option value="last 7 days">last 7 days<\/option>/);
  assert.match(html, /data-interval-panel="last 7 days"/);
  assert.match(html, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.equal(html.includes("<h2><span class=\"icon\">📝</span> Top Prompts</h2>"), false);
  assert.ok(html.indexOf("Activity Timeline") < html.indexOf("Artifact Usage at a Glance"));
  assert.ok(html.indexOf("Models Used") < html.indexOf("Top 10 Most-Used"));
  assert.ok(html.indexOf("Skills Used") > html.indexOf("Models Used"));
  assert.ok(html.indexOf("Skills Used") < html.indexOf("Top 10 Most-Used"));
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
