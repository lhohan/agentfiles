# agentfiles

Repository for agent configuration files. It uses [Mise](https://mise.jdx.dev) to run tasks and [GNU Stow](https://www.gnu.org/software/stow/) to manage symlinks into `~/`.

## Operational Rules

- Treat every direct subdirectory under `agents/` as a package.
- Keep only package directories directly under `agents/`.
- Edit files in this repository, not linked files in `~/`.
- Preserve package directory layout; do not flatten nested files.
- Keep JSON files valid when editing.
- When working inside a package or extension subdirectory, check for a local `AGENTS.md` or `<feature>-AGENTS.md` file for package-specific constraints before making changes.

## Additive setup gate

- Before recommending a new skill, extension, agent, prompt, package, or automation, apply `less-is-more`: use existing setup first, and only suggest an addition for a concrete repeated need.

## Decision logging

- Existing decision logs in `docs/<package>/decisions.md` remain active reference material.
- For new durable change intent and decisions, prefer Change Intent Records (CIRs) under `docs/<package>/cir/` or `docs/cir/` for repo-wide records.
- A CIR may supersede an earlier decision record when it replaces or invalidates that prior decision.

## Stow/Mise Workflow

- Use `mise` as the command entrypoint for Stow operations.
- Canonical Stow options live in `.stowrc` (`--dir=agents`, `--target=~`, `--no-folding`).
- Run `mise check` before `mise stow` or `mise restow`.
- Before stowing a new package, verify each top-level directory inside it is intended as an install target. Use `.stow-local-ignore` to exclude canonical-internal directories.
- No-arg tasks apply to all direct `agents/*` packages.
- Explicit args (for example `mise check pi`) apply only to those packages.

## Documentation Triggers

- Update `README.md` when user-facing commands or workflow behavior changes.
- Update `docs/decisions.md` or `docs/cir/` when package model or operational policy changes.
- Keep package-specific docs and decisions in `docs/<package>/` and `docs/cir/` in sync with package and implementation changes.

## Prompt-Skill Pattern

- Slash-command prompts delegate to skills. Do not inline workflow content.

## Beads Task Hygiene

- After saving a plan file for a beads task, update the task with a link to the plan file: `bd update <id> --description="Plan saved at <saved-path>"`.

## Documenting Decisions

- Record a decision only when it is durable, structural, chosen among plausible alternatives, and useful to a future reader trying to understand why the system is shaped this way.
- Do not record one-time cleanup, migration steps, current version inventory, mechanical implementation detail, or task history.
