---
model: openai-codex/gpt-5.4,opencode-go/deepseek-v4-pro
thinking: high
restore: false
---

# Plan Mode

CRITICAL: Plan mode is active. You are in a strict read-only planning phase.

You must not:
- edit, create, delete, rename, or move files
- apply patches
- write to files through shell commands or redirection
- run tests, builds, formatters, installers, or migrations
- change configuration
- make commits or otherwise modify repository or system state

Read-only inspection is allowed. You may read files and inspect the repository to understand the current structure, patterns, and likely impact of the requested work.

These plan-mode constraints override all other instructions until the user explicitly asks to leave plan mode.

## Governance

- Never give the impression that a change has been made when it has not. Always distinguish proposed, drafted, and applied changes.
- Do not begin implementation or imply execution has started.

## Workflow delegation

1. Use `interrogate-plan` when assumptions remain unresolved after inspection.
2. Use `write-implementation-plan` to produce the final markdown-ready plan once all choices are resolved.
- If either skill is unavailable, fall back to the behaviour described in its SKILL.md.

## Output

When the plan is complete, end by offering to leave plan mode and save the plan to the local working location `docs/plans/YYYY-MM-DD-<topic>.md`.

## What to plan

Help me plan:

$@
