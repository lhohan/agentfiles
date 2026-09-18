// CodeReviewBench adapter.
// Source: https://www.codereviewbench.com/api/leaderboard.json
//
// One row per ranked model. The publisher scores every model on one vendor
// harness with an LLM judge, and publishes no confidence interval: the payload
// carries a single F1 per model. The adapter therefore records uncertainty as
// null and the registry records the measured judge noise as a caveat.
//
// The bare host answers 307, so the fetch URL pins the www host.

import { sourceFailure } from '../errors.mjs';

export const id = 'codereviewbench';
export const adapter_version = 1;

// The publisher states that every ranked entry runs on its own review harness.
// The payload does not repeat the label per row, so the adapter supplies it and
// the registry maps it to a harness class.
const HARNESS_LABEL = 'kodus';

export function parse(raw, entries) {
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    throw sourceFailure('SOURCE_SCHEMA', 'CodeReviewBench payload is not JSON', error.message, [
      'Inspect the snapshot in scripts/cache/ and update scripts/lib/sources/codereviewbench.mjs.',
    ]);
  }
  if (!Array.isArray(doc.models) || doc.models.length === 0) {
    throw sourceFailure('SOURCE_SCHEMA', 'CodeReviewBench payload has no "models" array', `keys: ${Object.keys(doc).join(', ')}`, [
      'The source shape changed. Update the adapter before scoring.',
    ]);
  }
  const date = typeof doc.generatedAt === 'string' ? doc.generatedAt.slice(0, 10) : null;
  const rows = [];
  for (const model of doc.models) {
    if (typeof model.id !== 'string' || typeof model.name !== 'string' || typeof model.f1 !== 'number') {
      throw sourceFailure('SOURCE_SCHEMA', 'CodeReviewBench row is missing id, name, or f1', JSON.stringify(model).slice(0, 200), [
        'The source shape changed. Update the adapter before scoring.',
      ]);
    }
    for (const entry of entries) {
      rows.push({
        benchmark: entry.id,
        modelKey: model.id,
        modelDisplay: model.name,
        value: model.f1 / 100,
        attempts: 1,
        date,
        harnessLabel: HARNESS_LABEL,
        effort: null,
        uncertainty: null,
        caveat: null,
      });
    }
  }
  return {
    rows,
    meta: {
      generated_at: doc.generatedAt ?? null,
      publisher_rows: doc.models.length,
      measured_on: doc.measuredOn ?? null,
      publisher_metric: doc.metricDefinitions?.f1 ?? null,
    },
  };
}
