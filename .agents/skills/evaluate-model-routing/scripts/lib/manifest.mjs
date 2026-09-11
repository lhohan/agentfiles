// Run manifest loader. The skill authors the manifest after the profile gate;
// the script never parses profile Markdown or YAML.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { invalidInput } from './errors.mjs';

const DECISIONS = new Set(['keep', 'replace', 'add-secondary', 'add-tertiary', 'no-change', 'evidence-only']);

function fail(cause, next) {
  return invalidInput('Invalid run manifest', cause, next);
}

export function loadManifest(path) {
  const text = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw fail(`${path} is not valid JSON`, `Unexpected token: ${error.message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw fail('manifest must be a JSON object');
  }
  if (typeof parsed.agent !== 'string' || parsed.agent.length === 0) {
    throw fail('manifest.agent must be a non-empty string');
  }
  if (typeof parsed.run_slug !== 'string' || !/^[a-z0-9-]+$/.test(parsed.run_slug)) {
    throw fail('manifest.run_slug must be a lowercase slug of [a-z0-9-]', 'Example: "routing-refresh".');
  }
  if (typeof parsed.run_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.run_date)) {
    throw fail('manifest.run_date must be an ISO date (YYYY-MM-DD)');
  }
  if (!Array.isArray(parsed.enabled_models) || parsed.enabled_models.length === 0) {
    throw fail('manifest.enabled_models must be a non-empty array');
  }
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
    throw fail('manifest.candidates must be a non-empty array of provider/model-id strings');
  }
  if (!Array.isArray(parsed.stages) || parsed.stages.length === 0) {
    throw fail('manifest.stages must be a non-empty array');
  }
  const seenStages = new Set();
  for (const [index, stage] of parsed.stages.entries()) {
    const label = `manifest.stages[${index}]`;
    if (typeof stage.task !== 'string' || stage.task.length === 0) throw fail(`${label}.task must be a non-empty string`);
    if (seenStages.has(stage.task)) throw fail(`Duplicate stage task "${stage.task}"`);
    seenStages.add(stage.task);
    if (!Array.isArray(stage.routes) || stage.routes.length === 0) throw fail(`${label}.routes must be a non-empty array`);
    for (const route of stage.routes) {
      if (typeof route.model_id !== 'string' || route.model_id.length === 0) {
        throw fail(`${label}.routes[] entries need a non-empty model_id`);
      }
    }
  }

  const recommendations = parsed.recommendations ?? [];
  if (!Array.isArray(recommendations)) throw fail('manifest.recommendations must be an array');
  for (const [index, entry] of recommendations.entries()) {
    const label = `manifest.recommendations[${index}]`;
    if (typeof entry.task !== 'string' || entry.task.length === 0) throw fail(`${label}.task must be a non-empty string`);
    if (!DECISIONS.has(entry.decision)) {
      throw fail(`${label}.decision must be one of ${[...DECISIONS].join(', ')}`);
    }
    if (typeof entry.rationale !== 'string' || entry.rationale.length === 0) {
      throw fail(`${label}.rationale must be a non-empty string`, 'The renderer never invents a recommendation.');
    }
  }

  return {
    manifest_version: parsed.manifest_version ?? 1,
    agent: parsed.agent,
    profile: parsed.profile ?? null,
    profile_verified_at: parsed.profile_verified_at ?? null,
    run_date: parsed.run_date,
    run_slug: parsed.run_slug,
    enabled_models: parsed.enabled_models,
    candidates: parsed.candidates,
    stages: parsed.stages,
    recommendations,
    notes: parsed.notes ?? null,
    _resolved: path,
    hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
  };
}
