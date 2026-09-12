// Review index tests: ordering, incomplete-run visibility, and self-containment.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { collectRuns, renderIndexPage, writeIndex } from '../lib/index-page.mjs';

const skillDir = resolve(import.meta.dirname, '..', '..');
const cli = join(skillDir, 'scripts', 'evaluate.mjs');

function report({ agent = 'pi', runDate, runSlug, ranked = true, judge = null, calibration = null }) {
  const rows = ranked
    ? [{ route_id: 'p/a', score: 0.7, coverage: 1, eligible: true, rank: 1, missing_capabilities: [] }]
    : [{ route_id: 'p/a', score: null, coverage: 0, eligible: false, rank: null, missing_capabilities: [{ id: 'review', weight: 0.5 }] }];
  return {
    meta: { agent, run_date: runDate, run_slug: runSlug, pipeline_version: 6 },
    recommendations: [{ task: 'implement', decision: 'no-change', rationale: 'example' }],
    judge,
    calibration,
    scorecard: { stages: { implement: { weights: { software_engineering: 1 }, rows }, review: { weights: { review: 1 }, rows: [{ route_id: 'p/a', coverage: 0, eligible: false }] } } },
  };
}

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'emr-index-'));
  mkdirSync(join(root, '2026-09-11-pi-later'));
  writeFileSync(join(root, '2026-09-11-pi-later', 'report.json'), JSON.stringify(report({ runDate: '2026-09-11', runSlug: 'later', judge: { model: 'judge/model', assessment: { confidence: 'low' } }, calibration: { detected: 3, scored: 3, total: 3, status: 'complete' } })));
  mkdirSync(join(root, '2026-08-01-pi-earlier'));
  writeFileSync(join(root, '2026-08-01-pi-earlier', 'report.json'), JSON.stringify(report({ runDate: '2026-08-01', runSlug: 'earlier', ranked: false })));
  mkdirSync(join(root, '2026-09-12-pi-broken'));
  return root;
}

test('collectRuns reports incomplete directories instead of hiding them', () => {
  const runs = collectRuns(fixtureRoot());
  assert.equal(runs.length, 3);
  const broken = runs.find((run) => run.dir === '2026-09-12-pi-broken');
  assert.equal(broken.status, 'incomplete');
  assert.match(broken.reason, /no report\.json/);
});

test('collectRuns sorts newest first', () => {
  const runs = collectRuns(fixtureRoot());
  assert.equal(runs[0].dir, '2026-09-12-pi-broken');
  assert.deepEqual(runs.filter((run) => run.status === 'ok').map((run) => run.dir), ['2026-09-11-pi-later', '2026-08-01-pi-earlier']);
});

test('the index lists ranked stages, judge state, calibration, and decisions', () => {
  const runs = collectRuns(fixtureRoot());
  const html = renderIndexPage({ runs, generatedAt: '2026-09-12T00:00:00.000Z' });
  assert.ok(html.includes('Stages ranked'));
  assert.ok(html.includes('2026-09-11-pi-later/report.html'), 'each run links to its report');
  assert.ok(html.includes('3/3 of 3'), 'calibration figure is shown');
  assert.ok(html.includes('missing-judge'), 'a run without a judge says so');
  assert.ok(html.includes('Incomplete run directories'), 'broken runs are listed');
  assert.ok(html.includes('none'), 'a run with no ranked stage shows none');
});

test('the index is self-contained', () => {
  const html = renderIndexPage({ runs: collectRuns(fixtureRoot()), generatedAt: '2026-09-12T00:00:00.000Z' });
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<link'), false);
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('<style>'));
});

test('writeIndex writes index.html under the review root', () => {
  const root = fixtureRoot();
  const result = writeIndex({ root, generatedAt: '2026-09-12T00:00:00.000Z' });
  assert.equal(result.complete, 2);
  assert.equal(result.runs, 3);
  assert.ok(existsSync(join(root, 'index.html')));
  assert.ok(readFileSync(join(root, 'index.html'), 'utf8').includes('<!doctype html>'));
});

test('the index command needs no manifest', () => {
  const root = fixtureRoot();
  const stdout = execFileSync('node', [cli, 'index', '--root', root], { encoding: 'utf8' });
  assert.match(stdout, /Wrote .*index\.html/);
  assert.ok(existsSync(join(root, 'index.html')));
});
