# CIR: web-browser scripts must resolve their npm dependencies

## Intent

Ensure `web-browser` scripts can resolve `ws` by installing `node_modules` in the real repo path and preventing Stow from symlinking it.

## Behavior

GIVEN the `web-browser` skill is stowed via `mise stow dotagents`
WHEN a symlinked script runs (e.g. `~/.agents/skills/web-browser/scripts/cdp.js`)
THEN Node resolves ESM imports from the real repo path (`agents/dotagents/.agents/skills/web-browser/scripts/`), not the symlink location

## Constraints

- `package-lock.json` remains tracked for reproducible installs.
- `node_modules` must not be stowed into `~/.agents`.
- `node_modules` must not be tracked by jj.
- No new automation or package restructuring unless this pattern repeats.

## Decisions

- **Install deps in repo path** because Node ESM resolves symlinks to their real path, so `node_modules` in `~/.agents/...` is silently ignored.
- **Add `.stow-local-ignore` in `agents/dotagents/`** ignoring `node_modules` because `.gitignore` does not control Stow, and the alternative (installing elsewhere) adds indirection.
- Rejected installing in `~/.agents/skills/web-browser/scripts/` because Node ignores modules installed at the symlink location.
- Rejected a global install or `NODE_PATH` hack because a plain `npm ci` in the repo path is the simplest correct fix.

## Date

2026-05-14
