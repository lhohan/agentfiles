# Decision-log

Decisions are listed in reverse chronological order (most recent first).

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
