# CIR: command guardrails are bash-only

## Intent

Make Pi guardrails a narrow command-safety feature instead of a broad tool/content protection mechanism.

## Behavior

GIVEN Pi emits a `bash` `tool_call`
WHEN a loaded command guardrail regex matches the full command string
THEN the rule may warn or block according to its configured mode

GIVEN Pi emits any non-`bash` tool call
WHEN command guardrails are loaded
THEN the tool call is ignored by the guardrails extension

GIVEN a user needs file-read restrictions, write restrictions, secret protection, or process containment
WHEN they evaluate command guardrails
THEN command guardrails must not be presented as the control; containment such as Safehouse is the right layer

## Constraints

- Config is opt-in and loaded only from `guardrails.conf`.
- Previous config files are ignored rather than migrated.
- The rule schema stays small: section name, `match`, `mode`, and optional `reason`.
- Missing config fails open silently.
- A bad config disables only its own scope with a warning.

## Decisions

- **Restrict enforcement to `bash`** because command hazards are the concrete repeated need and are observable as one command string.
- **Remove non-command guardrails** because they implied protection that a model could route around through other tools or flows.
- **Use `guardrails.conf`** to mark the clean break from the previous config contract.
- **Keep project overrides by rule name** so global defaults can be disabled or changed per repository.

## Date

2026-06-24
