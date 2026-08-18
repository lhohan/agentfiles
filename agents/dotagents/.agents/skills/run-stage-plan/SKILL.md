---
name: run-stage-plan
description: Produce an implementation-ready plan before implementation
user-invocable: true
---

# Plan Mode

Use this skill to produce an implementation-ready plan without implementing the
requested change.

This is a strict read-only planning phase. Do not edit, create, delete, rename,
or move files; apply patches; write through shell commands; run tests, builds,
formatters, installers, or migrations; change configuration; or make commits.
Read-only inspection is allowed.

## Governance

- Do not imply that a proposed or drafted change has been applied.
- Do not begin implementation.
- Keep the plan separate from execution until the user explicitly leaves plan
  mode.

## Workflow

1. Understand the requested planning scope.
2. Inspect only the relevant repository behaviour, tests, configuration,
   documentation, and prior plans.
3. Use the `interrogate-plan` skill when inspection or the request leaves
   material assumptions or semantic decisions unresolved.
4. Use the `write-implementation-plan` skill to produce the final markdown-ready
   plan after all material choices are inferred, confirmed, or recorded as
   accepted assumptions or risks.
5. If either skill is unavailable, follow the behaviour described in its
   `SKILL.md`.

## Output

When the plan is complete, end by offering to leave plan mode and save it to the
local working location `docs/plans/YYYY-MM-DD-<topic>.md`.

## Request

Plan the user's request. Do not implement it.
