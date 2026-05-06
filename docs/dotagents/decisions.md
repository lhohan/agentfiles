# dotagents decisions

Dotagents-specific decisions are listed in reverse chronological order (most recent first).

### dotagents-007: Vendor web-browser skill from mitsuhiko/agent-stuff [Accepted]

> **In the context of** needing browser automation for project "web vision" work,
> **facing** the choice between installing the upstream `mitsupi` npm package (bundling 20+ skills) or vendoring the single web-browser skill,
> **we decided** to vendor `web-browser` as a standalone skill under `agents/dotagents/.agents/skills/web-browser/`, with provenance attribution pointing to `mitsuhiko/agent-stuff` (commit permalink in source metadata),
> **to achieve** a lean, locally-maintained browser automation capability without pulling in unrelated upstream skills,
> **accepting** that upstream updates must be reviewed and synced manually, and that an alternative integration path exists via `pi package add mitsupi`.

### dotagents-006: Vendor Karpathy guidelines as a standalone reusable skill [Accepted]

> **In the context of** repeatedly needing the same coding-behaviour guardrails during implementation work,
> **facing** the choice between folding them into `AGENTS.md`, merging them into `less-is-more`, or vendoring a dedicated skill,
> **we decided** to vendor `karpathy-guidelines` as its own skill under `agents/dotagents/.agents/skills/`, with provenance metadata pointing to `forrestchang/andrej-karpathy-skills`, and to leave the plugin/Cursor packaging out of scope,
> **to achieve** reusable guidance that can be enabled independently from repo policy text without widening the shared instructions package,
> **accepting** that the guidance overlaps with existing agent rules and therefore must stay concise rather than becoming another catch-all policy file.

### dotagents-005: interrogate-plan recovers grill-me branch coverage without full verbosity [Accepted]

> **In the context of** interrogate-plan stopping too early—accepting an implementable plan while material semantic decisions remained live,
> **facing** the choice between replacing it with grill-me (exhaustive) or revising it to be compressed-but-not-shallow,
> **we decided** to revise interrogate-plan so that it enumerates live semantic decisions before finalising a plan, uses a bounded threshold for low-risk classification (local, reversible, non-user-visible), and asks when risk depends on product intent or policy—keeping the skill general-purpose and repository-agnostic,
> **to achieve** a compressed interrogation that surfaces hidden decision branches without the verbosity of full grill-me questioning,
> **accepting** that the skill is longer, and that the agent still judges low-risk technical leftovers without user input.

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
