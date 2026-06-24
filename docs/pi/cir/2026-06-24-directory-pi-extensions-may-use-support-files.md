# CIR: directory-based Pi extensions may use colocated support files

## Intent

Allow a Pi extension in this repo to live as a directory with its own `index.ts` and colocated support files when a single flat `.ts` file would make the extension harder to maintain.

## Behavior

GIVEN a Pi extension under `agents/pi/.pi/agent/extensions/` needs colocated documentation, config metadata, or package metadata
WHEN the extension is installed through this repo's Stow workflow
THEN the extension may be represented as `extensions/<name>/index.ts` with those support files in the same directory

GIVEN that local npm dependencies create `node_modules`
WHEN `mise stow pi` links the package into `~/.pi/agent`
THEN `node_modules` must stay in the repo-backed extension directory and must not be stowed into `~/.pi/agent`

## Constraints

- This repo still does not ship default user guardrail config files.
- Dependency installs remain manual and explicit after stow if a future directory extension needs them.
- The pattern is justified only when directory-local support files materially improve maintenance.
- Stow ignore rules must live at the package root where Stow actually reads them.

## Decisions

- **Permit directory-style Pi extensions** for cases like `guardrails` that are clearer with an `index.ts` entrypoint plus colocated docs and metadata.
- **Keep the entrypoint at `index.ts`** so Pi's built-in extension auto-discovery works without `settings.json` changes.
- **Use package-root Stow ignores for nested `node_modules`** if local dependencies are introduced, because a nested `.stow-local-ignore` alone does not stop Stow from linking installed dependencies.
- Rejected flattening the feature back into one `.ts` file because colocating implementation and documentation under one extension directory keeps the contract easier to find.

## Date

2026-06-24
