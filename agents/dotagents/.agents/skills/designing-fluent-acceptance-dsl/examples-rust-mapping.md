# Rust Language Mapping Example

This file shows one concrete mapping from the pseudocode DSL style to Rust.

## Pseudocode to Rust Mapping

```text
GIVEN spec = Cmd.given()              -> Cmd::given()
AND spec.with_skill(...)              -> .with_skill(...)
AND spec.command_prime()              -> .command_prime()
WHEN result = spec.when_run()         -> .when_run()
THEN result.should_succeed()          -> .should_succeed()
AND result.expect_skill(...)          -> .expect_skill(...)
```

## Focused CLI Acceptance Example

```rust
#[test]
fn prime_lists_discovered_skill() {
    Cmd::given()
        .with_skill("test-skill", "Used for test prompts.", "# Test Skill")
        .command_prime()
        .when_run()
        .should_succeed()
        .expect_available_skills()
        .expect_skill("test-skill", "Used for test prompts.");
}
```

## Mandatory Setup Phase

```rust
#[test]
fn primed_agent_loads_named_skill() {
    AgentWithoutSkills::primed()
        .with_skills_from("tests/fixtures/")
        .when_run_with("Load test-skill")
        .should_succeed()
        .expect_output("TEST_SKILL_LOADED");
}
```

`AgentWithoutSkills::primed()` returns a dedicated primed phase. Unprimed execution
is intentionally unavailable from that phase. When the setup prerequisite is truly
mandatory, model each required transition as its own phase type so the unready
method is not available.

## Domain Assertion Extraction

Before extraction, repeated checks expose implementation details in scenario bodies:

```rust
Cmd::given()
    .with_onboard_file("AGENTS.md", "")
    .command_onboard()
    .when_run()
    .should_succeed()
    .expect_stderr_contains("bootstrap instructions written")
    .expect_file_contains("AGENTS.md", "## Mandatory Bootstrap");
```

After extraction, the test names the user-visible behavior directly:

```rust
Cmd::given()
    .with_onboard_file("AGENTS.md", "")
    .command_onboard()
    .when_run()
    .should_succeed()
    .expect_bootstrap_added_notice()
    .expect_file_has_bootstrap("AGENTS.md");
```

## Justified Raw-Fixture Exception

Keep a raw operation local when it exercises a one-off edge the DSL should not absorb yet:

```rust
#[test]
fn reports_permission_error_for_readonly_target() {
    Cmd::given()
        .with_onboard_readonly_file("AGENTS.md", "")
        .command_onboard()
        .when_run()
        .should_fail()
        .expect_stderr_contains("Permission denied");
}
```

This is acceptable when the fixture is specific to one platform or failure mode, remains
diagnostic, and does not repeat across the suite. If multiple tests need the same setup,
extract it into a DSL method.
