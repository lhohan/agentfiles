---
name: use-jujutsu
description: This skill should be used for detailed guidance on Jujutsu (jj) VCS operations, including committing, pushing, searching history, and working with revisions/revsets. Use when the user asks "how do I use jj?", "translate git to jj", ask to interact with VCS using jj or for specific jj command syntax.
version: 0.3.3
---

# Using Jujutsu (jj) VCS

This guide provides the definitive instruction set for working with **Jujutsu (jj)**.

## Core VCS Commands

**CRITICAL: This repository uses Jujutsu (jj), not git.** Always use `jj` commands for version control operations.
- Check status: `jj st --no-pager`
- View history: `jj log --no-pager`
- Create commit: `jj commit -m "message"`
- Only commit related changes: `jj commit -m "message" <filesets>`
  - Example: `jj commit -m "fix auth bug" src/auth.rs tests/auth_test.rs`
- Push: `jj git push`
- Push main: `jj bookmark set main -r @- && jj git push`
- Fetch remote: `jj git fetch --remote origin`
- Check remote state: `jj log -r @origin --no-pager -n 5`
- List bookmarks: `jj bookmark list`
- Undo last jj command: `jj undo`
- Help: `jj help` -- use this is you need to research how `jj` works. Or use available search tools.

## Before Any Commit

Run this safety checklist before `jj commit`:
- Run `jj st --no-pager`.
- Commit with `jj commit -m "message"` (or fileset form when committing only related paths).

If location is ambiguous (for example, multiple checkouts/workspaces), confirm with `jj root`.

## Search and History Operations

### History Search
- Use `jj log -r '<revset>'` with appropriate revset expressions
- For searching by message: `jj log -r "description(pattern)"`
- For searching by author: `jj log -r "author(pattern)"`
- For date-based searches: `jj log -r "after(date)"` or `jj log -r "before(date)"`

### Code Search
- Prefer `rg` (ripgrep) or `grep` over any VCS-integrated grep
- Do **not** use `git grep` in jj repos; use `rg` instead

## Working with Revisions (Revsets)
- `@` — Current working-copy parent revision
- `@-` — Parent of current revision
- `<ref>` — Specific revision by ref (supports short hashes)
- `main` — Branch by name
- `ancestors(@)` — All ancestors of current revision
- `descendants(@)` — All descendants of current revision

## Important Constraints
- **Never run** `jj abandon`, `jj split`, `jj squash`, `jj restore` — these rewrite or discard working-copy history/changes. Use `jj commit` with filesets to select changes.
- **Never use `git` commands in `.jj/` repositories**—translate to jj equivalent. This includes read-only commands like `git log` or `git status`.
- **Do not mix `git` and `jj` operations**; they have incompatible internal models.
- If a jj command fails, provide the error message and suggest alternatives.

## Integration with Search and Analysis
- Use `jj log` instead of `git log` to find recent changes.
- Use `jj diff` to compare revisions.
- Never use `git log -S` or `git log -G`; translate to `jj log` with appropriate revsets.
