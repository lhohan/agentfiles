// DeepSWE v1.1 adapter.
// Source: https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json
//
// One row per (model, harness, reasoning effort). The adapter emits values on a
// 0..1 scale and keeps the published CI so the scorer can record uncertainty.

import { sourceFailure } from '../errors.mjs';

export const id = 'deepswe';
export const adapter_version = 1;

export function parse(raw, entries) {
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    throw sourceFailure('SOURCE_SCHEMA', 'DeepSWE payload is not JSON', error.message, [
      'Inspect the snapshot in scripts/cache/ and update scripts/lib/sources/deepswe.mjs.',
    ]);
  }
  if (!Array.isArray(doc.rows) || doc.rows.length === 0) {
    throw sourceFailure('SOURCE_SCHEMA', 'DeepSWE payload has no "rows" array', `keys: ${Object.keys(doc).join(', ')}`, [
      'The source shape changed. Update the adapter before scoring.',
    ]);
  }
  const rows = [];
  for (const row of doc.rows) {
    if (typeof row.model !== 'string' || typeof row.pass_at_1 !== 'number' || typeof row.harness !== 'string') {
      throw sourceFailure('SOURCE_SCHEMA', 'DeepSWE row is missing model, harness, or pass_at_1', JSON.stringify(row).slice(0, 200), [
        'The source shape changed. Update the adapter before scoring.',
      ]);
    }
    for (const entry of entries) {
      rows.push({
        benchmark: entry.id,
        modelKey: row.model.toLowerCase(),
        modelDisplay: row.model,
        value: row.pass_at_1,
        attempts: Number.isInteger(row.n_runs) ? row.n_runs : (row.n_attempted ?? null),
        date: typeof doc.generated_at === 'string' ? doc.generated_at.slice(0, 10) : null,
        harnessLabel: row.harness,
        effort: row.reasoning_effort ?? null,
        uncertainty:
          typeof row.ci_lo === 'number' && typeof row.ci_hi === 'number'
            ? { kind: 'ci95', lo: row.ci_lo, hi: row.ci_hi, method: row.ci_method ?? null }
            : null,
        caveat: row.cost_basis ? 'publisher records a cost basis for this row' : null,
      });
    }
  }
  return {
    rows,
    meta: {
      generated_at: doc.generated_at ?? null,
      n_tasks_in_set: doc.n_tasks_in_set ?? null,
      publisher_scope: doc.scope ?? null,
      publisher_unit: doc.unit ?? null,
    },
  };
}
