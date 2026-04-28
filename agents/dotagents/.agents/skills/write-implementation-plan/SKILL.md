---
name: write-implementation-plan
description: Use when you have a spec or requirements for a multi-step task, before touching code.
---

Produce a concise, concrete implementation plan formatted in markdown. The plan must be readable by a zero-context engineer who has not participated in the conversation.

## Output structure

- **Goal** — what the work is meant to achieve
- **Assumptions** — important assumptions you are making
- **Open questions** — only if genuinely unresolved; otherwise omit
- **Plan** — a short ordered list of implementation steps
- **Likely files** — files or areas likely to be inspected or changed, with exact paths when knowable
- **Task linkage** — if this plan maps to a tracked task or issue, note the saved plan location in that task
- **Risks** — key tradeoffs, unknowns, or failure points
- **Validation** — how to verify the work once implementation begins

## Style rules

- Use planning language, not execution language.
- Follow existing repository conventions instead of inventing new structure.
- Keep steps ordered and actionable.
- Include exact file paths when knowable.
- Include tests, documentation, and validation guidance as advisory steps.
- Prefer DRY and YAGNI; do not over-engineer.
- Prefer APYIAC (Avoid Painting Yourself In A Corner) and Optionality; design properly what needs to be designed properly, implmentations should not make future changes harder than necessary.
- Advise test-first sequencing where it fits the codebase.
- Do not mention worktrees, commits, subagent execution, or writing files during plan mode.
