---
name: evaluate-model-routing
description: >
  Evaluate model routing across coding agents (Pi, OpenCode, Codex). Verifies an
  agent profile against live configuration, researches capability evidence, and
  recommends routing changes — or explicitly "no change" — without mutating
  configuration. Use when reviewing whether the right model runs each stage of
  an agent pipeline, or when a new model release should trigger a routing
  re-evaluation.
---

# Evaluate Model Routing

Repository-local skill (`.agents/skills/`). Do not stow or install globally.

## Inputs

- Agent name (must have a profile under `references/agents/<agent>.md`).
- Optional focus: a specific stage, capability, or candidate model.

If the requested agent has no profile, report that no profile exists and stop.

## Reference layout

| File | Contents |
|---|---|
| `references/agents/<agent>.md` | Per-agent: task → source file mapping, route chains, verification notes (Markdown + YAML frontmatter) |
| `references/tasks.md` | Shared: task ID → description + required capability IDs |
| `references/capabilities.md` | Shared: capability ID → evaluation method |
| `references/providers.md` | Shared: provider registry, free-tier notes, human-maintained "has auth?" column |

Agent profiles document current configuration; they are not the configuration
source of truth. Live tool configuration is authoritative.

## Workflow

1. **Load and verify the profile (hard gate).** See [Profile verification](#profile-verification). If verification fails, report the exact mismatch and stop. Do not auto-repair.
2. **Resolve task → capabilities.** For each task in the profile, look up the required capability IDs in `references/tasks.md`.
3. **Capability investigation.** Evaluate each required capability using the method in `references/capabilities.md`. "Baseline models are sufficient" is a valid result — the evaluation is not forced to recommend a change.
4. **Evidence research.** Consult the default evidence resources plus open-ended search for each candidate and baseline model. See [Evidence policy](#evidence-policy).
5. **Operational reality.** Resolve display names to exact `provider/model-id` strings using `references/providers.md` and the agent's model store (e.g. `~/.pi/agent/models-store.json`). Check context limits, pricing, and catalog data. Do not check authentication or read credential files; flag provider availability for manual confirmation.
6. **Routing evaluation.** Per stage, compare current primary/secondary/tertiary models with candidates. Check model-family diversity. Recommend one of: keep, replace, add secondary, add tertiary, or no change.
7. **Validation and application.** Record A/B measures and rollback criteria. Provide the agent-specific application checklist from the profile. Keep application separate from recommendation — do not mutate routing without explicit user approval.

## Profile verification

Stop before model research if any of these fail. Report the exact mismatch and the source path requiring attention.

- Profile exists and its YAML frontmatter parses.
- All task `source` paths resolve to real files.
- For each task: normalize the prompt's `model:` frontmatter (split on commas) and the profile's `routes` (ordered `model_id` list) to ordered lists of exact `provider/model-id` tokens, and compare for equality. On divergence, report the first index, the offending `model_id`, and the source path.
- Every `model_id` appears in the `enabledModels` array of `enabled_models_source`.
- Every task `id` exists in `references/tasks.md`.
- Symmetry: every `*.md` stage under the profile's prompt directory (derived from task `source` paths) has a matching task entry, and every profile task maps to a real prompt file. Compare after normalizing `-` to `_` in stage filenames (e.g. prompt `review-plan.md` ↔ task `review_plan`). Report stages present in prompts but missing from the profile, and profile tasks with no backing prompt.
- Every capability referenced in `tasks.md` exists as a heading in `references/capabilities.md`.
- Every `model_id` is listed in `references/providers.md`; any unlisted model is flagged `unverified-provider` for manual confirmation.

Missing, renamed, or conflicting sources are verification failures.

## Evidence policy

Default resources always consulted:

1. Aider Polyglot Leaderboard (`aider.chat/docs/leaderboards/`) — code editing across 225 exercises in 6 languages.
2. Artificial Analysis (`artificialanalysis.ai`) — Intelligence Index, Coding Agent Index (DeepSWE, Terminal-Bench, SWE-Atlas), cost-per-task, speed, endpoint accuracy.
3. LMArena (`lmarena.ai`) — crowd-sourced blind voting as a general-quality sanity check.

Open-ended search is unrestricted: benchmarks, release notes, provider model cards, blog posts. Consult SWE-bench (`github.com/swe-bench/SWE-bench`) and provider model cards when available. Search until the default resources are covered and each candidate has evidence or confirmed absence.

Tag every data point with source URL and type: `benchmark`, `crowd-sourced`, `provider-doc`, `news`, `unverified`. Distinguish "unverified" (no evidence found) from "rejected" (evidence against).

## Output contract

Produce:

- Executive summary.
- Capability investigation (task → capabilities → sufficiency verdicts).
- Evidence-status table (candidate/baseline model, source URLs, evidence type, status).
- Task-by-task review of the current routing.
- Meaningful workflow risks.
- Recommended routing (keep/replace/add secondary/add tertiary/no change per stage).
- Validation and rollback criteria.
- Confidence level.
- Unresolved evidence.

Avoid weighted scoring, synthetic numerical rankings, and price-led recommendations. Cost is a tiebreaker between sufficiently comparable quality options. Make "no change" a first-class result.

## Policies

- **Recommendation-only default.** Applying routing changes requires explicit user approval.
- **No auth checks.** Never read credential files or probe API keys; provider availability is human-maintained in `references/providers.md` and confirmed manually.
- **No model self-voting.** Model-generated opinions may appear as labelled evidence, but models do not vote on themselves and the skill invents no rankings.
- **Baseline = current routing.** "Baseline models" means the models configured in the agent's routing today.
