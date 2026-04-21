# dotagents decisions

Dotagents-specific decisions are listed in reverse chronological order (most recent first).

### dotagents-002: Keep vendored shared skills in this repository [Accepted]

> **In the context of** relying on reusable skills that were originally sourced from external repositories,
> **facing** the need for a stable local source of truth after migrating away from `agent-chisels`,
> **we decided** to maintain vendored copies of shared skills inside `agents/dotagents/.agents/skills/`, treat that directory's contents as the ground-truth inventory, and treat this repository as their maintained source of truth,
> **to achieve** reproducible installs and local control over updates to globally shared skills,
> **accepting** that upstream changes must be reviewed and synced manually when they are still relevant.

### dotagents-001: Use dotagents for globally installed reusable skills [Accepted]

> **In the context of** providing reusable skills to multiple coding agents from one home-directory location,
> **facing** the need to separate shared capabilities from shared AGENTS policy text,
> **we decided** to install globally reusable skills from the `dotagents` package under `~/.agents/skills/`,
> **to achieve** a dedicated ownership boundary for cross-agent skills and keep `agents-shared` focused on shared `AGENTS.md` policy files,
