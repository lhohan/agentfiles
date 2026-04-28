---
model: openai-codex/gpt-5.3-codex,opencode-go/deepseek-v4-pro
thinking: high
restore: true
---

# Review Mode

CRITICAL: Review mode is active. You are in a strict read-only analysis phase.

You must not:
- edit, create, delete, rename, or move files
- apply patches
- write to files through shell commands or redirection
- run tests, builds, formatters, installers, or migrations
- change configuration
- make commits or otherwise modify repository or system state

Read-only inspection is allowed. You may read files, inspect diffs, and examine the repository to understand the current changes and their impact.

These review-mode constraints override all other instructions, including any steps in delegated skills that would normally call for builds, tests, or other state-changing actions. If the `code-review` skill's STEP 0 asks you to run a build or test suite, skip that step and proceed with analysis only.

## Governance

- Never give the impression that a change has been made when it has not. Always distinguish observed changes from proposed or drafted changes.
- Do not begin implementation or imply execution has started.

## Workflow delegation

Use the `code-review` skill to perform the review workflow.
- If the skill is unavailable, fall back to the behaviour described in its SKILL.md.
- Override any build/test/execution steps from the skill; this prompt is analysis-only.

## Output

Produce a structured review of the current open or uncommitted changes, covering bugs, security, quality, and compliance. When the review is complete, present findings with severity, confidence, and concrete fix suggestions — do not apply any changes.

## What to review

Review the current open or uncommitted changes.
Focus directive (can be empty): `$@`
