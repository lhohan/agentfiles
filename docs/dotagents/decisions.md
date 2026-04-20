# dotagents decisions

## 2026-04-20 — dotagents owns globally installed reusable skills

### Context
The repo ships multiple agent skills that are needed globally (by Pi, OpenCode, and Codex), but it was unclear whether such skills should live inside `agents-shared` or in `dotagents`.

### Decision
Globally installed reusable skills belong in `agents/dotagents/.agents/skills/`, not inside `agents/agents-shared`.

- `agents-shared` owns: the canonical shared `AGENTS.md` text and tool-specific AGENTS entrypoints.
- `dotagents` owns: globally installed reusable skills under `~/.agents/skills/`.

### Considerations

- Currently supported coding agents in the agentsfiles repository all support the `~/.agents/skills` skills location.

### Consequences
- `agents-shared` stays focused on the shared policy file and its installed paths.
- `dotagents` includes the global skill library.
- Skills vendored into `dotagents` can be maintained copies; upstream changes must be manually synced.

### Skills vendored
- `detect-jujutsu` — vendored from `agent-chisels` repo (version 0.5.0)
- `use-jujutsu` — vendored from `agent-chisels` repo (version 0.3.1)

### Migration
- Removed external symlinks in `~/.agents/skills/` that pointed to `agent-chisels`
- Restowed `dotagents` so Stow owns the new paths
