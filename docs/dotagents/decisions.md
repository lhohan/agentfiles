# dotagents decisions

Dotagents-specific decisions are listed in reverse chronological order (most recent first).

### dotagents-012: Check for CIRs during task completion [Accepted]

**In the context of** using `landing-the-plane` as the shared completion workflow instead of adding more global `AGENTS.md` process text

**Facing** the need to remember when completed changes deserve Change Intent Records without making CIR creation mandatory for every task

> **We decided** to add a Change Intent Record check to `landing-the-plane`, delegating detailed guidance to `document-change-intentions-using-change-intent-records`

**To achieve** consistent end-of-task consideration of whether change intent, constraints, behaviour, and rejected alternatives need durable documentation before the final commit

**Accepting** the specialized CIR skill owns the criteria, template, examples, and workflow guidance.

### dotagents-011: Move `document-architectural-decisions` into dotagents [Accepted]

**In the context of** `agentfiles` now being the main repository for managing my skills

**Facing** the need to keep the latest `document-architectural-decisions` skill in the managed skill package

> **We decided** to add `document-architectural-decisions` to `agents/dotagents/.agents/skills/`

**To achieve** one current source for the globally installed skill

**Accepting** the old copy in `agent-chisels` should be removed rather than kept in parallel

### dotagents-010: Add CIR skill for change-level intent records [Accepted]

**In the context of** needing reusable guidance for documenting the intent, behaviour, constraints, and decisions behind non-trivial changes

**Facing** the choice between relying on ADR guidance, adding automation, or adding a small dedicated skill

> **We decided** to add `document-change-intentions-using-change-intent-records` under `agents/dotagents/.agents/skills/` as a self-contained skill

**To achieve** lightweight change-level documentation to capature past decisions and remember the intention of changes made. This complements ADRs, design documents, commit messages, and tests without adding runtime machinery

**Accepting** CIRs must remain selective and should be skipped for trivial or obvious changes to avoid process bloat and overlap with current decision record mechanisms.

### dotagents-009: Tighten `interrogate-plan` with explicit interrogation mode [Accepted]

**Amends** dotagents-005.

**In the context of** `interrogate-plan` still being able to produce an implementation plan without asking questions when material branches were unresolved

**Facing** the choice between adding session-specific rules for the observed failure or strengthening the generic grill-me-derived behaviour

> **We decided** to amend `dotagents-005` by making `interrogate-plan` enter an explicit interrogation mode after inspection, walk unresolved plan branches one by one, give a recommended answer with each question, and only skip questions after stating why every material branch is already resolved by repository evidence or explicit task text

**To achieve** the intended grill-me branch coverage without overfitting the skill to one observed planning failure

**Accepting** the skill becomes more forceful and may ask more questions before allowing `write-implementation-plan`

### dotagents-008: Document `use-jujutsu-workspaces` as experimental until it proves out [Accepted]

**In the context of** adding a reusable skill for `jj workspace` workflows

**Facing** the risk of presenting a newly added skill as equally established with the core shared skills even though it is not yet in active use

> **We decided** to keep `use-jujutsu-workspaces` installed in `agents/dotagents/.agents/skills/`, but document it in `README.md` as **experimental** and **under construction** rather than as part of the default Jujutsu guidance

**To achieve** a truthful inventory that exposes the capability without overstating its maturity or recommending it as standard practice before it has earned that status

**Accepting** the skill may evolve, be rewritten, or be removed if it does not solve a real repeated need

### dotagents-007: Vendor web-browser skill from mitsuhiko/agent-stuff [Accepted]

**In the context of** needing browser automation for project "web vision" work

**Facing** the choice between installing the upstream `mitsupi` npm package (bundling 20+ skills) or vendoring the single web-browser skill

> **We decided** to vendor `web-browser` as a standalone skill under `agents/dotagents/.agents/skills/web-browser/`, with provenance attribution pointing to `mitsuhiko/agent-stuff` (commit permalink in source metadata)

**To achieve** a lean, locally-maintained browser automation capability without pulling in unrelated upstream skills

**Accepting** upstream updates must be reviewed and synced manually, and that an alternative integration path exists via `pi package add mitsupi`

### dotagents-006: Vendor Karpathy guidelines as a standalone reusable skill [Accepted]

**In the context of** repeatedly needing the same coding-behaviour guardrails during implementation work

**Facing** the choice between folding them into `AGENTS.md`, merging them into `less-is-more`, or vendoring a dedicated skill

> **We decided** to vendor `karpathy-guidelines` as its own skill under `agents/dotagents/.agents/skills/`, with provenance metadata pointing to `forrestchang/andrej-karpathy-skills`, and to leave the plugin/Cursor packaging out of scope

**To achieve** reusable guidance that can be enabled independently from repo policy text without widening the shared instructions package

**Accepting** the guidance overlaps with existing agent rules and therefore must stay concise rather than becoming another catch-all policy file

### dotagents-005: interrogate-plan recovers grill-me branch coverage without full verbosity [Accepted]

**In the context of** interrogate-plan stopping too early—accepting an implementable plan while material semantic decisions remained live

**Facing** the choice between replacing it with grill-me (exhaustive) or revising it to be compressed-but-not-shallow

> **We decided** to revise interrogate-plan so that it enumerates live semantic decisions before finalising a plan, uses a bounded threshold for low-risk classification (local, reversible, non-user-visible), and asks when risk depends on product intent or policy—keeping the skill general-purpose and repository-agnostic

**To achieve** a compressed interrogation that surfaces hidden decision branches without the verbosity of full grill-me questioning

**Accepting** the skill is longer, and that the agent still judges low-risk technical leftovers without user input

### dotagents-004: Delegate `/implement` to vendored implementation skills [Accepted]

**In the context of** replacing the stub `/implement` prompt with reusable implementation guidance

**Facing** the choice between embedding implementation rules directly in the prompt or delegating to reusable skills

> **We decided** to keep `/implement` as a thin prompt that delegates to vendored `build-walking-skeleton` for implementation strategy and vendored `verification-before-completion` for completion claims, with `test-driven-development` maintained as a sub-skill dependency of `build-walking-skeleton`

**To achieve** reusable, inspectable implementation guidance without prompt bloat

**Accepting** the shared skills package now owns and maintains these vendored implementation skills

### dotagents-003: Add planning skills interrogate-plan and write-implementation-plan [Accepted]

**In the context of** Pi's `/plan` prompt

**Facing** a bloated monolith prompt

> **We decided** to delegate analysis and plan writing in `plan` to two skills, `interrogate-plan` and `write-implementation-plan`, under `agents/dotagents/.agents/skills/`, derived from the useful behaviour of [`grill-me`](https://github.com/mattpocock/skills/blob/main/grill-me/SKILL.md) and the plan-drafting conventions of [`writing-plans`](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md)

**To achieve** a lean `/plan` prompt with clear responsibilities and reuse of existing skills

**Accepting** these skills are maintained locally

### dotagents-002: Keep vendored shared skills in this repository [Accepted]

**In the context of** relying on reusable skills that were originally sourced from external repositories

**Facing** the need for a stable local source of truth after migrating away from `agent-chisels`

> **We decided** to maintain vendored copies of shared skills inside `agents/dotagents/.agents/skills/`, treat that directory's contents as the ground-truth inventory, and treat this repository as their maintained source of truth

**To achieve** reproducible installs and local control over updates to globally shared skills

**Accepting** upstream changes must be reviewed and synced manually when they are still relevant

### dotagents-001: Use dotagents for globally installed reusable skills [Accepted]

**In the context of** providing reusable skills to multiple coding agents from one home-directory location

**Facing** the need to separate shared capabilities from shared AGENTS policy text

> **We decided** to install globally reusable skills from the `dotagents` package under `~/.agents/skills/`

**To achieve** a dedicated ownership boundary for cross-agent skills and keep `agents-shared` focused on shared `AGENTS.md` policy files

**Accepting** agent setup is split across two packages
