#!/usr/bin/env node
// Behavior tests for the jj-footer extension's pure logic.
//
// Imports the exported pure functions directly from jj-footer.ts (Node 24
// type-stripping erases the type-only imports), mirroring how
// test-usage-stats.mjs verifies its lib with plain node:assert — no test
// framework involved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildJjLabelGroups,
  classifyJjStatusLine,
  formatCount,
  parseJjBookmarkAnchor,
  parseJjStatusCounts,
  renderJjLabel,
} from "../agents/pi/.pi/agent/extensions/jj-footer.ts";

// --- fixtures ---------------------------------------------------------------

function cleanState(overrides = {}) {
  return {
    jjInfo: { bookmark: "main", ahead: 0, changeId: "abc123", ...(overrides.jjInfo ?? {}) },
    fileCounts: { added: 0, changed: 0, deleted: 0, conflicted: 0, ...(overrides.fileCounts ?? {}) },
  };
}

const fakeFg = (role, text) => `<${role}>${text}</${role}>`;

// --- label groups -----------------------------------------------------------

{
  const groups = buildJjLabelGroups(cleanState());
  assert.deepEqual(groups, [
    [{ text: "jj", role: "accent" }],
    [{ text: "main", role: "accent" }],
    [{ text: "@abc123", role: "muted" }],
    [{ text: "clean", role: "success" }],
  ]);
}

{
  const groups = buildJjLabelGroups(
    cleanState({
      jjInfo: { bookmark: "main", ahead: 3, changeId: "abc123" },
      fileCounts: { added: 2, changed: 1, deleted: 1, conflicted: 1 },
    }),
  );
  assert.deepEqual(groups, [
    [{ text: "jj", role: "accent" }],
    [
      { text: "main", role: "accent" },
      { text: "↑3", role: "muted" },
    ],
    [{ text: "@abc123", role: "muted" }],
    [
      { text: "+2", role: "success" },
      { text: "~1", role: "warning" },
      { text: "-1", role: "error" },
      { text: "!1", role: "error" },
    ],
  ]);
}

// Each status type maps to its own symbol and role.
for (const [field, symbol, role] of [
  ["added", "+", "success"],
  ["changed", "~", "warning"],
  ["deleted", "-", "error"],
  ["conflicted", "!", "error"],
]) {
  const groups = buildJjLabelGroups(cleanState({ fileCounts: { [field]: 1 } }));
  const countsGroup = groups[groups.length - 1];
  assert.deepEqual(countsGroup, [{ text: `${symbol}1`, role }], `count for ${field}`);
}

// Unbookmarked working copy keeps change id and counts, bookmark reads muted.
{
  const groups = buildJjLabelGroups(
    cleanState({ jjInfo: { bookmark: "(no bookmark)", ahead: 0, changeId: "abc123" } }),
  );
  assert.deepEqual(groups[1], [{ text: "(no bookmark)", role: "muted" }]);
  assert.deepEqual(groups[2], [{ text: "@abc123", role: "muted" }]);
}

// Loading state renders only marker and loading label — no fake @ or clean.
{
  const groups = buildJjLabelGroups(
    cleanState({ jjInfo: { bookmark: "(loading…)", ahead: 0, changeId: "" } }),
  );
  assert.deepEqual(groups, [
    [{ text: "jj", role: "accent" }],
    [{ text: "(loading…)", role: "muted" }],
  ]);
}

// Unavailable state renders marker and error-styled unavailable label.
{
  const groups = buildJjLabelGroups(
    cleanState({ jjInfo: { bookmark: "(unavailable)", ahead: 0, changeId: "" } }),
  );
  assert.deepEqual(groups, [
    [{ text: "jj", role: "accent" }],
    [{ text: "(unavailable)", role: "error" }],
  ]);
}

// Empty change id omits the @ group entirely.
{
  const groups = buildJjLabelGroups(cleanState({ jjInfo: { bookmark: "main", ahead: 0, changeId: "" } }));
  assert.deepEqual(
    groups.map((group) => group.map((part) => part.text)),
    [["jj"], ["main"], ["clean"]],
  );
}

// Large counts use the compact formatter inside the label.
{
  const groups = buildJjLabelGroups(cleanState({ fileCounts: { added: 12345 } }));
  assert.deepEqual(groups[groups.length - 1], [{ text: "+12.3k", role: "success" }]);
}

// --- rendered label ---------------------------------------------------------

{
  const label = renderJjLabel(
    buildJjLabelGroups(
      cleanState({ jjInfo: { bookmark: "main", ahead: 1, changeId: "x" } }),
    ),
    fakeFg,
  );
  assert.equal(
    label,
    "<accent>jj</accent><muted> · </muted><accent>main</accent> <muted>↑1</muted><muted> · </muted><muted>@x</muted><muted> · </muted><success>clean</success>",
  );
}

// --- count formatting -------------------------------------------------------

{
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1234), "1.2k");
  assert.equal(formatCount(1000000), "1.0m");
  assert.equal(formatCount(-5), "-5");
  assert.equal(formatCount(Infinity), "∞");
}

// --- status classification (unchanged behaviour) -----------------------------

{
  assert.equal(classifyJjStatusLine("M file.txt"), "changed");
  assert.equal(classifyJjStatusLine("A file.txt"), "added");
  assert.equal(classifyJjStatusLine("? untracked.txt"), "added");
  assert.equal(classifyJjStatusLine("R {old.txt => new.txt}"), "changed");
  assert.equal(classifyJjStatusLine("T typechange.txt"), "changed");
  assert.equal(classifyJjStatusLine("D deleted.txt"), "deleted");
  assert.equal(classifyJjStatusLine("C conflicted.txt"), "conflicted");
  // Informational lines must not be counted as file statuses.
  assert.equal(classifyJjStatusLine("The working copy has no changes."), null);
  assert.equal(classifyJjStatusLine("Untracked paths:"), null);
  assert.equal(classifyJjStatusLine(""), null);
}

{
  const counts = parseJjStatusCounts(
    [
      "The working copy has no changes.",
      "M modified.txt",
      "A added.txt",
      "D deleted.txt",
      "C conflicted.txt",
      "? untracked.txt",
      "R {renamed.txt => moved.txt}",
      "Untracked paths:",
      "  untracked.txt",
    ].join("\n"),
  );
  assert.deepEqual(counts, { added: 2, changed: 2, deleted: 1, conflicted: 1 });
}

{
  assert.deepEqual(parseJjBookmarkAnchor("abc123\nmain\nfeature"), {
    commitId: "abc123",
    bookmark: "main,feature",
  });
  assert.equal(parseJjBookmarkAnchor("abc123"), null);
}

// --- source-level invariants -------------------------------------------------

{
  const source = readFileSync("agents/pi/.pi/agent/extensions/jj-footer.ts", "utf-8");
  assert.equal(source.includes("setFooter"), false, "must never call setFooter");
  assert.equal(source.includes('setStatus("jj-footer"'), true, "additive status key must remain");
  assert.equal(source.includes("change_id.short()"), true, "change id must come from the template");
  assert.equal(source.includes("--ignore-working-copy"), true, "all jj reads must stay side-effect-free");
}

console.log("test-jj-footer: all assertions passed");
