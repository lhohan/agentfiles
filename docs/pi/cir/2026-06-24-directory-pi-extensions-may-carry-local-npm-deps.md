# CIR: directory-based Pi extensions may carry local npm deps

## Intent

Allow a Pi extension in this repo to live as a directory with its own `index.ts`, `package.json`, and local runtime dependencies when the extension needs a non-bundled npm package.

## Behavior

GIVEN a Pi extension under `agents/pi/.pi/agent/extensions/` needs its own runtime dependency
WHEN the extension is installed through this repo's Stow workflow
THEN the extension may be represented as `extensions/<name>/index.ts` with a colocated `package.json`

GIVEN that local npm dependencies create `node_modules`
WHEN `mise stow pi` links the package into `~/.pi/agent`
THEN `node_modules` must stay in the repo-backed extension directory and must not be stowed into `~/.pi/agent`

## Constraints

- This repo still does not ship default user guardrail config files.
- Dependency installs remain manual and explicit after stow.
- The pattern is justified only when Pi's bundled imports are insufficient.
- Stow ignore rules must live at the package root where Stow actually reads them.

## Decisions

- **Permit directory-style Pi extensions** for cases like `guardrails` that need a local dependency (`yaml`).
- **Keep the entrypoint at `index.ts`** so Pi's built-in extension auto-discovery works without `settings.json` changes.
- **Use package-root Stow ignores for nested `node_modules`** because a nested `.stow-local-ignore` alone does not stop Stow from linking installed dependencies.
- **Require a documented post-stow `npm install` step** instead of adding more automation for a single extension.
- Rejected flattening the feature back into one `.ts` file because it would either drop YAML support or push inlined parsing complexity into a place where a small dependency is cleaner.

## Date

2026-06-24
