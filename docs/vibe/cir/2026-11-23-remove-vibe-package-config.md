# CIR: Remove the stow-managed Vibe config package

## Intent

Stop managing `~/.vibe/config.toml` from this repository. The Vibe CLI rewrites
that file during normal use and replaces the Stow-managed symlink with a regular
file, so the repo copy of `agents/vibe/.vibe/config.toml` kept diverging from the
live config and every `mise check` / `mise verify` reported a CONFLICT for
`.vibe/config.toml`.

## Behavior

GIVEN the packages under `agents/`
WHEN Stow plans or verifies links
THEN no package manages `~/.vibe/config.toml`, and no CONFLICT is reported for it.

GIVEN a live `~/.vibe/config.toml`
WHEN the Vibe CLI rewrites its own configuration
THEN the file remains a regular file owned by the CLI, and this repository never
writes through or replaces it.

## Constraints

- The real `~/.vibe/config.toml` in the home directory is left untouched; only the
  repository copy is removed.
- Secrets stay in `~/.vibe/.env`, which was never stow-managed.
- If Vibe configuration ever needs to be managed here again, re-add it as a new
  `agents/vibe/` package together with a new CIR explaining why the previous
  removal no longer applies.

## Decisions

- **Removed the whole `agents/vibe/` package** because `config.toml` was its only
  file; an empty package directory would still be picked up by the no-arg Stow
  tasks. Rejected keeping the empty directory "for later" as dead wiring.
- **Rejected Stow `--adopt` or overwrite flags** to force the repo copy over the
  live file, because that would clobber the CLI-owned configuration.
- **Updated the docs that named the package**: README package tree and Vibe
  section, SETUP per-package command examples (now use `zerostack`), and the
  `vibe:` entry in the repo-local commit-prefixes skill.

## Date

2026-11-23

## Supersedes

- `docs/vibe/cir/2026-09-16-vibe-credential-path-gating.md` — only its assumption
  that `~/.vibe/config.toml` is a symlink into `agents/vibe/`; the credential-path
  gating itself is unaffected.
