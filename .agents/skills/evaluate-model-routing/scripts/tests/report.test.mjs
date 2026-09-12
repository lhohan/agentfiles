// Renderer tests: the fixed ten-section form, escaping, and the two valid
// missing states (missing-judge, missing-recommendations).

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, renderHtml, renderMarkdown, REPORT_SECTIONS } from '../lib/report.mjs';
import { score } from '../lib/score.mjs';
import { buildUnits } from '../lib/units.mjs';

const ENTRY = {
  id: 'bench',
  name: 'Benchmark',
  adapter: 'bench',
  board: 'b',
  version: '1',
  split: 'default',
  metric: 'accuracy',
  direction: 'higher',
  source_url: 'javascript:alert(1)',
  capabilities: { software_engineering: 'primary' },
  harness_classes: { harness: 'agent-cli' },
};

const CONFIG = {
  judges: [{ model: 'judge/model', thinking: 'high' }],
  rank_threshold_coverage: 0.5,
  max_snapshot_age_days: 30,
  contested_tolerance: 0.05,
  effort_rank: ['low', 'high'],
  stage_weights: { implement: { software_engineering: 1 } },
  benchmark_overrides: {},
  model_aliases: [{ route_id: 'p/a', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' }],
  hash: 'deadbeefdeadbeef',
};

const REGISTRY = { byId: new Map([['bench', ENTRY]]), benchmarks: [ENTRY] };

function makeReport({ manifest = {}, judge = null } = {}) {
  const rows = Array.from({ length: 20 }, (_, index) => ({
    benchmark: 'bench',
    modelKey: index === 0 ? 'a' : `m${index}`,
    modelDisplay: `model-${index}`,
    value: index / 20,
    attempts: 1,
    date: '2026-09-01',
    harnessLabel: 'harness',
    effort: null,
    uncertainty: null,
    caveat: null,
  }));
  const units = buildUnits({
    entries: [ENTRY],
    rows,
    snapshot: { adapter: 'bench', adapter_version: 1, url: 'https://example.test/data.json', retrieved_at: '2026-09-11T00:00:00.000Z', sha256: 'b'.repeat(64) },
    effortOrder: CONFIG.effort_rank,
  });
  const fullManifest = {
    agent: '<img src=x onerror=alert(1)>',
    profile: 'p',
    profile_verified_at: '2026-09-11',
    run_date: '2026-09-11',
    run_slug: 'test',
    hash: 'cafebabecafebabe',
    candidates: ['p/a'],
    stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }],
    recommendations: [],
    notes: '<script>alert(1)</script>',
    ...manifest,
  };
  const scorecard = score({ config: CONFIG, registry: REGISTRY, manifest: fullManifest, units, referenceTime: '2026-09-11T00:00:00.000Z' });
  return buildReport({ config: CONFIG, registry: REGISTRY, manifest: fullManifest, sources: [{ adapter: 'bench', status: 'ok', url: 'https://example.test/data.json', retrieved_at: '2026-09-11T00:00:00.000Z', sha256: 'b'.repeat(64) }], failures: [], units, scorecard, judge, referenceTime: '2026-09-11T00:00:00.000Z' });
}

test('markdown carries all ten fixed sections', () => {
  const markdown = renderMarkdown(makeReport());
  REPORT_SECTIONS.forEach((section, index) => assert.ok(markdown.includes(`## ${index + 1}. ${section}`), `missing section ${section}`));
});

test('html carries all ten fixed sections', () => {
  const html = renderHtml(makeReport());
  REPORT_SECTIONS.forEach((section, index) => assert.ok(html.includes(`<h2>${index + 1}. ${section}</h2>`), `missing section ${section}`));
});

test('remote values are escaped in html', () => {
  const html = renderHtml(makeReport());
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<img src=x'), false);
  assert.ok(html.includes('&lt;script&gt;'), 'escaped script text is present');
  assert.ok(html.includes('&lt;img src=x'), 'escaped manifest agent is present');
});

test('only http and https URLs become links', () => {
  const html = renderHtml(makeReport());
  assert.equal(html.includes('href="javascript:'), false);
});

test('a missing judge renders the missing-judge state and a self-candidate judge is tagged', () => {
  assert.ok(renderMarkdown(makeReport()).includes('missing-judge'));
  const judge = {
    model: 'p/a',
    thinking: 'high',
    prompt_version: 1,
    received_at: '2026-09-11T01:00:00.000Z',
    assessment: { strengths: ['s'], risks: ['r'], disqualifiers: [], confidence: 'low', divergence: ['d'] },
    self_candidate: true,
  };
  const markdown = renderMarkdown(makeReport({ judge }));
  assert.ok(markdown.includes('self-candidate'));
  assert.equal(markdown.includes('missing-judge'), false);
});

test('operational columns show values, provenance, and missing markers', () => {
  const markdown = renderMarkdown(makeReport());
  assert.match(markdown, /Input price \(USD\/M tokens; source; read\)/);
  assert.match(markdown, /not-in-store \[source: not loaded; read: not recorded\]/);
  const html = renderHtml(makeReport());
  assert.match(html, /Context limit \(source; read\)/);
});

test('a report without skill-authored recommendations is marked and shows signals', () => {
  const markdown = renderMarkdown(makeReport());
  assert.ok(markdown.includes('missing-recommendations'));
  assert.ok(markdown.includes('implement:'));
  const withRecommendation = renderMarkdown(makeReport({ manifest: { recommendations: [{ task: 'implement', decision: 'keep', rationale: 'coverage is too low to move' }] } }));
  assert.equal(withRecommendation.includes('missing-recommendations'), false);
  assert.ok(withRecommendation.includes('coverage is too low to move'));
});
