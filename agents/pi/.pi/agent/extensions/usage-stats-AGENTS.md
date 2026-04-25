# usage-stats Extension — Agent Instructions

This file contains agent-specific constraints for the usage-stats extension and its reporters.

## Scope

- `usage-stats.ts` — Pi extension that intercepts events and writes JSONL
- `bin/pi-usage-report` — terminal reporter
- `bin/pi-usage-report-html` — HTML report generator
- `bin/pi-usage-report-lib.mjs` — shared parsing library consumed by both reporters

## Rules

1. **Never add event handling directly in a reporter script.** Always route new events through `bin/pi-usage-report-lib.mjs` first. Both reporters import from it.

2. **Keep the shared library dependency-free.** It may only use Node.js built-ins (`node:fs`, `node:readline`, `node:path`). No npm packages.

3. **HTML reporter must remain self-contained.** The generated HTML must have zero external dependencies — all CSS and SVG are inline. No CDN scripts, no external fonts, no images.

4. **Preserve CLI reporter's filter semantics.** The `--event` flag filters during ingestion, not during display. This keeps `recent` and `Events matched` counts consistent with what the user asked for.

5. **Update the maintenance contract in `usage-stats.md`** whenever:
   - A new event type is added to `usage-stats.ts`
   - A reporter gains new visual treatment for an existing event
   - The shared library's API surface changes

6. **Badge colours in the HTML reporter are event-type specific.** When adding a new event that appears in the Recent Events table, define a `.badge.<event_name>` CSS rule with a distinct colour.

7. **Both reporters read from the same `STATS_PATH`.** Do not introduce alternative paths or configuration files without updating both reporters and this document.
