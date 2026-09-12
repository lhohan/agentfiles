// CLI contract tests: exit codes, stderr guidance, and an offline end-to-end run
// from fixtures (fetch is expected to be the only network-dependent command).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { buildUnits } from '../lib/units.mjs';
import * as deepswe from '../lib/sources/deepswe.mjs';
import * as tbench from '../lib/sources/tbench.mjs';
import { PROMPT_VERSION } from '../lib/judge.mjs';

const skillDir = resolve(import.meta.dirname, '..', '..');
const cli = join(skillDir, 'scripts', 'evaluate.mjs');
const manifestPath = join(skillDir, 'references', 'manifest.example.json');
const configPath = join(skillDir, 'references', 'config.json');

function run(args) {
  try {
    const stdout = execFileSync('node', [cli, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return { code: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

test('help exits 0 and unknown input exits 2 with guidance', () => {
  assert.equal(run(['--help']).code, 0);
  const unknown = run(['bogus', '--manifest', manifestPath]);
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /ERROR: Unknown command/);
  assert.match(unknown.stderr, /NEXT:/);
});

test('a missing manifest is a usage error', () => {
  const result = run(['score']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /A run manifest is required/);
});

test('judge-import rejects a malformed assessment with exit 5', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-judge-'));
  const bad = join(runDir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ strengths: 'not-an-array', risks: [], disqualifiers: [], confidence: 'high', divergence: [] }));
  const result = run(['judge-import', '--manifest', manifestPath, '--run', runDir, '--judge-result', bad]);
  assert.equal(result.code, 5);
  assert.match(result.stderr, /strengths/);
});

/** The fixtures are small slices; pad them so the scored path is exercised offline. */
function pad(rows, count) {
  const padded = [...rows];
  const first = rows[0];
  for (let index = padded.length; index < count; index += 1) {
    padded.push({ ...first, modelKey: `synthetic-${index}`, modelDisplay: `Synthetic ${index}`, value: Math.min(0.95, 0.05 * index), uncertainty: null });
  }
  return padded;
}

test('judge-import stores a schema-valid assessment with exit 0', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-judge-ok-'));
  const good = join(runDir, 'judge-result.json');
  writeFileSync(
    good,
    JSON.stringify({
      strengths: ['wide capability coverage on implementation'],
      risks: ['plan stages have no tier A evidence'],
      disqualifiers: [],
      confidence: 'low',
      divergence: ['baseline has proxy-family evidence only'],
    }),
  );
  const result = run(['judge-import', '--manifest', manifestPath, '--run', runDir, '--judge-result', good]);
  assert.equal(result.code, 0, result.stderr);
  const stored = JSON.parse(readFileSync(good, 'utf8'));
  assert.equal(stored.model, 'opencode-go/hy4-preview');
  assert.equal(stored.thinking, 'high');
  assert.equal(stored.prompt_version, PROMPT_VERSION);
  assert.ok(stored.received_at);
});

function offlineRunDir() {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-run-'));
  const entries = [
    { id: 'deepswe', name: 'DeepSWE v1.1', adapter: 'deepswe', board: 'v1.1', version: '1.1', split: 'default', metric: 'pass_at_1', direction: 'higher', capabilities: { software_engineering: 'primary' }, harness_classes: { 'mini-swe-agent': 'agent-cli' } },
    { id: 'tbench-v2.1', name: 'Terminal-Bench v2.1', adapter: 'tbench', board: 'terminal-bench-2.1', version: '2.1', split: 'default', metric: 'accuracy', direction: 'higher', capabilities: { tool_use: 'primary' }, harness_classes: { Codex: 'agent-cli', 'Claude Code': 'agent-cli', 'Grok Build': 'agent-cli', 'mini-SWE-agent': 'agent-cli' } },
  ];
  const snapshot = { adapter: 'deepswe', adapter_version: 1, url: 'https://example.test/data.json', retrieved_at: '2026-09-11T00:00:00.000Z', sha256: 'd'.repeat(64) };
  const deepsweRows = pad(deepswe.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'deepswe.sample.json'), 'utf8'), [entries[0]]).rows, 20);
  const tbenchRows = pad(tbench.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'tbench.sample.html'), 'utf8'), [entries[1]]).rows, 20);
  const units = [
    ...buildUnits({ entries: [entries[0]], rows: deepsweRows, snapshot, effortOrder: ['low', 'medium', 'high', 'xhigh', 'max'] }),
    ...buildUnits({ entries: [entries[1]], rows: tbenchRows, snapshot: { ...snapshot, adapter: 'tbench' }, effortOrder: ['low', 'medium', 'high', 'xhigh', 'max'] }),
  ];
  writeFileSync(
    join(runDir, 'observations.json'),
    JSON.stringify({ observations_version: 1, reference_time: '2026-09-11T00:00:00.000Z', agent: 'pi', sources: [], failures: [], units }),
  );
  return runDir;
}

test('score, render, and replay work offline from fixtures', () => {
  const runDir = offlineRunDir();
  const scoreResult = run(['score', '--manifest', manifestPath, '--config', configPath, '--run', runDir]);
  assert.equal(scoreResult.code, 0, scoreResult.stderr);
  const renderResult = run(['render', '--manifest', manifestPath, '--run', runDir]);
  assert.equal(renderResult.code, 0, renderResult.stderr);
  const markdown = readFileSync(join(runDir, 'report.md'), 'utf8');
  assert.ok(markdown.includes('## 10. Evidence appendix'));
  assert.ok(markdown.includes('missing-judge'));
  assert.equal(run(['replay', '--manifest', manifestPath, '--run', runDir]).code, 0);
});

test('replay detects a tampered report with exit 6', () => {
  const runDir = offlineRunDir();
  run(['score', '--manifest', manifestPath, '--run', runDir]);
  run(['render', '--manifest', manifestPath, '--run', runDir]);
  const reportPath = join(runDir, 'report.json');
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  report.scorecard.threshold_coverage = 0.99;
  writeFileSync(reportPath, JSON.stringify(report));
  const result = run(['replay', '--manifest', manifestPath, '--run', runDir]);
  assert.equal(result.code, 6);
  assert.match(result.stderr, /Replay mismatch/);
});

test('score exits 4 when every unit is excluded', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-empty-'));
  writeFileSync(
    join(runDir, 'observations.json'),
    JSON.stringify({ observations_version: 1, reference_time: '2026-09-11T00:00:00.000Z', agent: 'pi', sources: [], failures: [], units: [{ unit_key: 'x', benchmark: 'deepswe', board: 'v1.1', version: '1.1', split: 'default', metric: 'pass_at_1', direction: 'higher', harness_class: 'agent-cli', snapshot: { adapter: 'deepswe', adapter_version: 1, url: 'https://example.test', retrieved_at: '2026-09-11T00:00:00.000Z', sha256: 'e'.repeat(64) }, population: [], dedupe: [] }] }),
  );
  const result = run(['score', '--manifest', manifestPath, '--run', runDir]);
  assert.equal(result.code, 4);
  assert.match(result.stderr, /No comparable data/);
});
