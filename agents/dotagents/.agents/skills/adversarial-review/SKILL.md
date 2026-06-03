---
name: adversarial-review
description: Stress-test a feature by generating edge-case hypotheses and driving TDD for exposed breakage. Use after completing a feature slice.
---

# Adversarial Review

## When to use

After completing a feature slice, before considering it done. Optional — skip if the feature is trivial or exploratory. Invoke explicitly; not an automatic gate.

## Workflow

```
INSPECT → HYPOTHESISE → PROPOSE → IMPLEMENT → REPORT
```

### 1. INSPECT

Read the feature code and its existing tests. Understand the contracts, boundaries, and assumptions. Look at input paths, output contracts, state management, and error handling.

### 2. HYPOTHESISE

Hypothesise how the code might break. No categories, no counts — think about what is fragile about *this specific code*.

### 3. PROPOSE

Present each scenario in markdown for review:

```
## Scenario: <short name>
**SEV** <low | med | high>
**GIVEN** <precondition>
**WHEN** <trigger>
**THEN** <expected correct behaviour>
**CURRENT** <what the code actually does today (if known)>
```

**Severity:** low (cosmetic / narrow edge-case), med (wrong output / missing validation), high (data loss / crash / security).

Wait for the user to approve, reject, or modify each scenario before proceeding.

### 4. IMPLEMENT

For each approved scenario, delegate to TDD:

1. Write a failing test in the **feature's existing test module** — never a separate adversarial module.
2. Present the test to the user. They verify RED.
3. **Do not fix the code** — stop and report. Fixing is a separate step the user decides to take.

### 5. REPORT

List all scenarios, their test locations, and status:

| Scenario | Severity | Test location | Status |
|----------|----------|---------------|--------|
| `<name>` | low/med/high | `<file>::<test_fn>` | RED / green / not written |

Note any scenarios where the test passes immediately (bug already fixed or never existed).

## Rules

- Tests go in the feature's existing test module, not a separate file.
- Do **not** fix code during this skill — present failing tests and let the user decide.
- A scenario where the test already passes is fine — note it in the report.
- Severity helps the user triage; it does not determine implementation order.
