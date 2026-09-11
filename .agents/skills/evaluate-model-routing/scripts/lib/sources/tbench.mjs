// Terminal-Bench v2.1 adapter.
// Source page: https://www.tbench.ai/leaderboard/terminal-bench/2.1
//
// The page is a Next.js server component. Its React Server Component flight
// payload carries the leaderboard rows as a JSON array. The adapter reads that
// array directly: no JavaScript runtime, no authentication, no pagination.
// A shape change fails loudly instead of producing a partial board.

import { sourceFailure } from '../errors.mjs';

export const id = 'tbench';
export const adapter_version = 1;

const FLIGHT_CHUNK = /self\.__next_f\.push\(\[1,(".*?")\]\)/gs;

function decodeFlightPayload(html) {
  const chunks = [...html.matchAll(FLIGHT_CHUNK)].map((match) => match[1]);
  if (chunks.length === 0) {
    throw sourceFailure('SOURCE_SCHEMA', 'Terminal-Bench page has no RSC flight payload', 'no self.__next_f.push([1,...]) chunks found', [
      'The site changed its rendering. Update scripts/lib/sources/tbench.mjs.',
    ]);
  }
  return chunks
    .map((chunk) => {
      try {
        return JSON.parse(chunk);
      } catch {
        return '';
      }
    })
    .join('');
}

function extractJsonArray(text, key) {
  const marker = text.indexOf(`"${key}":[`);
  if (marker === -1) {
    throw sourceFailure('SOURCE_SCHEMA', `Terminal-Bench payload has no "${key}" array`, '', [
      'The site changed its payload. Update scripts/lib/sources/tbench.mjs.',
    ]);
  }
  const start = text.indexOf('[', marker);
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  throw sourceFailure('SOURCE_SCHEMA', `Terminal-Bench payload "${key}" array is unterminated`, '', [
    'The site changed its payload. Update scripts/lib/sources/tbench.mjs.',
  ]);
}

export function parse(raw, entries) {
  const payload = decodeFlightPayload(raw);
  const rows = extractJsonArray(payload, 'rows');
  if (rows.length === 0) {
    throw sourceFailure('SOURCE_SCHEMA', 'Terminal-Bench leaderboard is empty', '', ['Check the source page manually.']);
  }
  const parsed = [];
  for (const row of rows) {
    const metadata = row.metadata ?? {};
    const metrics = row.metrics ?? {};
    const modelDisplay = metadata.model_display?.label;
    const agentDisplay = metadata.agent_display?.label;
    if (typeof modelDisplay !== 'string' || typeof metrics.accuracy !== 'number' || typeof agentDisplay !== 'string') {
      throw sourceFailure('SOURCE_SCHEMA', 'Terminal-Bench row is missing model_display.label, agent_display.label, or metrics.accuracy', JSON.stringify(row).slice(0, 200), [
        'The source shape changed. Update the adapter before scoring.',
      ]);
    }
    const halfWidth = typeof metrics.accuracy_ci95_half_width === 'number' ? metrics.accuracy_ci95_half_width / 100 : null;
    const value = metrics.accuracy / 100;
    for (const entry of entries) {
      parsed.push({
        benchmark: entry.id,
        modelKey: modelDisplay.toLowerCase().replace(/[^a-z0-9.]+/g, '-'),
        modelDisplay,
        value,
        attempts: Number.isInteger(metrics.n_trials) ? metrics.n_trials : null,
        date: metadata.date ?? null,
        harnessLabel: agentDisplay,
        effort: metadata.reasoning_effort ?? null,
        uncertainty: halfWidth === null ? null : { kind: 'ci95', lo: Math.max(0, value - halfWidth), hi: Math.min(1, value + halfWidth), method: '95% CI half width published as accuracy_ci95_half_width' },
        caveat: null,
      });
    }
  }
  return {
    rows: parsed,
    meta: {
      publisher_rows: rows.length,
      publisher_note: 'Rows group one agent+model+effort configuration each; n_trials is published per row.',
    },
  };
}
