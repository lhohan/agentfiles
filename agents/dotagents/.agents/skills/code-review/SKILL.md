---
name: code-review
description: >
  Use when reviewing code changes (diffs, PRs, or commits) that need operational verification, project-rule checks, and actionable findings across bugs, security, quality, and compliance.
---

# Code Review Skill

Use this skill when performing code reviews that require thorough analysis beyond automated checks.

## When to Use

- Reviewing uncommitted changes before commit
- Pull request reviews
- Historical commit or branch inspection
- Interactive code review sessions
- Reviews needing operational verification (build/test status)

## Prerequisites

- Access to the code to review (diff, PR, commit, or working tree)
- Build toolchain for the project (for STEP 0 verification)
- Test suite available (if tests don't exist, note that as a finding)

## Table of Contents

- [When to Use](#when-to-use)
- [Review Process](#review-process)
- [Constraints](#constraints)
- [Example Usage](#example-usage)

## Review Process

### STEP 0 - Operational Verification (MANDATORY)

Before analyzing code, verify it actually works:

1. Load the code to review — uncommitted diff, PR, commit, or pasted code. Inspect the changes using the project's version control system (AGENTS.md governs which VCS to use).
2. If no changes are present, report "Nothing to review" and stop.
3. Identify project type (look at Cargo.toml, package.json, pyproject.toml, go.mod, etc.)
4. Run build: see project commands first, if not found then `cargo build`, `npm run build`, `go build ./...`, etc.
5. Run tests: see project commands first, if not found then `cargo test`, `npm test`, `pytest`, `go test ./...`, etc.
6. **If build or tests fail:** log as Critical Issue #1 with the exact error and stop.

If the build environment is not available (e.g. reviewing a PR remotely), note this limitation and proceed with analysis only.

### Scope Summary

Summarize scope:

1. Files touched
2. Rough size of changes
3. Key areas impacted

### Review Axes (Cover All)

Review along these 4 axes, always addressing each even if "no issues found":

**1. Bugs & Correctness**
- Logic errors
- Edge cases
- Error handling
- Test coverage

**2. Security**
- Secrets exposure
- Injection risks (SQL, command, XSS)
- Authz/authn pitfalls
- Unsafe shell usage
- Unsafe file permissions
- Supply-chain risks

**3. Quality & Maintainability**
- Clarity and naming
- API boundaries
- Code duplication
- Types/contracts
- Performance footguns (avoid micro-nitpicks)

**4. Compliance (Project Rules)**
- Project style and naming conventions
- No secrets or credentials in committed files
- Shell and scripting conventions (e.g. nix/shell style)
- Commit message quality and conventions when relevant

### Issue Format

For each issue found:

1. **Concise title** - Clear problem statement
2. **Severity** - low/med/high
3. **Confidence** - low/med/high
4. **Explanation** - Why it matters
5. **Concrete fix** - Code snippet or exact change suggestion

### Output Structure

```
## Scope
[Files touched, size, key areas]

## Positives (1-3)
- [Good thing about the code]

## Findings

### Bugs & Correctness
- **[SEVERITY/CONFIDENCE]** Title
  - Explanation
  - Fix: [code suggestion]

### Security
- **[SEVERITY/CONFIDENCE]** Title
  - Explanation
  - Fix: [code suggestion]

### Quality & Maintainability
- **[SEVERITY/CONFIDENCE]** Title
  - Explanation
  - Fix: [code suggestion]

### Compliance
- **[SEVERITY/CONFIDENCE]** Title
  - Explanation
  - Fix: [code suggestion]

## Suggested Follow-ups
- [Tests to run]
- [Checks to perform]
- [Verification steps]
```

## Constraints

- Read-only mode — do not edit files during review
- Avoid nitpicks unless they prevent bugs or reduce maintenance cost
- Every issue must be actionable with a concrete fix

## Example Usage

User: "Review my changes before I commit"
→ Load skill, run STEP 0 to verify build and tests, inspect the diff, review across all 4 axes, output structured findings with severity and concrete fixes.

User: "Review this PR — tests pass but something feels off"
→ Skip STEP 0 build verification (already passing in CI), focus on Security and Quality axes, look for subtle logic errors or API boundary issues.
