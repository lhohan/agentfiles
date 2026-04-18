---
name: agentfiles-commit-prefixes
description: Repository-local guidance for agentfiles commit subjects using area prefixes instead of Conventional Commits. Use when committing or the user asks to commit.
---

# Agentfiles Commit Prefixes

Use this skill when writing commit messages for this repository.

## Goal

Use a short area prefix that tells the reader what part of the repository changed.
This is **not** traditional Conventional Commits.

## Current prefix map

- `pi:` — changes under `agents/pi/`
- `dotagents:` — changes under `agents/dotagents/`
- `docs:` — documentation changes (only)
- `build:` — task management or build related changes
- `chore:` — repository-wide or cross-cutting changes, including root files, task scripts

If a change touches one package plus repo-wide docs, choose the prefix that best matches the primary intent.
If no single prefix clearly dominates, use `chore:`.

## Message shape

Format:

`<prefix>: <imperative summary>`

Examples:

- `pi: show all bookmarks in jj footer`
- `build: update stow task documentation`
- `docs: document the commit prefix convention`

Keep the subject short, direct, and in present tense. Add a body only when the rationale needs explanation.

## Maintenance rule

Update this skill whenever the repository evolves:

- add a new prefix for each new direct `agents/<name>/` package
- revise the `chore:` definition when repo-wide files or workflow change
- keep examples in sync with real commit history
