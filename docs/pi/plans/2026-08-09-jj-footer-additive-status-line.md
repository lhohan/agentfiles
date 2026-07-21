# Plan: Migrate `jj-footer.ts` to an additive footer status line

## Goal

Replace the `setFooter`-based design in `agents/pi/.pi/agent/extensions/jj-footer.ts` — which reinstates Pi's built-in `FooterComponent` through a fake `session`/`modelRuntime` facade — with an additive `ctx.ui.setStatus("jj-footer", <label>)` design that leaves Pi's built-in footer fully intact and shows the Jujutsu label on a dedicated footer status line.

This implements the decision recorded in `docs/pi/cir/2026-08-09-jj-footer-additive-status-line.md`. The crash `TypeError: this.session.modelRuntime.isUsingSubscription is not a function` (Pi 0.84.1) becomes structurally impossible because the extension no longer builds a `modelRuntime` facade or calls `setFooter`.

## Assumptions

- Pi 0.84.1's `ctx.ui.setStatus(key, text)` renders all extension statuses on one shared footer line, sorted by key, alongside the built-in footer (verified in the bundle and `examples/extensions/status-line.ts`). The key `"jj-footer"` sorts it to a stable position.
- The existing jj state machinery (described below) is correct and worth keeping **verbatim**: `createJjStateController`'s exported surface (`getState`/`refresh`/`subscribe`/`isActive`/`dispose`) and internals — the single-pending debounce timer (`WATCH_DEBOUNCE_MS`), the in-flight guard with queued re-run loop (no lost updates), the error fallback state that still fires `notify()` (so `(unavailable)` is published instead of stale text), and dispose semantics (clears listeners, timer, and watcher) — are copied unchanged. Only the notification *consumer* changes: the subscriber callback that used to call `footerComponent.invalidate()` + `tui.requestRender()` now re-publishes via `setStatus`.
- Pi's `turn_end` event fires after agent actions and `fs.watch(.jj, { recursive: true })` catches metadata changes from any source; both are retained.
- `ctx.ui.setStatus(key, undefined)` clears a status entry (per the docs and bundle `setExtensionStatus`), used on `session_shutdown` and when no `.jj` is found.
- The residual `detached` label on the built-in footer's row 1 is accepted per the CIR and is out of scope for this change.
- Stow is the install path: `mise check pi` then `mise stow pi` to update `~/.pi/agent/extensions/jj-footer.ts`.

## Open questions

None blocking. Open-after-implementation: whether the single shared status line orders `jj-footer` acceptably relative to other statuses from installed extensions (e.g. `pi-prompt-template-model`, `pi-answer`); if not, tune the status key string for sort order only after observing real output.

## Plan

1. **Audit retained helpers.** From the current `jj-footer.ts`, identify the helpers that must be preserved unchanged because they produce the jj label and refresh it: the `JjState` types, `WATCH_DEBOUNCE_MS`, `findJjRoot`, `formatCount`, `parseJjBookmarkAnchor`, `classifyJjStatusLine`, `parseJjStatusCounts`, `readJjBookmarkInfo`, `readFileCounts`, `formatJjBranchLabel`, and the `createJjStateController` function. **Preservation contract: the refresh algorithm inside `createJjStateController` is copied verbatim, not rewritten.** Debounce (single-pending `WATCH_DEBOUNCE_MS` timer), in-flight guard with the queued re-run loop, error fallback that still notifies, watcher setup/teardown, and dispose are all unchanged; only the subscriber callback that consumes `notify()` changes (step 3). If an edit would touch any line inside `createJjStateController`, stop — that behavior must instead live in the subscriber.

2. **Delete the footer-reinstatement surface.** Remove from `jj-footer.ts`:
   - imports `FooterComponent` and `type ReadonlyFooterDataProvider` (the only items from `@earendil-works/pi-coding-agent` that are solely for the facade);
   - `import { existsSync, watch, type FSWatcher } from "node:fs";` stays; remove `dirname, join` if and only if no other use remains (audit first — `findJjRoot` and the watcher both use `join`/`dirname`, so they likely stay);
   - `createWrappedFooterData`;
   - `createModelRuntimeFacade` (the literal crash source);
   - `createFooterSessionShim`;
   - every call to `ctx.ui.setFooter(...)`.
   After the rewrite the `@earendil-works/pi-coding-agent` import keeps only `ExtensionAPI` (the `export default` signature); `ExtensionContext`, `FooterComponent`, and `ReadonlyFooterDataProvider` are all removed. Handler `ctx` parameters stay inferred from `pi.on`, so no explicit `ExtensionContext` annotation remains.

3. **Rewrite the `session_start` handler** to publish the label via `setStatus` instead of `setFooter`:
   - At the top, dispose any controller left over from a prior session (session switch/fork/reload can fire `session_start` without a `session_shutdown` first) — reuse the existing `clearController()`. Then clear the status key (`ctx.ui.setStatus("jj-footer", undefined)`) so no stale label survives the transition.
   - Call `findJjRoot(ctx.cwd)`.
   - If no `.jj` is found: return without creating a controller (the top-of-handler clear already handled the stale-entry case).
   - If found: create a `JjStateController` (existing `createJjStateController`, untouched) and subscribe. On every change, publish `ctx.ui.setStatus("jj-footer", <label>)` where `<label>` is `ctx.ui.theme.fg("dim", formatJjBranchLabel(controller.getState()))` — the dim wrap matches the built-in footer's dim rows and mirrors `examples/extensions/status-line.ts` (`sanitizeStatusText` only collapses whitespace, so ANSI styling survives). Skip the `setStatus` call when the label is unchanged from the last published value (every `setStatus` triggers `requestRender` in Pi). Track the last-published label in a `let` local **inside the `session_start` closure** — never at module scope, where a value left over from a previous session could suppress the new session's first publish after the top-of-handler clear. Both the immediate publish (below) and the subscriber callback must update this local.
   - Immediately after subscribing, publish the initial state (`(loading…)` + zero counts — already what `getState()` returns) so the line appears instantly instead of staying empty for the first refresh (~100 ms–2.5 s).
   - Then trigger the initial refresh: `void controller.refresh()`.

4. **Rewrite the `turn_end` handler** to `void activeController?.refresh()` — the controller's in-flight/queued refresh logic already coalesces repeated triggers. Delete the `requestRefresh` indirection entirely: it existed only to give the `setFooter` factory a dispose hook and to guard `turn_end`; with `setFooter` gone, `activeController` is the single source of truth.

5. **Rewrite the `session_shutdown` handler** to dispose the active controller via `clearController()` and call `ctx.ui.setStatus("jj-footer", undefined)` to clear the line (`session_shutdown` handlers receive a full ctx, so `ctx.ui` is available). Remove only the `requestRefresh = undefined` line; `clearController()` stays because both `session_start` (step 3) and `session_shutdown` need it.

6. **Keep refresh-driven re-render correct.** This is a confirm-only step — no code lives here. The `footerComponent.invalidate()` + `tui.requestRender()` calls exist only inside the setFooter factory deleted in steps 2–3 and disappear with it; there is no separate `activeTui`-style variable to hunt down. Confirm the new path renders on change: `setStatus` itself drives a footer re-render in Pi (the TUI-side `setExtensionStatus` calls `requestRender()` unconditionally, verified in the bundle), so no manual render call is needed. After the rewrite, the controller's `notify()` listeners must only re-publish the status text.

7. **Preserve the debounced-watcher refresh strategy.** The `fs.watch(join(jjRoot, ".jj"), { recursive: true }, scheduleRefresh)` path stays exactly as-is; it already routes through `refresh()`, which now ends in `setStatus` via the subscribe listener rather than `footerComponent.invalidate()`. The error path is also unchanged: a failed refresh still sets the `(unavailable)` fallback state and still fires `notify()`, so the status line shows `(unavailable)` instead of silently keeping stale text.

8. **Update the doc-sync checklist and the maintainer doc.** In `agents/pi/.pi/agent/extensions/jj-footer.md`:
   - Rewrite **Purpose** ("replaces Pi's detached-HEAD footer label" → additive status line), **Behaviour summary** (drop the "wrapped footer data provider" / `getGitBranch()` override description; describe the `setStatus("jj-footer", …)` publish-and-clear contract), and the **Before/After captions** (they describe the old inline row-1 label placement).
   - Replace the "Session shim" section (which documents the `FooterComponent` reuse and the `modelRuntime` façade) with a "Status line" section explaining the additive `setStatus("jj-footer", …)` contract, the per-session clear-on-shutdown, and the no-`setFooter` invariant.
   - Update the "Maintenance notes" list: drop "`modelRuntime` façade methods"; add the status key sort-order and the CIR reference.
   - Update the source-file doc-sync checklist header in `jj-footer.ts` (the block listing "footer label format/content / jj commands / status codes / refresh-watch/error-fallback") to add "status-line key and clear-on-shutdown contract" and to drop any facade reference.

9. **Recapture the before/after screenshots.** The existing `without-jj-footer.png` and `with-jj-footer.png` show the old inline-row-1 label placement and now misrepresent the additive-status-line design. They must be regenerated after the code change and stow, not before:
   - Keep the existing files in place until after step 10 so the *before* shot (`without-jj-footer.png`) is still reproducible by disabling the extension (or running in a non-jj repo).
   - After stow and verification (step 10), capture a new `with-jj-footer.png` from inside a jj repo showing the jj label on its dedicated status line alongside Pi's intact `cwd (detached) • sessionName` row 1 and token-stats row 2.
   - Capture a new `without-jj-footer.png` showing Pi's default footer in the same repo with the extension disabled (or a non-jj directory) so the contrast remains meaningful.
   - Reuse the existing filenames so `jj-footer.md`'s image links stay valid; do not add new filenames.
   - Reference the existing image link locations in `jj-footer.md` (the `![...](with-jj-footer.png)` / `![...](without-jj-footer.png)` blocks under the "### Before:" / "### After:" headings) and confirm the captions still match the new visuals after capture.

10. **Stow and verify.** Run `mise check pi` then `mise stow pi` so the symlinked `~/.pi/agent/extensions/jj-footer.ts` updates. Then verify (next step).

## Likely files

- Change: `agents/pi/.pi/agent/extensions/jj-footer.ts` (rewrite the footer-instatement path; delete facade/shim helpers; keep jj parsing/state).
- Change: `agents/pi/.pi/agent/extensions/jj-footer.md` (replace "Session shim" section; update maintenance notes; reference the CIR).
- Reference (no change): `docs/pi/cir/2026-08-09-jj-footer-additive-status-line.md` (the decision this plan implements).
- Reference (no change): `nix/store/.../pi-0.84.1/libexec/pi/examples/extensions/status-line.ts` and `custom-footer.ts` — public-API contracts to mirror.
- Recapture (binary overwrite, same filenames): `agents/pi/.pi/agent/extensions/with-jj-footer.png`, `agents/pi/.pi/agent/extensions/without-jj-footer.png` — old images show the inline row-1 label and misrepresent the additive status-line output.

## Task linkage

Plan saved at `docs/pi/plans/2026-08-09-jj-footer-additive-status-line.md`. If this work is tracked as a beads task, update that task with this path (`bd update <id> --description="Plan saved at docs/pi/plans/2026-08-09-jj-footer-additive-status-line.md"`).

## Risks

- **Status-line sort order surprises.** Multiple extensions share the footer status line; `jj-footer` may render adjacent to other extensions' statuses in an unanticipated order. Mitigation: observe real output post-stow; tune the key only if ordering is unreadable.
- **Line-length / truncation.** Pi truncates the status line to terminal width; a long bookmark name plus `+N ~N -N !N bookmark↑N` could be cut. Mitigation: the existing `formatCount` already shortens large numbers; rely on Pi's truncation and revisit if the ahead/count portions disappear in practice.
- **Stale status after `session_shutdown` without restart.** If a shutdown fires but the process keeps running (rare in TUI), the cleared key must remove the line. Mitigation: explicit `setStatus("jj-footer", undefined)` in the shutdown handler.
- **Watcher permission / recursive-watch portability.** Inherited from the current design and unchanged by this plan; not a new risk.
- **Dropped `(sub)` / token stats accuracy.** Not applicable — this change keeps Pi's built-in footer rendering those itself; we no longer touch that surface, so accuracy improves versus today's facade.

## Validation

- **Extension loads clean:** `cd ~/dev/agentfiles && pi` starts with no extension load error for `jj-footer` (syntax/type errors surface only at extension load — there is no tsconfig or typecheck task; `mise check pi` is a stow dry-run only, so this startup check is the compile gate).
- **Crash reprogression:** `cd ~/dev/agentfiles && pi` (a Jujutsu repo with extensions auto-discovered) starts with no `uncaughtException`. The pre-fix symptom is gone by construction (no `modelRuntime` facade is built).
- **Label visible:** The footer shows a line with the jj label (`+N ~N -N bookmark↑N` or just `bookmark`) separate from Pi's built-in `cwd (detached) • sessionName` row 1 and the token-stats row 2.
- **Live refresh via watcher (no interaction):** Run `jj new` (bookmark change) in another terminal and confirm the label updates within `WATCH_DEBOUNCE_MS` without any keypress in Pi — exercises `fs.watch` → `scheduleRefresh` → `refresh` → `setStatus`.
- **Live refresh via turn_end:** After an agent turn completes, confirm a working-copy change (`touch newfile`) is reflected in the label.
- **Instant initial label:** On session start in a jj repo, the status line shows the initial `(loading…)` label immediately, before the first refresh completes.
- **Failure fallback:** With `jj` temporarily unavailable (e.g. stripped `PATH`), the status line shows `(unavailable)` instead of stale counts, and recovers once `jj` is reachable again.
- **Non-jj passthrough:** `cd /tmp && pi` (no `.jj` upward) starts with no `jj-footer` status line and the default footer intact.
- **Shutdown clear:** Exit Pi and confirm no dangling status line on a subsequent session in the same terminal.
- **Doc consistency:** `jj-footer.md` no longer mentions `FooterComponent`, `modelRuntime`, façade, or `setFooter`; the doc-sync checklist matches the source.
- **Screenshots match behaviour:** `with-jj-footer.png` shows the jj label on a dedicated status line below the built-in footer rows; `without-jj-footer.png` shows the default footer without the jj line. Both are captured after the code change is live via the stowed symlink.
- **Stow integrity:** `mise check pi` passes before and after; `~/.pi/agent/extensions/jj-footer.ts` is the symlinked target of the updated source.