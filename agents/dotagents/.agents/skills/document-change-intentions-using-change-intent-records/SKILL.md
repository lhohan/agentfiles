---
name: document-change-intentions-using-change-intent-records
description: >
  Use when change intent or decision is worth remembering. Guides Change Intent Records for non-obvious rationale, rejected alternatives, subtle behaviour, or constraints maintainers and agents must preserve.
---

# Document Change Intentions Using Change Intent Records

Use this skill when planning, implementing, reviewing, or explaining a change where future readers need to know why the change exists, what behaviour it protects, and which tradeoffs shaped it.

A Change Intent Record (CIR) is a small, change-level document that captures the intent behind a specific change. CIRs help AI-assisted development by giving future agents and humans durable context that is often lost in chat transcripts, branch notes, or terse commit messages.

## Table of Contents

- [When Change Intent Is Worth Remembering](#when-change-intent-is-worth-remembering)
- [Standard CIR Template](#standard-cir-template)
- [Recommended Location and Naming](#recommended-location-and-naming)
- [Relationship to Other Records](#relationship-to-other-records)
- [Agent Workflow](#agent-workflow)
- [Example: Rejected Alternative](#example-rejected-alternative)
- [Example: Non-Obvious Constraint](#example-non-obvious-constraint)
- [Quick Checklist](#quick-checklist)

## When Change Intent Is Worth Remembering

Create a CIR when at least one of these is true:

- A reasonable alternative was rejected and future agents might rediscover it.
- The change is constrained by non-obvious product, operational, compatibility, security, or maintenance requirements.
- The intended behaviour is subtle enough that a future refactor could accidentally undo it.
- The change spans multiple files or systems and the rationale is not visible from code alone.
- The user explicitly wants the decision trail preserved.

Skip a CIR when:

- The change is trivial, mechanical, or self-explanatory.
- The intent is already obvious from a nearby test, comment, or existing decision record.
- The record would only restate the commit message.
- There is no durable decision or rejected alternative to preserve.

If unsure, ask: "Will a future agent be likely to change this back because the reason is missing?" If yes, write a CIR.

## Standard CIR Template

Store CIRs as Markdown. Use this structure:

```markdown
# CIR-<000>: <short change intent title>

## Intent

What change are we making, and what outcome should it achieve?

## Behavior

GIVEN <starting context>
WHEN <the relevant action or condition occurs>
THEN <the expected behaviour or invariant>

## Constraints

- <constraint that shaped the change>
- <constraint that future changes must preserve>

## Decisions

- **<decision made>** because <why>.
- Rejected <reasonable alternative> because <why>.
- Rejected <reasonable alternative> because <why>.

## Date

YYYY-MM-DD

## Supersedes

- <optional path or identifier for prior CIR>
```

Omit `Supersedes` when the CIR does not replace an earlier record. Use sequential CIR numbers only when the repository already tracks them; otherwise replace `CIR-<000>` with `CIR` and rely on the date-based filename. Do not omit the other sections; write `None known` only when that is genuinely true and useful.

## Recommended Location and Naming

Default location:

- Repo-wide CIRs: `docs/cir/`
- Package-scoped CIRs: `docs/<package>/cir/`

Default filename:

```text
YYYY-MM-DD-short-change-intent-topic.md
```

Examples:

```text
docs/cir/2026-05-13-preserve-plan-mode-read-only.md
docs/dotagents/cir/2026-05-14-adopt-hybrid-cir-decision-record-policy.md
```

A CIR may supersede an earlier decision record when it replaces or invalidates that prior decision. If the repository already has a convention for decision records, follow it unless it conflicts with the CIR purpose. Keep CIRs near other durable project documentation, not inside temporary task notes.

## Relationship to Other Records

- **ADRs:** Use ADRs for architecture-level decisions that shape system structure over time. Use CIRs for change-level intent and constraints. A CIR may reference an ADR, but should not replace one.
- **Decision records:** Existing decision logs remain active reference material. A CIR may supersede a prior decision record when it replaces or invalidates that prior decision.
- **Commit messages:** Commit messages summarize what changed and may mention why. CIRs preserve richer rationale, expected behaviour, and rejected alternatives that should outlive a single commit.
- **Design documents:** Design docs can explore broad options before implementation. CIRs capture the final intent and decisions for a specific change after the relevant tradeoffs are known.
- **Tests:** Tests prove behaviour. CIRs explain why that behaviour matters and what constraints future changes must respect.

## Agent Workflow

When this skill applies:

1. Inspect existing documentation first. Look for `docs/cir/`, ADRs, design docs, task notes, and nearby comments or tests that already preserve the intent.
2. Decide whether a CIR is warranted using the criteria above. Do not create one by default for every change.
3. If a CIR seems warranted, tell the user why and offer a short draft. Ask only for missing intent, constraints, or tradeoffs that cannot be inferred from the repository or task.
4. Draft the CIR with concrete behaviour in GIVEN/WHEN/THEN form. Avoid vague statements like "improve maintainability" unless the record explains how.
5. Reference relevant existing CIRs, ADRs, issues, tests, or design docs. Use `Supersedes` only when replacing or invalidating an earlier CIR.
6. During implementation or review, check that code, tests, and docs still match the CIR. If behaviour or decisions change, revise the CIR rather than letting it become stale.
7. Do not let CIR writing become process theatre. If the CIR adds no durable context, skip it and say why.

## Example: Rejected Alternative

```markdown
# CIR-001: Keep Usage Stats Aggregation Snapshot-Based

## Intent

Preserve fast usage-stat reports by aggregating from periodic snapshots instead of replaying every raw event on each report run.

## Behavior

GIVEN a long-running Pi installation with many usage events
WHEN the user generates a usage report
THEN the report should read a bounded set of snapshot data rather than replaying the complete event log every time

## Constraints

- Raw events remain useful for audit and debugging.
- Reports should stay responsive as the event log grows.
- The design must not require a database server.

## Decisions

- **Use snapshot-based aggregation** for routine reporting because it bounds report-time work.
- Keep raw event replay available as a recovery or rebuild path.
- Reject report-time full replay as the default because it gets slower with every recorded event.

## Date

2026-05-13
```

## Example: Non-Obvious Constraint

```markdown
# CIR-002: Keep Plan Mode Strictly Read-Only

## Intent

Ensure plan mode produces implementation-ready plans without mutating repository, task, or system state.

## Behavior

GIVEN plan mode is active
WHEN the agent inspects the repository to prepare a plan
THEN it may read files and documentation but must not edit files, run builds, run tests, change task state, or commit changes

## Constraints

- Planning must be safe to run before the user has approved implementation.
- Verification commands can modify caches, generated files, or task state, so they are deferred until implementation.
- The final plan must distinguish proposed changes from applied changes.

## Decisions

- **Treat plan mode as read-only** even for apparently harmless formatting or validation commands.
- Defer saving the plan file until the user explicitly leaves plan mode.
- Reject automatic task updates during plan mode because they mutate task state.

## Date

2026-05-13
```

## Quick Checklist

Before creating or accepting a CIR, confirm:

- The change has durable intent or non-obvious rationale worth preserving.
- The behaviour section states a concrete GIVEN/WHEN/THEN invariant.
- Constraints explain what future changes must not accidentally violate.
- Decisions include meaningful tradeoffs or rejected alternatives.
- The CIR complements, rather than duplicates, ADRs, design docs, commit messages, and tests.
