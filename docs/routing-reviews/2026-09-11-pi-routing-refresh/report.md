# Model-routing review: pi

## 1. Run metadata

- Agent: pi
- Profile: .agents/skills/evaluate-model-routing/references/agents/pi.md (verified 2026-09-11)
- Run: 2026-09-11-routing-refresh
- Reference time: 2026-09-12T06:13:45.076Z
- Pipeline version: 3; config hash: ff5336211b39add4; manifest hash: 40a523e0bbe0bc64
- Coverage threshold: 0.5; maximum snapshot age: 30 days; contested tolerance: 0.05
- Judge: opencode-go/hy4-preview (thinking high)

Sources:

| Source | Status | Retrieved | SHA-256 | URL |
|---|---|---|---|---|
| deepswe | ok | 2026-09-12T06:13:44.434Z | 005cbedb49f988ba3f0d9636300862ad7ace93ce1992b37faf9945fe5b383415 | https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json |
| tbench | ok | 2026-09-12T06:13:44.696Z | 590aa836d45b8ba266a4936bc0fd4616efdc46f046de7aa9b8f9f181bce5f2a7 | https://www.tbench.ai/?version=2.1 |
| swebench-site | ok | 2026-09-12T06:13:45.062Z | 83cd949a9582f4dd68b0a07148cd86ff0eae6a05b0f2d2298a8f3717baf89d2d | https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json |

## 2. Executive summary

- 6 comparable unit(s): 3 scored, 3 excluded as a small board, 0 excluded as stale.
- Stages that rank: implement.
- Stages that stay evidence-only (coverage below 0.5): run_stage_plan, review_plan, review, run_stage_break, general.
- Capabilities with no observed evidence for these routes: adversarial_analysis, instruction_following, long_context, multimodal, reasoning, repository_understanding, review.
- Routes with no observed evidence: opencode-go/hy3.
- All tier A sources responded.
- A judge assessment is present.

Pipeline version 3, judge prompt version 3. Judge opencode-go/hy4-preview answered with low confidence and agreed with the deterministic outcome: no routing change is supported in any stage. Its two earlier rounds found three defects, now fixed: a published release claimed by two providers resolved to only one route, equal scores split into different ranks on the route name, and the prompt omitted rank, alias scope, snapshot age, and the percentile tie method. One open item remains: contested_tolerance applies to disagreements inside a unit, not to the gap between two routes in a stage, so the 0.040 gap between rank 1 and rank 2 in implement is below the tolerance yet still reads as an ordering. Judge confidence varied between runs (low, high, low) on near-identical evidence, so treat that field as advisory only.

## 3. Baseline route table and re-evaluation

Configured baseline routes (rank 1) with their re-evaluation:

| Stage | Baseline (rank 1) | Status | Score | Coverage |
|---|---|---|---|---|
| run_stage_plan | opencode-go/glm-5.3 | evidence only | n/a | 0.0% |
| review_plan | openai-codex/gpt-5.6-sol | evidence only | n/a | 0.0% |
| implement | opencode-go/deepseek-v4.1-flash | evidence only | n/a | 0.0% |
| review | openai-codex/gpt-5.6-sol | evidence only | n/a | 30.0% |
| run_stage_break | opencode-go/hy3 | evidence only | n/a | 0.0% |
| general | openai-codex/gpt-5.6-luna | evidence only | n/a | 0.0% |

Full configured chains:

| Stage | Chain (rank order) |
|---|---|
| run_stage_plan | opencode-go/glm-5.3 > mistral/zai-glm-5-2 |
| review_plan | openai-codex/gpt-5.6-sol > mistral/zai-glm-5-2 |
| implement | opencode-go/deepseek-v4.1-flash > opencode-go/gpt-5.6-luna > openai-codex/gpt-5.6-luna |
| review | openai-codex/gpt-5.6-sol > mistral/zai-glm-5-2 |
| run_stage_break | opencode-go/hy3 > openai-codex/gpt-5.6-luna > opencode-go/gpt-5.6-luna |
| general | openai-codex/gpt-5.6-luna |

## 4. Capability coverage matrix

Values are the mean percentile rank of the observations for that capability. `evidence only` and `no_evidence` never render as a number.

| Route | adversarial_analysis | instruction_following | long_context | multimodal | reasoning | repository_understanding | review | software_engineering | tool_use |
|---|---|---|---|---|---|---|---|---|---|
| mistral/zai-glm-5-2 | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | 0.161 | no_evidence |
| openai-codex/gpt-5.6-luna | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | 0.696 | 0.250 |
| openai-codex/gpt-5.6-sol | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | 0.875 | 0.607 |
| opencode-go/deepseek-v4.1-flash | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | evidence only | no_evidence |
| opencode-go/glm-5.3 | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | 0.768 | 0.679 |
| opencode-go/gpt-5.6-luna | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | 0.696 | 0.250 |
| opencode-go/hy3 | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence |

## 5. Deterministic scorecard per stage

### run_stage_plan

Weights: repository_understanding 0.3, reasoning 0.3, long_context 0.2, instruction_following 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review_plan

Weights: reasoning 0.4, adversarial_analysis 0.3, repository_understanding 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### implement

Weights: software_engineering 0.5, tool_use 0.3, repository_understanding 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| 1 | openai-codex/gpt-5.6-sol | 0.775 | 80.0% | 0.80 | ranked | repository_understanding (0.2) |
| 2 | opencode-go/glm-5.3 | 0.734 | 80.0% | 0.80 | ranked | repository_understanding (0.2) |
| 3 (tied with opencode-go/gpt-5.6-luna) | openai-codex/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) |
| 3 (tied with openai-codex/gpt-5.6-luna) | opencode-go/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) |
| 4 | mistral/zai-glm-5-2 | 0.161 | 50.0% | 0.50 | ranked | tool_use (0.3), repository_understanding (0.2) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review

Weights: review 0.5, software_engineering 0.3, reasoning 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### run_stage_break

Weights: adversarial_analysis 0.4, review 0.3, software_engineering 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### general

Weights: instruction_following 0.3, reasoning 0.3, long_context 0.2, multimodal 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

## 6. Fuzzy assessment (judge)

Judge: opencode-go/hy4-preview (thinking high)

Prompt version: 3; received: 2026-09-12T06:16:21.144Z

Strengths:

- The scorecard applies its coverage threshold consistently: five of six stages report no_comparable_evidence, so it does not manufacture ranks where no route has comparable evidence.
- Freshness is satisfied for the only scored units (DeepSWE and Terminal-Bench v2.1); their snapshot age is within max_snapshot_age_days, so staleness is not a limiting factor.
- Proxy evidence is handled conservatively: the routed opencode-go/deepseek-v4.1-flash baseline is recorded as proxy-family (deliberately not scored) with baseline coverage zero, and the scorecard flags baseline_unrankable rather than claiming the baseline is worse.
- Alias provenance is auditable: each evidence row records unit_key, publisher_name and alias_rule, capturing why a published board name maps to a route (e.g., the gpt-5.6-luna release claimed by two providers; deepseek-v4-flash vs the routed deepseek-v4.1-flash alias).
- Missing weight is reported per row and never redistributed (per the glossary), so the partial-coverage nature of the implement stage stays visible instead of being hidden.

Risks:

- Coverage is too low to decide almost all routing: five stages (run_stage_plan, review_plan, review, run_stage_break, general) have no eligible route and no comparable evidence, so their baselines cannot be confirmed or changed.
- For the only stage with eligible candidates (implement), the baseline opencode-go/deepseek-v4.1-flash has no scored evidence (baseline coverage zero), so the scorecard emits baseline_unrankable with no baseline comparison; switching to the top-ranked eligible candidate is not supported by the scorecard.
- Evidence breadth is narrow: all scored observations come from only two benchmarks (DeepSWE and Terminal-Bench v2.1), which in the implement stage cover only the software-engineering and tool-use capabilities. The repository-understanding capability is missing for every eligible implement row, and reasoning, review, long-context, adversarial-analysis, instruction-following and multimodal have no scored evidence, leaving most stage weights unmeasured.
- The two gpt-5.6-luna routes (openai-codex and opencode-go) carry identical evidence, coverage and rank because one published release is claimed by both providers; the scorecard provides no provider-level evidence to distinguish them, so preferring one is arbitrary on this data.
- Terminal-Bench v2.1 has a small population, and the glossary states tied models share one percentile and that contested_tolerance is not applied to gaps between two routes in a stage; the separation between eligible implement candidates should not be treated as a robust ordering.
- opencode-go/hy3 has no evidence entries at all and is the baseline for run_stage_break, a stage with no comparable evidence; the scored swebench-multilingual unit also has no route aliased to it and contributes no usable capability evidence.

Disqualifiers:

- No route is scored as disqualified: the deepseek-v4.1-flash baseline is excluded from scoring as proxy-family evidence rather than disqualified, and opencode-go/hy3 is simply absent from the evidence base. The limiting factor is insufficient coverage, not disqualification.

Judge confidence: low

Divergence from the scorecard:

- A naive reading of the implement stage sees an ordered set of eligible candidates with a clear leader and might conclude the implement baseline should be replaced; the scorecard diverges from that reading because its stage signal is baseline_unrankable, the baseline has no eligible evidence, and no candidate_ahead or baseline_ahead verdict is issued.
- The two gpt-5.6-luna routes do not diverge in the scorecard — they share identical evidence, coverage and rank — yet they are distinct candidate routes in the routing table; the data cannot separate them, so any preference is extra-evidential.
- DeepSWE carries family-level evidence for opencode-go/deepseek-v4.1-flash (publisher deepseek-v4-flash) that is deliberately not scored, which diverges from a naive assumption that the baseline has an observation and explains why baseline coverage is zero.
- The swebench-multilingual unit is scored and fresh, but no route_evidence entry aliases any candidate to it; this board diverges from the routes under evaluation and contributes zero measured capability, highlighting a coverage gap rather than a comparable observation.
- Per the glossary, contested_tolerance is not applied to gaps between two routes in a stage, so the implement ordering diverges from a tolerance-aware reading in which the eligible candidates could be effectively tied.

The judge is advisory. It cannot change a deterministic score.

## 7. Divergences and contradictions

- No contested units were detected.


## 8. Recommendation per stage

| Stage | Decision | Rationale |
|---|---|---|
| run_stage_plan | no-change | Coverage is 0% for every route: repository_understanding, reasoning, long_context, and instruction_following all lack a tier A source. Ranking here would be invented, so the stage stays evidence-only. |
| review_plan | no-change | Coverage is 0% for every route: reasoning, adversarial_analysis, and repository_understanding are tier B only. No deterministic comparison is possible, so the current chain stands. |
| implement | no-change | The baseline opencode-go/deepseek-v4.1-flash has proxy-family evidence only (board publishes deepseek-v4-flash, not the routed deepseek-v4.1-flash), so the rule cannot rank it against eligible candidates. openai-codex/gpt-5.6-sol (rank 1, 0.775) and opencode-go/glm-5.3 (rank 2, 0.734) lead on a 0.80-coverage vector that omits repository_understanding. Verify a release-matched observation for the routed baseline before moving the stage. |
| review | no-change | The best-covered route reaches 30% coverage (software_engineering only), below the 50% threshold. The review capability has no tier A source, so no rank exists and the current chain stands. |
| run_stage_break | no-change | Coverage reaches 30% through software_engineering only. adversarial_analysis and review have no tier A source, so the stage cannot be ranked and the current chain stands. |
| general | no-change | multimodal has a tier A source but no rows for these routes, and reasoning, instruction_following, and long_context have none. Coverage is 0%, so the session-start model stands. |

Applying any change requires explicit user approval. Routing files are not modified by this pipeline.

## 9. Validation and rollback criteria

- Measure before and after each applied change on the affected stage, with the same prompt and candidate models.
- Roll back the stage when the new primary fails a stage task twice in a row, or when it needs more retries than the previous primary for the same task.
- Keep the previous primary as the next rank so a rollback is a frontmatter edit, not a re-evaluation.
- Re-run this pipeline after any model release, provider change, or adapter failure.

## 10. Evidence appendix

| Route | Benchmark | Board | Metric | Value | Percentile | Scope | Role | Date | Attempts | Uncertainty | URL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mistral/zai-glm-5-2 | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.438 | 0.161 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.421-0.455 | https://deepswe.datacurve.ai/ |
| openai-codex/gpt-5.6-luna | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.672 | 0.696 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.632-0.712 | https://deepswe.datacurve.ai/ |
| openai-codex/gpt-5.6-luna | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.173 | 0.250 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.144-0.201 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| openai-codex/gpt-5.6-sol | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.727 | 0.875 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.698-0.755 | https://deepswe.datacurve.ai/ |
| openai-codex/gpt-5.6-sol | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.373 | 0.607 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.335-0.411 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| opencode-go/deepseek-v4.1-flash | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.533 | 0.286 | proxy-family | software_engineering:primary | 2026-09-03 | 4 | ci95 0.498-0.569 | https://deepswe.datacurve.ai/ |
| opencode-go/glm-5.3 | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.690 | 0.768 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.659-0.720 | https://deepswe.datacurve.ai/ |
| opencode-go/glm-5.3 | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.418 | 0.679 | model | tool_use:primary | 2026-08-14 | 330 | ci95 0.386-0.451 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| opencode-go/gpt-5.6-luna | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.672 | 0.696 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.632-0.712 | https://deepswe.datacurve.ai/ |
| opencode-go/gpt-5.6-luna | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.173 | 0.250 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.144-0.201 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |

Comparable units and exclusions:

| Unit | Population | Status | Snapshot | SHA-256 |
|---|---|---|---|---|
| deepswe|v1.1|1.1|default|pass_at_1|agent-cli | 28 | scored | 2026-09-12T06:13:44.434Z | 005cbedb49f988ba… |
| tbench-v2.1|terminal-bench-2.1|2.1|default|accuracy|agent-cli | 14 | scored (small-board flag) | 2026-09-12T06:13:44.696Z | 590aa836d45b8ba2… |
| swebench-multilingual|Multilingual|2026-02-13|default|resolved|agent-cli | 13 | scored (small-board flag) | 2026-09-12T06:13:45.062Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli | 6 | small-board-excluded | 2026-09-12T06:13:45.062Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli+computer | 6 | small-board-excluded | 2026-09-12T06:13:45.062Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|bare-model | 2 | small-board-excluded | 2026-09-12T06:13:45.062Z | 83cd949a9582f4dd… |

Rejected and evidence-only frameworks are recorded in `references/benchmarks.md` with their tier and caveats.

