// Read-only HTTP helper. One retry on transient failure, hard timeout, content hash.

import { createHash } from 'node:crypto';
import { sourceFailure } from './errors.mjs';

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * @param {string} url
 * @param {{timeoutMs?: number, headers?: Record<string,string>}} [options]
 * @returns {Promise<{url: string, status: number, text: string, sha256: string, retrievedAt: string}>}
 */
export async function fetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const headers = { 'user-agent': 'agentfiles-evaluate-model-routing/1', ...(options.headers ?? {}) };
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        if (RETRY_STATUS.has(response.status) && attempt === 1) {
          lastError = `HTTP ${response.status}`;
          continue;
        }
        throw sourceFailure(
          'SOURCE_HTTP',
          `Source returned HTTP ${response.status}`,
          `${url}`,
          ['Retry later: the source may be rate limiting.', 'Confirm the URL in references/benchmarks.json is still correct.'],
        );
      }
      const text = await response.text();
      return {
        url: response.url || url,
        status: response.status,
        text,
        sha256: createHash('sha256').update(text).digest('hex'),
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error?.name === 'CliError') throw error;
      lastError = `${error.name}: ${error.message}`;
      if (attempt === 2) break;
    }
  }
  throw sourceFailure(
    'SOURCE_UNREACHABLE',
    'Could not reach the source',
    lastError ?? 'unknown network error',
    ['Check network connectivity and DNS resolution.', 'Retry: node scripts/evaluate.mjs fetch --manifest <file>'],
  );
}
