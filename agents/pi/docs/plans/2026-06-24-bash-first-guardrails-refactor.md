# Bash-First Command Guardrails Refactor

## Summary

Refactor Pi `guardrails` into command guardrails for `bash` tool calls only. Replace the old multi-tool config contract with a clean `guardrails.conf` contract, remove all non-command protection claims, and document that file access control belongs in containment such as Safehouse.

## Key Changes

- Public contract:
  - Load only `~/.pi/agent/guardrails.conf` and `<project-root>/.pi/guardrails.conf`.
  - Remove the shipped default config; command guardrails become opt-in.
  - `/guardrails test <command...>` is the only test syntax.
- Rule format:
  - Use INI-style sections where the section name is the rule name.
  - Supported keys: `match`, `mode`, optional `reason`.
  - Supported modes: `off`, `warn`, `block`.
  - `match` is a JavaScript regex string matched against the full bash command.
  - Comments are whole-line only.
- Runtime behavior:
  - Enforce only `bash` `tool_call` events.
  - Project config overrides global config by section name.
  - Missing config is silent and fail-open.
  - Parse or validation failure disables only that scope with a warning.
  - Evaluation collects matching warns before the first matching block, then stops at that block.
- Documentation:
  - Rewrite guardrails docs around command guardrails.
  - Update README so it describes command guardrails and `guardrails.conf`.
  - Record the durable shift in a Pi CIR.
  - Update the existing directory-extension CIR so it no longer depends on a live package dependency.

## Example

```ini
[block-jj-abandon]
mode = block
match = \bjj abandon\b
reason = Protect working-copy history
```

## Test Plan

- Config loading:
  - No config files load silently with zero rules.
  - Valid global `guardrails.conf` loads.
  - Valid project `guardrails.conf` loads.
  - Project same-name section overrides global.
  - Invalid config in one scope warns and leaves the other scope active.
  - Duplicate rule sections in one scope disable that scope.
- Runtime:
  - `block` rule matching `jj abandon` blocks the bash call.
  - `warn` rule matching a command notifies and allows execution.
  - `off` rule is listed but not enforced.
  - A command matching warn then block reports prior warnings and the block.
  - Non-bash tool calls are ignored completely.
- Command UX:
  - `/guardrails` lists command guardrails and scope counts.
  - `/guardrails test jj abandon` reports the expected match.
  - `/guardrails test bash jj abandon` treats `bash jj abandon` as the command string.
- Repo checks:
  - Run `mise check`.
  - Manually verify Pi extension behavior if no dedicated test harness exists.

## Assumptions

- This is a clean break, not a compatibility migration.
- No old config behavior should remain in code, docs, warnings, or examples.
- No new test harness or dependency is added for this iteration.
