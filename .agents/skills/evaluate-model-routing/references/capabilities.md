# Capability Evaluation Guide

Shared across coding agents. Each second-level heading is a capability ID used in
`tasks.md`.

This file defines what each capability means and when evidence is sufficient. It
does not list benchmark dispositions: those live in `benchmarks.md`, in one place,
so they cannot drift.

For every routing review:

- Classify an evaluation's fit for one capability as `primary`, `secondary`,
  `conditional`, or `deprecated`. The label applies to that capability, not to the
  evaluation's overall quality.
- Label each result `model`, `agent-model-system`, or `proxy-family` evidence.
  Most agentic benchmark rows are agent-model-system evidence.
- Public benchmarks rarely measure planning or plan review directly. When no
  credible benchmark matches the stage, use a realistic local workflow sample and
  mark the public coverage gap explicitly.

Source types: `benchmark`, `crowd-sourced`, `provider-doc`, `news`, `unverified`.

## reasoning

- **What it means:** Sustained multi-step inference: tracing control flow, deriving invariants, weighing trade-offs, and spotting contradictions in plans or code.
- **Evidence:** No tier A source. [Artificial Analysis](https://artificialanalysis.ai/evaluations) component evaluations are conditional and key-gated; use them for discovery and normalisation, not as a reason for a routing decision. Realistic local stage samples carry the assessment.
- **Sufficiency criteria:** The model handles the stage's reasoning load on realistic inputs, or the capability is reported as a coverage gap. Never treat the Artificial Analysis Intelligence Index as a coding-reasoning score: knowledge, preference, and issue-resolution scores are not interchangeable with reasoning evidence.

## repository_understanding

- **What it means:** Reading a codebase as a whole: locating relevant modules, tracing call graphs, matching existing patterns, and estimating change blast radius.
- **Evidence:** No tier A source. [ContextBench](https://github.com/EuniAI/ContextBench) and [SWE Atlas Codebase QnA](https://labs.scale.com/leaderboard/sweatlas-qna) are tier B primaries, so run them as manual evidence with URLs and dates.
- **Sufficiency criteria:** Evidence covers repository navigation or multi-file understanding. A large advertised context window alone is insufficient, and short-form editing results are not repository-understanding evidence.

## software_engineering

- **What it means:** Writing correct, idiomatic, reviewable code, including tests, refactors, error handling, dependency use, and tooling awareness.
- **Evidence:** Tier A: `deepswe` (primary) and `swebench-multilingual` (secondary, language breadth and small board). SWE-bench Verified is deprecated for frontier routing; SWE-bench Pro is secondary at most after its published audit. Record the harness, attempts, and reasoning effort with every result.
- **Sufficiency criteria:** Evidence covers an edit-test-fix or comparable repository workflow. Use multilingual results for language breadth, not as proof of contamination resistance or universal software-engineering quality.

## tool_use

- **What it means:** Driving shell commands, file edits, and agent tools reliably: constructing commands, interpreting output, recovering from failures, and respecting operating constraints.
- **Evidence:** Tier A: `tbench-v2.1` (primary, small board). Record the agent, scaffold, tools, attempt count, and published interval. Single-turn function-calling benchmarks are not direct evidence of agentic tool use.
- **Sufficiency criteria:** Evidence covers multi-turn tool use and recovery from failures under constraints similar to the target agent.

## review

- **What it means:** Finding bugs, security issues, and quality problems in existing code or plans; assessing severity; and suggesting minimal fixes without rewriting.
- **Evidence:** No tier A source. [c-CRAB](https://arxiv.org/abs/2603.23448) is the tier B primary; [CR-Bench](https://arxiv.org/abs/2603.11078) is secondary. c-CRAB measures whether feedback guides a fixed coding agent to pass tests derived from human-raised issues; it does not measure valid findings absent from those reviews. CR-Bench inherits SWE-bench provenance and uses an LLM judge, so record the judge version and any human-agreement evidence.
- **Sufficiency criteria:** Evidence measures useful defect detection and false positives, not merely fluent critique. Plan-review stages still need local samples, because coding-review benchmarks do not establish plan-review quality.

## adversarial_analysis

- **What it means:** Actively finding failure modes, edge cases, abuse vectors, and assumptions the author did not anticipate.
- **Evidence:** No tier A source. c-CRAB and CR-Bench are tier B primaries for defect finding; [CyberGym](https://openreview.net/forum?id=2YvbLQEdYt) is secondary and security-specific. Pair any public evidence with realistic local `/run-stage-break` samples.
- **Sufficiency criteria:** Evidence shows non-obvious breakage with actionable reproduction ideas. Without public coverage or a local sample, report a coverage gap. General safety, refusal, and jailbreak scores do not establish software failure analysis.

## long_context

- **What it means:** Staying coherent and accurate across large repositories, plans, or diffs without losing early constraints or inventing details.
- **Evidence:** No tier A source. ContextBench is the tier B primary. Take the deployed context limit from the agent's model store, and pair it with a local sample near the target stage's realistic load.
- **Sufficiency criteria:** Evidence covers retrieval and use at realistic scale and deployment settings. Do not infer effective context from the advertised maximum: RULER, LongBench, and needle tests are conditional diagnostics, not routing evidence.

## multimodal

- **What it means:** Correctly interpreting screenshots, diagrams, UI mockups, and other images as task input.
- **Evidence:** Tier A: `swebench-multimodal` (primary), which currently has no rows for the evaluated routes and is excluded as a small board. [MMMU](https://mmmu-benchmark.github.io/) and [DocVQA](https://www.docvqa.org/) are conditional and generic.
- **Sufficiency criteria:** The stage must need images. Generic vision scores support perception claims but do not establish performance in coding workflows, and a text-only model is not deficient for a text-only route.

## instruction_following

- **What it means:** Following precise, multi-part instructions across turns while preserving constraints and producing the requested form of output.
- **Evidence:** No tier A source. [IFBench](https://github.com/allenai/IFBench) and [MultiChallenge](https://arxiv.org/abs/2501.17399) are tier B primaries; [LMArena](https://lmarena.ai/) is a secondary preference sanity check only.
- **Sufficiency criteria:** Evidence covers constraint retention on multi-part or multi-turn work. Single-shot format compliance is insufficient, and LMArena mixes many constructs, so it is never the sole basis for a decision. MMLU and GPQA measure knowledge or reasoning, not instruction adherence.
