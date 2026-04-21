# agents-shared decisions

Agents-shared-specific decisions are listed in reverse chronological order (most recent first).

### agents-shared-003: Keep reusable global skills outside the shared AGENTS package [Accepted]

> **In the context of** sharing reusable skills across Pi, OpenCode, and Codex,
> **facing** the need for clear package ownership and a stable install shape,
> **we decided** that `dotagents` owns the reusable global skills,
> **to achieve** clear maintenance boundaries,
> **accepting** that agent setup is split across two packages

### agents-shared-002: Keep location of the canonical AGENTS.md internal to the package [Accepted]

> **In the context of** storing the canonical shared policy file at `agents/agents-shared/agent-rules/AGENTS.md`,
> **facing** Stow's default behaviour of exposing top-level package paths into `~`,
> **we decided** to exclude `agent-rules/` from Stow output with a package-local `.stow-local-ignore`,
> **to achieve** one in-repo source of truth without creating an unintended `~/agent-rules/` install target,
> **accepting** that the package relies on an explicit ignore rule that maintainers must preserve when restructuring the package.

### agents-shared-001: Share one canonical AGENTS.md across Pi, OpenCode, and Codex [Accepted]

> **In the context of** Pi, OpenCode, and Codex each reading a global `AGENTS.md` file from a different path,
> **facing** drift and duplicate maintenance from keeping separate copies,
> **we decided** to maintain one canonical `AGENTS.md` in `agents/agents-shared/agent-rules/AGENTS.md` and expose it through tool-specific entrypoints,
> **to achieve** a single source of truth for shared global policy across all three tools,
> **accepting** that the shared instructions must remain tool-neutral and compatible with each tool's loading behaviour.
