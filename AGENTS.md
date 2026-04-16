# agentfiles

Repository for agent configuration files. It uses [Mise](https://mise.jdx.dev) to run tasks and [GNU Stow](https://www.gnu.org/software/stow/) to manage symlinks into `~/`.

## Operational Rules

- Treat every direct subdirectory under `agents/` as a package.
- Keep only package directories directly under `agents/`.
- Edit files in this repository, not linked files in `~/`.
- Preserve package directory layout; do not flatten nested files.
- Keep JSON files valid when editing.

## Stow/Mise Workflow

- Use `mise` as the command entrypoint for Stow operations.
- Canonical Stow options live in `.stowrc` (`--dir=agents`, `--target=~`, `--no-folding`).
- Run `mise check` before `mise stow` or `mise restow`.
- No-arg tasks apply to all direct `agents/*` packages.
- Explicit args (for example `mise check pi`) apply only to those packages.

## Documentation Triggers

- Update `README.md` when user-facing commands or workflow behavior changes.
- Update `decisions.md` when package model or operational policy changes.
