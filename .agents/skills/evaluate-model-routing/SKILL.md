---
name: evaluate-model-routing
description: >
  Evaluate model routing across coding agents (Pi, OpenCode, Codex). Verifies an agent profile against live configuration, researches capability evidence, and recommends routing changes — or explicitly "no change" — without mutating configuration. Use when reviewing whether the right model runs each stage of an agent pipeline, or when a new model release should trigger a routing re-evaluation.
---

# Evaluate Model Routing

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

Agent profiles document current configuration; they are not the configuration source of truth. Live tool configuration is authoritative.

## Workflow

1. **Load and verify the profile (hard gate).** See [Profile verification](#profile-verification). If verification fails, report the exact mismatch and stop. Do not auto-repair.
2. **Resolve task → capabilities.** For each task in the profile, look up the required capability IDs in `references/tasks.md`.
3. **Capability investigation.** Evaluate each required capability using the portfolio in `references/capabilities.md`. "Baseline models are sufficient" is a valid result — the evaluation is not forced to recommend a change.
4. **Evidence research.** Select evidence for each required capability, then research the baseline and candidate models. See [Evidence policy](#evidence-policy).
5. **Operational reality.** Resolve display names to exact `provider/model-id` strings using `references/providers.md` and the agent's model store (e.g. `~/.pi/agent/models-store.json`). Check context limits, pricing, and catalog data. Do not check authentication or read credential files; flag provider availability for manual confirmation.
6. **Routing evaluation.** Per stage, compare current primary/secondary/tertiary models with candidates. Check model-family diversity. Recommend one of: keep, replace, add secondary, add tertiary, or no change.
7. **Validation and application.** Record A/B measures and rollback criteria. Provide the agent-specific application checklist from the profile. Keep application separate from recommendation — do not mutate routing without explicit user approval.

## Profile verification

Stop before model research if any of these fail. Report the exact mismatch and the source path requiring attention.

- Profile exists and its YAML frontmatter parses.
- Task `source`s are either prompt files (`path`) or config-sourced (`path --> dotted.key`). Every source path resolves to a real file; for config-sourced tasks the key resolves to a scalar value in that file (e.g. `agents/pi/.pi/agent/settings.json --> sessionStartModel.model`). A missing file, missing key, or non-scalar value is a verification failure.
- For each task: normalize the source's model chain — for prompt files, the `model:` frontmatter split on commas; for config-sourced tasks, the resolved key value — and the profile's `routes` (ordered `model_id` list) to ordered lists of exact `provider/model-id` tokens, and compare for equality. On divergence, report the first index, the offending `model_id`, and the source path.
- Every `model_id` appears in the `enabledModels` array of `enabled_models_source`.
- Every task `id` exists in `references/tasks.md`.
- Symmetry (prompt-sourced tasks only): every `*.md` stage under the profile's prompt directory (derived from prompt-file task `source` paths) has a matching task entry, and every prompt-sourced task maps to a real prompt file. Compare after normalizing `-` to `_` in stage filenames (e.g. prompt `review-plan.md` ↔ task `review_plan`). Report stages present in prompts but missing from the profile, and profile tasks with no backing prompt. Config-sourced tasks are exempt — their validity is covered by the key-resolution rule above.
- Every capability referenced in `tasks.md` exists as a heading in `references/capabilities.md`.
- Every `model_id` is listed in `references/providers.md`; any unlisted model is flagged `unverified-provider` for manual confirmation.

Missing, renamed, or conflicting sources are verification failures.

## Evidence policy

Use the capability-specific portfolio in `references/capabilities.md`; no benchmark is a universal default. Artificial Analysis is useful for discovering and normalising results, but inspect the component evaluation rather than treating a composite index as direct evidence. Use Aider Polyglot only for short-form editing evidence and LMArena only as a general preference or usability sanity check.

Research benchmark revisions, audits, release notes, provider model cards, and independent reports. Prefer primary benchmark sources for task construction and result metadata; use independent audits to assess benchmark quality. Search until every required capability has suitable evidence for each baseline and candidate, or a confirmed evidence gap.

### Benchmark-quality gates

Before using an evaluation, assess:

- construct fit to the capability under investigation;
- task provenance and likely contamination exposure;
- verifier quality, specification fidelity, and audit history;
- saturation and separation between frontier systems;
- repository, language, and task diversity;
- reproducibility, public artifacts, and trajectory availability;
- model, agent, harness, scaffold, and tool effects;
- sample size, repeated attempts, variance, and confidence intervals;
- benchmark version and evaluation date.

Classify each evaluation's role for the capability as:

- `primary`: direct, credible evidence suitable for routing decisions;
- `secondary`: relevant corroboration with material limitations;
- `conditional`: usable only when its stated scope or caveat matches the decision;
- `deprecated`: unsuitable for current frontier-routing decisions.

A benchmark can have different roles for different capabilities. Do not turn these labels into weights or a synthetic ranking.

### Current benchmark dispositions

- Prefer [DeepSWE v1.1](https://github.com/datacurve-ai/deep-swe) for long-horizon software engineering and [Terminal-Bench v2.1](https://www.tbench.ai/leaderboard/terminal-bench/2.1) for agentic terminal use.
- Treat [SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) as `deprecated` for frontier routing because contamination and saturation weaken separation. It may provide historical context.
- Treat [SWE-bench Pro](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) as `secondary` at most because a published audit found widespread task and verifier defects.
- Treat [SWE-Bench ProMax](https://arxiv.org/abs/2608.09802) as `secondary`: it improves curation and task scale, but tasks are mined from public commits and results remain scaffold-sensitive.
- Treat [SWE-bench Multilingual](https://www.swebench.com/multilingual.html) as `secondary` evidence of language breadth, not as contamination-resistant proof of general software-engineering ability.

Do not embed leaderboard percentages in durable instructions. Research current results during each evaluation.

### Result comparability

For every reported result, record:

- exact model ID or version and reasoning effort;
- benchmark name, version, and split;
- agent, harness, scaffold, and tools;
- attempt count and metric definition;
- evaluation date;
- confidence interval or variance when available;
- source URL and known caveats.

Label the result as `model`, `agent-model system`, or `proxy-family` evidence. Most agentic benchmark results are agent-model-system evidence unless the model effect has been isolated. Never transfer a score between aliases or family members without the `proxy-family` label.

Do not compare scores numerically across different benchmarks, versions, splits, harnesses, or model configurations. Present contradictions and uncertainty rather than averaging them.

Tag every data point with a source URL and source type: `benchmark`, `crowd-sourced`, `provider-doc`, `news`, or `unverified`. Distinguish `unverified` (no suitable evidence found) from `rejected` (evidence against).

## Output contract

Produce:

- Executive summary.
- Capability investigation (task → capabilities → sufficiency verdicts).
- Evidence-status table (candidate/baseline model, capability, evaluation role, result scope, score metadata, source URLs, source type, status, caveats).
- Contradictory evidence and comparability limits.
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
