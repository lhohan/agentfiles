// Registry consistency: benchmarks.json mirrors benchmarks.md, every alias
// route uses a registered provider, and every tier A source records a probe.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { loadConfig } from '../lib/config.mjs';
import { loadRegistry } from '../lib/registry.mjs';

const skillDir = resolve(import.meta.dirname, '..', '..');
const references = join(skillDir, 'references');
const registry = loadRegistry(join(references, 'benchmarks.json'));
const config = loadConfig(join(references, 'config.json'));
const benchmarksDoc = readFileSync(join(references, 'benchmarks.md'), 'utf8');
const providersDoc = readFileSync(join(references, 'providers.md'), 'utf8');

test('every registry entry has a section in benchmarks.md', () => {
  for (const entry of registry.benchmarks) {
    assert.ok(benchmarksDoc.includes(`\`${entry.id}\``), `benchmarks.md must mention the id ${entry.id}`);
  }
});

test('benchmarks.md documents every framework named in the task inventory', () => {
  const inventory = [
    'deepswe',
    'tbench-v2.1',
    'contextbench',
    'swe-atlas',
    'swebench-promax',
    'swebench-multilingual',
    'swebench-pro',
    'swebench-verified',
    'c-crab',
    'cr-bench',
    'cybergym',
    'ifbench',
    'multichallenge',
    'aider-polyglot',
    'artificial-analysis',
    'lmarena',
    'swebench-multimodal',
    'mmmu',
    'docvqa',
  ];
  const registryIds = new Set(registry.benchmarks.map((entry) => entry.id));
  assert.deepEqual([...registryIds].sort(), [...inventory].sort());
});

test('every tier A source records a probe result', () => {
  for (const entry of registry.benchmarks.filter((entry) => entry.tier === 'A')) {
    assert.ok(entry.probe?.command, `${entry.id} needs a probe command`);
    assert.ok(entry.probe?.result, `${entry.id} needs a probe result`);
    assert.ok(entry.caveats?.length > 0, `${entry.id} needs at least one caveat`);
  }
});

test('tier B and C entries state why they are not fetched', () => {
  for (const entry of registry.benchmarks.filter((entry) => entry.tier !== 'A')) {
    assert.ok(entry.reason, `${entry.id} needs a reason`);
    assert.equal(entry.adapter, undefined, `${entry.id} must not declare an adapter`);
  }
});

test('every alias route id uses a provider prefix from providers.md', () => {
  const prefixes = new Set([...providersDoc.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((match) => match[1]));
  assert.ok(prefixes.size > 0, 'providers.md must list provider prefixes');
  for (const alias of config.model_aliases) {
    const prefix = alias.route_id.split('/')[0];
    assert.ok(prefixes.has(prefix), `alias ${alias.route_id} uses provider ${prefix}, which providers.md does not list`);
  }
});

test('every alias names a source that exists in the registry', () => {
  for (const alias of config.model_aliases) {
    assert.ok(registry.byId.has(alias.source), `alias source ${alias.source} is not a benchmark id`);
  }
});

test('stage weights cover every capability that capabilities.md documents', () => {
  const capabilityDoc = readFileSync(join(references, 'capabilities.md'), 'utf8');
  const documented = new Set([...capabilityDoc.matchAll(/^## ([a-z_]+)$/gm)].map((match) => match[1]));
  const weighted = new Set(Object.values(config.stage_weights).flatMap((weights) => Object.keys(weights)));
  for (const capability of documented) {
    assert.ok(weighted.has(capability), `capabilities.md documents ${capability}, but no stage weights it`);
  }
});
