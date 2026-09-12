import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOperationalData } from '../lib/operational.mjs';

function store(models) {
  const dir = mkdtempSync(join(tmpdir(), 'emr-model-store-'));
  const path = join(dir, 'models-store.json');
  writeFileSync(path, JSON.stringify({
    'provider-a': { checkedAt: Date.parse('2026-09-12T00:00:00.000Z'), models },
  }));
  return path;
}

test('missing model store returns not-in-store markers without failing', () => {
  const data = loadOperationalData({ path: '/no/such/models-store.json', routes: ['provider-a/model-a'], readAt: '2026-09-12T00:00:00.000Z' });
  assert.equal(data.routes['provider-a/model-a'].input_price.value, 'not-in-store');
  assert.equal(data.routes['provider-a/model-a'].output_price.value, 'not-in-store');
  assert.equal(data.routes['provider-a/model-a'].context_limit.value, 'not-in-store');
  assert.equal(data.routes['provider-a/model-a'].input_price.source, '/no/such/models-store.json');
  assert.equal(data.routes['provider-a/model-a'].input_price.read_at, '2026-09-12T00:00:00.000Z');
});

test('a store that lists only some routes marks the other route explicitly', () => {
  const path = store([{ id: 'model-a', cost: { input: 0.2, output: 1.2 }, contextWindow: 128000 }]);
  const data = loadOperationalData({ path, routes: ['provider-a/model-a', 'provider-a/model-b'] });
  assert.equal(data.routes['provider-a/model-a'].input_price.value, 0.2);
  assert.equal(data.routes['provider-a/model-a'].output_price.value, 1.2);
  assert.equal(data.routes['provider-a/model-a'].context_limit.value, 128000);
  assert.equal(data.routes['provider-a/model-b'].context_limit.value, 'not-in-store');
});
