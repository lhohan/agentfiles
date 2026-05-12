---
name: use-jujutsu-workspaces
description: Use when running multiple agents or tasks in parallel against a Jujutsu repo with isolated working directories. Use this skill for jj workspace creation, inspection, comparison, cleanup, and stale-workspace recovery.
---

# Use jj Workspaces for Parallel Agent Work

## Table of Contents

- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
- [Core Rule](#core-rule)
- [Glossary](#glossary)
- [When to Use](#when-to-use)
- [Standard Workflow](#standard-workflow)
- [Agent Safety Rules](#agent-safety-rules)
- [Read-Only Review Pattern](#read-only-review-pattern)
- [Multi-Agent Pattern](#multi-agent-pattern)
- [Troubleshooting](#troubleshooting)
- [Command Reference](#command-reference)
- [Minimal Agent Protocol](#minimal-agent-protocol)
- [Skill Summary](#skill-summary)

## Purpose

Use **jj workspaces** to create isolated working directories that share the same underlying repository. This lets agents run code review, tests, refactors, or competing implementations without overwriting each other's files.

Each workspace has its own working-copy commit, shown in `jj log` as `<workspace-name>@`.

Use this skill when:

- Running multiple agents against the same repo.
- Reviewing code while continuing implementation elsewhere.
- Running tests without blocking active edits.
- Trying competing approaches in parallel.
- Avoiding checkout/clobber conflicts between tasks.

## Prerequisites

This skill requires `jj` (Jujutsu) and either `uuidgen` or `date +%s` for unique ID generation; if unavailable, report to the user do not try to work around these facts.

---

## Core Rule

**One workspace per writing task.**

A workspace isolates a working-copy commit. Multiple agents can read or review from the same workspace, but only one agent at a time should produce changes in it.

Create one workspace per task that modifies code.

---

## Glossary

| **Term** | **Definition** |
|---|---|
| **Workspace** | A separate working directory attached to the same repo (same `.jj/` directory). |
| **Working-copy commit** | The current commit that a workspace has checked out. It is a real commit in the commit graph, not a staging area. |
| **`@`** | Shorthand for "the working-copy commit of the current workspace." |
| **`<name>@`** | Shorthand for "the working-copy commit of the workspace named `<name>`." Confirmed by `jj help -k revsets`. |
| **Repo** | The parent directory containing `.jj/`. All workspaces share the same commit graph. Commits are visible from any workspace. |
| **Workspace marker** | Appears as `<name>@` in `jj log` output to distinguish each workspace's working-copy commit. |
| **Isolation boundary** | Only the **filesystem** (each workspace has its own files). The commit graph is shared across all workspaces. |
| **Stale workspace** | A workspace whose working-copy commit was rewritten by another workspace (via `jj rebase`, `jj squash`, `jj abandon`, etc.). |

---

## When to Use

| **Scenario** | **Workspace strategy** |
|---|---|
| Code review | Create `review-${SUFFIX}` workspace at `main` or target revision |
| Test runner | Create `test-${SUFFIX}` workspace so tests do not block editing |
| Agent experiment | Create `agent-a-${SUFFIX}`, `agent-b-${SUFFIX}`, etc. |
| Bug fix while feature is dirty | Create `hotfix-${SUFFIX}` workspace from `main` |
| Large refactor | Create dedicated `refactor-${SUFFIX}` workspace |

---

## Standard Workflow

### 1. Verify you are in a jj repo

Run the **detect-jujutsu** skill first to confirm we are in Jujutsu repo.

Confirm your current state:

```bash
jj workspace root    # shows the current workspace directory (NOT the .jj/ parent)
jj workspace list    # lists all workspaces
jj log               # shows current position
```

### 2. Create a new workspace

**Always specify a revision or bookmark with `-r`.** Workspaces should be created as siblings of the main repo directory.

A workspace name must be unique. Use a suffix that combines the task name with a short UUID (or use `date +%s` if `uuidgen` is unavailable):

```bash
# SUFFIX = <task>-<short-uuid>
SUFFIX=<task>-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../<repo>-${SUFFIX} --name ${SUFFIX} -r main
```

Example for a repo called `my-app` and task 'fix rate limit':

```bash
SUFFIX=fix-rate-limit-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../my-app-${SUFFIX} --name ${SUFFIX} -r main
```

Workspace names must be unique per repo. jj will error if a duplicate name is attempted. The UUID suffix prevents collisions.

### 3. Work only inside the assigned workspace

```bash
cd ../my-app-${SUFFIX}
jj status
```

**Remain inside your own workspace directory.**

Do not edit files in another workspace unless explicitly instructed.

### 4. View all active workspaces

```bash
jj log
jj workspace list
```

Example log output:

```
@  kntqzsqt
○  fix-rate-limit-a3f2c1b8@
○  refactor-auth-d7e81234@
```

Each `<name>@` is that workspace's working-copy commit.

### 5. Compare workspace states

Use `jj log` to find the workspace markers. Inspect a specific workspace's working-copy commit:

```bash
jj diff -r fix-rate-limit-a3f2c1b8@
```

Compare two workspaces:

```bash
jj diff --from fix-rate-limit-a3f2c1b8@ --to refactor-auth-d7e81234@
```

The `<name>@` syntax resolves to the working-copy commit of workspace `<name>`.

### 6. Integrate the chosen result

The task workspace's commits are already in the shared graph. From inside the task workspace, move to the main workspace and rebase the task's commits onto the target branch:

```bash
cd ../my-app
jj rebase -s ${SUFFIX}@ -d main
```

If you want to share or save the result remotely, create and push a bookmark:

```bash
jj bookmark set ${SUFFIX} -r ${SUFFIX}@
jj git push --bookmark ${SUFFIX}
```

### 7. Clean up unused workspaces

`jj workspace forget` and directory deletion are independent — either order works. But deleting the directory first is the safer habit: if you `forget` first, you lose the name-to-directory mapping and may leave a stale directory behind.

```bash
rm -rf ../<repo>-${SUFFIX}
jj workspace forget ${SUFFIX}
```

---

## Agent Safety Rules

### Do

- Use one workspace per writing task.
- Use unique workspace names (append UUID suffix).
- Always specify `-r <revision>` when creating workspaces.
- Create workspaces as siblings of the main repo.
- Run `jj workspace list` before creating new workspaces.
- Keep agent commands scoped to the assigned directory.
- Use `jj log` to inspect all workspace heads.
- Clean up abandoned workspaces.

### Avoid

- **Do not let multiple agents make changes in the same workspace.**
- Assume `@` means the same commit across directories.
- Modify another workspace's `@` from a different workspace.
- Delete a workspace directory without also running `jj workspace forget`.
- Rely on default `-r` (inherit parent); always be explicit.

---

## Read-Only Review Pattern

```bash
cd ~/dev/my-app
SUFFIX=review-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../my-app-${SUFFIX} --name ${SUFFIX} -r main
cd ../my-app-${SUFFIX}
jj status
jj log
# ... run tests, review code ...
```

The original workspace remains untouched:

```bash
cd ../my-app
jj status
```

---

## Multi-Agent Pattern

```bash
# In main workspace:
cd ~/dev/my-app
SUFFIX_A=refactor-auth-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../my-app-${SUFFIX_A} --name ${SUFFIX_A} -r main

SUFFIX_B=fix-rate-limit-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../my-app-${SUFFIX_B} --name ${SUFFIX_B} -r main
```

Assign work:

| **Workspace** | **Agent task** |
|---|---|
| `my-app-${SUFFIX_A}` | Refactor auth middleware |
| `my-app-${SUFFIX_B}` | Fix rate-limit bug |
| `my-app` | Human/manual work |

Review results:

```bash
jj log
jj diff -r ${SUFFIX_A}@
jj diff -r ${SUFFIX_B}@
```

Integrate the selected revision:

```bash
# From inside the task workspace
cd ../my-app
jj rebase -s ${SUFFIX_A}@ -d main
```

Optionally bookmark and push to share remotely:

```bash
jj bookmark set ${SUFFIX_A} -r ${SUFFIX_A}@
jj git push --bookmark ${SUFFIX_A}
```

Clean up rejected workspace:

```bash
rm -rf ../my-app-${SUFFIX_B}
jj workspace forget ${SUFFIX_B}
```

---

## Troubleshooting

### Stale working copy warning

**Cause:** Another workspace rewrote the commit that this workspace was sitting on (via `jj squash`, `jj rebase`, `jj abandon`, etc.).

**Fix from inside the stale workspace:**

```bash
jj workspace update-stale
```

If jj cannot reconcile the state, it may create a recovery commit.

### Unsure which workspace you are in

```bash
jj workspace root    # prints the workspace directory path
jj workspace list    # lists all workspaces with names
jj log               # shows position in the graph
```

Note: `jj workspace root` returns the **current workspace's directory**, not the parent repo path containing `.jj/`.

---

## Command Reference

```bash
# Create a workspace (always use -r):
jj workspace add ../path --name <name> -r <revision>

# Example: create from main with unique ID:
SUFFIX=fix-rate-limit-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../repo-${SUFFIX} --name ${SUFFIX} -r main

# List workspaces:
jj workspace list

# Show current workspace root:
jj workspace root

# Rename current workspace:
jj workspace rename <new-name>

# Forget a workspace:
jj workspace forget <name>

# Fix stale workspace:
jj workspace update-stale

# Inspect workspace markers:
jj log
```

---

## Minimal Agent Protocol

Before starting task work:

```bash
# Step 1: Run detect-jujutsu skill
# Step 2: Confirm state
jj workspace list
jj log
```

Create isolated workspace:

```bash
SUFFIX=<task>-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../<repo>-${SUFFIX} --name ${SUFFIX} -r main
cd ../<repo>-${SUFFIX}
```

After task work:

```bash
jj status
jj log
```

Before cleanup:

```bash
cd ..
rm -rf <repo>-${SUFFIX}
jj workspace forget ${SUFFIX}
```

---

## Skill Summary

Use jj workspaces as the default isolation mechanism for parallel agent work in Jujutsu repositories.

The safe pattern is:

```bash
SUFFIX=<task>-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d- -f1)
jj workspace add ../<repo>-${SUFFIX} --name ${SUFFIX} -r main
cd ../<repo>-${SUFFIX}
# work here only
jj log
jj diff -r ${SUFFIX}@
```

One workspace per task. One working-copy commit per workspace. No file conflicts.
