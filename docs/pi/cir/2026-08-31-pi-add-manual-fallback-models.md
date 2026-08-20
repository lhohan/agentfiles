# CIR: Add manual-fallback and simple-task models; fix extraction config gap

## Intent

Add three models to `enabledModels` as manual/picker options (not routed), and fix a
configuration gap in `answer.extractionModels` where `openai-codex/gpt-5.4-mini` was
referenced but never enabled.

## Behavior

GIVEN the Pi `enabledModels` list
WHEN Pi builds its model selector
THEN `opencode-go/hy4-preview`, `opencode-go/qwen3.8-flash`, and
`mistral/mistral-small-2603` are present and selectable.

GIVEN the answer-extraction configuration
WHEN Pi's `pi-answer` extension extracts Q&A
THEN its model list is `mistral/mistral-medium-3.5`, `opencode-go/deepseek-v4-flash`,
and `mistral/mistral-small-2603` — all enabled.

## Constraints

- These are picker additions only. No prompt-template route chain changes; the
  user's ≤3-models-per-route rule is preserved.
- `mistral/mistral-small-2603` must be enabled for the extraction slot to resolve
  (it is added by this CIR).
- Devstral and Magistral are intentionally NOT added (see Decisions).

## Decisions

- **`opencode-go/hy4-preview`** — newest reasoning model (770B MoE, ~1M ctx).
  Extends the Hy3 line already on the Break route as a manual reasoning/break
  fallback. Evidence status: `unverified` — vendor claims competitive with
  Qwen3.8 Max / DeepSeek V4 Pro / GLM-5.3 / Kimi K3 on agentic coding, trails
  GPT-5.6 Sol and Claude Opus 5 on hardest reasoning; BenchLM ~#6/228 (79.9).
  No independent agentic-SWE or Terminal-Bench result found. Treat as
  experimental manual use.
- **`opencode-go/qwen3.8-flash`** — cheap multimodal fallback ($0.15/$0.47,
  1M ctx, image-capable). Complements the routed `glm-5.3-flash` as a low-cost
  image-capable manual option.
- **`mistral/mistral-small-2603` (Small 4)** — EU-origin small multimodal model
  ($0.15/$0.6, 256k ctx) for simple tasks: summarising and answer extraction.
  Chosen to replace the missing `gpt-5.4-mini` in `answer.extractionModels`
  because it is exactly the "small model for answer stuff" role and is EU-hosted
  (privacy buffer). Vendor-diverse alternative if two Mistrals in the extraction
  list is unwanted: `opencode-go/qwen3.8-flash`.
- **Reject Devstral / Magistral:** user notes Mistral deprecated both and
  recommends moving to `mistral-medium-3.5`. Not added. (These appeared in an
  earlier evaluate-model-routing shortlist; rejected here on the deprecation
  signal.)

## Date

2026-08-31
