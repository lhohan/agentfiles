---
name: designing-fluent-acceptance-dsl
description: Use when designing, refactoring, or writing tests with fluent acceptance-test DSLs.
---

# Designing Custom Test DSL

## Table of Contents

- [Overview](#overview)
- [Trigger Conditions](#trigger-conditions)
- [Before You Write Tests](#before-you-write-tests)
- [Architecture Pattern](#architecture-pattern)
- [Execution Modes](#execution-modes)
- [Core Pattern](#core-pattern)
- [Examples](#examples)
- [Design Rules](#design-rules)
  - [Test File Organization](#test-file-organization)
- [Assertion Model](#assertion-model)
- [Implementation Strategy](#implementation-strategy)
- [Evolution Workflow](#evolution-workflow)
- [Maturity Ladder](#maturity-ladder)
- [Implementation Language](#implementation-language)
- [Prerequisites](#prerequisites)
- [Limitations](#limitations)
- [Failure and Diagnostics](#failure-and-diagnostics)
- [External Behavior Contracts](#external-behavior-contracts)
- [Single-Responsibility Fixture Style](#single-responsibility-fixture-style)
- [Validation Checklist](#validation-checklist)
- [DSL Requirements](#dsl-requirements)
- [Common Mistakes](#common-mistakes)

## Overview

Build acceptance tests that read like executable behavior specs. Model the narrative as `Setup -> Action -> Assertion`, then encode that narrative in types.

## Trigger Conditions

Use this skill when:
- Designing or refactoring fluent acceptance-test DSLs
- Writing tests using an existing fluent DSL
- **Before claiming DSL test work is complete** (mandatory checkpoint)

## Before You Write Tests

**Required Checkpoint:** Complete the [Test Compliance](#validation-checklist) section of the Validation Checklist before claiming any DSL test work is complete.

When writing tests using this DSL, verify scenario test bodies use DSL methods for standard setup and assertions. Run the scan commands in the Validation Checklist, then classify any remaining raw operations.

**If unclassified leaks remain:** Refactor into fluent Scenario methods before continuing.

## Architecture Pattern

Every DSL follows three phases:

1. Setup: configure state, input, and environment.
2. Action: execute the operation under test.
3. Assertion: verify behavior and diagnostics.

## Execution Modes

- Eager mode (common in CLI DSLs): setup first, execute once, then assert on result.
- Deferred mode (common in server/request DSLs): setup first, define request, queue assertions, then execute.

Examples:

- Eager: `given().with_data(...).when_run().should_succeed().expect_output(...)`
- Deferred: `new().with_file(...).get("/path").expect_status_code(200).execute()`

## Core Pattern

Use `SCENARIO -> GIVEN -> WHEN -> THEN` as the reader-facing shape. In implementation, keep distinct types per phase as described in [Architecture Pattern](#architecture-pattern) so execution order stays explicit and invalid call paths stay unavailable.

## Examples

- language-agnostic pseudocode examples for CLI and server DSL styles: `examples-core-pseudocode.md`
- a compact multi-scenario suite in a general domain: `examples-order-processing-scenarios.md`
- a dedicated Rust mapping example: `examples-rust-mapping.md`

## Design Rules

- Keep setup methods pure builders returning `Self`.
- Treat required setup inputs as explicit contracts (for example, `with_flags(...)`, `with_agents(...)`).
- When a setup prerequisite is mandatory, prefer a distinct phase type over a runtime flag or optional field. Make unready execution methods unavailable when practical.
- Apply setup in a deterministic internal order so setup call order does not change behavior.
- Make action boundaries explicit (`when_run`, `get`, `post`, `execute`).
- Fail fast in the action entry point (`run`/`execute`) when required setup is missing, with scenario-specific diagnostics.
- Return a dedicated assertion type from action methods.
- Keep assertions chainable and failure messages diagnostic-rich.
- Use domain terms in high-level assertions, not protocol terms.
- For naming decisions in DSL tests, route to the `naming-tests` skill and follow its convention directly.
- Keep temp resources alive in context/result objects.
- Use separate DSLs for broad e2e tests and focused acceptance tests when they have different resources, execution costs, or failure diagnostics.

### Test File Organization

Order tests within a file so a reader's mental model builds incrementally.

- Place the most broadly illustrative tests first — the ones that answer "what does this feature do at its simplest?"
- Group related tests together. Tests that exercise the same concern should be adjacent.
- Progress from fundamental contract to specific edge cases. Do not interleave unrelated scenarios.
- The file should read as a story, not a reference index.

Do not add section comments or dividers — the test order itself conveys the structure.

## Assertion Model

Start with generic assertions:

- `should_succeed`, `should_fail`, `should_timeout`
- `expect_output_contains`, `expect_error_contains`
- `expect_status_code`, `expect_header`
- `expect_json_field`, `expect_output_matches`

Then add domain assertions:

- `expect_entity("name")`
- `.with_metric("duration", "2h")`
- `.with_state("active")`
- `.validate()`

Domain assertions should mirror business language used by humans.

## Implementation Strategy

1. Define entry points and phase types (`given/new`, setup type, result type).
2. Implement setup builders (flags/config/files/env/time).
3. Implement one action transition and return assertion object.
4. Add basic assertions with strong diagnostics.
5. Add domain assertions for common business checks.
6. Add resource lifetime ownership (`TempDir`, server handle, database handle).
7. Test the DSL itself for success, failure, and chained assertion behavior.

## Evolution Workflow

When improving an existing suite, evolve the DSL from call sites instead of inventing a complete API up front.

1. Inspect current test bodies first. Note the setup chains, action boundaries, assertions, and raw fixtures that repeat.
2. Identify repeated raw assertions or fixture setup. Treat repeated literals in user-visible output, files, or domain state as extraction candidates.
3. Extract only repeated, domain-meaningful operations into DSL methods. Keep one-off mechanics local unless they obscure the behavior being tested.
4. Reorder tests so simple behavior appears before edge cases. The file should teach the feature before it enumerates exceptions.
5. Run compliance scans and classify remaining exceptions. Convert an exception into a DSL method as soon as the pattern repeats.

## Maturity Ladder

Use this ladder to decide the next useful improvement, not as a requirement to build everything at once.

1. Basic fluent command runner: `given().arg(...).when_run().should_succeed()`.
2. Resource-owning fixture setup: isolated HOME/CWD, temp files, servers, or databases live until assertions finish.
3. Type-state transitions: mandatory setup is represented by phase types, so invalid execution paths are unavailable.
4. Domain assertions: repeated business or user-visible checks become methods such as `expect_skill(...)` or `expect_bootstrap_added_notice()`.
5. Narrative test ordering and consistent names: broad behavior first, related edge cases adjacent, names aligned with the suite's convention.

## Implementation Language

Prefer strongly typed languages to implement the DSL.

If no DSL implementation exists yet, ask the user which language should be used. Make a suggestion based on:
1. The implementation language of other kinds of tests.
2. The implementation language of the production code.
3. A strongly-typed, expressive language like Rust.

## Prerequisites

- A clear behavior narrative with at least one happy path and one failure path.
- Domain vocabulary for high-level assertions (`expect_entity`, `with_state`, etc.).
- A runtime model for resource ownership (temp files, server handles, databases).

## Limitations

- In weakly typed languages, phase safety is runtime-only unless enforced by API design.
- DSLs can overfit one product area; keep high-level assertions domain-specific but reusable.
- For small smoke tests, plain helper functions may be cheaper than a full fluent DSL.
- A raw fixture may be clearer than a DSL method for a single platform-specific edge case. Keep that exception local and diagnostic.

## Failure and Diagnostics

- Setup failures should fail fast and report missing/invalid inputs before action execution.
- Action failures should expose execution context (command/request, status/exit code, stderr/body).
- Assertion failures should include expected vs actual values and scenario context.
- Deferred execution DSLs should surface queued assertion failures in declaration order.

## External Behavior Contracts

When external behavior changes, add a dedicated acceptance test for that contract.

Examples of external behavior include:
- CLI output and exit semantics
- API response status/body and wire format
- file or symlink layout visible to consumers
- config or data formats consumed by other systems

Do not rely only on broad end-to-end tests for these checks; keep contract assertions explicit and focused.

## Single-Responsibility Fixture Style

Prefer DSL wrapper methods (e.g., `.with_source_skills()`, `.with_multi_source_skills()`) over manual fixture management in scenario test bodies. The DSL should handle resource lifetimes automatically, with no explicit cleanup in the test.

- Use DSL setup methods for standard test fixtures
- Keep one primary contract per focused test
- Add thin local DSL helpers only when repetition hurts readability
- Keep helper wrappers transparent and local to the test module
- Avoid hidden global DSL defaults
- Keep broad end-to-end tests alongside focused tests, but treat broad tests as integration coverage, not contract isolation

## Validation Checklist

### DSL Implementation
- [ ] Setup methods cannot trigger execution.
- [ ] Action boundary is explicit (`when_run`, `execute`, `get`, `post`).
- [ ] Assertions are unavailable before action transition.
- [ ] Required setup contracts fail fast with scenario-specific diagnostics.
- [ ] Setup application order is deterministic and independent of setup call order.
- [ ] DSL tests cover success, failure, and chained assertions.
- [ ] External contract changes have a dedicated acceptance test.
- [ ] Focused tests verify one primary contract with only minimal supporting assertions.
- [ ] Failure messages include actionable diagnostics.
- [ ] Resource lifetimes survive until all assertions finish.

### Test Compliance (run this scan before completion)
```bash
rg -n "\b(?:assert|debug_assert)(?:_(?:eq|ne|matches))?!\s*\(|\bpanic!\s*\(" tests/
rg -n "\b(?:tempfile::Builder|(?:std::)?fs::(?:create_dir_all|write|read_link|symlink_metadata)|std::os::unix::fs::symlink|symlink)\b" tests/
```
Scan hits inside DSL implementation helpers are classification candidates, not automatic failures. Only scenario-body leaks fail by default.

- [ ] Scenario test bodies use DSL assertion methods (e.g., `expect_exit()`, `expect_stdout_contains()`), not direct `assert!`, `assert_eq!`, or `panic!`.
- [ ] Scenario test bodies use DSL setup methods for standard fixtures, not raw filesystem operations.
- [ ] DSL implementation internals may use raw filesystem operations or assertions when they provide resource ownership, phase transitions, or diagnostics.
- [ ] Remaining raw test-body operations are classified as explicit exceptions: platform-specific edge cases, one-off fixture constraints, or DSL self-tests.
- [ ] Exceptions are local, diagnostic, and converted into DSL methods if repetition appears.

**If unclassified leaks remain:** Refactor into fluent Scenario methods before continuing.

## DSL Requirements

Treat the DSL as production code:

- clear happy path behaviour
- failure behavior with clear messages
- multiple chained assertions
- resource cleanup and lifetime correctness
- compile-time phase safety (assertions unavailable before action)

## Common Mistakes

- Mixing setup, action, and assertions in a single mutable type.
- Implicit execution during setup methods.
- Hiding required setup behind global defaults just to reduce repetition.
- Generic assertion names that hide domain meaning.
- Asserting multiple unrelated contracts in one focused test.
- Treating broad e2e tests and focused CLI acceptance tests as if one DSL must cover both.
- Adding DSL methods before a repeated scenario-body need exists.
- Weak panic/assert messages that slow debugging.
- Dropping temporary files/servers before assertions complete.
