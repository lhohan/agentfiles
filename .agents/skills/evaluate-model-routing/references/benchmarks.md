# Benchmark registry

Every benchmark and evaluation framework the skill knows about. `benchmarks.json`
is the machine-readable mirror of this file; a test keeps the two in step.

Tier meanings:

| Tier | Meaning | Use |
|---|---|---|
| A | Machine-readable results, verified in the fetchability spike | Fetched and scored by `scripts/evaluate.mjs` |
| B | Construct-relevant, but results are manual, key-gated, or not JSON | Evidence-only notes in the report |
| C | Deprecated, conditional, or narrow scope | Disposition recorded; excluded from the pipeline |

No machine-readable result means no score. Tier A entries record the exact
fetch URL, the metric, its direction, the harness class map, and a probe result.
Values are normalised to 0..1 by the adapter.

## Tier A sources

### `deepswe`

- **Name:** DeepSWE v1.1. **Capability:** `software_engineering` (primary).
- **Source:** <https://deepswe.datacurve.ai/> — fetch
  `https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json`.
- **Unit:** board `v1.1`, split `default`, metric `pass_at_1`, harness class
  `agent-cli` (the only published harness is `mini-swe-agent`).
- **Probe (2026-09-11):** HTTP 200, 94 KB JSON, 70 configurations over 28
  models, `generated_at` 2026-09-03.
- **Caveats:** every row uses the same harness, so a result is agent-model-system
  evidence. Rows repeat a model at several reasoning efforts; the scorer keeps
  the highest published effort and records the alternatives. The publisher also
  records run-to-run intervals; the pipeline records them and never combines
  them statistically. Trajectory analysis is not published as data, so this
  source does not score `repository_understanding` or `long_context`.

### `tbench-v2.1`

- **Name:** Terminal-Bench v2.1. **Capability:** `tool_use` (primary).
- **Source:** <https://www.tbench.ai/leaderboard/terminal-bench/2.1>.
- **Unit:** board `terminal-bench-2.1`, split `default`, metric `accuracy`,
  harness class `agent-cli` for Codex, Claude Code, Grok Build, and mini-SWE-agent.
- **Probe (2026-09-11):** HTTP 200; 18 ranked rows carry `accuracy`,
  `accuracy_ci95_half_width`, `n_trials`, and `pass_at_k`.
- **Caveats:** the rows are JSON inside the server-rendered React Server
  Component flight payload, not a documented JSON endpoint. The adapter extracts
  the rows array and fails loudly if the shape changes; it needs no JavaScript
  runtime and no authentication. The board holds 13 distinct models after
  dedupe, so the scorer marks it `small-board`. The Hugging Face submissions
  dataset stores per-task rollout directories, which is not a machine-readable
  leaderboard.

### `swebench-multilingual`

- **Name:** SWE-bench Multilingual. **Capability:** `software_engineering`
  (secondary).
- **Source:** <https://www.swebench.com/multilingual.html> — fetch
  `https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json`.
- **Unit:** board `Multilingual`, metric `resolved`, harness class `agent-cli`.
- **Probe (2026-09-11):** HTTP 200, 4 MB JSON, five boards. The `main` branch
  returns 404; the `master` branch returns 200, so the adapter pins `master`.
- **Caveats:** language-breadth evidence only, not evidence of contamination
  resistance or general software-engineering ability. All 13 rows use one
  harness, so the board is small and single-harness. Probed 2026-09-11: no route
  in the current candidate set appears on this board, so it contributes a
  coverage gap today. The adapter keeps only submissions the publisher marks as
  checked.

### `swebench-multimodal`

- **Name:** SWE-bench Multimodal. **Capability:** `multimodal` (primary).
- **Source:** <https://www.swebench.com/multimodal.html> — the same JSON payload
  as the multilingual entry.
- **Unit:** board `Multimodal`, metric `resolved`; harness classes `bare-model`,
  `agent-cli`, and `agent-cli+computer`.
- **Probe (2026-09-11):** HTTP 200; 22 rows across 12 agent harnesses, 21 marked
  checked.
- **Caveats:** the only tier A source for the `multimodal` capability. Rows split
  across three harness classes and only the `agent-cli` class reaches 7 distinct
  models, which the scorer excludes as a small board. Probed 2026-09-11: no
  route in the current candidate set appears on this board. Several rows belong
  to the 2025 model generation, so scores are agent-model-system evidence.

## Tier B (evidence only)

| Id | Framework | Capabilities | Why it is not fetched |
|---|---|---|---|
| `contextbench` | [ContextBench](https://github.com/EuniAI/ContextBench) | `repository_understanding` (primary), `long_context` (primary) | Results ship as JavaScript module literals in a Turbopack chunk: no JSON export, no documented API. The repository publishes task data but no result file. |
| `swe-atlas` | [SWE Atlas](https://labs.scale.com/leaderboard/sweatlas-qna) | `repository_understanding` (primary), `software_engineering` (secondary) | Rows load client-side; no JSON endpoint found. The board is graded by an LLM judge, so the headline number mixes judge behaviour with model behaviour. |
| `c-crab` | [c-CRAB](https://arxiv.org/abs/2603.23448) | `review` (primary), `adversarial_analysis` (primary) | No public result export. |
| `cr-bench` | [CR-Bench](https://arxiv.org/abs/2603.11078) | `review` (secondary), `adversarial_analysis` (secondary) | No public result export. |
| `cybergym` | [CyberGym](https://openreview.net/forum?id=2YvbLQEdYt) | `adversarial_analysis` (secondary), `review` (conditional) | Results appear on third-party leaderboards only. Security-specific scope. |
| `ifbench` | [IFBench](https://github.com/allenai/IFBench) | `instruction_following` (primary) | The task set is open; frontier result tables sit behind a key. |
| `multichallenge` | [MultiChallenge](https://arxiv.org/abs/2501.17399) | `instruction_following` (primary) | The dataset is published without a result table. |
| `artificial-analysis` | [Artificial Analysis evaluations](https://artificialanalysis.ai/evaluations) | `reasoning` (conditional) | `api/v2/data/llms/models` returns HTTP 401 without a key; component pages are key-gated. Use for discovery and normalisation, never as a composite score. |
| `lmarena` | [LMArena](https://lmarena.ai/) | `instruction_following` (secondary) | Preference votes are published as datasets, not as per-model capability results. Sanity check only. |

## Tier C (excluded from the pipeline)

| Id | Framework | Capabilities | Disposition |
|---|---|---|---|
| `swebench-promax` | [SWE-bench ProMax](https://arxiv.org/abs/2608.09802) | `software_engineering` (secondary), `repository_understanding` (secondary) | Tasks are mined from public commits; results stay scaffold-sensitive. Secondary at most. |
| `swebench-pro` | [SWE-bench Pro](https://scale.com/leaderboard/swe_bench_pro_public) | `software_engineering` (secondary) | A published audit found widespread task and verifier defects. Secondary at most. |
| `swebench-verified` | [SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | `software_engineering` (deprecated), `repository_understanding` (deprecated) | Contamination and saturation weaken separation. Historical context only. |
| `aider-polyglot` | [Aider Polyglot](https://aider.chat/docs/leaderboards/) | `software_engineering` (conditional), `repository_understanding` (conditional) | Short-form editing evidence only; the leaderboard is HTML only. |
| `mmmu` | [MMMU](https://mmmu-benchmark.github.io/) | `multimodal` (conditional) | Generic vision reasoning, not coding-workflow visual evidence. |
| `docvqa` | [DocVQA](https://www.docvqa.org/) | `multimodal` (conditional) | Document visual question answering, not coding-workflow visual evidence. |

## Coverage after the 2026-09-11 spike

| Weighted capability | Tier A source | Effect |
|---|---|---|
| `software_engineering` | `deepswe` (primary), `swebench-multilingual` (secondary) | Scored |
| `tool_use` | `tbench-v2.1` (primary) | Scored, small-board flag |
| `multimodal` | `swebench-multimodal` (primary) | No observation for the current candidate set |
| `repository_understanding` | none | No source (ContextBench and SWE Atlas are tier B) |
| `long_context` | none | No source (ContextBench is tier B) |
| `reasoning` | none | No source |
| `instruction_following` | none | No source (IFBench and MultiChallenge are tier B) |
| `review` | none | No source (c-CRAB and CR-Bench are tier B) |
| `adversarial_analysis` | none | No source (c-CRAB and CR-Bench are tier B) |

Only `implement` reaches the coverage threshold with the current candidate set.
Every other stage is evidence-only: the report shows its observations and missing
weight, with no rank and no recommendation. That is a coverage finding, not a
low score.

Methods, thresholds, and the report form are in
[`evaluation-method.md`](evaluation-method.md). Settings, weights, and alias
records are in [`config.json`](config.json).
