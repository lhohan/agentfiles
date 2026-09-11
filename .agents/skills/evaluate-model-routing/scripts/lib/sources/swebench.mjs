// SWE-bench leaderboard adapter.
// Source: raw data/leaderboards.json in SWE-bench/swe-bench.github.io (branch master).
//
// One payload serves several boards. Registry entries select a board by name.
// Only submissions the publisher marks as checked are used.

import { sourceFailure } from '../errors.mjs';

export const id = 'swebench-site';
export const adapter_version = 1;

export function parse(raw, entries) {
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    throw sourceFailure('SOURCE_SCHEMA', 'SWE-bench payload is not JSON', error.message, [
      'Inspect the snapshot in scripts/cache/ and update scripts/lib/sources/swebench.mjs.',
    ]);
  }
  if (!Array.isArray(doc.leaderboards) || doc.leaderboards.length === 0) {
    throw sourceFailure('SOURCE_SCHEMA', 'SWE-bench payload has no "leaderboards" array', `keys: ${Object.keys(doc).join(', ')}`, [
      'The source shape changed. Update the adapter before scoring.',
    ]);
  }
  const boards = new Map(doc.leaderboards.map((board) => [board.name, board]));
  const rows = [];
  const meta = { boards: {}, dropped_unchecked: 0 };
  for (const entry of entries) {
    const board = boards.get(entry.board);
    if (!board) {
      throw sourceFailure('SOURCE_SCHEMA', `SWE-bench payload has no "${entry.board}" board`, `boards: ${[...boards.keys()].join(', ')}`, [
        'Update the board name in references/benchmarks.json.',
      ]);
    }
    if (!Array.isArray(board.results)) {
      throw sourceFailure('SOURCE_SCHEMA', `SWE-bench "${entry.board}" board has no results array`, '', [
        'The source shape changed. Update the adapter before scoring.',
      ]);
    }
    let kept = 0;
    for (const result of board.results) {
      if (typeof result.resolved !== 'number') continue;
      if (result.checked === false) {
        meta.dropped_unchecked += 1;
        continue;
      }
      const tags = Array.isArray(result.tags) ? result.tags : [];
      const modelTag = tags.find((tag) => tag.startsWith('Model: '));
      const attemptTag = tags.find((tag) => tag.startsWith('System: Attempts - '));
      rows.push({
        benchmark: entry.id,
        modelKey: (modelTag ? modelTag.slice('Model: '.length) : result.model_display ?? result.name ?? '').toLowerCase(),
        modelDisplay: result.model_display ?? result.name ?? 'Undisclosed',
        value: result.resolved / 100,
        attempts: attemptTag ? Number.parseInt(attemptTag.slice('System: Attempts - '.length), 10) : null,
        date: result.date ?? null,
        harnessLabel: result.agent ?? 'Unknown agent',
        effort: result.reasoning_effort ?? null,
        uncertainty: null,
        caveat: modelTag ? null : 'publisher does not disclose the underlying model',
      });
      kept += 1;
    }
    meta.boards[entry.id] = { board: entry.board, results: board.results.length, kept };
  }
  return { rows, meta };
}
