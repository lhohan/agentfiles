---
name: evaluate-model-routing
description: >
  Evaluate model routing across coding agents (Pi, OpenCode, Codex). Verifies an agent profile against live configuration, fetches published benchmark results, scores capabilities per stage with declared weights, adds an advisory judge assessment, and renders a fixed Markdown + HTML report with recommendations — or an explicit "no change" — without mutating configuration. Use when reviewing whether the right model runs each stage of an agent pipeline, or when a new model release should trigger a routing re-evaluation.
---

# Evaluate Model Routing

Deterministic scoring plus an advisory judge, over published benchmark data.
Recommendation-only: this skill never changes routing.

## Inputs

- Agent name, with a profile at `references/agents/<agent>.md`.
- Optional focus: a stage, a capability, or candidate models to add.
- Optional existing run directory to re-render.

No profile means no evaluation: report that and stop.

## References and scripts

| Path | Contents |
|---|---|
| `references/agents/<agent>.md` | Per-agent: task → source mapping, route chains, application checklist |
| `references/tasks.md` | Shared: task ID → description + required capability IDs |
| `references/capabilities.md` | Shared: capability ID → what it means and how to assess it |
| `references/providers.md` | Shared: provider registry; human-maintained availability |
| `references/benchmarks.md` | Human registry: tier, role, fetch source, version policy, caveats |
| `references/benchmarks.json` | Machine registry the scripts read; mirrors `benchmarks.md` |
| `references/config.json` | Judge, thresholds, stage weights, alias records |
| `references/evaluation-method.md` | Data model, scoring rules, judge contract, CLI contract |
| `references/manifest.example.json` | Run manifest schema |
| `scripts/evaluate.mjs` | Pipeline entry point |

Profiles document current configuration; live tool configuration is authoritative.

## Workflow

1. **Verify the profile (hard gate).** See [Profile verification](#profile-verification).
   On any mismatch, report the exact mismatch and source path, then stop. Never
   auto-repair.
2. **Build the run manifest.** Write `manifest.json` with the agent, the verified
   `enabled_models`, each stage's configured chain in rank order, and the
   candidate set (baseline routes plus the models under consideration). The
   scripts never parse profile Markdown; the manifest is the gate's outcome.
3. **Fetch.** `node scripts/evaluate.mjs fetch --manifest <file>`. This records
   snapshots, provenance, and comparable units. A failing source is reported and
   becomes a coverage gap; it never becomes a number.
4. **Score.** `node scripts/evaluate.mjs score --manifest <file>`. Percentiles are
   computed inside a unit, capabilities and stages are weighted means over
   present observations only, and coverage decides eligibility.
5. **Judge (advisory).** `judge-prompt`, then run the printed isolated headless
   command, then `judge-import`. A missing judge is a valid state. Optionally run
   `judge-calibrate` to measure the judge against frozen scorecards with planted
   defects; the figure is recorded in section 6 and replaces the judge's
   self-reported confidence, which is not calibrated.
6. **Render.** `node scripts/evaluate.mjs render --manifest <file>`, then
   `node scripts/evaluate.mjs index` to refresh the review index.
7. **Recommend.** Read the scorecard, then add `recommendations` to the manifest
   (one per stage, with rationale) and re-render. The renderer never invents a
   recommendation.
8. **Report and stop.** Present the report, the coverage gaps, the judge
   divergences, and the validation plan. Application needs explicit approval and
   follows the profile's checklist.

Exit codes: 0 ok, 2 invalid input, 3 source failure, 4 no comparable data,
5 judge schema mismatch, 6 replay mismatch. `replay` re-scores a committed
`report.json` and must match.

## Profile verification

Stop before any fetch if any of these fail. Report the exact mismatch and the
source path needing attention.

- The profile exists and its YAML frontmatter parses.
- Task `source`s are prompt files (`path`) or config-sourced
  (`path --> dotted.key`); every path resolves to a real file, and a
  config-sourced key resolves to a scalar value (for example
  `agents/pi/.pi/agent/settings.json --> sessionStartModel.model`).
- For each task, the source's model chain — prompt `model:` frontmatter split on
  commas, or the resolved config value — matches the profile's `routes` as
  ordered lists of exact `provider/model-id` tokens. Report the first divergent
  index, the offending `model_id`, and the source path.
- Every `model_id` appears in the `enabledModels` array of `enabled_models_source`.
- Every task `id` exists in `references/tasks.md`.
- Symmetry for prompt-sourced tasks: every stage prompt has a task entry and every
  prompt-sourced task maps to a real prompt file (normalise `-` to `_`).
  Config-sourced tasks are exempt.
- Every capability referenced in `tasks.md` is a heading in `references/capabilities.md`.
- Every `model_id`'s provider prefix is listed in `references/providers.md`;
  otherwise flag `unverified-provider` for manual confirmation.

## Rules that keep the numbers honest

- Score only what a benchmark actually publishes and what an alias record
  actually claims. No imputation, no interpolation, no proxy score passed off as
  the routed release.
- Compare only inside one unit: `(benchmark, board, version, split, metric,
  harness class)`. Never compare, average, or rank across units.
- Show coverage and missing weight on every score. A stage below
  `rank_threshold_coverage` is evidence-only: observations, no rank, no
  composite, no recommendation.
- Keep `model`, `agent-model-system`, and `proxy-family` scope visible on every
  observation, and let a `proxy-family` observation never be the sole basis for a
  recommendation.
- Record published uncertainty; never combine it statistically. Report
  contradictions and contested units instead of averaging them.
- "No change" is a first-class result.
- Cost is a tiebreaker between quality-comparable options, never the driver.

## Evidence policy

`references/benchmarks.md` holds the tier, role, and caveats of every framework.
Tier A sources are fetched; tier B sources are evidence-only notes; tier C
sources are recorded and excluded. A benchmark that cannot be fetched is a
coverage gap, never a score. Judge provider pages, model cards, and release notes
as claims, not as measurements, and label their source type.

If a candidate has no alias record for a board, do not guess the mapping: report
the missing evidence, and add an alias record only when the published release is
verified against `providers.md`.

## Policies

- **Recommendation-only.** Applying routing changes needs explicit user approval;
  this skill never writes routing, `enabledModels`, or provider configuration.
- **No auth checks.** Never read credential files or probe API keys. Provider
  availability is human-maintained in `references/providers.md`.
- **No invented data.** The skill does not run benchmarks, does not estimate
  scores, and does not turn a leaderboard name into a claim without an alias
  record.
- **Judge is advisory.** It cannot change a deterministic score; when the judge
  is also a candidate, the report tags it `self-candidate`.

## Tests

```bash
node --test ".agents/skills/evaluate-model-routing/scripts/tests/*.test.mjs"
```

Run these after changing an adapter, the scorer, the renderer, or the settings
file. They run offline from committed fixtures.
