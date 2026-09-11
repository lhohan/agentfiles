// Settings file loader. references/config.json is the single machine-readable
// settings source: judges, weights, thresholds, and alias records.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { invalidInput } from './errors.mjs';

const TOP_LEVEL_KEYS = new Set([
  'config_version',
  'judges',
  'rank_threshold_coverage',
  'max_snapshot_age_days',
  'contested_tolerance',
  'effort_rank',
  'stage_weights',
  'benchmark_overrides',
  'model_aliases',
]);

function fail(message, cause, next) {
  return invalidInput(`Invalid settings file: ${message}`, cause, next);
}

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw fail(`${label} must be an object`);
  }
  return value;
}

function validateWeights(weights, label) {
  const out = requireObject(weights, label);
  let total = 0;
  for (const [id, weight] of Object.entries(out)) {
    if (typeof weight !== 'number' || !(weight > 0) || weight > 1) {
      throw fail(`${label}.${id} must be a number in (0, 1]`);
    }
    total += weight;
  }
  if (Math.abs(total - 1) > 1e-9) {
    throw fail(`${label} weights must sum to 1 (found ${total})`, 'Adjust references/config.json so each stage sums to 1.');
  }
  return out;
}

export function loadConfig(path) {
  const text = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw fail(`${path} is not valid JSON`, `Unexpected token: ${error.message}`);
  }
  requireObject(parsed, 'config');
  for (const key of Object.keys(parsed)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      throw fail(`Unknown top-level key "${key}" in ${path}`, `Allowed keys: ${[...TOP_LEVEL_KEYS].join(', ')}`);
    }
  }

  const judges = parsed.judges;
  if (!Array.isArray(judges) || judges.length === 0) {
    throw fail('config.judges must be a non-empty array');
  }
  for (const [index, judge] of judges.entries()) {
    requireObject(judge, `config.judges[${index}]`);
    if (typeof judge.model !== 'string' || judge.model.length === 0) {
      throw fail(`config.judges[${index}].model must be a non-empty string`);
    }
    if (typeof judge.thinking !== 'string' || judge.thinking.length === 0) {
      throw fail(`config.judges[${index}].thinking must be a non-empty string`);
    }
  }

  const threshold = parsed.rank_threshold_coverage;
  if (typeof threshold !== 'number' || threshold <= 0 || threshold > 1) {
    throw fail('config.rank_threshold_coverage must be a number in (0, 1]');
  }
  const maxAge = parsed.max_snapshot_age_days;
  if (!Number.isInteger(maxAge) || maxAge <= 0) {
    throw fail('config.max_snapshot_age_days must be a positive integer');
  }
  const tolerance = parsed.contested_tolerance;
  if (typeof tolerance !== 'number' || tolerance <= 0) {
    throw fail('config.contested_tolerance must be a positive number');
  }
  if (!Array.isArray(parsed.effort_rank) || parsed.effort_rank.some((v) => typeof v !== 'string')) {
    throw fail('config.effort_rank must be an array of strings, lowest effort first');
  }

  const stageWeights = requireObject(parsed.stage_weights, 'config.stage_weights');
  if (Object.keys(stageWeights).length === 0) throw fail('config.stage_weights must not be empty');
  for (const [stage, weights] of Object.entries(stageWeights)) {
    validateWeights(weights, `config.stage_weights.${stage}`);
  }

  const overrides = parsed.benchmark_overrides ?? {};
  requireObject(overrides, 'config.benchmark_overrides');
  for (const [id, override] of Object.entries(overrides)) {
    requireObject(override, `config.benchmark_overrides.${id}`);
    if (!Number.isInteger(override.max_snapshot_age_days) || override.max_snapshot_age_days <= 0) {
      throw fail(`config.benchmark_overrides.${id}.max_snapshot_age_days must be a positive integer`);
    }
    for (const key of Object.keys(override)) {
      if (key !== 'max_snapshot_age_days') {
        throw fail(`Unknown key "${key}" in config.benchmark_overrides.${id}`);
      }
    }
  }

  const aliases = parsed.model_aliases ?? [];
  if (!Array.isArray(aliases)) throw fail('config.model_aliases must be an array');
  const seen = new Map();
  for (const [index, alias] of aliases.entries()) {
    const label = `config.model_aliases[${index}]`;
    requireObject(alias, label);
    for (const key of ['route_id', 'source', 'source_name', 'canonical_release', 'evidence_scope']) {
      if (typeof alias[key] !== 'string' || alias[key].length === 0) {
        throw fail(`${label}.${key} must be a non-empty string`);
      }
    }
    if (!['model', 'agent-model-system', 'proxy-family'].includes(alias.evidence_scope)) {
      throw fail(`${label}.evidence_scope must be model, agent-model-system, or proxy-family`);
    }
    for (const key of Object.keys(alias)) {
      if (!['route_id', 'source', 'source_name', 'source_slug', 'canonical_release', 'evidence_scope', 'verified', 'note'].includes(key)) {
        throw fail(`Unknown key "${key}" in ${label}`);
      }
    }
    const key = `${alias.source}\u0000${alias.source_slug ?? normalizeName(alias.source_name)}`;
    const previous = seen.get(key);
    if (previous && previous.route_id !== alias.route_id) {
      // One published release can be reachable through several provider routes.
      // That is allowed only when every claim names the same release and scope.
      const sameRelease = aliases
        .filter((other) => other.source === alias.source && (other.source_slug ?? normalizeName(other.source_name)) === (alias.source_slug ?? normalizeName(alias.source_name)))
        .every((other) => other.canonical_release === alias.canonical_release && other.evidence_scope === alias.evidence_scope);
      if (!sameRelease || alias.evidence_scope !== 'model') {
        throw fail(
          `Alias collision: source "${alias.source}" name "${alias.source_name}" maps to two different claims`,
          `routes ${previous.route_id} and ${alias.route_id}; allowed only when both name one release with evidence_scope model`,
          ['Keep one route per published name, or give both routes the same canonical_release and evidence_scope.'],
        );
      }
    }
    seen.set(key, alias);
  }

  return {
    config_version: parsed.config_version ?? 1,
    judges,
    rank_threshold_coverage: threshold,
    max_snapshot_age_days: maxAge,
    contested_tolerance: tolerance,
    effort_rank: parsed.effort_rank,
    stage_weights: stageWeights,
    benchmark_overrides: overrides,
    model_aliases: aliases,
    _resolved: path,
    hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
  };
}

export function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Max snapshot age for one benchmark, honouring per-benchmark overrides. */
export function maxAgeFor(config, benchmarkId) {
  return config.benchmark_overrides[benchmarkId]?.max_snapshot_age_days ?? config.max_snapshot_age_days;
}

/** Resolve the alias record for one source row, or null. */
export function resolveAlias(config, { sourceIds, sourceSlug, sourceName }) {
  const keySlug = sourceSlug ?? '';
  const keyName = normalizeName(sourceName);
  for (const alias of config.model_aliases) {
    if (!sourceIds.includes(alias.source)) continue;
    const aliasSlug = alias.source_slug ?? normalizeName(alias.source_name);
    if ((keySlug && aliasSlug === keySlug) || aliasSlug === keyName) return alias;
  }
  return null;
}
