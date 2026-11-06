# CIR: Remove the `web-browser` skill

**Date:** 2026-11-09
**Scope:** `agents/dotagents/.agents/skills/web-browser/` (removed), `agents/dotagents/.stow-local-ignore`

## Intent

Remove the vendored `web-browser` skill so the repository stops maintaining a
browser-automation capability that is not used. The skill carried its own npm
dependency, a stow ignore rule, and a stow-ordering trap for a capability that
did not earn its maintenance cost.

## Behavior

GIVEN the `dotagents` package is stowed
WHEN an agent looks for skills under `~/.agents/skills/`
THEN no `web-browser` skill exists, and no `node_modules` directory is expected
under `agents/dotagents/`

GIVEN a future need for browser automation
WHEN someone considers re-adding it
THEN they re-vendor the upstream skill (source recorded in decision
`dotagents-007`) instead of assuming a local copy still exists

## Constraints

- Stow owns the links, so `mise unstow dotagents` must run before the source
  files are deleted; `stow -D` needs the source tree to know what to unlink.
- `node_modules` installed at `~/.agents/skills/web-browser/scripts/` is not
  stow-managed and must be deleted by hand.
- Runtime prerequisites (Chrome/Chromium, Node.js, the `ws` package) exist only
  for this skill, so removing the skill removes that requirement.

## Decisions

- **Remove the whole skill rather than keep it dormant** because an unused
  vendored skill still costs a dependency install, a stow ignore rule, and
  documentation maintenance.
- **Drop the `node_modules` entry from `agents/dotagents/.stow-local-ignore`**
  because that rule existed only for this skill; it returns with the skill if
  the skill returns.
- **Delete the skill-specific doc and dependency CIR** rather than keeping them
  as archaeology, because `dotagents-007` already records the provenance path
  needed to re-vendor.
- Rejected keeping the skill as "experimental" (the treatment used for
  `use-jujutsu-workspaces`) because the skill's dependency-install trap made
  dormant-but-present more expensive than absent-and-documented.

## Date

2026-11-09

## Supersedes

- Decision `dotagents-007` in `docs/dotagents/decisions.md`
- `docs/dotagents/cir/2026-05-14-web-browser-scripts-must-resolve-deps.md` (removed with the skill)
