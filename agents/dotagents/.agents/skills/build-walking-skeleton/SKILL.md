---
name: build-walking-skeleton
description: Use when implementing features by establishing a walking skeleton (primitive whole) and evolving behavior through stable interfaces from the outside in.
---

# Build Walking Skeleton

**REQUIRED SUB-SKILL:** `test-driven-development`.

## Primitive Whole Definition

A primitive whole (walking skeleton) is the smallest permanent slice of real behavior that runs end to end for the chosen scope and is verified through a stable interface.

## Valid Scopes

- Full app/service scope: exercise a real CLI command, HTTP endpoint, or UI flow end to end.
- Stable internal interface scope: exercise a stable contract inside the system, such as a parser or algorithm boundary, through observable inputs and outputs.

## Acceptance Criteria

- Uses a stable interface contract, not private implementation details.
- Executes a real end-to-end path for the chosen scope.
- Is automated with repeatable tests.
- Is intentionally thin in behavior, enough to prove integration and flow.
- Is permanent and evolved over time, not a throwaway spike.

## When Not to Use

- Do not use for throwaway spikes or experiments that will be discarded.
- Do not use when no stable interface contract exists yet.
- Do not use when the test bypasses the stable contract boundary for the chosen scope and targets private implementation details instead.

## Examples

1. CLI walking skeleton scope: interface `my-tool import <file>`; first behavior test validates exit code `0` and one expected summary line for a valid minimal file.
2. Stable internal contract scope (parser): interface `parseLine(line) -> BusinessObject | ParseError`; first behavior test validates expected mapped fields for a valid fixed-width line.

## Operating Rules

- Keep the scope within the boundaries defined in the "Valid Scopes" section.
- Start with a walking skeleton that runs end to end from the outside in.
- Write tests at the right abstraction level, focused on behavior and stability.
- Avoid tests tightly coupled to implementation details.
- Test behavior against stable interface contracts so tests survive refactoring.

## Guardrail

- Never add production behavior without a failing behavior test first.
- For full RED/GREEN/REFACTOR protocol and anti-rationalization rules, follow `test-driven-development`.

## Workflow

1. Confirm alignment by stating you understood this style.
2. Create or extend one end-to-end behavior test for the walking skeleton.
3. Use `test-driven-development` to drive each next outside-in slice.
4. Prefer the smallest useful vertical step to keep behavior demonstrable end to end.
5. After each green step, ask whether to refactor now.
6. Repeat with the next smallest behavior slice.

## Quality Checks

- Each new test targets observable behavior, not internal structure.
- Tests should survive normal refactoring without rewrites.
- No production behavior is added without a failing behavior test first.
- Refactoring does not change behavior; tests remain green throughout.
