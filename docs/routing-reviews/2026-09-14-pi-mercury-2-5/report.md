# Model-routing review: pi

## 1. Run metadata

- Agent: pi
- Profile: .agents/skills/evaluate-model-routing/references/agents/pi.md (verified 2026-09-14)
- Run: 2026-09-14-mercury-2-5
- Reference time: 2026-09-14T16:25:01.785Z
- Pipeline version: 7; config hash: 3905af56bb3b1fca; manifest hash: f5000b9c1849df95
- Coverage threshold: 0.5; maximum snapshot age: 30 days; contested tolerance: 0.05
- Judge: opencode-go/hy4-preview (thinking high)

Sources:

| Source | Status | Retrieved | SHA-256 | URL |
|---|---|---|---|---|
| deepswe | ok | 2026-09-14T16:25:01.129Z | 005cbedb49f988ba3f0d9636300862ad7ace93ce1992b37faf9945fe5b383415 | https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json |
| tbench | ok | 2026-09-14T16:25:01.374Z | a3e64b8fb13ff7a4128e9d8e2308ff6d216be9f91533cf875f4084586b9a8c45 | https://www.tbench.ai/?version=2.1 |
| swebench-site | ok | 2026-09-14T16:25:01.761Z | 83cd949a9582f4dd68b0a07148cd86ff0eae6a05b0f2d2298a8f3717baf89d2d | https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json |

## 2. Executive summary

- 6 comparable unit(s): 3 scored, 3 excluded as a small board, 0 excluded as stale.
- Stages that rank: implement.
- Stages that stay evidence-only (coverage below 0.5): run_stage_plan, review_plan, review, run_stage_break, general.
- Capabilities with no observed evidence for these routes: adversarial_analysis, instruction_following, long_context, reasoning, repository_understanding, review.
- Routes with no observed evidence: opencode-go/deepseek-v4.1-flash, opencode-go/hy3, openrouter/inception/mercury-2.5.
- All tier A sources responded.
- No judge assessment: this report carries the missing-judge state.

## 3. Baseline route table and re-evaluation

Configured baseline routes (rank 1) with their re-evaluation. Operational values are catalog data, not capability scores:

| Stage | Baseline (rank 1) | Status | Score | Coverage | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|
| run_stage_plan | opencode-go/glm-5.3 | evidence only | n/a | 0.0% | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| review_plan | openai-codex/gpt-5.6-sol | evidence only | n/a | 0.0% | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| implement | opencode-go/deepseek-v4.1-flash | evidence only | n/a | 0.0% | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| review | openai-codex/gpt-5.6-sol | evidence only | n/a | 30.0% | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| run_stage_break | opencode-go/hy3 | evidence only | n/a | 0.0% | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| general | openai-codex/gpt-5.6-luna | evidence only | n/a | 0.0% | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |

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
| run_stage_plan | opencode-go/glm-5.3 | 1 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| run_stage_plan | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| review_plan | openai-codex/gpt-5.6-sol | 1 | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| review_plan | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| implement | opencode-go/deepseek-v4.1-flash | 1 | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| implement | opencode-go/gpt-5.6-luna | 2 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| implement | openai-codex/gpt-5.6-luna | 3 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| review | openai-codex/gpt-5.6-sol | 1 | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| review | mistral/zai-glm-5-2 | 2 | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| run_stage_break | opencode-go/hy3 | 1 | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| run_stage_break | openai-codex/gpt-5.6-luna | 2 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| run_stage_break | opencode-go/gpt-5.6-luna | 3 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| general | openai-codex/gpt-5.6-luna | 1 | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |

## 4. Capability coverage matrix

Values are the mean percentile rank of the observations for that capability. Empty cells state why: `no source` (no tier A benchmark carries this capability), `excluded unit` (the board is too small or stale), `no alias` (add an alias record), `not on board` (the model has no published row).

| Route | adversarial_analysis | instruction_following | long_context | multimodal | reasoning | repository_understanding | review | software_engineering | tool_use |
|---|---|---|---|---|---|---|---|---|---|
| mistral/zai-glm-5-2 | no source | no source | no source | excluded unit | no source | no source | no source | 0.161 | no alias |
| openai-codex/gpt-5.6-luna | no source | no source | no source | excluded unit | no source | no source | no source | 0.696 | 0.250 |
| openai-codex/gpt-5.6-sol | no source | no source | no source | excluded unit | no source | no source | no source | 0.875 | 0.607 |
| opencode-go/deepseek-v4.1-flash | no source | no source | no source | excluded unit | no source | no source | no source | evidence only | no alias |
| opencode-go/glm-5.3 | no source | no source | no source | excluded unit | no source | no source | no source | 0.768 | 0.679 |
| opencode-go/gpt-5.6-luna | no source | no source | no source | excluded unit | no source | no source | no source | 0.696 | 0.250 |
| opencode-go/hy3 | no source | no source | no source | excluded unit | no source | no source | no source | no alias | no alias |
| openrouter/inception/mercury-2.5 | no source | no source | no source | excluded unit | no source | no source | no source | no alias | no alias |

## 5. Deterministic scorecard per stage

### run_stage_plan

Weights: repository_understanding 0.3, reasoning 0.3, long_context 0.2, instruction_following 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | repository_understanding (0.3), reasoning (0.3), long_context (0.2), instruction_following (0.2) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review_plan

Weights: reasoning 0.4, adversarial_analysis 0.3, repository_understanding 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | reasoning (0.4), adversarial_analysis (0.3), repository_understanding (0.3) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### implement

Weights: software_engineering 0.5, tool_use 0.3, repository_understanding 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| 1 (tied with opencode-go/glm-5.3, within tolerance) | openai-codex/gpt-5.6-sol | 0.775 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| 1 (tied with openai-codex/gpt-5.6-sol, within tolerance) | opencode-go/glm-5.3 | 0.734 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| 2 (tied with opencode-go/gpt-5.6-luna) | openai-codex/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| 2 (tied with openai-codex/gpt-5.6-luna) | opencode-go/gpt-5.6-luna | 0.529 | 80.0% | 0.80 | ranked | repository_understanding (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| 3 | mistral/zai-glm-5-2 | 0.161 | 50.0% | 0.50 | ranked | tool_use (0.3), repository_understanding (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | software_engineering (0.5), tool_use (0.3), repository_understanding (0.2) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### review

Weights: review 0.5, software_engineering 0.3, reasoning 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | review (0.5), reasoning (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | review (0.5), software_engineering (0.3), reasoning (0.2) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### run_stage_break

Weights: adversarial_analysis 0.4, review 0.3, software_engineering 0.3

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/glm-5.3 | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 30.0% | 0.30 | evidence only | adversarial_analysis (0.4), review (0.3) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | adversarial_analysis (0.4), review (0.3), software_engineering (0.3) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

### general

Weights: instruction_following 0.3, reasoning 0.3, long_context 0.2, multimodal 0.2

| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities | Input price (USD/M tokens; source; read) | Output price (USD/M tokens; source; read) | Context limit (source; read) |
|---|---|---|---|---|---|---|---|---|---|
| - | mistral/zai-glm-5-2 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.462Z] |
| - | openai-codex/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | openai-codex/gpt-5.6-sol | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 5.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 30.000 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] | 272,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.398Z] |
| - | opencode-go/deepseek-v4.1-flash | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.600 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/glm-5.3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 1.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 4.400 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,000,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/gpt-5.6-luna | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1.200 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 1,050,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | opencode-go/hy3 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.140 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 0.580 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] | 256,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.408Z] |
| - | openrouter/inception/mercury-2.5 | n/a | 0.0% | 0.00 | evidence only | instruction_following (0.3), reasoning (0.3), long_context (0.2), multimodal (0.2) | 0.040 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 0.150 [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] | 260,000 tokens [source: ~/.pi/agent/models-store.json; read: 2026-09-14T16:23:01.406Z] |

Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.

## 6. Fuzzy assessment (judge)

State: `missing-judge`. No advisory assessment is present. The deterministic scorecard stands unchanged.

Judge calibration: not run for this review.

## 7. Divergences and contradictions

- No contested units were detected.


## 8. Recommendation per stage

| Stage | Decision | Rationale |
|---|---|---|
| run_stage_plan | no-change | Mercury 2.5 has no alias on the fetched Tier A boards, so it has no scored evidence for repository understanding, reasoning, long context, or instruction following. Do not route it into planning on provider claims alone. |
| review_plan | no-change | Mercury 2.5 has no scored evidence for reasoning, adversarial analysis, or repository understanding. It cannot displace the current review-plan chain. |
| implement | no-change | Mercury 2.5 has no release-matched software-engineering or tool-use observation on the fetched Tier A boards. The current baseline is already not fully rankable, but this candidate does not repair that evidence gap. |
| review | no-change | Mercury 2.5 has no scored review or software-engineering evidence. Do not use its speed or price claims as evidence for defect detection. |
| run_stage_break | no-change | Mercury 2.5 has no scored adversarial-analysis, review, software-engineering, or tool-use evidence. It is not justified for failure-mode hunting. |
| general | no-change | Mercury 2.5 is text-only and has no scored instruction-following, reasoning, long-context, or multimodal evidence. Its 260K context and low catalog price are operational facts, not a routing-quality result; OpenRouter is also marked unavailable in the provider registry. |

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
| deepswe|v1.1|1.1|default|pass_at_1|agent-cli | 28 | scored | 2026-09-14T16:25:01.129Z | 005cbedb49f988ba… |
| tbench-v2.1|terminal-bench-2.1|2.1|default|accuracy|agent-cli | 14 | scored (small-board flag) | 2026-09-14T16:25:01.374Z | a3e64b8fb13ff7a4… |
| swebench-multilingual|Multilingual|2026-02-13|default|resolved|agent-cli | 13 | scored (small-board flag) | 2026-09-14T16:25:01.761Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli | 6 | small-board-excluded | 2026-09-14T16:25:01.761Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|agent-cli+computer | 6 | small-board-excluded | 2026-09-14T16:25:01.761Z | 83cd949a9582f4dd… |
| swebench-multimodal|Multimodal|2025-11-17|default|resolved|bare-model | 2 | small-board-excluded | 2026-09-14T16:25:01.761Z | 83cd949a9582f4dd… |

Rejected and evidence-only frameworks are recorded in `references/benchmarks.md` with their tier and caveats.

