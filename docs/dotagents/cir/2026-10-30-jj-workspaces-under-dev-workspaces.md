# CIR: Place jj workspaces under `~/dev/workspaces/<repo>/`

**Date:** 2026-10-30
**Scope:** `agents/dotagents/.agents/skills/use-jujutsu-workspaces/SKILL.md`

## Intent

Keep `~/dev/` limited to main repositories by giving every jj workspace a
dedicated location under a single workspaces root, instead of creating
workspaces as siblings of the main repo directory (`../<repo>-<name>`), which
cluttered `~/dev/`.

## Behavior

GIVEN an agent needs an isolated working directory for a writing task in a
repository under `~/dev/`
WHEN it creates a jj workspace via the `use-jujutsu-workspaces` skill
THEN the workspace directory is `~/dev/workspaces/<repo-name>/<task>-<short-uuid>/`
and the jj workspace name is `<task>-<short-uuid>`

GIVEN a workspace is cleaned up
WHEN its directory is removed and `jj workspace forget` runs
THEN the project directory under `~/dev/workspaces/` may also be removed once
empty

## Constraints

- The workspaces root is fixed at `~/dev/workspaces/`; repositories outside
  `~/dev/` are out of scope for this convention.
- The project subdirectory name equals the main repository's directory name
  (`REPO=$(basename "$(jj workspace root)")` run from the main repo).
- `mkdir -p ~/dev/workspaces/<repo>` must run before `jj workspace add`
  because jj does not create missing parent directories.
- Terminology is "workspace" only, matching jj's own vocabulary; the root
  directory is `workspaces/`, never "worktrees".
- Workspace directories and jj workspace names keep the `<task>-<short-uuid>`
  suffix so jj workspace names stay unique per repo.

## Decisions

- **Use a fixed root `~/dev/workspaces/`** because the goal is an uncluttered
  `~/dev/` containing only main repositories; the previous sibling scheme
  (`../<repo>-<name>`) was rejected because it recreates the clutter.
- **Group workspaces by repository** (`workspaces/<repo>/<name>/`) so all
  workspaces of a project are discoverable in one place.
- **Keep the short UUID suffix in directory and workspace names** because jj
  workspace names must be unique per repo and jj errors on duplicates.
- **Name the root `workspaces/`** to match jj's own terminology.

## Date

2026-10-30
