# Plan: agf-6np — Remove prompt resources discovered metric from HTML report

## Goal
Remove the prompt-resources-discovered metric from both the HTML and CLI usage reports, and remove the now-dead `resources_discovered` event emission, collector handling, and documentation.

## Assumptions
- The `resources_discovered` event is no longer consumed by any reporter, so the extension should stop emitting it.
- The `refreshPromptIndex` helper is still needed elsewhere (prompt invocation detection), so it stays.
- Dead code in the shared collector should be cleaned up rather than left behind.

## Plan
1. **Remove the HTML metric card**
   - Update `agents/pi/.pi/agent/bin/pi-usage-report-html` to stop rendering the metric card that displays `counters.resourcesDiscovered.prompts`.
   - Keep the surrounding metrics grid intact so the remaining cards reflow naturally with no placeholder.

2. **Remove the CLI metric line**
   - Update `agents/pi/.pi/agent/bin/pi-usage-report` to stop printing the `Prompt resources discovered (cumulative)` line.

3. **Clean up the shared collector**
   - Remove the `resourcesDiscovered` counter and the `resources_discovered` event handling case from `agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs`.

4. **Remove the event emission from the extension**
   - Delete the `pi.on("resources_discover", ...)` handler from `agents/pi/.pi/agent/extensions/usage-stats.ts`.
   - Keep `refreshPromptIndex` intact (used in `session_start`, `input`, and `before_agent_start`).

5. **Update documentation**
   - Remove the `resources_discovered` row from the event table in `agents/pi/.pi/agent/extensions/usage-stats.md`.

## Likely files
- `agents/pi/.pi/agent/bin/pi-usage-report-html`
- `agents/pi/.pi/agent/bin/pi-usage-report`
- `agents/pi/.pi/agent/bin/pi-usage-report-lib.mjs`
- `agents/pi/.pi/agent/extensions/usage-stats.ts`
- `agents/pi/.pi/agent/extensions/usage-stats.md`

## Risks
- Removing the wrong metric card could unintentionally change another summary metric.
- The `resources_discover` Pi event handler also called `refreshPromptIndex`; removing it shifts the first refresh to lazily on first use. This is safe because `session_start` also refreshes the index.

## Validation
- Confirm `grep -r resources_discovered agents/pi/.pi/agent` returns no matches.
- Confirm the HTML report no longer contains a `Prompts Discovered` metric card.
- Confirm the CLI report no longer prints the cumulative prompt-discovery count.
- Confirm `usage-stats.md` no longer lists `resources_discovered` in the event table.
