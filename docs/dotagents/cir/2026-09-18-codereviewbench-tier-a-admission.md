# CIR: Admit CodeReviewBench as a tier A source for the `review` capability

**Date:** 2026-09-18
**Scope:** `.agents/skills/evaluate-model-routing/` (`references/benchmarks.json`,
`references/benchmarks.md`, `scripts/lib/sources/codereviewbench.mjs`,
`scripts/tests/adapters.test.mjs`)

## Intent

Close the `review` capability gap, which had no tier A source. Before this change,
six of nine weighted capabilities had no fetchable evidence, and only the
`implement` stage could reach the coverage threshold. CodeReviewBench publishes
per-model review scores as JSON, so it is admitted as tier A and the `review` and
`run_stage_break` stages become reachable.

## Behavior

GIVEN a candidate route appears on the CodeReviewBench leaderboard and an alias
record maps that published name to the route
WHEN a routing review runs
THEN the route receives a `review` observation with a micro-averaged F1 value
normalised to 0..1, one attempt, `effort` null, `uncertainty` null, and scope
`agent-model-system`, and the row is never presented as model-scope evidence

AND a route that does not appear on the leaderboard receives no observation and
is reported as a coverage gap, never as a low score

AND the source fails loudly with exit code 3 if the payload loses its `models`
array or a row loses its `id`, `name`, or `f1`

## Constraints

- The source is one vendor harness (`kodus`), so every row is
  `agent-model-system` evidence. It must never be scored as `model` scope.
- The payload publishes no confidence interval. `uncertainty` stays null; no
  interval may be synthesised from other data.
- The rescoring spread is judge noise, not model run-to-run variance. It is
  recorded as a caveat and never combined statistically with a score.
- Judged findings are not ground truth about review quality. The board ranks
  models inside one reviewer, so it does not establish which model reviews best
  in a different harness.
- Coverage is per route. This change makes the stages reachable in principle; it
  does not guarantee any specific route reaches the threshold.
- The fetch URL must keep the `www` host: the bare host answers 307.

## Decisions

- **Admitted as tier A with `agent-model-system` scope** because the source is
  reproducible, machine-readable, and auditable: every ranked model has a
  versioned scorecard with per-case results, the harness, the run date, and the
  judge model. The alternative costs two of five stages for no safety gain.
- **The distinguishing test against the SWE Atlas precedent is whether verifier
  error is measured and the per-result artefact is published.** SWE Atlas is tier
  B because its rows load client-side, it publishes no per-result data, and its
  judge behaviour cannot be quantified at all. CodeReviewBench publishes both, so
  a 2-point judge rescoring spread is *known* rather than *unknown*. Future
  entries must satisfy this test, not merely "uses an LLM judge".
- Rejected **keeping it tier B for surface consistency with SWE Atlas** because
  consistency at the level of "an LLM judge was involved" would discard usable,
  auditable evidence and leave the gap open. The precedent is narrowed here
  explicitly rather than left to interpretation.
- Rejected **adapting the per-model scorecards instead of the leaderboard**
  because the fetch contract allows one URL per adapter and the scorecards are 15
  separate files. The leaderboard is the publisher's own ranking artefact, and its
  `f1` was verified on 2026-09-18 to equal the scorecard `f1Micro` rounded to one
  decimal (`glm-5.3-flash`: 0.3997 → 40).
- Rejected **synthesising an uncertainty interval from the three rescoring runs**
  because that interval would be our statistic, not the publisher's. The pipeline
  records published uncertainty only.
- Rejected **mapping the `kodus` harness label to an unmapped class** because one
  declared `agent-cli` class describes the harness honestly, and 13 entries in one
  unit stays above the small-board exclusion floor while still carrying the
  `small-board` flag.
- Rejected **recording a reasoning effort** because the publisher runs vendor
  defaults and publishes no effort variation; `effort` stays null rather than
  being inferred from the scorecards' `vendor-default` marker.
- Rejected **adapting c-CRAB, CR-Bench, ContextBench, SWE Atlas, or IFBench in
  this change** because none publishes results as data. c-CRAB and IFBench publish
  task sets plus harnesses, which is the self-run path, not a fetch source.

## Impact

- `review` and `run_stage_break` can now reach the coverage threshold, up from
  `implement` alone, subject to per-route alias records and board presence.
- `adversarial_analysis` still has no tier A source, so `run_stage_break` cannot
  rank on its primary capability.
- Probed 2026-09-18: `gpt-5.6-luna` and `gpt-5.6-terra` have 30-case scorecards in
  the publisher's repository but no leaderboard row, so a `gpt-5.6-luna` route
  gains no observation from this source and its `review` coverage does not move.

## Date

2026-09-18
