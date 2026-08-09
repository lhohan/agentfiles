# CIR: JJ Footer as an Additive Status-Line Line

## Intent

Show Jujutsu working-copy and bookmark stats in the Pi footer without replacing Pi's built-in footer component. The jj label lives on its own footer line via `ctx.ui.setStatus()`, and Pi keeps rendering its stock footer (cwd/branch, token stats, context %, model, extension statuses) untouched.

This replaces the previous `jj-footer.ts` design, which called `ctx.ui.setFooter()` to swap the entire built-in `FooterComponent` for a re-instantiated copy with a patched branch label.

## Behavior

GIVEN Pi runs inside a Jujutsu repository (a `.jj/` directory exists at or above `cwd`)
WHEN the session starts, a turn ends, or `.jj/` metadata changes on disk
THEN the extension:
- computes a jj label containing the nearest bookmark name, commits ahead of that bookmark (`↑N`), the short change ID of the working-copy commit (`@…`), and the working-copy state — explicit `clean` or file counts (`+`, `~`, `-`, `!`)
- publishes it with `ctx.ui.setStatus("jj-footer", <label>)`

GIVEN the jj label changes
WHEN a refresh completes
THEN the extension updates the same status key so Pi's footer re-renders the new text on the status line

GIVEN Pi runs outside a Jujutsu repository
WHEN `session_start` fires and no `.jj/` is found upward from `cwd`
THEN the extension never calls `setFooter` or `setStatus` for the jj key and Pi's default footer is fully unchanged

GIVEN a Pi upgrade changes the built-in footer renderer
WHEN the new Pi version starts
THEN the extension does not crash, because it touches no internal footer/session/modelRuntime surface

## Constraints

- **No internal facade:** The extension must not reconstruct `session.modelRuntime`, `state`, or any other object the built-in `FooterComponent` reads. Pi does not expose the real `modelRuntime` to extensions, so any facade is a hand-curated allow-list that breaks silently or loudly when Pi's footer starts calling new methods.
- **No `setFooter`:** Calling `setFooter(factory)` removes Pi's built-in footer entirely; the factory's component becomes the whole footer. Any visual swap of one footer token therefore forces owning the entire footer renderer, which is the fragility we are eliminating.
- **Additive only:** `ctx.ui.setStatus(key, text)` is the only footer API that composes with the built-in footer instead of replacing it. Pi renders all extension statuses on a shared footer line, sorted by key.
- **Residual `detached` label is accepted:** Because the built-in footer still renders row 1 (`cwd (branch) • sessionName`), it will continue to show `detached` for the git branch in a jj repo. This is the explicit trade for crash-proofness and zero duplicated renderer. A future dedicated jj block on row 1 is not possible without `setFooter`.
- **Keep the existing jj state machinery:** The dual refresh strategy (`turn_end` event + `fs.watch` on `.jj/`) and the `jj log`/`jj status` parsing already in `jj-footer.ts` are retained; only the footer reinstatement path (`setFooter` + `FooterComponent` + `modelRuntime`/`session` shims) is removed.

## Decisions

- **Use `ctx.ui.setStatus("jj-footer", label)` and never call `setFooter`** because it is the only footer-touching API that composes with Pi's built-in footer instead of replacing it, eliminating the fake-session and fake-`modelRuntime` facades that kept breaking across Pi upgrades.
- **Rejected: keep calling `setFooter` and re-instantiate `FooterComponent`** because it requires a fake `session` and `modelRuntime` facade; Pi does not expose `modelRuntime` to extensions, so the facade is an incomplete allow-list that breaks whenever `FooterComponent` starts calling a new `modelRuntime`/`session` member. This is what caused the `TypeError: this.session.modelRuntime.isUsingSubscription is not a function` crash on Pi 0.84.1.
- **Rejected: `setFooter` + self-render the full footer from public `ctx.*`** because it duplicates ~150 LoC of bundled footer rendering (token formatting, truncation, theme, context %, experimental badge) that must be hand-synced on every Pi upgrade and silently drifts when Pi adds new footer stats. The `(sub)` cost suffix additionally requires reconstructing `isUsingSubscription` from `ctx.modelRegistry`, reintroducing a (smaller) facade.
- **Rejected: `setFooter(() => new EmptyFooter())` + draw into the editor border via `setEditorComponent`** (the `border-status-editor.ts` pattern) because it suppresses Pi's footer stats entirely and is far more invasive than the single additive line we need.
- **Rejected: a `Proxy`-hardened facade returning `() => false` for unknown `modelRuntime`/`session` members** because it patches the crash class but keeps the fake-session surface and still ties us to `FooterComponent`'s evolution; statuses would silently render as missing instead of crashing, which is a worse failure mode for a status footer than a loud crash fixed in seconds.
- **Accept the residual `detached` row-1 label** because removing it is only achievable via `setFooter`, and the whole point of this change is to stop replacing the built-in footer.
- **Rejected (re-evaluated 2026-08-09): move the jj status line to the top/first footer row.** We investigated whether the jj label could render above Pi's built-in rows (`cwd (branch) • sessionName` and token stats). It cannot without `setFooter`: Pi 0.84.1's built-in footer renderer hardcodes the row order (`lines = [pwdLine, statsLine]` with all extension statuses unconditionally appended as the last row), and `setStatus` only sets that final row's content — there is no placement or reorder option. Moving the line up therefore requires owning the whole footer renderer, which must reimplement both built-in rows from public surfaces: the `(sub)` cost suffix needs `modelRuntime.isUsingSubscription` (not exposed to extensions), the `CH%` cache-hit rate needs `latestCacheHitRate` (session internal), the `xp` badge needs `areExperimentalFeaturesEnabled()` (internal), and token totals require re-aggregating `sessionManager.getBranch()` entries — plus ~150 LoC of layout/formatting that silently drifts on every Pi upgrade. This is the same fragility class as the other `setFooter` rejections above. **Future revisit: before attempting this again, check Pi release notes for a footer-row ordering or status-placement option; until one exists, keep the jj label on the bottom status line.**

## Date

2026-08-09

## Supersedes

None. This CIR records a new decision and supersedes the implicit design of the existing `jj-footer.ts` extension (reinstating `FooterComponent` via a fake session), but there is no prior CIR for that design to replace.