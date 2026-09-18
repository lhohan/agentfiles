// Adapter tests: fixture parsing and loud failure on shape change.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as codereviewbench from '../lib/sources/codereviewbench.mjs';
import * as deepswe from '../lib/sources/deepswe.mjs';
import * as swebench from '../lib/sources/swebench.mjs';
import * as tbench from '../lib/sources/tbench.mjs';

const fixtures = join(import.meta.dirname, 'fixtures');
const read = (name) => readFileSync(join(fixtures, name), 'utf8');

test('deepswe parses rows with CI and effort', () => {
  const { rows, meta } = deepswe.parse(read('deepswe.sample.json'), [{ id: 'deepswe' }]);
  assert.ok(rows.length >= 4);
  const sol = rows.find((row) => row.modelKey === 'gpt-5-6-sol' && row.effort === 'max');
  assert.equal(sol.benchmark, 'deepswe');
  assert.equal(sol.harnessLabel, 'mini-swe-agent');
  assert.ok(sol.value > 0 && sol.value < 1, 'value is normalised to 0..1');
  assert.equal(sol.uncertainty.kind, 'ci95');
  assert.equal(meta.n_tasks_in_set > 0, true);
});

test('deepswe rejects a payload without rows', () => {
  assert.throws(
    () => deepswe.parse(JSON.stringify({ nope: true }), [{ id: 'deepswe' }]),
    (error) => error.code === 'SOURCE_SCHEMA' && error.exit === 3,
  );
});

test('deepswe rejects a row with a missing field', () => {
  assert.throws(
    () => deepswe.parse(JSON.stringify({ rows: [{ model: 'x', harness: 'h' }] }), [{ id: 'deepswe' }]),
    (error) => error.code === 'SOURCE_SCHEMA',
  );
});

test('swebench parses the requested board only and drops unchecked rows', () => {
  const { rows, meta } = swebench.parse(read('swebench.sample.json'), [{ id: 'swebench-multilingual', board: 'Multilingual' }]);
  assert.ok(rows.length > 0);
  assert.equal(rows.every((row) => row.benchmark === 'swebench-multilingual'), true);
  assert.equal(Math.max(...rows.map((row) => row.value)) <= 1, true, 'resolved percentages become 0..1');
  assert.equal(meta.boards['swebench-multilingual'].board, 'Multilingual');
  assert.equal(typeof meta.dropped_unchecked, 'number');
});

test('swebench rejects an unknown board', () => {
  assert.throws(
    () => swebench.parse(read('swebench.sample.json'), [{ id: 'x', board: 'Missing' }]),
    (error) => error.code === 'SOURCE_SCHEMA',
  );
});

test('tbench reads rows out of the RSC flight payload', () => {
  const { rows } = tbench.parse(read('tbench.sample.html'), [{ id: 'tbench-v2.1' }]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].benchmark, 'tbench-v2.1');
  assert.equal(rows[0].uncertainty.kind, 'ci95');
  assert.ok(rows[0].value > 0 && rows[0].value < 1);
});

test('codereviewbench parses ranked models and normalises F1 to 0..1', () => {
  const { rows, meta } = codereviewbench.parse(read('codereviewbench.sample.json'), [{ id: 'codereviewbench' }]);
  assert.equal(rows.length, 3);
  const pro = rows.find((row) => row.modelKey === 'deepseek-v4-pro');
  assert.equal(pro.benchmark, 'codereviewbench');
  assert.equal(pro.harnessLabel, 'kodus');
  assert.equal(pro.value, 0.439, 'the payload publishes F1 as a percentage');
  assert.equal(pro.attempts, 1, 'the publisher runs one review pass per model');
  assert.equal(pro.uncertainty, null, 'the payload publishes no confidence interval');
  assert.equal(pro.date, '2026-09-11');
  assert.equal(meta.publisher_rows, 3);
  assert.equal(meta.measured_on.confirmedBugs, 95);
});

test('codereviewbench rejects a payload without models', () => {
  assert.throws(
    () => codereviewbench.parse(JSON.stringify({ generatedAt: '2026-09-11T00:00:00.000Z' }), [{ id: 'codereviewbench' }]),
    (error) => error.code === 'SOURCE_SCHEMA' && error.exit === 3,
  );
});

test('codereviewbench rejects a row with a missing field', () => {
  assert.throws(
    () => codereviewbench.parse(JSON.stringify({ models: [{ id: 'x', name: 'X' }] }), [{ id: 'codereviewbench' }]),
    (error) => error.code === 'SOURCE_SCHEMA',
  );
});

test('tbench fails loudly when the payload shape changes', () => {
  assert.throws(
    () => tbench.parse('<html><body>no payload</body></html>', [{ id: 'tbench-v2.1' }]),
    (error) => error.code === 'SOURCE_SCHEMA',
  );
  const empty = '<script>self.__next_f=self.__next_f||[];self.__next_f.push([1,"{\\"rows\\":[]}"]);</script>';
  assert.throws(
    () => tbench.parse(empty, [{ id: 'tbench-v2.1' }]),
    (error) => error.code === 'SOURCE_SCHEMA',
  );
});
