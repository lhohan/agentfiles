# Task Definitions

Shared across coding agents. A task not listed here is a validation error in any agent profile.

Each task's capability set is the input to the stage weighting in
`config.json`. Weights are configured there, not here: the scripts cannot parse
Markdown tables. The capability identifiers below are the join between this file,
`capabilities.md`, and `config.json`; a test asserts that every capability named
here is weighted in at least one stage.

## run_stage_plan

- **Description:** produce an implementation-ready plan from a user request and repository inspection: enumerate options, surface unresolved decisions, estimate impact, and hand off to execution.
- **Capabilities:** `reasoning`, `instruction_following`, `repository_understanding`, `long_context`

## review_plan

- **Description:** critically review an implementation plan before execution: find unclear assumptions, missing steps, weak trade-offs, and likely failure points; suggest the smallest corrective changes.
- **Capabilities:** `reasoning`, `adversarial_analysis`, `repository_understanding`

## implement

- **Description:** implement features, fixes, or tasks in code: inspect the repository, make surgical changes, run verification, and keep the change scoped.
- **Capabilities:** `software_engineering`, `repository_understanding`, `tool_use`

## review

- **Description:** review open or uncommitted changes for bugs, security, quality, and compliance; report findings with severity and confidence without applying changes.
- **Capabilities:** `review`, `software_engineering`, `reasoning`

## run_stage_break

- **Description:** adversarial failure-mode hunting: find ways the software can fail, leak, crash, or be abused; propose minimal repro ideas; do not validate the implementation.
- **Capabilities:** `adversarial_analysis`, `review`, `software_engineering`

## general

- **Description:** handle general-purpose assistant work outside the stage-specific prompts: answering questions, summarising, explaining, writing, and following arbitrary user instructions with accurate knowledge and clear output.
- **Capabilities:** `reasoning`, `instruction_following`, `long_context`, `multimodal`
