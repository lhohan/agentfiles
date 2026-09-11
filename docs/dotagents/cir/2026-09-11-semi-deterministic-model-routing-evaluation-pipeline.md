# CIR: Semi-deterministic model-routing evaluation pipeline

**Date:** 2026-09-11
**Supersedes:** `docs/dotagents/cir/2026-08-11-generic-model-routing-evaluation.md`
(partially: two standing constraints and one rejected alternative)
**Scope:** `.agents/skills/evaluate-model-routing/` (SKILL.md, `references/`,
`scripts/`)

## Intent

Turn the model-routing evaluation from a prose checklist into an instrument that
produces the same answer twice. The skill now fetches published benchmark results
from sources that expose machine-readable data, normalises them inside one
comparable unit, combines them with declared capability and stage weights, adds a
separate advisory judge layer, and renders one fixed Markdown + HTML report. The
safety posture is unchanged: recommendation-only, no auth reads, no routing
mutation, and "no change" as a first-class result.

## Behavior

GIVEN an agent profile that still matches live configuration
WHEN a routing review runs
THEN the skill builds a JSON run manifest from the verified profile, fetches tier A
sources, scores percentiles inside one unit, weights capabilities and stages with
the configured weights, records coverage and missing weight, optionally collects an
advisory judge assessment, and writes `report.json`, `report.md`, and `report.html`
under `docs/routing-reviews/YYYY-MM-DD-<agent>-<slug>/`

AND the pipeline must never invent a result: a benchmark without machine-readable
results is a named coverage gap, a capability with no verified source renders
`no_evidence` and never as 0, and a stage below the coverage threshold is
evidence-only with no rank, no composite, and no recommendation

AND values may be compared only inside one unit
`(benchmark, board, version, split, metric, harness class)`; a failing or stale
source must stay visible and must never become a silent score

AND the judge may not change a deterministic score; when the judge is a candidate
under evaluation the report tags its section `self-candidate`

AND the run must not read `~/.pi/agent/auth.json`, must not mutate any agent
configuration, and must not apply routing changes without explicit user approval

## Constraints

- Profile verification remains a hard gate that stops the run; live tool
  configuration stays authoritative and profiles are never auto-repaired.
- Route comparison still compares ordered lists of exact `provider/model-id`
  tokens.
- A score exists only with a verified fetchable source; `benchmarks.md` records
  the tier, role, and caveats of every framework, including the ones the pipeline
  excludes.
- Alias records are source-scoped and strict: one published name may claim two
  routes only when both records name the same release with scope `model`. Every
  alias route ID must use a provider prefix listed in `providers.md`.
- Raw evidence stays visible: every score displays coverage and missing weight,
  and the evidence appendix carries URLs, dates, scope, role, and uncertainty.
- Published uncertainty is recorded and never combined statistically; contested
  units are excluded and reported, never averaged.
- Determinism is scoped: `score`, `render`, and `replay` are byte-identical over a
  fixed snapshot; `fetch` is not deterministic by design.
- The scripts are zero-dependency Node and do not run benchmarks, install
  packages, or add extensions.
- The skill stays repository-local at `.agents/skills/evaluate-model-routing/`.

## Decisions

- **Semi-deterministic pipeline with declared weights** because a prose checklist
  produced a different answer each run and could not show its own coverage.
  Capability weights are `primary` 1.0 and `secondary` 0.5; stage weights live in
  `references/config.json`.
- **Percentile normalisation inside one unit** because the previous policy of
  refusing to compare any two scores left no way to combine evidence at all, while
  cross-benchmark comparison remains invalid.
- **Coverage threshold with an evidence-only fallback** because a weighted mean
  over a fragment of a stage vector invites false confidence. Below
  `rank_threshold_coverage` (0.5) the stage shows its observations and missing
  weight only.
- **Advisory judge that may be a candidate** because a fixed judge is operationally
  simpler, and the deterministic layer stays primary; divergence is an attention
  flag, not independent evidence.
- **Machine-readable registry (`benchmarks.json`) beside the human document
  (`benchmarks.md`)** because scripts cannot parse Markdown tables reliably; a
  test keeps the two in step.
- **One published release may map to several provider routes** when every record
  names the same release with scope `model`, because provider duplication is not
  ambiguity. Any other duplication of one published name fails validation.
- Rejected **a universal four-benchmark scorecard** because the benchmarks measure
  different constructs under different harnesses.
- Rejected **imputing or redistributing missing weight** because a score that
  hides its own gaps is worse than a visible gap.
- Rejected **scraping sources that expose results only as JavaScript literals**
  (ContextBench, SWE Atlas) because parsing application code as data cannot fail
  safely; those sources stay tier B until a dedicated adapter with fixture tests
  exists.
- Rejected **fixed leaderboard percentages in durable instructions** because
  versions, harnesses, and results change; the pipeline fetches current data at
  run time.
- Rejected **an automatic routing change** because applying a recommendation still
  needs explicit user approval.

## Impact

- Two earlier constraints no longer hold and are replaced: "no weighted scoring or
  synthetic rankings" (now: weighted scoring inside a unit, with coverage shown)
  and "models never vote on themselves" (now: the judge may be under evaluation,
  is advisory only, is tagged `self-candidate`, and cannot change a score).
- Everything else in the superseded CIR still holds: comparisons stay within one
  benchmark unit, raw evidence is always shown, coverage is visible, and the judge
  cannot change scores.
- Routing reviews become reproducible and auditable: a committed `report.json`
  replays byte-identically, and every number traces to a snapshot hash.
- The first run exposes its own coverage honestly: `software_engineering` and
  `tool_use` score, while `repository_understanding`, `long_context`, `reasoning`,
  `instruction_following`, `review`, `adversarial_analysis`, and `multimodal` have
  no tier A source and render as coverage gaps.
