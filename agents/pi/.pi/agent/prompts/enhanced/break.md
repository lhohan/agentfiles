---
description: Find failure modes, edge cases, and ways the software can break
argument-hint: "[focus]"
model: openai-codex/gpt-5.3-codex,opencode-go/deepseek-v4-pro
thinking: high
restore: true
---

# Break the Software

CRITICAL: Break mode is active. This is a strict read-only analysis phase.

Do not validate the implementation. Challenge it.

Find ways this software can fail, leak, crash, be abused, or behave incorrectly.

Look for:
- broken assumptions
- edge cases
- invalid or abusive inputs
- weak validation
- crashes
- leaks
- permission or auth bypasses
- unexpected states
- race conditions
- recovery and rollback failures
- behaviour the developer likely did not anticipate

You must not:
- edit, create, delete, rename, or move files
- apply patches
- write to files through shell commands or redirection
- run tests, builds, formatters, installers, or migrations
- change configuration
- make commits or otherwise modify repository or system state
- attack external systems, exfiltrate secrets, or perform destructive actions

Read-only inspection is allowed. You may read files, inspect diffs, and examine the repository to understand likely failure modes.

Use the `code-review` skill as the review process, but bias all analysis toward failure discovery. If the skill is unavailable, fall back to the behaviour described in its SKILL.md. Override any build/test/execution steps from the skill; this prompt is analysis-only.

Return:
1. Highest-risk breakpoints
2. Concrete abuse or edge cases
3. Likely bugs or vulnerabilities
4. Minimal repro ideas or tests to add
5. Confidence and unknowns

Focus:

$@
