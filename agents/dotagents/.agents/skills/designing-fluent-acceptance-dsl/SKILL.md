---
name: designing-fluent-acceptance-dsl
description: Use when designing, refactoring, or writing fluent acceptance-test DSLs across languages. Provides a language-agnostic pattern with optional Rust mapping.
---

# Designing Fluent Acceptance-Test DSLs

## Table of Contents

- [Overview](#overview)
- [Trigger Conditions](#trigger-conditions)
- [Before You Write Tests](#before-you-write-tests)
- [Architecture Pattern](#architecture-pattern)
- [Execution Modes](#execution-modes)
- [Core Pattern](#core-pattern)
- [Examples](#examples)
- [Design Rules](#design-rules)
  - [Test File Organisation](#test-file-organisation)
- [Assertion Model](#assertion-model)
- [Implementation Strategy](#implementation-strategy)
- [Evolution Workflow](#evolution-workflow)
- [Maturity Ladder](#maturity-ladder)
- [Language Strategy](#language-strategy)
  - [Typed-Language Mapping](#typed-language-mapping)
- [Prerequisites](#prerequisites)
- [Limitations](#limitations)
- [Failure and Diagnostics](#failure-and-diagnostics)
- [External Behaviour Contracts](#external-behaviour-contracts)
- [Single-Responsibility Fixture Style](#single-responsibility-fixture-style)
- [Validation Checklist](#validation-checklist)
- [DSL Requirements](#dsl-requirements)
- [Common Mistakes](#common-mistakes)

## Overview

Build acceptance tests that read like executable behaviour specs. Model the narrative as `Setup -> Action -> Assertion`, then encode that narrative in the host language's strongest suitable abstractions.

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
3. Assertion: verify behaviour and diagnostics.

## Execution Modes

- Eager mode (common in CLI DSLs): setup first, execute once, then assert on result.
- Deferred mode (common in server/request DSLs): setup first, define request, optionally queue assertion declarations, then execute.

Examples:

- Eager: `given().with_data(...).when_run().should_succeed().expect_output(...)`
- Deferred explicit result: `new().with_file(...).get("/path").execute().expect_status_code(200)`
- Deferred queued assertions: `new().with_file(...).get("/path").expect_status_code(200).execute()`

In queued-assertion DSLs, `expect_*` calls before `execute()` declare checks to run later; `execute()` remains the action boundary.

## Core Pattern

Use `SCENARIO -> GIVEN -> WHEN -> THEN` as the reader-facing shape. In implementation, keep distinct phase boundaries as described in [Architecture Pattern](#architecture-pattern) so execution order stays explicit and invalid call paths stay unavailable.

## Examples

- language-agnostic pseudocode examples for CLI and server DSL styles: `examples-core-pseudocode.md`
- a compact multi-scenario suite in a general domain: `examples-order-processing-scenarios.md`
- an optional Rust mapping example for Rust codebases: `examples-rust-mapping.md`

## Design Rules

- Keep setup methods pure builders returning the same setup phase or the next phase builder.
- Treat required setup inputs as explicit contracts (for example, `with_flags(...)`, `with_agents(...)`).
- When a setup prerequisite is mandatory, prefer a distinct phase type over a runtime flag or optional field. Make unready execution methods unavailable when practical.
- Apply setup in a deterministic internal order so setup call order does not change behaviour.
- Make action boundaries explicit (`when_run`, `get`, `post`, `execute`).
- Fail fast in the action entry point (`run`/`execute`) when required setup is missing, with scenario-specific diagnostics.
- Return a dedicated assertion type from action methods.
- Keep assertions chainable and failure messages diagnostic-rich.
- Use domain terms in high-level assertions, not protocol terms.
- For naming decisions in DSL tests, route to the `naming-tests` skill and follow its convention directly.
- Keep temporary resources alive in context/result objects.
- Use separate DSLs for broad e2e tests and focused acceptance tests when they have different resources, execution costs, or failure diagnostics.

### Test File Organisation

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

1. Define entry points and phase types (`given/new`, setup phase, action/request phase, result/assertion phase).
2. Implement setup builders (flags/config/files/env/time).
3. Implement one action transition and return assertion object.
4. Add basic assertions with strong diagnostics.
5. Add domain assertions for common business checks.
6. Add resource lifetime ownership (temporary-resource handle, server handle, database handle).
7. Test the DSL itself for success, failure, and chained assertion behaviour.

## Evolution Workflow

When improving an existing suite, evolve the DSL from call sites instead of inventing a complete API up front.

1. Inspect current test bodies first. Note the setup chains, action boundaries, assertions, and raw fixtures that repeat.
2. Identify repeated raw assertions or fixture setup. Treat repeated literals in user-visible output, files, or domain state as extraction candidates.
3. Extract only repeated, domain-meaningful operations into DSL methods. Keep one-off mechanics local unless they obscure the behaviour being tested.
4. Reorder tests so simple behaviour appears before edge cases. The file should teach the feature before it enumerates exceptions.
5. Run compliance scans and classify remaining exceptions. Convert an exception into a DSL method as soon as the pattern repeats.

## Maturity Ladder

Use this ladder to decide the next useful improvement, not as a requirement to build everything at once.

1. Basic fluent command runner: `given().arg(...).when_run().should_succeed()`.
2. Resource-owning fixture setup: isolated HOME/CWD, temp files, servers, or databases live until assertions finish.
3. Explicit phase boundaries: mandatory setup is represented by distinct phases. In languages with strong type systems, prefer type-state or dedicated phase types so invalid execution paths are unavailable.
4. Domain assertions: repeated business or user-visible checks become methods such as `expect_skill(...)` or `expect_bootstrap_added_notice()`.
5. Narrative test ordering and consistent names: broad behaviour first, related edge cases adjacent, names aligned with the suite's convention.

## Language Strategy

The pattern itself is language-agnostic. The primary teaching vehicle should be pseudocode and behaviour-level examples that transfer cleanly to Java, Scala, C#, Rust, and similar languages.

Map the pattern into the host language rather than forcing one language's idioms onto another:

- In strongly typed languages, prefer distinct phase types, type-state transitions, or equivalent compile-time restrictions when they improve clarity.
- In weaker or more dynamic languages, preserve the same narrative shape and execution boundaries with explicit API design and strong runtime diagnostics.
- Use the host language's normal naming, fixture, and assertion idioms where they do not weaken the scenario narrative.

If the project uses Rust, the Rust mapping example is useful on demand because Rust can express resource ownership and phase safety particularly well. Treat it as a concrete mapping, not as the canonical form all languages must imitate.

If no DSL implementation exists yet, suggest a language based on:
1. The implementation language of the production code.
2. The implementation language already used for the surrounding tests.
3. The language that gives the clearest phase boundaries and diagnostics for that codebase.

### Typed-Language Mapping

Use these mappings to translate the pseudocode pattern into common strongly typed languages:

| Concept | Java | Scala | C# | Rust |
|---|---|---|---|---|
| Setup phase | builder class or staged builder interface | case class builder, fluent class, or test fixture DSL | builder class or fluent fixture object | struct with builder methods |
| Mandatory transition | staged interfaces | separate types or opaque/new types | staged interfaces or separate classes | type-state structs or distinct phase structs |
| Action boundary | `run()`, `execute()`, request method returning result | `run`, `execute`, effect/request wrapper | `Run()`, `ExecuteAsync()`, request method returning result | `when_run()`, `execute()`, request method returning result |
| Assertion phase | assertion/result object with fluent methods | matcher/result DSL with domain methods | assertion/result object with fluent methods | result/assertion struct with fluent methods |
| Resource lifetime | JUnit extension, AutoCloseable, temp directory owner | fixture resource wrapper, loan pattern, effect resource | `IDisposable`, `IAsyncDisposable`, fixture lifetime | owning struct with `TempDir`, handles, or drop cleanup |

Keep the public scenario shape stable across languages even when implementation mechanics differ.

## Prerequisites

- A clear behaviour narrative with at least one happy path and one failure path.
- Domain vocabulary for high-level assertions (`expect_entity`, `with_state`, etc.).
- A runtime model for resource ownership (temp files, server handles, databases).

## Limitations

- Some languages cannot express phase safety at compile time; preserve the same contract with API structure and runtime checks.
- DSLs can overfit one product area; keep high-level assertions domain-specific but reusable.
- For small smoke tests, plain helper functions may be cheaper than a full fluent DSL.
- A raw fixture may be clearer than a DSL method for a single platform-specific edge case. Keep that exception local and diagnostic.

## Failure and Diagnostics

- Setup failures should fail fast and report missing/invalid inputs before action execution.
- Action failures should expose execution context (command/request, status/exit code, stderr/body).
- Assertion failures should include expected vs actual values and scenario context.
- Deferred execution DSLs should surface queued assertion failures in declaration order.

## External Behaviour Contracts

When external behaviour changes, add a dedicated acceptance test for that contract.

Examples of external behaviour include:
- CLI output and exit semantics
- API response status/body and wire format
- file or symlink layout visible to consumers
- config or data formats consumed by other systems

Do not rely only on broad end-to-end tests for these checks; keep contract assertions explicit and focused.

### Contract-First Assertion Discipline

Treat the CLI as a contract, not an implementation. Assert exit code, output shape, and `ok` semantics before domain fields.

Define a **scenario** as one end-to-end invocation (one `when_run()`), followed by multiple assertions that together specify the behaviour for that scenario.

Use composite assertions to keep behaviour readable:

- `expect_ok()` — transport and contract success: exit 0, output parseable, `ok: true`.
- `expect_err(code)` — transport and contract failure: non-zero exit, output parseable, `ok: false`, `error.code == code`.

Add only the minimum domain assertions per scenario (one to three) that express the behavioural intent. Grow the DSL from the assertions you actually use, and prefer stable behavioural checks over unstable ones.

Make error behaviour first-class: negative tests are part of the contract.

Keep inputs minimal and controlled early: start with a single fixture written by the DSL (for example, `with_markdown(...)`) to validate the whole flow before scaling the corpus.

Keep UX clarity in the contract because the DSL is also documentation of intended usage.

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
Choose scan commands that match the project's language, test layout, and assertion library. The goal is to detect scenario-body leaks, not to enforce Rust-specific mechanics everywhere.

Generic leak categories to scan for:
- direct assertion primitives in scenario bodies
- raw filesystem or temp-resource setup in scenario bodies
- direct process, request, or protocol checks that should be named DSL assertions

Select the relevant language patterns below, then add project-local assertion, fixture, and process/request helpers as needed:
```bash
rg -n "\b(?:assert|debug_assert)(?:_(?:eq|ne|matches))?!\s*\(|\bpanic!\s*\(" tests/   # Rust assertions
rg -n "\b(?:tempfile::Builder|TempDir|(?:std::)?fs::|std::os::unix::fs::symlink)\b" tests/   # Rust fixtures
rg -n "\b(?:assertEquals|assertThat|assertTrue|assertFalse|fail)\s*\(" src test   # Java/JVM assertions
rg -n "\b(?:Files\.|Path\.of|createTempDirectory|File\.createTempFile)\b" src test   # Java/JVM fixtures
rg -n "\b(?:assert|assertResult|shouldBe|shouldEqual|fail)\b" src test   # Scala assertions
rg -n "\b(?:Files\.|Paths\.|java\.io\.File|os\.temp|tempDir)\b" src test   # Scala fixtures
rg -n "\b(?:Assert\.|Should\(\)|FluentAssertions|NUnit\.Framework)\b" .   # C# assertions
rg -n "\b(?:File\.|Directory\.|Path\.GetTemp|TestContext)\b" .   # C# fixtures
```

For Rust projects:

```bash
rg -n "\b(?:assert|debug_assert)(?:_(?:eq|ne|matches))?!\s*\(|\bpanic!\s*\(" tests/
rg -n "\b(?:tempfile::Builder|(?:std::)?fs::(?:create_dir_all|write|read_link|symlink_metadata)|std::os::unix::fs::symlink|symlink)\b" tests/
```
Scan hits inside DSL implementation helpers are classification candidates, not automatic failures. Only scenario-body leaks fail by default.

- [ ] Scenario test bodies use DSL assertion methods rather than direct assertion primitives from the host test framework.
- [ ] Scenario test bodies use DSL setup methods for standard fixtures rather than raw filesystem, temp-resource, or environment operations.
- [ ] DSL implementation internals may still use low-level assertions or fixture operations when they provide resource ownership, phase transitions, or diagnostics.
- [ ] Remaining raw test-body operations are classified as explicit exceptions: platform-specific edge cases, one-off fixture constraints, or DSL self-tests.
- [ ] Exceptions are local, diagnostic, and converted into DSL methods if repetition appears.

**If unclassified leaks remain:** Refactor into fluent Scenario methods before continuing.

## DSL Requirements

Treat the DSL as production code:

- clear happy path behaviour
- failure behaviour with clear messages
- multiple chained assertions
- resource cleanup and lifetime correctness
- phase safety appropriate to the host language (assertions unavailable before action)

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
