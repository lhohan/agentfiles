# Model-routing review: pi

## 1. Run metadata

- Agent: pi
- Profile: .agents/skills/evaluate-model-routing/references/agents/pi.md (verified 2026-09-20)
- Run: 2026-09-20-review-evidence
- Reference time: 2026-09-20T04:53:54.592Z
- Pipeline version: 7; config hash: e85d5a67bab148e8; manifest hash: a24730baf0b2818b
- Coverage threshold: 0.5; maximum snapshot age: 30 days; contested tolerance: 0.05
- Judge: opencode-go/hy4-preview (thinking high)

Sources:

| Source | Status | Retrieved | SHA-256 | URL |
|---|---|---|---|---|
| deepswe | ok | 2026-09-20T04:53:53.053Z | 005cbedb49f988ba3f0d9636300862ad7ace93ce1992b37faf9945fe5b383415 | https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json |
| tbench | ok | 2026-09-20T04:53:53.289Z | d35894eb5e454edc9393ecff452bc1a7031fc7597dcb4e335c0d3bbfbcb4b51d | https://www.tbench.ai/?version=2.1 |
| swebench-site | ok | 2026-09-20T04:53:53.687Z | 83cd949a9582f4dd68b0a07148cd86ff0eae6a05b0f2d2298a8f3717baf89d2d | https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json |
| codereviewbench | ok | 2026-09-20T04:53:54.591Z | 6ce64f060ca89a02528a909b0fdab5049ab9ed0e6ddde74118a437d315474b2a | https://www.codereviewbench.com/api/leaderboard.json |

## 2. Executive summary

- 7 comparable unit(s): 4 scored, 3 excluded as a small board, 0 excluded as stale.
- Stages that rank: implement, review, run_stage_break.
- Stages that stay evidence-only (coverage below 0.5): run_stage_plan, review_plan, general.
- Capabilities with no observed evidence for these routes: adversarial_analysis, instruction_following, long_context, reasoning, repository_understanding.
- Routes with no observed evidence: opencode-go/hy3.
- All tier A sources responded.
- No judge assessment: this report carries the missing-judge state.

## 3. Baseline route table and re-evaluation

Configured baseline routes (rank 1) with their re-evaluation. Operational values are catalog data, not capability scores:

| Stage | Baseline (rank 1) | Status | Score | Coverage | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|
| run_stage_plan | opencode-go/glm-5.3 | evidence only | n/a | 0.0% | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| review_plan | openai-codex/gpt-5.6-sol | evidence only | n/a | 0.0% | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| implement | opencode-go/deepseek-v4.1-flash | evidence only | n/a | 0.0% | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| review | openai-codex/gpt-5.6-sol | evidence only | n/a | 30.0% | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| run_stage_break | opencode-go/hy3 | evidence only | n/a | 0.0% | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| general | openai-codex/gpt-5.6-luna | evidence only | n/a | 0.0% | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |

Full configured chains:

| Stage | Chain (rank order) |
|---|---|
| run_stage_plan | opencode-go/glm-5.3 > mistral/zai-glm-5-2 |
| review_plan | openai-codex/gpt-5.6-sol > mistral/zai-glm-5-2 |
| implement | opencode-go/deepseek-v4.1-flash > opencode-go/gpt-5.6-luna > openai-codex/gpt-5.6-luna |
| review | openai-codex/gpt-5.6-sol > mistral/zai-glm-5-2 |
| run_stage_break | opencode-go/hy3 > openai-codex/gpt-5.6-luna > opencode-go/gpt-5.6-luna |
| general | openai-codex/gpt-5.6-luna |

Operational data for every configured route:

| Stage | Route | Configured rank | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|
| run_stage_plan | opencode-go/glm-5.3 | 1 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| run_stage_plan | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| review_plan | openai-codex/gpt-5.6-sol | 1 | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| review_plan | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| implement | opencode-go/deepseek-v4.1-flash | 1 | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| implement | opencode-go/gpt-5.6-luna | 2 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| implement | openai-codex/gpt-5.6-luna | 3 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| review | openai-codex/gpt-5.6-sol | 1 | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| review | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| run_stage_break | opencode-go/hy3 | 1 | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| run_stage_break | openai-codex/gpt-5.6-luna | 2 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| run_stage_break | opencode-go/gpt-5.6-luna | 3 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| general | openai-codex/gpt-5.6-luna | 1 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |

## 4. Capability coverage matrix

Values are the mean percentile rank of the observations for that capability. Empty cells state why: `no source` (no tier A benchmark carries this capability), `excluded unit` (the board is too small or stale), `no alias` (add an alias record), `not on board` (the model has no published row).

| Route | adversarial_analysis | instruction_following | long_context | multimodal | reasoning | repository_understanding | review | software_engineering | tool_use |
|---|---|---|---|---|---|---|---|---|---|
| mistral/zai-glm-5-2 | no source | no source | no source | excluded unit | no source | no source | 0.654 | 0.161 | no alias |
| openai-codex/gpt-5.6-luna | no source | no source | no source | excluded unit | no source | no source | no alias | 0.696 | 0.250 |
| openai-codex/gpt-5.6-sol | no source | no source | no source | excluded unit | no source | no source | no alias | 0.875 | 0.607 |
| opencode-go/deepseek-v4.1-flash | no source | no source | no source | excluded unit | no source | no source | 0.731 | evidence only | no alias |
| opencode-go/glm-5.3 | no source | no source | no source | excluded unit | no source | no source | no alias | 0.768 | 0.679 |
| opencode-go/glm-5.3-flash | no source | no source | no source | excluded unit | no source | no source | 0.577 | no alias | no alias |
| opencode-go/gpt-5.6-luna | no source | no source | no source | excluded unit | no source | no source | no alias | 0.696 | 0.250 |
| opencode-go/hy3 | no source | no source | no source | excluded unit | no source | no source | no alias | no alias | no alias |
| opencode-go/kimi-k2.7-code | no source | no source | no source | excluded unit | no source | no source | 0.885 | no alias | no alias |

## 5. Deterministic scorecard per stage

### run_stage_plan

Weights: repository_understanding 0.3, reasoning 0.3, long_context 0.2, instruction_following 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3-flash | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/kimi-k2.7-code | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review_plan

Weights: reasoning 0.4, adversarial_analysis 0.3, repository_understanding 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3-flash | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/kimi-k2.7-code | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### implement

Weights: software_engineering 0.5, tool_use 0.3, repository_understanding 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| 1 (tied with opencode-go/glm-5.3, within tolerance) | openai-codex/gpt-5.6-sol | 0.775 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| 1 (tied with openai-codex/gpt-5.6-sol, within tolerance) | opencode-go/glm-5.3 | 0.734 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| 2 (tied with opencode-go/gpt-5.6-luna) | openai-codex/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| 2 (tied with openai-codex/gpt-5.6-luna) | opencode-go/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| 3 | mistral/zai-glm-5-2 | 0.161 | 50.0% | 0.50 | ranked | tool_use (0.3), repository_understanding (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3-flash | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/kimi-k2.7-code | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review

Weights: review 0.5, software_engineering 0.3, reasoning 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | opencode-go/kimi-k2.7-code | 0.885 | 50.0% | 0.50 | ranked | software_engineering (0.3), reasoning (0.2) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| 2 | opencode-go/deepseek-v4.1-flash | 0.731 | 50.0% | 0.50 | ranked | software_engineering (0.3), reasoning (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| 3 | opencode-go/glm-5.3-flash | 0.577 | 50.0% | 0.50 | ranked | software_engineering (0.3), reasoning (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| 4 | mistral/zai-glm-5-2 | 0.469 | 80.0% | 0.80 | ranked | reasoning (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### run_stage_break

Weights: adversarial_analysis 0.4, review 0.3, software_engineering 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | mistral/zai-glm-5-2 | 0.407 | 60.0% | 0.60 | ranked | adversarial_analysis (0.4) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), software_engineering (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3-flash | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), software_engineering (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/kimi-k2.7-code | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), software_engineering (0.3) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### general

Weights: instruction_following 0.3, reasoning 0.3, long_context 0.2, multimodal 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.509Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:19.504Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/glm-5.3-flash | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.500 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |
| - | opencode-go/kimi-k2.7-code | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.950 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 4.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] | 262,144 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-19T05:23:18.513Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

## 6. Fuzzy assessment (judge)

State: `missing-judge`. No advisory assessment is present. The deterministic scorecard stands unchanged.

Judge calibration: not run for this review.

## 7. Divergences and contradictions

- No contested units were detected.


## 8. Recommendation per stage

| Stage | Decision | Rationale |
|---|---|---|
| run_stage_plan | evidence-only | Every route has 0% coverage of this stage. repository_understanding, reasoning, long_context, and instruction_following have no tier A source, so no route can be ranked and the configured chain is unchanged for lack of evidence, not for lack of merit. Do not read this as support for the current chain. |
| review_plan | evidence-only | Every route has 0% coverage. reasoning and adversarial_analysis have no tier A source and repository_understanding is unmeasured, so plan review cannot be ranked by published data. Local plan samples remain the only route to evidence for this stage. |
| implement | add-secondary | openai-codex/gpt-5.6-sol (0.775) and opencode-go/glm-5.3 (0.734) tie for rank 1 within the 0.05 tolerance, and opencode-go/glm-5.3 dominates on both input and output price (1.40/4.40 against 5.00/30.00 USD per million tokens). It is a candidate to add as an implementation secondary. This is additive: the configured rank 1, opencode-go/deepseek-v4.1-flash, is unrankable here because its only software-engineering observation is proxy-family and unscored, so it cannot be compared and must not be replaced on this evidence. The configured ranks 2 and 3 already match the attested rank-2 group. |
| review | replace | The configured rank 1, openai-codex/gpt-5.6-sol, has no review observation at all: it covers only 30% of this stage through software_engineering and is evidence-only. Four enabled routes carry review evidence, led by opencode-go/kimi-k2.7-code at 0.885 with a 0.154 gap to the next candidate, well above the separation tolerance. Recommend moving opencode-go/kimi-k2.7-code to rank 1 and keeping openai-codex/gpt-5.6-sol at rank 2, so the stage gains its primary capability without losing the incumbent. Apply only after the validation step in section 9: the evidence is one vendor harness at 50% coverage, judged by one LLM whose rescoring noise is about 2 points, and absence of a published row for the incumbent is missing evidence, not proof of worse review. |
| run_stage_break | add-secondary | mistral/zai-glm-5-2 is the only route that reaches the coverage threshold for this stage (0.407 at 60%), so it is worth adding as a break secondary. Read it narrowly: adversarial_analysis carries 0.4 of the stage and has no tier A source, so 60% of the rank comes from review and software_engineering. The configured rank 1, opencode-go/hy3, has 0% coverage and cannot be assessed either way. |
| general | evidence-only | No route has evidence for instruction_following, reasoning, long_context, or multimodal with which this stage is weighted, so the session-start model cannot be ranked. Its 0.20/1.20 price and 272K context are operational facts, not routing-quality results. |

Applying any change requires explicit user approval. Routing files are not modified by this pipeline.


Operational tiebreak rationale:

- implement, rank 1: Cost broke the tie inside an otherwise tied group: opencode-go/glm-5.3 is cheapest and has the largest context (opencode-go/glm-5.3). Capability ranks remain tied.
- implement, rank 2: The largest context member is opencode-go/gpt-5.6-luna inside an otherwise tied group; cost did not identify one winner. Capability ranks remain tied.

## 9. Validation and rollback criteria

- Measure before and after each applied change on the affected stage, with the same prompt and candidate models.
- Roll back the stage when the new primary fails a stage task twice in a row, or when it needs more retries than the previous primary for the same task.
- Keep the previous primary as the next rank so a rollback is a frontmatter edit, not a re-evaluation.
- Re-run this pipeline after any model release, provider change, or adapter failure.

## 10. Evidence appendix

| Route | Benchmark | Board | Metric | Value | Percentile | Scope | Role | Date | Attempts | Uncertainty | URL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mistral/zai-glm-5-2 | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.438 | 0.161 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.421-0.455 | https://deepswe.datacurve.ai/ |
| mistral/zai-glm-5-2 | CodeReviewBench | light-v1 | f1 (agent-cli) | 0.402 | 0.654 | model | review:primary | 2026-09-11 | 1 | not published | https://codereviewbench.com/ |
| openai-codex/gpt-5.6-luna | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.672 | 0.696 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.632-0.712 | https://deepswe.datacurve.ai/ |
| openai-codex/gpt-5.6-luna | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.173 | 0.250 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.144-0.201 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| openai-codex/gpt-5.6-sol | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.727 | 0.875 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.698-0.755 | https://deepswe.datacurve.ai/ |
| openai-codex/gpt-5.6-sol | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.373 | 0.607 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.335-0.411 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| opencode-go/deepseek-v4.1-flash | CodeReviewBench | light-v1 | f1 (agent-cli) | 0.415 | 0.731 | model | review:primary | 2026-09-11 | 1 | not published | https://codereviewbench.com/ |
| opencode-go/deepseek-v4.1-flash | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.533 | 0.286 | proxy-family | software_engineering:primary | 2026-09-03 | 4 | ci95 0.498-0.569 | https://deepswe.datacurve.ai/ |
| opencode-go/glm-5.3 | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.690 | 0.768 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.659-0.720 | https://deepswe.datacurve.ai/ |
| opencode-go/glm-5.3 | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.418 | 0.679 | model | tool_use:primary | 2026-08-14 | 330 | ci95 0.386-0.451 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| opencode-go/glm-5.3-flash | CodeReviewBench | light-v1 | f1 (agent-cli) | 0.400 | 0.577 | model | review:primary | 2026-09-11 | 1 | not published | https://codereviewbench.com/ |
| opencode-go/gpt-5.6-luna | DeepSWE v1.1 | v1.1 | pass_at_1 (agent-cli) | 0.672 | 0.696 | model | software_engineering:primary | 2026-09-03 | 4 | ci95 0.632-0.712 | https://deepswe.datacurve.ai/ |
| opencode-go/gpt-5.6-luna | Terminal-Bench v2.1 | terminal-bench-2.1 | accuracy (agent-cli) | 0.173 | 0.250 | model | tool_use:primary | 2026-06-26 | 330 | ci95 0.144-0.201 | https://www.tbench.ai/leaderboard/terminal-bench/2.1 |
| opencode-go/kimi-k2.7-code | CodeReviewBench | light-v1 | f1 (agent-cli) | 0.431 | 0.885 | model | review:primary | 2026-09-11 | 1 | not published | https://codereviewbench.com/ |

Comparable units and exclusions:

| Unit | Population | Status | Snapshot | SHA-256 |
|---|---|---|---|---|
| deepswe|v1.1|1.1|default|pass_at_1|agent-cli | 28 | scored | 2026-09-20T04:53:53.053Z | 005cbedb49f988ba… |
| tbench-v2.1|terminal-bench-2.1|2.1|default|accuracy|agent-cli | 14 | scored (small-board flag) | 2026-09-20T04:53:53.289Z | d35894eb5e454edc… |
| swebench-multilingual|Multilingual|2026-02-13|default|resolved|agent-cli | 13 | scored (small-board flag) | 2026-09-20T04:53:53.687Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli | 6 | small-board-excluded | 2026-09-20T04:53:53.687Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli+computer | 6 | small-board-excluded | 2026-09-20T04:53:53.687Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|bare-model | 2 | small-board-excluded | 2026-09-20T04:53:53.687Z | 83cd949a9582f4dd… |
| codereviewbench|light-v1|light-v1|default|f1|agent-cli | 13 | scored (small-board flag) | 2026-09-20T04:53:54.591Z | 6ce64f060ca89a02… |

Rejected and evidence-only frameworks are recorded in `references/benchmarks.md` with their tier and caveats.

