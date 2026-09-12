# CIR: Gate Vibe File Tools on Third-Party Credential Paths

## Intent

Make an unsandboxed Vibe session ask before its file tools read or write another
tool's credential files. The previous configuration gated only `.env` files, so
an agent could read `~/.omlx/settings.json`, `~/.pi/agent/auth.json`, or
`~/.claude.json` without a prompt.

## Behavior

GIVEN an unsandboxed Vibe session
WHEN `read_file`, `write_file`, or `edit` targets a path matching a sensitive pattern
THEN Vibe requires approval before the tool proceeds

GIVEN an unsandboxed Vibe session
WHEN `grep` matches lines from a file matching a sensitive pattern
THEN Vibe drops those lines from the result instead of showing them

GIVEN a path matching `**/.env`, `**/.env.*`, `**/auth.json`,
`**/.claude.json`, `**/.claude.json.*`, or `**/.omlx/settings.json`
WHEN a file tool targets that path
THEN the tool treats the path as sensitive

GIVEN a `bash` command whose first token is `sudo`
WHEN Vibe evaluates the command
THEN Vibe requires approval

GIVEN the agentfiles repository is stowed
WHEN Vibe reads `~/.vibe/config.toml`
THEN the path is a symlink to `agents/vibe/.vibe/config.toml`

## Constraints

- Vibe rewrites `~/.vibe/config.toml` and replaces the managed symlink with a
  regular file. `scripts/verify-links-task` detects that. Re-stow after any
  Vibe-side configuration change.
- Edit the repository copy, never the linked file in `~`.
- File-tool patterns are matched with Python `PurePath.match`: right-anchored,
  case-insensitive, and `**` spans directory levels.
- `bash` `sensitive_patterns` match only the first token, the command name.
  Path-scoped bash gating is not possible in this Vibe version.
- `[tools.bash] permission = "always"` makes every bash command
  unconditionally allowed except sensitive-command and denylist matches.
- The real secret values stay in `~/.vibe/.env` and `~/.pi/agent/auth.json`.
  No credential value belongs in this repository.

## Decisions

- **Added `**/auth.json`, `**/.claude.json`, `**/.claude.json.*`, and
  `**/.omlx/settings.json`** to `read_file`, `write_file`, `edit`, and `grep`.
  The `auth.json` pattern covers the Pi, Codex, and OpenCode credential stores.
- **Left the `bash` `sensitive_patterns` at `["sudo"]`.** Vibe matches the
  first token only, so an entry such as `"cat ~/.omlx/settings.json"` can never
  fire. Adding `cat` would prompt on every `cat` command. The Safehouse wrapper
  `safe-vibe` is the control for shell reads.
- Rejected `**/.pi/agent/settings.json`. On this host it is a symlink into this
  repository and holds no credential fields, so the pattern would prompt on
  ordinary repository edits. `**/auth.json` covers the real Pi credential file.
- Rejected the broad `**/.config/*/settings.json` and
  `**/.config/*/config.json` globs. No such file exists on this host, and the
  globs would prompt on ordinary application configuration.
- **Merged the drifted live configuration into the repository copy** before
  re-stowing. The live file held an `omlx` provider, a `medgemma` model alias,
  and two allowlist entries that the repository copy lacked. The live file
  replaced the symlink, so the repository copy was stale.
- **Deleted the stale `config.toml` backups in `~/.vibe/`.** Their only unique
  content was two obsolete Obsidian vault allowlist paths, removed during the
  vault extraction.

## Date

2026-09-16
