// Benchmark registry loader. references/benchmarks.json is the machine-readable
// mirror of references/benchmarks.md; a test asserts the two stay in step.

import { readFileSync } from 'node:fs';
import { invalidInput } from './errors.mjs';

const TIERS = new Set(['A', 'B', 'C']);
const ROLES = new Set(['primary', 'secondary', 'conditional', 'deprecated']);

export function loadRegistry(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw invalidInput('Invalid benchmark registry', `${path}: ${error.message}`);
  }
  if (!Array.isArray(parsed.benchmarks)) {
    throw invalidInput('Invalid benchmark registry', `${path}: "benchmarks" must be an array`);
  }
  const byId = new Map();
  for (const entry of parsed.benchmarks) {
    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      throw invalidInput('Invalid benchmark registry', 'Every entry needs a string id');
    }
    if (byId.has(entry.id)) {
      throw invalidInput('Invalid benchmark registry', `Duplicate benchmark id "${entry.id}"`);
    }
    if (!TIERS.has(entry.tier)) {
      throw invalidInput('Invalid benchmark registry', `${entry.id}: tier must be A, B, or C`);
    }
    if (entry.tier === 'A') {
      for (const key of ['adapter', 'board', 'version', 'split', 'metric', 'direction', 'fetch_url', 'source_url']) {
        if (typeof entry[key] !== 'string' || entry[key].length === 0) {
          throw invalidInput('Invalid benchmark registry', `${entry.id}: tier A entries need "${key}"`);
        }
      }
      if (!['higher', 'lower'].includes(entry.direction)) {
        throw invalidInput('Invalid benchmark registry', `${entry.id}: direction must be higher or lower`);
      }
      if (entry.harness_classes === undefined || typeof entry.harness_classes !== 'object') {
        throw invalidInput('Invalid benchmark registry', `${entry.id}: tier A entries need harness_classes`);
      }
    }
    for (const [capability, role] of Object.entries(entry.capabilities ?? {})) {
      if (!ROLES.has(role)) {
        throw invalidInput('Invalid benchmark registry', `${entry.id}.${capability}: role must be one of ${[...ROLES].join(', ')}`);
      }
    }
    byId.set(entry.id, entry);
  }
  return { benchmarks: parsed.benchmarks, byId };
}

export const ROLE_WEIGHTS = { primary: 1, secondary: 0.5 };

export function tierAByAdapter(registry) {
  const map = new Map();
  for (const entry of registry.benchmarks) {
    if (entry.tier !== 'A') continue;
    if (!map.has(entry.adapter)) map.set(entry.adapter, []);
    map.get(entry.adapter).push(entry);
  }
  return map;
}

/** Map a publisher harness label to a declared harness class, or "unmapped:<label>". */
export function harnessClassFor(entry, label) {
  const mapped = entry.harness_classes?.[label];
  if (typeof mapped === 'string' && mapped.length > 0) return { harnessClass: mapped, from: 'declared-map' };
  return { harnessClass: `unmapped:${label}`, from: 'unmapped' };
}
