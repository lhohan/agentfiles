# Plan: qv9 — Improve CLI report view clarity

## Goal
Make the CLI usage report easier to scan by improving visual hierarchy, spacing, and alignment in `pi-usage-report`, without changing any underlying counters, metrics, filtering behaviour, or report content.

## Assumptions
- Scope is the CLI presentation layer; no telemetry changes.
- Existing sections remain semantically the same: summary metrics, per-category tables, and optional recent events.
- Dependency-free and terminal-portable; no npm packages.
- `usage-stats.md` must be updated per the maintenance contract.

## Plan
1. Refactor CLI rendering into clearer presentation helpers (header, summary block, section headings, tables, recent-events).
2. Reorganise the report into explicit visual sections with consistent spacing and separators.
3. Tighten alignment and heading consistency without changing values or semantics.
4. Make recent-events output easier to read with clearer field separation.
5. Update `usage-stats.md` to reflect the revised CLI reporter presentation.

## Likely files
- `agents/pi/.pi/agent/bin/pi-usage-report`
- `agents/pi/.pi/agent/extensions/usage-stats.md`
- `agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs` — inspection only

## Risks
- Cosmetic refactor could accidentally alter output semantics around `--event`, `--recent`, or `--top`.
- Existing ad hoc scraping scripts may depend on current text layout.

## Validation
- Same counts before/after against identical stats file.
- `--event`, `--top`, `--recent` flags retain correct semantics.
- `usage-stats.md` matches revised CLI presentation.
