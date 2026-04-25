# Plan: agf-65b — Merge skill load reporting and deduplicate loaded skills

## Goal
Make the usage report present a single consolidated **loaded-skills** view, deduplicated so each skill is counted once even if loaded repeatedly or from multiple paths.

## Assumptions
- Primary scope is the HTML report, but shared collector semantics should remain coherent for both reporters.
- Deduplication should happen by normalized skill name, not raw path.
- Repeated `skill_loaded` events should contribute presence, not frequency.
- No new telemetry event type is needed; existing `skill_loaded` events are sufficient.

## Plan
1. **Refactor loaded-skill aggregation in the shared library**
   - Change `agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs` so loaded skills are tracked as a deduplicated identity set, keyed by normalized skill name.
   - Keep path normalization in one place so multiple install locations still collapse to the same skill.

2. **Define one reporter-facing loaded-skills representation**
   - Expose a clear derived form for reporters: unique loaded-skill names.
   - Avoid leaving reporters to infer uniqueness from raw per-event counts.

3. **Simplify the HTML report to one skill-loaded view**
   - Update `agents/pi/.pi/agent/bin/pi-usage-report-html` so skill-related presentation is anchored on the deduplicated loaded-skills data.
   - Remove or repurpose the current skill-related metric/section(s) that conflict with the “single loaded-skills view” goal.
   - Ensure the remaining skill display clearly communicates “loaded”, not “invoked”.

4. **Keep CLI output semantically aligned**
   - Review `agents/pi/.pi/agent/bin/pi-usage-report` after the shared-library change.
   - If its current “Top Skills Loaded (implicit)” table becomes misleading with all counts effectively flattened, adjust the label/format to reflect unique loaded skills rather than frequency.

5. **Update extension documentation**
   - Revise `agents/pi/.pi/agent/extensions/usage-stats.md` to describe the deduplicated loaded-skills behaviour and the updated report presentation.
   - Remove any wording that implies repeated loads are counted multiple times.

## Likely files
- `agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs`
- `agents/pi/.pi/agent/bin/pi-usage-report-html`
- `agents/pi/.pi/agent/bin/pi-usage-report`
- `agents/pi/.pi/agent/extensions/usage-stats.md`

## Risks
- Conflating **skills invoked** with **skills loaded** if labels are not precise.
- CLI reporter may look odd unless wording/formatting is updated alongside the shared-library change.
- Deduping by parent directory name assumes skill directory names are canonical identity.

## Validation
- Use a stats sample containing repeated loads and multi-path loads.
- Confirm the HTML report shows one loaded-skills view only, each skill once, with no duplicate inflation.
- Confirm the CLI reporter no longer implies repeated load frequency when data is unique-only.
- Confirm `usage-stats.md` matches the implemented behaviour.
