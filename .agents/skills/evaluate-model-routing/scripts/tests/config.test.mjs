// Settings validation: weights, unknown keys, and strict alias records.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig, resolveAlias } from '../lib/config.mjs';

const dir = mkdtempSync(join(tmpdir(), 'emr-config-'));

function write(name, value) {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

const BASE = {
  judges: [{ model: 'judge/model', thinking: 'high' }],
  rank_threshold_coverage: 0.5,
  max_snapshot_age_days: 30,
  contested_tolerance: 0.05,
  effort_rank: ['low', 'high'],
  stage_weights: { implement: { software_engineering: 1 } },
  benchmark_overrides: {},
  model_aliases: [],
};

const withAliases = (aliases) => ({ ...BASE, model_aliases: aliases });

test('a valid settings file loads and hashes', () => {
  const config = loadConfig(write('valid.json', BASE));
  assert.equal(config.hash.length, 16);
  assert.equal(config.stage_weights.implement.software_engineering, 1);
});

test('stage weights must sum to one', () => {
  const path = write('weights.json', { ...BASE, stage_weights: { implement: { software_engineering: 0.5 } } });
  assert.throws(() => loadConfig(path), (error) => error.code === 'INVALID_INPUT' && /sum to 1/.test(error.message));
});

test('unknown top-level keys are rejected', () => {
  const path = write('unknown.json', { ...BASE, extra: true });
  assert.throws(() => loadConfig(path), (error) => /Unknown top-level key/.test(error.message));
});

test('one source name may not claim two different releases', () => {
  const path = write('ambiguous.json', withAliases([
    { route_id: 'p/a', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/b', source: 'bench', source_name: 'a', canonical_release: 'b', evidence_scope: 'model' },
  ]));
  assert.throws(() => loadConfig(path), (error) => /Alias collision/.test(error.message));
});

test('a family-level claim on one name is always rejected when duplicated', () => {
  const path = write('family.json', withAliases([
    { route_id: 'p/a', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'proxy-family' },
    { route_id: 'p/b', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'proxy-family' },
  ]));
  assert.throws(() => loadConfig(path), (error) => /Alias collision/.test(error.message));
});

test('one published release may be served by several provider routes', () => {
  const path = write('multi.json', withAliases([
    { route_id: 'p/a', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'model' },
    { route_id: 'p/b', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'model' },
  ]));
  const config = loadConfig(path);
  const alias = resolveAlias(config, { sourceIds: ['bench'], sourceSlug: 'a', sourceName: 'A' });
  assert.equal(alias.route_id, 'p/a');
});

test('an unknown alias key is rejected', () => {
  const path = write('key.json', withAliases([
    { route_id: 'p/a', source: 'bench', source_name: 'a', canonical_release: 'a', evidence_scope: 'model', extra: 1 },
  ]));
  assert.throws(() => loadConfig(path), (error) => /Unknown key "extra"/.test(error.message));
});

test('alias source matching is scoped to the benchmark or adapter id', () => {
  const path = write('scope.json', withAliases([
    { route_id: 'p/a', source: 'deepswe', source_name: 'a', source_slug: 'a', canonical_release: 'a', evidence_scope: 'model' },
  ]));
  const config = loadConfig(path);
  assert.equal(resolveAlias(config, { sourceIds: ['tbench-v2.1'], sourceSlug: 'a', sourceName: 'a' }), null);
  assert.notEqual(resolveAlias(config, { sourceIds: ['deepswe'], sourceSlug: 'a', sourceName: 'a' }), null);
});

test('an invalid judge entry is rejected', () => {
  const path = write('judge.json', { ...BASE, judges: [{ model: 'x' }] });
  assert.throws(() => loadConfig(path), (error) => /thinking/.test(error.message));
});
