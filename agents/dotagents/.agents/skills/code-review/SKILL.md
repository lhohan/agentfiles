---
name: code-review
description: >
  Use when performing structured code reviews of open changes that need operational verification, project-rule checks, and actionable findings across bugs, security, quality, and compliance.
---

# Code Review Skill

Use this skill when performing code reviews that require thorough analysis beyond automated checks.

## When to Use

- Reviewing uncommitted changes before commit
- Interactive code review sessions (not automated post-execution reviews)
- Deep-dive reviews requiring project-specific compliance checks
- Reviews needing operational verification (build/test status)

## Table of Contents

- [When to Use](#when-to-use)
- [Review Process](#review-process)
- [Constraints](#constraints)
- [Example Usage](#example-usage)

## Review Process

### STEP 0 - Operational Verification (MANDATORY)

Before analyzing code, verify it actually works:

1. Identify project type (look at Cargo.toml, package.json, pyproject.toml, go.mod, etc.)
2. Run build: `cargo build`, `npm run build`, `go build ./...`, etc.
3. Run tests: `cargo test`, `npm test`, `pytest`, `go test ./...`, etc.
4. **If build or tests fail:**
   - Log this as Critical Issue #1 with the exact error
   - "Tests exist" ≠ "Tests work" - always verify execution

### Code Inspection

1. Inspect uncommitted changes:
   - `jj st` - Check status
   - `jj diff` - View changes (prefer jj over git in this repo)
   - `jj log` - View relevant context
   - `jj show` - Inspect specific commits when needed

2. Summarize scope:
   - Files touched
   - Rough size of changes
   - Key areas impacted

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
- jj-only workflow (no git commands)
- No secret files committed
- nix/shell style conventions
- Conventional commits guidance when relevant

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
- Prefer jj commands; avoid git commands in this repo
- Avoid nitpicks unless they prevent bugs or reduce maintenance cost
- Every issue must be actionable with a concrete fix

## Example Usage

```
User: "Review my changes before I commit"
→ Load skill, follow STEP 0, inspect changes, review 4 axes, output structured findings
```