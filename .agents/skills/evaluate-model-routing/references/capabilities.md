# Capability Evaluation Guide

Shared across coding agents. The heading of each section IS the capability ID
used in `tasks.md`. Do not duplicate IDs in frontmatter. Add a new capability
only when a real evaluation needs it.

Evidence types: `benchmark`, `crowd-sourced`, `provider-doc`, `news`, `unverified`.

## reasoning

- **What it means:** sustained multi-step inference: tracing control flow, deriving invariants, weighing trade-offs, spotting contradictions in plans or code.
- **Primary evidence:** Artificial Analysis Intelligence Index; Aider Polyglot Leaderboard (reasoning-heavy exercise clusters); SWE-bench (for code-grounded reasoning).
- **Secondary evidence:** LMArena blind-vote rankings; provider model cards (chain-of-thought/reasoning mode support); blog posts with controlled comparisons.
- **Sufficiency criteria:** the model must handle the stage's reasoning load on a realistic task sample; if no benchmark evidence exists, mark `unverified`, not inferior.

## repository_understanding

- **What it means:** reading a codebase as a whole: locating relevant modules, tracing call graphs, matching existing patterns and conventions, estimating blast radius of a change.
- **Primary evidence:** Aider Polyglot Leaderboard (edits across multiple files in real repos); SWE-bench-style issue-resolution benchmarks; provider docs claiming long-horizon repo work.
- **Secondary evidence:** Artificial Analysis Coding Agent Index (SWE-Atlas, Terminal-Bench); crowd-sourced reports from agent users.
- **Sufficiency criteria:** evidence must cover multi-file, repo-grounded edits rather than single-function edits; large context windows alone are not evidence of understanding.

## software_engineering

- **What it means:** writing correct, idiomatic, reviewable code: tests, refactors, error handling, dependency and tooling awareness.
- **Primary evidence:** Aider Polyglot Leaderboard; SWE-bench resolved-rate; Coding Agent Index (DeepSWE, Terminal-Bench).
- **Secondary evidence:** LMArena coding rooms (crowd-sourced); provider release notes on coding-specific variants (e.g. `-codex`, `-code`); engineering blog evaluations.
- **Sufficiency criteria:** evidence must cover realistic coding workflows (edit → test → fix), not just single-shot completions.

## tool_use

- **What it means:** driving shell commands, file edits, and agent tools reliably: correct command construction, parsing tool output, recovering from tool failures, respecting read-only modes.
- **Primary evidence:** Terminal-Bench (agentic terminal usage); Artificial Analysis Coding Agent Index; agent-trace studies or tool-call accuracy reports.
- **Secondary evidence:** provider docs on function/tool calling support; crowd-sourced agent tool-call logs.
- **Sufficiency criteria:** evidence must be agentic (multi-turn tool use), not single-turn API function calling.

## review

- **What it means:** finding bugs, security issues, and quality problems in existing code or plans; assessing severity; suggesting minimal fixes without rewriting.
- **Primary evidence:** SWE-bench (reviews as issue resolution); code-review benchmarks (e.g. CodeRabbit, SWE-bench-verified review tasks); Aider Polyglot (regression avoidance).
- **Secondary evidence:** LMArena blind votes on review-quality tasks; provider model cards mentioning critique capabilities.
- **Sufficiency criteria:** evidence should show detection of injected or real bugs (recall), not just fluent critique.

## adversarial_analysis

- **What it means:** actively trying to break things: finding failure modes, edge cases, abuse vectors, and assumptions the author did not anticipate.
- **Primary evidence:** security/red-team benchmarks (e.g. CyberSecEval, jailbreak/hardening suites); adversarial QA leaderboards; bug-bounty style evaluations.
- **Secondary evidence:** LMArena-style blind comparisons on hostile-questions tasks; provider safety documentation; independent red-team reports.
- **Sufficiency criteria:** evidence must demonstrate that the model surfaces non-obvious breakage, not that it identifies obvious bugs.

## long_context

- **What it means:** staying coherent and accurate across large inputs (big repos, long plans, big diffs) without losing early context or hallucinating.
- **Primary evidence:** long-context benchmarks (e.g. RULER, LongBench, needle-in-a-haystack variants); context-window specifications from the model store; agent sessions with large prompt loads.
- **Secondary evidence:** provider docs; crowd-sourced reports of degradation beyond a certain size.
- **Sufficiency criteria:** evidence must be about retrieval/coherence at the model's actual deployment context size, not just its advertised limit.

## multimodal

- **What it means:** correctly interpreting images (screenshots, diagrams, UI mockups) as task input.
- **Primary evidence:** vision-language benchmarks (e.g. MMMU, DocVQA); model-store `input` capability for the agent's provider.
- **Secondary evidence:** LMArena image tasks; provider model cards.
- **Sufficiency criteria:** the stage must actually need images; a text-only model is not deficient for text-only stages.

## instruction_following

- **What it means:** accurately doing what the user asked on open-ended, general-purpose work: adhering to precise, multi-part instructions, answering with accurate knowledge, and producing clear, well-formed output — the skills a general assistant is judged on, independent of code-specific stages.
- **Primary evidence:** LMArena blind-vote rankings (general quality); knowledge benchmarks (MMLU-Pro, GPQA); instruction-following suites (IFEval).
- **Secondary evidence:** provider model cards (chat/assistant variants); crowd-sourced reports of instruction adherence; writing-quality blind comparisons.
- **Sufficiency criteria:** evidence must cover open-ended, multi-turn instruction adherence and factual accuracy — not single-shot completions or code-only benchmarks.
