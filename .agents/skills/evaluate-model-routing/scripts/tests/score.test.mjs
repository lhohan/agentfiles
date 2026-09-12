// Scoring tests: percentile handling, exclusions, coverage, contested units,
// and the no-imputation rule. All inputs are local; no network is used.

import assert from 'node:assert/strict';
import test from 'node:test';
import { disagreements, percentileRanks, score } from '../lib/score.mjs';
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
  source_url: 'https://example.test',
  capabilities: { software_engineering: 'primary', tool_use: 'secondary' },
  harness_classes: { harness: 'agent-cli' },
};

const SNAPSHOT = { adapter: 'bench', adapter_version: 1, url: 'https://example.test/data.json', retrieved_at: '2026-09-11T00:00:00.000Z', sha256: 'a'.repeat(64) };

const CONFIG = {
  judges: [{ model: 'judge/model', thinking: 'high' }],
  rank_threshold_coverage: 0.5,
  max_snapshot_age_days: 30,
  contested_tolerance: 0.05,
  min_stage_separation: 0.01,
  effort_rank: ['low', 'medium', 'high', 'max'],
  stage_weights: {
    implement: { software_engineering: 0.5, tool_use: 0.3, repository_understanding: 0.2 },
  },
  benchmark_overrides: {},
  model_aliases: [
    { route_id: 'p/a', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/b', source: 'bench', source_name: 'b', source_slug: 'b', canonical_release: 'b', evidence_scope: 'model' },
    { route_id: 'p/c', source: 'bench', source_name: 'c', source_slug: 'c', canonical_release: 'c', evidence_scope: 'model' },
    { route_id: 'p/proxy', source: 'bench', source_name: 'd', source_slug: 'd', canonical_release: 'd', evidence_scope: 'proxy-family' },
  ],
};

const REGISTRY = { byId: new Map([[ENTRY.id, ENTRY]]), benchmarks: [ENTRY] };

function rows(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => ({
    benchmark: 'bench',
    modelKey: String.fromCharCode(97 + index),
    modelDisplay: String.fromCharCode(97 + index),
    value: index / count,
    attempts: 1,
    date: '2026-09-01',
    harnessLabel: 'harness',
    effort: null,
    uncertainty: null,
    caveat: null,
    ...overrides,
  }));
}

function run(unitRows, manifest = { candidates: ['p/a', 'p/b', 'p/c', 'p/proxy'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config = CONFIG, referenceTime = '2026-09-11T00:00:00.000Z', operationalData = null) {
  const units = buildUnits({ entries: [ENTRY], rows: unitRows, snapshot: SNAPSHOT, effortOrder: config.effort_rank });
  return score({ config, registry: REGISTRY, manifest, units, referenceTime, operationalData });
}

test('percentile rank uses midrank tie handling and supports lower-is-better', () => {
  const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} !~ ${expected}`);
  percentileRanks([1, 2, 3], 'higher').forEach((value, index) => closeTo(value, [1 / 6, 3 / 6, 5 / 6][index]));
  percentileRanks([1, 2, 2, 3], 'higher').forEach((value, index) => closeTo(value, [1 / 8, 4 / 8, 4 / 8, 7 / 8][index]));
  percentileRanks([1, 2, 3], 'lower').forEach((value, index) => closeTo(value, [5 / 6, 3 / 6, 1 / 6][index]));
});

test('a board smaller than ten entries is excluded from scoring', () => {
  const result = run(rows(9));
  assert.equal(result.units[0].status, 'small-board-excluded');
  assert.equal(result.units[0].population[0].percentile, null);
});

test('a board of ten to nineteen entries scores with a small-board flag', () => {
  const result = run(rows(12));
  assert.equal(result.units[0].status, 'scored');
  assert.equal(result.units[0].small_board, true);
});

test('duplicate rows for one model resolve to the highest published effort', () => {
  const duplicates = [
    ...rows(10),
    { ...rows(1)[0], modelKey: 'a', modelDisplay: 'a', value: 0.9, effort: 'max', attempts: 4, date: '2026-09-02' },
  ];
  const result = run(duplicates);
  assert.equal(result.units[0].population.find((row) => row.model_key === 'a').value, 0.9);
  assert.equal(result.units[0].dedupe.length, 1);
  assert.equal(result.units[0].dedupe[0].chosen.effort, 'max');
});

test('stale snapshots are excluded and never scored', () => {
  const result = run(rows(12), undefined, CONFIG, '2026-12-01T00:00:00.000Z');
  assert.equal(result.units[0].status, 'stale-excluded');
});

test('capability and stage scores weight present observations only', () => {
  const result = run(rows(20));
  const row = result.stages.implement.rows.find((entry) => entry.route_id === 'p/a');
  const expectedSoftware = result.routes['p/a'].observations.find((observation) => observation.unit_key.endsWith('agent-cli')).percentile;
  assert.equal(row.capabilities.software_engineering.score, expectedSoftware);
  assert.equal(row.coverage, 0.5, 'only the software_engineering weight is present');
  assert.deepEqual(row.missing_capabilities.map((entry) => entry.id), ['tool_use', 'repository_understanding']);
  assert.equal(row.eligible, true, 'coverage exactly at the threshold is eligible');
  assert.equal(result.stages.implement.rows.find((entry) => entry.route_id === 'p/c').score !== null, true);
});

test('capability scores average a primary and a secondary observation of the same capability', () => {
  const entries = [ENTRY, { ...ENTRY, id: 'bench2', adapter: 'bench', capabilities: { software_engineering: 'secondary', tool_use: 'primary' } }];
  const units = buildUnits({ entries, rows: [...rows(20), ...rows(20).map((row) => ({ ...row, benchmark: 'bench2', harnessLabel: 'harness' }))], snapshot: SNAPSHOT, effortOrder: CONFIG.effort_rank });
  const registry = { byId: new Map(entries.map((entry) => [entry.id, entry])), benchmarks: entries };
  const config = { ...CONFIG, model_aliases: [
    { route_id: 'p/a', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/a', source: 'bench2', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
  ] };
  const manifest = { candidates: ['p/a'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] };
  const result = score({ config, registry, manifest, units, referenceTime: '2026-09-11T00:00:00.000Z' });
  const row = result.stages.implement.rows[0];
  const observations = result.routes['p/a'].observations;
  const primary = observations.find((observation) => observation.unit_key.startsWith('bench|'));
  const secondary = observations.find((observation) => observation.unit_key.startsWith('bench2|'));
  const expected = (primary.percentile + 0.5 * secondary.percentile) / 1.5;
  assert.equal(row.capabilities.software_engineering.score, expected);
});

test('a below-threshold stage reports no composite and no rank', () => {
  const config = { ...CONFIG, stage_weights: { implement: { repository_understanding: 1 } } };
  const result = run(rows(20), undefined, config);
  const row = result.stages.implement.rows[0];
  assert.equal(row.coverage, 0);
  assert.equal(row.score, null);
  assert.equal(row.eligible, false);
  assert.equal(result.stages.implement.scores.length, 0);
  assert.equal(result.signals.implement.signal, 'no_comparable_evidence');
});

test('one published release scores for every provider route that claims it', () => {
  const config = {
    ...CONFIG,
    model_aliases: [
      { route_id: 'p/a', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
      { route_id: 'p/b', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
    ],
  };
  const result = run(rows(20), { candidates: ['p/a', 'p/b'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config);
  const first = result.routes['p/a'].observations[0];
  const second = result.routes['p/b'].observations[0];
  assert.equal(first.percentile, second.percentile, 'the same published row yields the same percentile for both routes');
  assert.equal(result.stages.implement.rows.find((row) => row.route_id === 'p/b').coverage, 0.5);
});

test('proxy-family observations stay visible and unscored', () => {
  const result = run(rows(20));
  const route = result.routes['p/proxy'];
  assert.equal(route.observations.length, 0);
  assert.equal(route.unscored_observations.length, 1);
});

test('two source names for one route that disagree are contested and excluded', () => {
  const conflicting = [...rows(20), { ...rows(1)[0], modelKey: 'a2', modelDisplay: 'a2', value: 0.9, date: '2026-09-03' }];
  const config = { ...CONFIG, model_aliases: [...CONFIG.model_aliases, { route_id: 'p/a', source: 'bench', source_name: 'a2', source_slug: 'a2', canonical_release: 'a', evidence_scope: 'model' }] };
  const result = run(conflicting, undefined, config);
  assert.equal(result.routes['p/a'].conflicts.length, 1);
  assert.equal(result.routes['p/a'].observations.length, 0, 'the whole unit is excluded for this route');
  assert.equal(result.routes['p/a'].unscored_observations.length, 2);
});

test('two rows for one source model are resolved by the dedupe rule, not treated as a conflict', () => {
  const duplicated = [...rows(20), { ...rows(1)[0], modelKey: 'a', modelDisplay: 'a', value: 0.01, date: '2026-09-03' }];
  const result = run(duplicated);
  assert.equal(result.routes['p/a'].conflicts.length, 0);
  assert.equal(result.units[0].dedupe.length, 1);
  assert.equal(result.units[0].dedupe[0].chosen.value, 0.01, 'the most recent row wins');
});

test('published intervals that overlap are not contested', () => {
  const overlapping = [
    ...rows(20),
    { ...rows(1)[0], modelKey: 'a', modelDisplay: 'a', value: 0.5, date: '2026-09-03', uncertainty: { kind: 'ci95', lo: 0.4, hi: 0.6 } },
  ];
  const result = run(overlapping);
  assert.equal(result.routes['p/a'].conflicts.length, 0);
});

test('disagreements ignore observations from different units', () => {
  const conflicts = disagreements(
    [
      { unit_key: 'u1', value: 0.2, uncertainty: null, model_display: 'x', benchmark: 'b' },
      { unit_key: 'u2', value: 0.9, uncertainty: null, model_display: 'y', benchmark: 'b' },
    ],
    0.05,
  );
  assert.deepEqual(conflicts, []);
});

test('routes with equal evidence share a rank instead of splitting on the route name', () => {
  const entries = [ENTRY, { ...ENTRY, id: 'bench2', adapter: 'bench' }];
  const sharedRows = rows(20);
  const units = buildUnits({
    entries,
    rows: [...sharedRows, ...sharedRows.map((row) => ({ ...row, benchmark: 'bench2' }))],
    snapshot: SNAPSHOT,
    effortOrder: CONFIG.effort_rank,
  });
  const registry = { byId: new Map(entries.map((entry) => [entry.id, entry])), benchmarks: entries };
  const config = { ...CONFIG, model_aliases: [
    { route_id: 'p/a', source: 'bench', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/b', source: 'bench', source_name: 'b', source_slug: 'b', canonical_release: 'b', evidence_scope: 'model' },
    { route_id: 'p/c', source: 'bench2', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/d', source: 'bench2', source_name: 'b', source_slug: 'b', canonical_release: 'b', evidence_scope: 'model' },
  ] };
  const manifest = { candidates: ['p/a', 'p/b', 'p/c', 'p/d'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] };
  const result = score({ config, registry, manifest, units, referenceTime: '2026-09-11T00:00:00.000Z' });
  const byRoute = new Map(result.stages.implement.rows.map((row) => [row.route_id, row]));
  // bench and bench2 publish the same values, so p/a ties with p/c and p/b ties with p/d.
  assert.equal(byRoute.get('p/a').score, byRoute.get('p/c').score);
  assert.equal(byRoute.get('p/a').rank, byRoute.get('p/c').rank);
  assert.equal(byRoute.get('p/a').tie_kind, 'exact');
  assert.deepEqual(byRoute.get('p/a').tied_with, ['p/c']);
  assert.notEqual(byRoute.get('p/a').rank, byRoute.get('p/b').rank);
});

test('a gap inside min_stage_separation shares a rank with the group anchor', () => {
  // One rank step is 0.05 here. Groups are anchored on the highest score, so the
  // top two routes share rank 1 and the third falls outside the tolerance.
  const config = { ...CONFIG, min_stage_separation: 0.05, stage_weights: { implement: { software_engineering: 1 } } };
  const result = run(rows(20), { candidates: ['p/a', 'p/b', 'p/c'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config);
  const byRoute = new Map(result.stages.implement.rows.map((row) => [row.route_id, row]));
  assert.equal(byRoute.get('p/c').rank, 1);
  assert.equal(byRoute.get('p/b').rank, 1, 'a 0.05 gap is inside the tolerance');
  assert.equal(byRoute.get('p/b').tie_kind, 'within-tolerance');
  assert.deepEqual(byRoute.get('p/b').tied_with, ['p/c']);
  assert.equal(byRoute.get('p/a').rank, 2, 'the third route is 0.10 below the group anchor, so it does not chain in');
});

test('a candidate ahead only within the tolerance raises its own signal', () => {
  const config = { ...CONFIG, min_stage_separation: 0.05, stage_weights: { implement: { software_engineering: 1 } } };
  const result = run(rows(20), { candidates: ['p/a', 'p/b'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config);
  assert.equal(result.signals.implement.signal, 'candidate_ahead_within_tolerance');
  assert.deepEqual(result.signals.implement.candidates_ahead, []);
  assert.deepEqual(result.signals.implement.candidates_ahead_within_tolerance, ['p/b']);
});

test('an ineligible baseline yields the baseline_unrankable signal', () => {
  const result = run(rows(20), { candidates: ['p/a', 'p/b', 'p/proxy'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/proxy' }] }] });
  assert.equal(result.signals.implement.signal, 'baseline_unrankable');
  assert.deepEqual(result.signals.implement.baseline, 'p/proxy');
  assert.deepEqual(result.signals.implement.eligible_candidates, ['p/a', 'p/b']);
});

test('a candidate above the baseline yields the candidate_ahead signal', () => {
  const result = run(rows(20), { candidates: ['p/a', 'p/b'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] });
  assert.equal(result.signals.implement.signal, 'candidate_ahead');
  assert.deepEqual(result.signals.implement.candidates_ahead, ['p/b']);
});

test('manifest candidates are independent of the stages list', () => {
  const result = run(rows(20), { candidates: ['p/c'], stages: [] });
  assert.deepEqual(Object.keys(result.routes), ['p/c']);
  assert.deepEqual(Object.keys(result.stages), ['implement'], 'stage weights come from config, not the manifest');
});

test('operational data annotates a quality tie without changing its rank', () => {
  const config = { ...CONFIG, min_stage_separation: 0.05, stage_weights: { implement: { software_engineering: 1 } } };
  const result = run(rows(20), { candidates: ['p/a', 'p/b'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config, '2026-09-11T00:00:00.000Z', {
    source: '~/.pi/agent/models-store.json',
    read_at: '2026-09-12T00:00:00.000Z',
    routes: {
      'p/a': { input_price: { value: 0.2 }, output_price: { value: 1.2 }, context_limit: { value: 272000 } },
      'p/b': { input_price: { value: 0.4 }, output_price: { value: 1.8 }, context_limit: { value: 128000 } },
    },
  });
  const stage = result.stages.implement;
  const byRoute = new Map(stage.rows.map((row) => [row.route_id, row]));
  assert.equal(byRoute.get('p/a').rank, byRoute.get('p/b').rank, 'operational data does not create a quality rank');
  assert.equal(byRoute.get('p/a').operational.input_price.value, 0.2);
  assert.equal(stage.tie_groups[0].operational_tiebreak.status, 'cost-broke-tie');
  assert.deepEqual(stage.tie_groups[0].operational_tiebreak.cheapest, ['p/a']);
  assert.deepEqual(stage.tie_groups[0].operational_tiebreak.largest_context, ['p/a']);
});

test('a cheaper route with a lower capability score stays below the better route', () => {
  const config = { ...CONFIG, min_stage_separation: 0.01, stage_weights: { implement: { software_engineering: 1 } } };
  const result = run(rows(20), { candidates: ['p/a', 'p/b'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config, '2026-09-11T00:00:00.000Z', {
    source: '~/.pi/agent/models-store.json',
    read_at: '2026-09-12T00:00:00.000Z',
    routes: {
      'p/a': { input_price: { value: 0.01 }, output_price: { value: 0.01 }, context_limit: { value: 128000 } },
      'p/b': { input_price: { value: 9 }, output_price: { value: 9 }, context_limit: { value: 128000 } },
    },
  });
  const byRoute = new Map(result.stages.implement.rows.map((row) => [row.route_id, row]));
  assert.ok(byRoute.get('p/b').score > byRoute.get('p/a').score);
  assert.ok(byRoute.get('p/b').rank < byRoute.get('p/a').rank, 'cost must not override a score outside tie tolerance');
});

test('equal operational data leaves a quality tie unresolved', () => {
  const config = { ...CONFIG, min_stage_separation: 0.2, stage_weights: { implement: { software_engineering: 1 } } };
  const result = run(rows(20), { candidates: ['p/a', 'p/c'], stages: [{ task: 'implement', routes: [{ rank: 1, model_id: 'p/a' }] }] }, config, '2026-09-11T00:00:00.000Z', {
    source: '~/.pi/agent/models-store.json',
    read_at: '2026-09-12T00:00:00.000Z',
    routes: {
      'p/a': { input_price: { value: 0.2 }, output_price: { value: 1.2 }, context_limit: { value: 272000 } },
      'p/c': { input_price: { value: 0.2 }, output_price: { value: 1.2 }, context_limit: { value: 272000 } },
    },
  });
  const tie = result.stages.implement.tie_groups[0].operational_tiebreak;
  assert.equal(tie.status, 'unresolved');
  assert.match(tie.rationale, /unresolved tie/i);
});
