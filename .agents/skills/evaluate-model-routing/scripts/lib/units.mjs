// Unit construction. A unit is the only place where values are comparable:
// (benchmark, board, version, split, metric, harness class).

import { harnessClassFor } from './registry.mjs';

export function unitKeyOf(entry, harnessClass) {
  return [entry.id, entry.board, entry.version, entry.split, entry.metric, harnessClass].join('|');
}

/** Higher effort wins a tie: routing decisions name a reasoning configuration. */
function effortRank(effort, effortOrder) {
  if (effort === null || effort === undefined) return -1;
  const index = effortOrder.indexOf(String(effort));
  return index === -1 ? -1 : index;
}

function compareForChoice(a, b, effortOrder) {
  if ((a.date ?? '') !== (b.date ?? '')) return (b.date ?? '').localeCompare(a.date ?? '');
  if ((a.attempts ?? -1) !== (b.attempts ?? -1)) return (b.attempts ?? -1) - (a.attempts ?? -1);
  const effort = effortRank(b.effort, effortOrder) - effortRank(a.effort, effortOrder);
  if (effort !== 0) return effort;
  return String(a.modelKey).localeCompare(String(b.modelKey));
}

/**
 * @param {object} spec
 * @param {import('./registry.mjs').loadRegistry extends never ? never : any[]} spec.entries tier A registry entries
 * @param {any[]} spec.rows adapter rows, each tagged with a benchmark id
 * @param {{adapter: string, url: string, retrieved_at: string, sha256: string, adapter_version: number}} spec.snapshot
 * @param {string[]} spec.effortOrder
 */
export function buildUnits({ entries, rows, snapshot, effortOrder }) {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const groups = new Map();
  for (const row of rows) {
    const entry = entriesById.get(row.benchmark);
    if (!entry) throw new Error(`No registry entry for benchmark "${row.benchmark}"`);
    const { harnessClass, from } = harnessClassFor(entry, row.harnessLabel);
    const key = unitKeyOf(entry, harnessClass);
    if (!groups.has(key)) {
      groups.set(key, {
        unit_key: key,
        benchmark: entry.id,
        benchmark_name: entry.name,
        adapter: entry.adapter,
        board: entry.board,
        version: entry.version,
        split: entry.split,
        metric: entry.metric,
        metric_label: entry.metric_label ?? entry.metric,
        direction: entry.direction,
        harness_class: harnessClass,
        rows: [],
        snapshot,
      });
    }
    groups.get(key).rows.push({ ...row, harness_class_source: from });
  }

  const units = [];
  for (const unit of groups.values()) {
    const byModel = new Map();
    for (const row of unit.rows) {
      if (!byModel.has(row.modelKey)) byModel.set(row.modelKey, []);
      byModel.get(row.modelKey).push(row);
    }
    const population = [];
    const dedupe = [];
    for (const [modelKey, candidates] of byModel) {
      const sorted = [...candidates].sort((a, b) => compareForChoice(a, b, effortOrder));
      const [chosen, ...alternatives] = sorted;
      population.push(chosen);
      if (alternatives.length > 0) {
        dedupe.push({
          model_key: modelKey,
          chosen: { effort: chosen.effort, attempts: chosen.attempts, value: chosen.value },
          alternatives: alternatives.map((row) => ({ effort: row.effort, attempts: row.attempts, value: row.value })),
          rule: 'most recent date, then highest attempt count, then highest published reasoning effort',
        });
      }
    }
    population.sort((a, b) => String(a.modelKey).localeCompare(String(b.modelKey)));
    units.push({ ...unit, rows: undefined, raw_row_count: unit.rows.length, population, dedupe });
  }
  units.sort((a, b) => a.unit_key.localeCompare(b.unit_key));
  return units;
}
