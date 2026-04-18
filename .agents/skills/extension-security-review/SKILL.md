---
name: extension-security-review
description: Use when adding an extension, plugin, GitHub repo, npm package, or local plugin and you need a structured security review before installing or enabling it.
version: "0.1.1"
---

# Extension Security Review

Use this skill before installing or enabling any untrusted extension, plugin, package, or repo.
Treat everything as untrusted code until the review says otherwise.

## Table of Contents

- [Inputs](#inputs)
- [Review workflow](#review-workflow)
  - [1. Identify the install surface](#1-identify-the-install-surface)
  - [2. Inspect high-signal files](#2-inspect-high-signal-files)
  - [3. Detect dangerous capabilities](#3-detect-dangerous-capabilities)
  - [4. Audit lifecycle scripts, critically](#4-audit-lifecycle-scripts-critically)
  - [5. Assess dependency risk](#5-assess-dependency-risk)
  - [6. Evaluate maintainer and repo trust signals](#6-evaluate-maintainer-and-repo-trust-signals)
  - [7. Model network and exfiltration risk](#7-model-network-and-exfiltration-risk)
  - [8. Model execution capability](#8-model-execution-capability)
  - [9. Check reproducibility and integrity](#9-check-reproducibility-and-integrity)
  - [10. Return a verdict](#10-return-a-verdict)
- [Default policies](#default-policies)
- [JS-specific rules](#js-specific-rules)
- [Safe install procedure](#safe-install-procedure)
- [Edge cases and fallback](#edge-cases-and-fallback)

## Inputs

Require all of these before reviewing:

- Source URL or path: GitHub, npm, git, tarball, or local path
- Package name
- Exact version, tag, or commit

If any input is missing, request it first or mark risk as elevated.

## Review workflow

### 1. Identify the install surface

Determine:

- install method: npm, git clone, tarball, local copy, etc.
- whether installation executes scripts
- whether the shipped artifact differs from source
- whether a build step produces bundled output

Return:

- `install_path_summary`
- `artifact_traceability`: `clear | partial | unclear`

### 2. Inspect high-signal files

Prioritise:

- `package.json`
- lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- entrypoints: `main`, `bin`
- build scripts
- CI workflows in `.github/workflows/`

Extract:

- lifecycle scripts
- dependency list
- build pipeline
- any install-time automation

### 3. Detect dangerous capabilities

Search for:

- `child_process`, `exec`, `spawn`
- filesystem access outside the project
- network calls: `http`, `https`, `fetch`, `WebSocket`
- `eval`, `new Function`, dynamic import
- credential access: `process.env`, `.env`, `.ssh`, cloud config files

Classify each finding as:

- `required`
- `justified`
- `suspicious`
- `excessive`

### 4. Audit lifecycle scripts, critically

From `package.json`, flag:

- `preinstall`
- `install`
- `postinstall`
- `prepare`

For each script, note:

- the command run
- whether it fetches remote code
- whether it executes shell commands
- whether it is necessary for the package to function

If present without strong justification, raise risk to `High`.

### 5. Assess dependency risk

Check:

- dependency count
- pinned vs loose versions
- native modules
- transitive install scripts
- unknown or low-trust maintainers

Flag:

- large dependency trees
- install-time execution in dependencies
- unusually broad dependency scopes

### 6. Evaluate maintainer and repo trust signals

Check:

- maintainer history
- commit activity consistency
- PR review patterns
- recent ownership changes
- signed commits or tags, if visible

Do not treat stars or download counts as trust signals.

### 7. Model network and exfiltration risk

Determine:

- outbound domains contacted
- whether data leaves the workspace
- whether editor state, secrets, or credentials can be transmitted
- whether runtime fetches remote code

Flag:

- undocumented telemetry
- broad data access without need
- remote code loading at runtime

### 8. Model execution capability

Determine whether the extension can:

- run shell commands
- modify files automatically
- read the full workspace
- access IDE or editor state
- persist changes through hooks or config files

Summarise the blast radius clearly.

### 9. Check reproducibility and integrity

Assess:

- whether a lockfile is present
- whether versions are pinned
- whether release tags match source
- whether install is reproducible without surprise network access

### 10. Return a verdict

Use this output shape:

#### Summary
- Package:
- Source:
- Version:
- Risk: `Low | Medium | High | Reject`

#### Key findings
- Top 3 risk drivers

#### Red flags
- List the most important concerns

#### Positive signals
- List trust-building signals

#### Unknowns
- List anything not verified

#### Recommended usage
- Safe install method, for example `npm install --ignore-scripts` first
- Isolation needed: `yes | no`
- Pin version or commit: `yes | no`

### Verdict thresholds

Use these thresholds when assigning risk:

- `Low` — source and artifact are traceable, version is pinned, no suspicious install-time behaviour, and no meaningful exfiltration path is visible.
- `Medium` — one or more unknowns exist, but there is no direct evidence of hidden install-time execution or broad data exposure.
- `High` — strong risk signals exist, such as install-time scripts, broad filesystem or network access, unpinned dependencies, or partial artifact traceability, but the package is still reviewable.
- `Reject` — hidden install-time execution, untraceable artifacts, unexplained exfiltration or credential access, runtime remote code loading, or any behaviour that cannot be justified safely.

## Default policies

- Treat all extensions as untrusted code.
- Prefer pinned commits and no lifecycle scripts.
- Reject if traceability is unclear or install-time behaviour is hidden.
- Reject unexplained shell, network, or credential access.

## JS-specific rules

Only apply this section when the target is a JavaScript or TypeScript package.

- Treat `package.json` scripts as executable code.
- Assume `npm install` can run arbitrary commands.
- Audit transitive dependencies if risk is above `Medium`.
- Flag dynamic code execution such as `eval` or `Function`.
- Flag unsanitised shell or file operations.
- Prefer deterministic installs with lockfiles.

## Safe install procedure

1. Inspect without execution:
   - `npm install --ignore-scripts`
2. Preview package contents:
   - `npm pack --dry-run`
3. Run in isolation:
   - container, VM, or low-privilege user
   - no secrets in environment
4. Only then enable normally.

## Edge cases and fallback

- If the manifest or equivalent entry file is missing, say so and raise risk.
- If the artifact is binary-only or built elsewhere, mark `artifact_traceability` as `unclear` unless source-to-artifact mapping is explicit.
- If the package is not JavaScript, skip the JS-specific rules and use the ecosystem's native manifest and build files instead.
- If a tool fails, report the failure and continue with direct file inspection rather than guessing.
- If version, tag, or commit is missing, request it before concluding.
