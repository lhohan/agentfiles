# Bash-First Pi Guardrails Refactor

## Summary

Refactor the Pi `guardrails` extension from a generic multi-tool filter into a bash-first command safety layer. The new goal is narrow and explicit: intercept risky `bash` commands such as `jj abandon`, warn or block them, and stop treating this extension as a reliable file-content protection mechanism. Remove the current multi-tool rule model, simplify the YAML schema, simplify `/guardrails test`, and document the scope change clearly. Record the shift as a CIR.

## Key Changes

- Change the extension contract to enforce only `bash` `tool_call` events.
- Keep global and project-local config locations unchanged:
  - `~/.pi/agent/guardrails.yaml|yml`
  - `<project-root>/.pi/guardrails.yaml|yml`
- Keep top-level YAML as `rules:` but make each rule bash-only:
  - required: `name`, `match`, `mode`
  - optional: `reason`
- Remove `tools`, `pattern`, `pathPattern`, and `allow` from the supported schema.
- Define `match` as a JavaScript regex string matched against the full bash command string.
- Keep `mode` as `off | warn | block`.
- Keep override semantics by rule `name`: project-local replaces global on the same name.
- Keep validation semantics per scope:
  - both `.yaml` and `.yml` in one scope disables only that scope with a warning
  - parse or validation failure disables only that scope with a warning
  - missing files remain silent and fail-open
- Make old-schema detection explicit:
  - if a rule contains removed fields such as `tools`, `pattern`, `pathPattern`, or `allow`, treat that config as invalid for that scope
  - error text should say the extension is now bash-first and show the new required fields
- Narrow `/guardrails` command behavior:
  - `/guardrails` lists active bash rules and summary counts
  - `/guardrails test <command...>` tests a command string verbatim against loaded rules
  - drop the required `<tool>` argument
  - optionally accept `/guardrails test bash <command...>` as a compatibility convenience, but normalize it internally to the same bash test path
- Update README and extension docs to state the real scope:
  - this is for command safety, not file secrecy
  - use agent-safehouse or equivalent containment for file-read restrictions
  - models can route around non-bash file guardrails, so those are intentionally removed rather than implied

## Docs and CIR

- Rewrite `agents/pi/.pi/agent/extensions/guardrails/guardrails.md` around bash-only usage:
  - purpose and non-goals
  - config locations
  - new rule schema
  - matching and override behavior
  - error handling
  - `/guardrails` and `/guardrails test`
  - migration notes from the old schema
- Update `README.md` to describe the extension as bash-first command guardrails rather than a seven-tool system.
- Add a new CIR under `docs/pi/cir/` that records the durable product decision:
  - guardrails are for bash command safety, not file/tool sandboxing
  - schema is intentionally narrow to reduce false confidence and config complexity
- Update the existing directory-extension CIR so it no longer claims the current design is justified by a live `yaml` dependency if that is no longer true. Keep the durable part: directory-style Pi extensions are still allowed.

## Test Plan

- Config load:
  - valid global config loads
  - valid project-local config loads
  - project-local same-name rule overrides global
  - both `.yaml` and `.yml` in one scope warns and disables only that scope
  - malformed YAML in one scope warns and leaves the other active
  - old-schema config warns with a migration-focused message and disables only that scope
- Runtime behavior:
  - `block` rule for `jj abandon` blocks the bash tool call
  - `warn` rule for a risky command notifies but allows execution
  - `off` rule is loaded but not enforced
  - first matching `block` rule stops evaluation for blocking
  - all matching `warn` rules are surfaced
- Command UX:
  - `/guardrails` lists active rules and per-scope counts
  - `/guardrails test jj abandon` reports the expected block match
  - if compatibility is kept, `/guardrails test bash jj abandon` also works
  - `/reload` picks up config changes
- Documentation validation:
  - examples in `guardrails.md` use only the new schema
  - README wording no longer suggests file-read or write-content protection

## Assumptions and Defaults

- This refactor is a clean break, not a transition layer.
- The extension should optimize for a small, trustworthy command-safety surface rather than flexible but misleading coverage.
- Exemption logic is removed entirely for now; users express exceptions by writing narrower regexes or overriding rules per project.
- No new unit-test harness is added in this iteration; verification remains manual plus repo checks already used for Pi changes.
