# CIR: Generic model-routing evaluation skill with per-agent profiles

**Date:** 2026-08-11
**Scope:** `.agents/skills/evaluate-model-routing/` (SKILL.md + `references/`)

## Intent

Provide a repeatable, evidence-first way to evaluate whether the right model runs
each stage of a coding-agent pipeline, starting with Pi's five routed stages
(Plan → Review Plan → Implement → Review → Break). Recurring model releases and
the need for structured routing reviews motivated a lean repository-local skill
rather than ad-hoc per-review notes.

## Behavior

GIVEN a coding-agent profile exists under `references/agents/`
WHEN the skill evaluates the agent's model routing
THEN it first verifies the profile against live configuration (prompt `model:`
frontmatter chains, `enabledModels`), stops with the exact mismatch on any
verification failure, and otherwise produces a recommendation-only review that
explicitly supports "no change"

AND the run must not read `~/.pi/agent/auth.json`, must not mutate any agent
configuration, and must not apply routing changes without explicit user approval

AND the review covers capability investigation (task → capabilities), tagged
evidence (source URL + type), operational reality (context limits, pricing,
model-store catalog), model-family diversity, and A/B validation/rollback
criteria.

## Constraints

- Profiles are Markdown with YAML frontmatter (agent-specific routes and source
  paths only); the heading is the capability ID in `capabilities.md`, with no
  redundant id/name frontmatter.
- Live tool configuration is authoritative; profiles document, never replace, it.
- Stale profile documentation is a hard gate: report the mismatch and stop;
  never auto-repair.
- Route comparison compares ordered lists of exact `provider/model-id` tokens
  (prompt `model:` split on commas vs. profile `routes` by rank) — no semantic
  interpretation.
- Profile task set must be symmetric with the agent's prompt-stage set.
- `defaultModel`/`defaultProvider` are out of scope for Pi (volatile per `/model`
  switch); `session_start_model` is in scope (fixed).
- The skill lives at `.agents/skills/evaluate-model-routing/` and must not be
  added to `agents/dotagents`, stowed globally, or installed into
  `~/.agents/skills/`.
- No new provider, package, extension, or automation is required.
- The human-maintained `references/providers.md` documents provider
  availability; the skill never probes auth.
- Evidence policy: curated defaults always consulted (Aider Polyglot Leaderboard,
  Artificial Analysis, LMArena) plus open-ended search; every data point tagged
  with source URL and type (`benchmark`, `crowd-sourced`, `provider-doc`, `news`,
  `unverified`); unverified ≠ rejected.
- Cost is a tiebreaker between sufficiently comparable quality options; no
  weighted scoring or synthetic rankings; models never vote on themselves.

## Decisions

- **Generic evaluator + per-agent Markdown profiles** (`agents/pi.md` first)
  because the evaluation process is shared while routes, sources, and constraints
  are agent-specific; OpenCode/Codex can be added later without changing the
  generic process.
- **Shared `tasks.md` / `capabilities.md` / `providers.md` modules** so agents
  reuse task→capability mappings and evidence methods instead of duplicating them.
- **Live configuration as source of truth**, with profile verification gating
  research — a profile that disagrees with the prompts or settings is a stopped
  evaluation, not a repair opportunity.
- Rejected **globally stowing the skill** because it is repository-specific and
  must stay available only here (AGENTS.md additive-setup gate; `less-is-more`).
- Rejected **pure YAML configuration files** for profiles in favor of Markdown
  with YAML frontmatter, keeping prose (notes, checklist, constraints) with the
  structured route data and avoiding a separate schema/parser surface.
- Rejected **automated auth/key checking** because `auth.json` is out of bounds;
  provider availability stays a human-maintained column confirmed manually.
- Rejected **defaulting to change recommendations** — "no change" is a
  first-class result, and applying any recommendation requires explicit user
  approval.

## Impact

- Pi routing reviews follow one verifiable workflow instead of ad-hoc comparisons.
- Profile drift is caught and reported at the source path instead of being
  silently papered over.
- Future model releases have a defined entry point for re-evaluation
  (validation step 13 of the plan).
