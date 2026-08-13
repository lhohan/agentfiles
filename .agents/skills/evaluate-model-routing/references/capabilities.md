# Capability Evaluation Guide

Shared across coding agents. Each second-level heading is a capability ID used in
`tasks.md`. Add a capability only when a real evaluation needs it.

For each routing review, classify evidence as `primary`, `secondary`,
`conditional`, or `deprecated` according to `SKILL.md`. The labels apply to an
evaluation's fit for one capability, not to its overall quality. Also label each
result as `model`, `agent-model system`, or `proxy-family` evidence.

Public benchmarks rarely measure planning directly. When no credible benchmark
matches the stage, use a realistic local workflow sample and mark missing public
coverage `unverified`.

Source types: `benchmark`, `crowd-sourced`, `provider-doc`, `news`, `unverified`.

## reasoning

- **What it means:** Sustained multi-step inference: tracing control flow, deriving invariants, weighing trade-offs, and spotting contradictions in plans or code.
- **Primary evidence:** A construct-matched individual evaluation from [Artificial Analysis](https://artificialanalysis.ai/evaluations), where one exists, plus realistic local samples from the target stage.
- **Secondary evidence:** Failure analysis from [DeepSWE v1.1](https://deepswe.datacurve.ai/) or [SWE Atlas](https://github.com/scaleapi/SWE-Atlas) can reveal reasoning failures during repository work.
- **Conditional or deprecated:** Do not use the Artificial Analysis Intelligence Index as a direct coding-reasoning score. Knowledge, preference, and issue-resolution scores are not interchangeable with reasoning evidence.
- **Sufficiency criteria:** The model handles the stage's reasoning load on realistic inputs. If no direct public result or local sample exists, report `unverified`, not inferior.

## repository_understanding

- **What it means:** Reading a codebase as a whole: locating relevant modules, tracing call graphs, matching existing patterns, and estimating change blast radius.
- **Primary evidence:** [SWE Atlas Codebase Q&A](https://labs.scale.com/leaderboard/sweatlas-qna) and [ContextBench](https://github.com/EuniAI/ContextBench).
- **Secondary evidence:** DeepSWE v1.1 trajectories and [SWE-Bench ProMax](https://arxiv.org/abs/2608.09802) outcomes on large repository tasks.
- **Conditional or deprecated:** ContextBench measures context retrieval within an agent trajectory, so treat it as agent-model-system evidence unless model effects are isolated. ProMax is mined from public commits and remains scaffold-sensitive. Aider Polyglot is short-form editing evidence, not repository-understanding evidence.
- **Sufficiency criteria:** Evidence covers repository navigation or multi-file understanding. A large advertised context window alone is insufficient.

## software_engineering

- **What it means:** Writing correct, idiomatic, reviewable code, including tests, refactors, error handling, dependency use, and tooling awareness.
- **Primary evidence:** [DeepSWE v1.1](https://github.com/datacurve-ai/deep-swe), which uses original long-horizon tasks and programmatic verifiers. Record its harness and attempts with every result.
- **Secondary evidence:** [SWE Atlas Test Writing and Refactoring](https://github.com/scaleapi/SWE-Atlas), SWE-Bench ProMax, and [SWE-bench Multilingual](https://www.swebench.com/multilingual.html).
- **Conditional or deprecated:** [Aider Polyglot](https://aider.chat/docs/leaderboards/) is conditional short-form editing evidence. SWE-bench Pro is secondary at most because of its published task-quality audit. SWE-bench Verified is deprecated for frontier routing because contamination and saturation weaken its signal.
- **Sufficiency criteria:** Evidence covers an edit-test-fix or comparable repository workflow. Use multilingual results for language breadth, not as proof of contamination resistance or universal software-engineering quality.

## tool_use

- **What it means:** Driving shell commands, file edits, and agent tools reliably: constructing commands, interpreting output, recovering from failures, and respecting operating constraints.
- **Primary evidence:** [Terminal-Bench v2.1](https://www.tbench.ai/leaderboard/terminal-bench/2.1) for multi-step work in real terminal environments.
- **Secondary evidence:** The [Artificial Analysis Terminal-Bench v2.1 component](https://artificialanalysis.ai/evaluations/terminalbench-v2-1) and public trajectories or controlled agent-trace studies.
- **Conditional or deprecated:** Terminal-Bench results are agent-model-system evidence and must name the harness, scaffold, tools, and attempt count. Single-turn function-calling benchmarks are not direct evidence of agentic tool use.
- **Sufficiency criteria:** Evidence covers multi-turn tool use and recovery from failures under constraints similar to the target agent.

## review

- **What it means:** Finding bugs, security issues, and quality problems in existing code or plans; assessing severity; and suggesting minimal fixes without rewriting.
- **Primary evidence:** [c-CRAB](https://arxiv.org/abs/2603.23448), which checks review findings against test-backed, human-raised issues in realistic pull requests.
- **Secondary evidence:** [CR-Bench](https://arxiv.org/abs/2603.11078) results that report defect precision, recall, usefulness, and signal-to-noise behavior.
- **Conditional or deprecated:** c-CRAB measures whether feedback guides a fixed coding agent to pass tests derived from human-raised issues; it does not measure valid findings absent from those reviews. CR-Bench inherits SWE-bench provenance and uses an LLM judge. Record judge versions and human-agreement evidence. SWE-bench issue resolution and Aider regression avoidance are not direct review evidence.
- **Sufficiency criteria:** Evidence measures useful defect detection and false positives, not merely fluent critique. Plan-review stages still require local samples because coding-review benchmarks do not establish plan-review quality.

## adversarial_analysis

- **What it means:** Actively finding failure modes, edge cases, abuse vectors, and assumptions the author did not anticipate.
- **Primary evidence:** c-CRAB or CR-Bench for defect finding, paired with realistic local `/break` samples for the target workflow.
- **Secondary evidence:** [CyberGym](https://openreview.net/forum?id=2YvbLQEdYt) for security-specific vulnerability discovery and reproduction.
- **Conditional or deprecated:** CyberGym establishes a narrower security capability, not general adversarial analysis. General safety, refusal, and jailbreak scores do not establish software failure analysis.
- **Sufficiency criteria:** Evidence shows non-obvious breakage with actionable reproduction ideas. Without direct public coverage or a local sample, report `unverified`.

## long_context

- **What it means:** Staying coherent and accurate across large repositories, plans, or diffs without losing early constraints or inventing details.
- **Primary evidence:** ContextBench retrieval precision, recall, and efficiency at repository scale, plus a local sample near the target stage's realistic context load.
- **Secondary evidence:** Long-horizon outcomes and trajectories from DeepSWE v1.1 or ProMax, together with the deployed context limit from the agent's model store.
- **Conditional or deprecated:** ContextBench is agent-model-system evidence and measures context selection rather than every aspect of long-context reasoning. Advertised context size, RULER, LongBench, and needle tests are conditional diagnostics, not sufficient routing evidence by themselves.
- **Sufficiency criteria:** Evidence covers retrieval and use at realistic scale and deployment settings. Do not infer effective context from the advertised maximum.

## multimodal

- **What it means:** Correctly interpreting screenshots, diagrams, UI mockups, and other images as task input.
- **Primary evidence:** [SWE-bench Multimodal](https://www.swebench.com/multimodal.html) for repository tasks that require visual evidence.
- **Secondary evidence:** [MMMU](https://mmmu-benchmark.github.io/), [DocVQA](https://www.docvqa.org/), vision Arena results, and the model store's deployed input capability.
- **Conditional or deprecated:** Generic vision scores support perception claims but do not by themselves establish performance in coding workflows.
- **Sufficiency criteria:** The stage must need images. A text-only model is not deficient for a text-only route.

## instruction_following

- **What it means:** Following precise, multi-part instructions across turns while preserving constraints and producing the requested form of output.
- **Primary evidence:** [IFBench](https://github.com/allenai/IFBench) for verifiable out-of-domain constraints and [MultiChallenge](https://arxiv.org/abs/2501.17399) for realistic multi-turn instruction following.
- **Secondary evidence:** [LMArena](https://lmarena.ai/) as a broad preference and usability sanity check, plus realistic local stage samples.
- **Conditional or deprecated:** LMArena mixes many constructs and is not direct instruction-following evidence. MMLU and GPQA measure knowledge or reasoning, not instruction adherence.
- **Sufficiency criteria:** Evidence covers constraint retention on multi-part or multi-turn work. Single-shot format compliance alone is insufficient.
