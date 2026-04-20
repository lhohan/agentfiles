# agents-shared decisions

## 2026-04-20 — One shared AGENTS.md for Pi, OpenCode, and Codex

### Context
Pi, OpenCode, and Codex each read a global `AGENTS.md` file for agent instructions. Maintaining separate copies creates drift and duplicate effort.

### Decision
- Create a single Stow package (`agents/agents-shared`) with one canonical `AGENTS.md` at `agent-rules/AGENTS.md`.
- Expose the canonical file at three tool-specific locations via Stow symlinks:
  - `~/.pi/agent/AGENTS.md` (Pi)
  - `~/.config/opencode/AGENTS.md` (OpenCode)
  - `~/.codex/AGENTS.md` (Codex)
- Within the package, the three entry-point paths are symlinks to the canonical file. Stow resolves these when creating target symlinks, so all three installed paths ultimately resolve to `agents/agents-shared/agent-rules/AGENTS.md`.
- Seed the canonical content from the existing `~/.config/opencode/AGENTS.md`, adapted to be tool-neutral.
- Exclude `agent-rules/` from Stow output using a package-local `.stow-local-ignore` file, so the canonical file remains in-repo but does not create a `~/agent-rules/` directory.
- Globally installed reusable skills (e.g. `detect-jujutsu`, `use-jujutsu`) belong in `agents/dotagents/.agents/skills/`, not inside `agents-shared`.

### Consequences
- Editing the canonical repo file changes the effective instructions for all three tools.
- The `~/agent-rules/` path is not managed by Stow for this package.
- Existing home-directory files at `~/.config/opencode/AGENTS.md` and `~/.codex/AGENTS.md` must be removed (or adopted) before the first `mise stow agents-shared`.
- The `~/.codex/AGENTS.override.md` file must not exist, as Codex uses it to override the main `AGENTS.md`.

### Cleanup performed
- Removed stale symlink `~/.config/opencode/AGENTS.md` (pointed to external dotfiles repo).
- Removed empty file `~/.codex/AGENTS.md`.
- Removed leftover `~/agent-rules/` directory from an earlier stow before the ignore file was added.
