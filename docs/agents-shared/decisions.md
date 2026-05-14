# agents-shared decisions

> **Note:** These decision logs remain active reference material. New durable change intent or decisions should usually be recorded as CIRs. A CIR may supersede an older decision record when it replaces or invalidates that prior decision.

Agents-shared-specific decisions are listed in reverse chronological order (most recent first).

### agents-shared-004: Rename the internal canonical source directory to CANONICAL [Accepted]

**In the context of** the shared `AGENTS.md` source living inside the `agents-shared` package

**Facing** the desire to make the canonical source location visually obvious in directory listings

> **We decided** to rename the internal source directory from `canonical/` to `CANONICAL/` while keeping it ignored by Stow

**To achieve** a more visually distinctive in-repo canonical path without changing the external install targets

**Accepting** the package now depends on preserving the new ignore rule and that only the source directory name changes

### agents-shared-003: Keep reusable global skills outside the shared AGENTS package [Accepted]

**In the context of** sharing reusable skills across Pi, OpenCode, and Codex

**Facing** the need for clear package ownership and a stable install shape

> **We decided** that `dotagents` owns the reusable global skills

**To achieve** clear maintenance boundaries

**Accepting** agent setup is split across two packages

### agents-shared-002: Keep location of the canonical AGENTS.md internal to the package [Accepted]

**In the context of** storing the canonical shared policy file at `agents/agents-shared/CANONICAL/AGENTS.md`

**Facing** Stow's default behaviour of exposing top-level package paths into `~`

> **We decided** to exclude `CANONICAL/` from Stow output with a package-local `.stow-local-ignore`

**To achieve** one in-repo source of truth without creating an unintended `~/CANONICAL/` install target

**Accepting** the package relies on an explicit ignore rule that maintainers must preserve when restructuring the package

### agents-shared-001: Share one canonical AGENTS.md across Pi, OpenCode, and Codex [Accepted]

**In the context of** Pi, OpenCode, and Codex each reading a global `AGENTS.md` file from a different path

**Facing** drift and duplicate maintenance from keeping separate copies

> **We decided** to maintain one canonical `AGENTS.md` in `agents/agents-shared/CANONICAL/AGENTS.md` and expose it through tool-specific entrypoints

**To achieve** a single source of truth for shared global policy across all three tools

**Accepting** the shared instructions must remain tool-neutral and compatible with each tool's loading behaviour
