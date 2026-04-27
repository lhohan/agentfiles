# dotagents decisions

Dotagents-specific decisions are listed in reverse chronological order (most recent first).

### dotagents-004: Delegate `/implement` to vendored implementation skills [Accepted]

> **In the context of** replacing the stub `/implement` prompt with reusable implementation guidance,
> **facing** the choice between embedding implementation rules directly in the prompt or delegating to reusable skills,
> **we decided** to keep `/implement` as a thin prompt that delegates to vendored `build-walking-skeleton` for implementation strategy and vendored `verification-before-completion` for completion claims, with `test-driven-development` maintained as a sub-skill dependency of `build-walking-skeleton`,
> **to achieve** reusable, inspectable implementation guidance without prompt bloat,
> **accepting** that the shared skills package now owns and maintains these vendored implementation skills.

### dotagents-003: Add planning skills interrogate-plan and write-implementation-plan [Accepted]

> **In the context of** Pi's `/plan` prompt,
> **facing** a bloated monolith prompt,
> **we decided** to delegate analysis and plan writing in `plan` to two skills, `interrogate-plan` and `write-implementation-plan`, under `agents/dotagents/.agents/skills/`, derived from the useful behaviour of [`grill-me`](https://github.com/mattpocock/skills/blob/main/grill-me/SKILL.md) and the plan-drafting conventions of [`writing-plans`](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md),
> **to achieve** a lean `/plan` prompt with clear responsabilities and reuse of existing skills,
> **accepting** that these skills are maintained locally.

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
