# Model-routing review: pi

## 1. Run metadata

- Agent: pi
- Profile: .agents/skills/evaluate-model-routing/references/agents/pi.md (verified 2026-09-11)
- Run: 2026-09-11-routing-refresh
- Reference time: 2026-09-11T22:03:16.035Z
- Pipeline version: 1; config hash: ff5336211b39add4; manifest hash: e1349ce00551b6b1
- Coverage threshold: 0.5; maximum snapshot age: 30 days; contested tolerance: 0.05
- Judge: opencode-go/hy4-preview (thinking high)

Sources:

| Source | Status | Retrieved | SHA-256 | URL |
|---|---|---|---|---|
| deepswe | ok | 2026-09-11T22:03:15.696Z | 005cbedb49f988ba3f0d9636300862ad7ace93ce1992b37faf9945fe5b383415 | https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json |
| tbench | ok | 2026-09-11T22:03:15.896Z | c32c091727dabeffcad617f6bb5dbae8d97b960128c0df4442f9a3841e7f9558 | https://www.tbench.ai/?version=2.1 |
| swebench-site | ok | 2026-09-11T22:03:16.018Z | 83cd949a9582f4dd68b0a07148cd86ff0eae6a05b0f2d2298a8f3717baf89d2d | https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json |

## 2. Executive summary

- 6 comparable unit(s): 3 scored, 3 excluded as a small board, 0 excluded as stale.
- Stages that rank: implement.
- Stages that stay evidence-only (coverage below 0.5): run_stage_plan, review_plan, review, run_stage_break, general.
- Capabilities with no observed evidence for these routes: adversarial_analysis, instruction_following, long_context, multimodal, reasoning, repository_understanding, review.
- Routes with no observed evidence: openai-codex/gpt-5.6-luna, opencode-go/hy3.
- All tier A sources responded.
- No judge assessment: this report carries the missing-judge state.

First run of the semi-deterministic pipeline. The judge step was not executed: the report carries the missing-judge state, and judge-prompt.md holds the exact command for the operator.

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
| openai-codex/gpt-5.6-luna | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence | no_evidence |
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
| 3 | opencode-go/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) |
| 4 | mistral/zai-glm-5-2 | 0.161 | 50.0% | 0.50 | ranked | tool_use (0.3), repository_understanding (0.2) |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review

Weights: review 0.5, software_engineering 0.3, reasoning 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |
|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) |
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
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) |
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

State: `missing-judge`. No advisory assessment is present. The deterministic scorecard stands unchanged.

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
| deepswe|v1.1|1.1|default|pass_at_1|agent-cli | 28 | scored | 2026-09-11T22:03:15.696Z | 005cbedb49f988ba… |
| tbench-v2.1|terminal-bench-2.1|2.1|default|accuracy|agent-cli | 14 | scored (small-board flag) | 2026-09-11T22:03:15.896Z | c32c091727dabeff… |
| swebench-multilingual|Multilingual|2026-02-13|default|resolved|agent-cli | 13 | scored (small-board flag) | 2026-09-11T22:03:16.018Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli | 6 | small-board-excluded | 2026-09-11T22:03:16.018Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli+computer | 6 | small-board-excluded | 2026-09-11T22:03:16.018Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|bare-model | 2 | small-board-excluded | 2026-09-11T22:03:16.018Z | 83cd949a9582f4dd… |

Rejected and evidence-only frameworks are recorded in `references/benchmarks.md` with their tier and caveats.

