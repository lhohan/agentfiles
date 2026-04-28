# decisions

Decisions are listed in reverse chronological order (most recent first).

Package-specific decisions live in:
- [`agents-shared/decisions.md`](./agents-shared/decisions.md)
- [`dotagents/decisions.md`](./dotagents/decisions.md)
- [`pi/decisions.md`](./pi/decisions.md)

### AGF-013: Calibrate less-is-more to catch setup wiring without broadening into docs/reporting [Accepted]

> **In the context of** a repo-local `less-is-more` skill that missed several setup-adjacent changes,
> **facing** uncertainty about where the useful trigger boundary sits while the skill is still being exercised,
> **we decided** to broaden the trigger to include changes that add, remove, move, rename, or materially change skills, prompts/templates, agents, extensions, or agent-setup packages, plus the wiring that discovers, loads, injects, scopes, enables, attributes, or gates them,
> **to achieve** a skill that catches setup growth without firing on ordinary documentation, metrics, reporting, or unrelated feature work,
> **accepting** that this is an active calibration and may need further tightening or loosening after more usage.

### AGF-012: Keep saved `/plan` files local-only under `docs/plans/` [Accepted]

> **In the context of** `/plan` ending with an offer to save substantial planning output,
> **facing** the need for a predictable save path without growing committed repo noise,
> **we decided** to keep `docs/plans/YYYY-MM-DD-<topic>.md` as a local working location and ignore `docs/plans/` in version control,
> **to achieve** consistent plan save ergonomics while keeping day-to-day planning artefacts ephemeral,
> **accepting** that plans intended for long-term/shared reference must be promoted manually into tracked documentation.
>
> **Supersedes:** AGF-010.

### AGF-011: Apply less-is-more before proposing setup additions [Accepted]

> **In the context of** deciding whether to add a new skill, extension, agent, prompt, package, or automation to the agent setup,
> **facing** the tendency to recommend additions before checking whether the current setup already solves the problem,
> **we decided** to require `less-is-more` as the first filter for additive setup decisions: prefer the existing setup first and only suggest an addition for a concrete repeated need,
> **to achieve** smaller, need-driven setup growth and fewer unnecessary installs,
> **accepting** that some plausible additions will be rejected or deferred until the need is repeated and specific.

### AGF-010: Use canonical saved-plan location at docs/plans/ [Superseded by AGF-012]

> **In the context of** `/plan` producing substantial implementation plans that should persist beyond the conversation,
> **facing** ad-hoc plan storage and no predictable location for saved plans,
> **we decided** to use `docs/plans/YYYY-MM-DD-<topic>.md` as the canonical saved-plan location,
> **to achieve** a predictable, dated, topic-named convention for finished plans,
> **accepting** that the save handoff should appear only at the end of a substantial completed plan, never mid-planning, and that the directory must be created when first needed.

### AGF-009: Keep decision logs focused on durable structural choices [Accepted]

> **In the context of** maintaining repo-wide and package-specific decision logs,
> **facing** drift and noise from recording cleanup history, migration steps, version inventory, and mechanical implementation detail as decisions,
> **we decided** to record only durable, structural choices selected among plausible alternatives, and to remove task history and other transient details from decision records,
> **to achieve** decision logs that stay accurate, useful, and readable to future maintainers,
> **accepting** that some historical implementation context will be omitted unless it explains a current constraint.

### AGF-008: Add a repo-local "less is more" skill to restrain setup growth [Accepted]

> **In the context of** an agent setup that is growing with skills, prompts, extensions, and packages, and the tendency to adopt tools preemptively or because they exist,
> **facing** the risk of gradual setup bloat that outpaces actual need and makes the configuration harder to understand and maintain,
> **we decided** to add a repo-local `less-is-more` skill at `.agents/skills/less-is-more/SKILL.md` that biases against unnecessary additions, requires speculative additions to be labelled `experimental`, and encourages explicit decision records for meaningful setup changes,
> **to achieve** deliberate, need-driven growth where the motivation for each addition is visible and reviewable,
> **accepting** that the skill itself is an addition that needed justification (this record), that it adds a small amount of overhead to setup decisions, and that it must stay concise or it undermines its own purpose.

### AGF-007: Share one global AGENTS.md across Pi, OpenCode, and Codex [Accepted]

> **In the context of** Pi, OpenCode, and Codex each reading a global `AGENTS.md` for agent instructions _from a different location_,
> **facing** drift and duplication from maintaining separate copies,
> **we decided** to create a single Stow package (`agents-shared`) with one canonical `AGENTS.md` symlinked to all three tool paths internally,
> **to achieve** a single source of truth for global agent instructions,
> **accepting** that the shared instructions must remain tool-neutral and installation conflicts must be handled explicitly rather than hidden in repo automation.

### AGF-006: Frame the repository as agent dotfiles first [Accepted]

> **In the context of** describing the repository to newcomers,
> **facing** wording that makes the agent package layout sound secondary,
> **we decided** to describe the repository as agent dotfiles managed with Stow, with `agents/` as the canonical package layout,
> **to achieve** a clearer first impression that matches the repository's purpose,
> **accepting** that package-level details remain documented separately.

### AGF-005: Treat each direct `agents/` subdirectory as a Stow package [Accepted]

> **In the context of** managing multiple agent configurations with GNU Stow,
> **facing** drift between custom package metadata and the real on-disk package layout,
> **we decided** that every direct subdirectory under `agents/` is a package, with no marker files,
> **to achieve** one canonical package source of truth and simpler maintenance,
> **accepting** that `agents/` must contain only package directories.

> **In the context of** day-to-day link management commands,
> **facing** task scripts that hardcode package names,
> **we decided** to keep `mise` as a thin entrypoint where no-arg operations apply to all packages and explicit args scope to selected packages,
> **to achieve** predictable defaults with intentional per-package control,
> **accepting** dynamic package discovery from `agents/` at runtime.

### AGF-004: Use GNU Stow for symlink management [Accepted]

> **In the context of** installing agent configs into a home directory,
> **facing** the need for predictable, reversible symlink management without custom tooling,
> **we decided** to use GNU Stow as the linking mechanism,
> **to achieve** simple per-agent installation and clean removal,
> **accepting** the extra dependency on Stow.

### AGF-003: Package each agent in its own directory [Accepted]

> **In the context of** a repo that may grow to hold multiple agent configs,
> **facing** the need for a structure that scales without ambiguity,
> **we decided** to give each agent its own directory under `agents/<agent>/`,
> **to achieve** a clear ownership boundary and one consistent expansion path,
> **accepting** one extra directory level per agent.

### AGF-002: Use `agents/` as the top-level layout [Accepted]

> **In the context of** a repository dedicated to agent configuration,
> **facing** the need for a layout that is easy to understand and extend,
> **we decided** to keep agent configs under `agents/` at the repository root,
> **to achieve** a predictable structure that newcomers can navigate quickly and future additions can follow,
> **accepting** one extra directory level for clarity.

### AGF-001: Create a dedicated `agentfiles` repository for agent configuration [Accepted]

> **In the context of** sharing agent configuration, similar to dotfiles repositories,
> **facing** complexity and security concerns of sharing everything inside a main dotfiles setup or my existing setup initially intended to serve this purpose [1](https://github.com/lhohan/agent-chisels),
> **we decided** to create a dedicated `agentfiles` repository, focused on agent configuration only,
> **to achieve** a clearer structure, a narrower scope, and a repository that can grow in a similar spirit to dotfiles,
> **accepting** a separate repository boundary and a gradual move of related material over time.
