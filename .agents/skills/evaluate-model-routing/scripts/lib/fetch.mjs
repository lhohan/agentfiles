// Fetch orchestration: one request per source, one snapshot per run, adapters
// return rows, units are built. A failing source is recorded, never hidden.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from './errors.mjs';
import { fetchText } from './http.mjs';
import { tierAByAdapter } from './registry.mjs';
import { getAdapter } from './sources/index.mjs';
import { buildUnits } from './units.mjs';

function snapshotStem(adapter, retrievedAt) {
  return `${adapter}@${retrievedAt.slice(0, 10)}T${retrievedAt.slice(11, 19).replace(/:/g, '')}Z`;
}

/**
 * @param {object} spec
 * @param {any} spec.config
 * @param {any} spec.registry
 * @param {string[]} [spec.sourceIds]
 * @param {string} spec.cacheDir
 */
export async function runFetch({ config, registry, sourceIds, cacheDir }) {
  const grouped = tierAByAdapter(registry);
  const selected = [...grouped.keys()].filter((adapter) => !sourceIds || sourceIds.length === 0 || sourceIds.includes(adapter));
  if (selected.length === 0) {
    throw new CliError({
      code: 'INVALID_INPUT',
      message: 'No tier A source matched the requested --sources filter',
      exit: 2,
      cause: `available: ${[...grouped.keys()].join(', ')}`,
      next: ['Run without --sources, or pass one of the available adapter ids.'],
    });
  }

  mkdirSync(cacheDir, { recursive: true });
  const units = [];
  const sources = [];
  const failures = [];

  for (const adapterId of selected) {
    const entries = grouped.get(adapterId);
    const urls = new Set(entries.map((entry) => entry.fetch_url));
    if (urls.size !== 1) {
      throw new CliError({
        code: 'REGISTRY_INVALID',
        message: `Adapter "${adapterId}" has entries with different fetch URLs`,
        exit: 2,
        cause: [...urls].join(', '),
        next: ['Give every entry of one adapter the same fetch_url, or split the adapter.'],
      });
    }
    const url = [...urls][0];
    try {
      const response = await fetchText(url);
      const adapter = getAdapter(adapterId);
      const { rows, meta } = adapter.parse(response.text, entries);
      const stem = snapshotStem(adapterId, response.retrievedAt);
      writeFileSync(join(cacheDir, `${stem}.raw`), response.text);
      writeFileSync(
        join(cacheDir, `${stem}.json`),
        `${JSON.stringify({ adapter: adapterId, adapter_version: adapter.adapter_version, url: response.url, retrieved_at: response.retrievedAt, sha256: response.sha256, bytes: response.text.length, meta }, null, 2)}\n`,
      );
      const snapshot = {
        adapter: adapterId,
        adapter_version: adapter.adapter_version,
        url: response.url,
        retrieved_at: response.retrievedAt,
        sha256: response.sha256,
      };
      for (const unit of buildUnits({ entries, rows, snapshot, effortOrder: config.effort_rank })) units.push(unit);
      sources.push({ adapter: adapterId, status: 'ok', url: response.url, retrieved_at: response.retrievedAt, sha256: response.sha256, bytes: response.text.length, meta, snapshot_file: `${stem}.raw` });
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      failures.push({ adapter: adapterId, code: error.code, message: error.message, cause: error.cause ?? null });
      sources.push({ adapter: adapterId, status: 'failed', url, code: error.code, message: error.message, cause: error.cause ?? null });
    }
  }

  return { units, sources, failures };
}
