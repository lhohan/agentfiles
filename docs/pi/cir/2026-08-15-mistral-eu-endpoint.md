# CIR: Route Mistral models through the EU regional endpoint

## Intent

Route all Mistral models through the EU regional inference endpoint
(`https://api.eu.mistral.ai`) for EU data residency, and add Mistral-hosted
GLM 5.2 (`zai-glm-5-2`) as a custom model with reasoning support and accurate
cost tracking.

## Behavior

GIVEN `~/.pi/agent/models.json` defines provider `mistral` with
`baseUrl: "https://api.eu.mistral.ai"`
WHEN pi composes the built-in `mistral` provider
THEN every built-in Mistral model resolves to the EU base URL and the custom
`zai-glm-5-2` model is added alongside them.

GIVEN thinking is set to a non-`off` level on `mistral/zai-glm-5-2`
WHEN pi 0.84.2 builds the request
THEN it sends `prompt_mode: "reasoning"` and omits `reasoning_effort` (the
model is not in the hardcoded `usesReasoningEffort` list).

GIVEN thinking is set to `off` on `mistral/zai-glm-5-2`
WHEN pi 0.84.2 builds the request
THEN it omits both `prompt_mode` and `reasoning_effort`, so the model does not
reason.

## Constraints

- All Mistral models must use the EU endpoint for data residency.
- EU regional pricing is 1.1× standard list pricing; cost metadata must reflect
  this so usage/cost tracking stays accurate.
- `settings.json` cannot express provider `baseUrl`, custom models, cost, or
  `thinkingLevelMap`; `models.json` is the only declarative mechanism. Unknown
  `settings.json` keys are silently ignored.
- Mistral's regional endpoints support function calling only (no other tool
  types) and no stateful features (Agents, Batch, Files API). This does not
  affect normal coding-agent tool use, which relies on function calling.
- As of 2026-08-15, 15 of pi's 31 built-in Mistral models are absent from the
  EU endpoint: `devstral-medium-2507`, `devstral-small-2505`,
  `devstral-small-2507`, `labs-devstral-small-2512`, `magistral-medium-latest`,
  `magistral-small`, `mistral-large-2411`, `mistral-nemo`, `mistral-small-2506`,
  `open-mistral-7b`, `open-mistral-nemo`, `open-mixtral-8x22b`,
  `open-mixtral-8x7b`, `pixtral-12b`, `pixtral-large-latest`. None are in
  `enabledModels`. The regional catalog drifts as Mistral syncs endpoints, so
  this list is a snapshot, not a guarantee.
- `enabledModels` remains additive-only; the existing `opencode-go/glm-5.2`
  entry is kept alongside the new `mistral/zai-glm-5-2`.

## Decisions

- **Override the built-in `mistral` provider `baseUrl` to the EU endpoint**
  rather than creating a separate provider, so existing Mistral models
  (`mistral-medium-3.5`, used in `answer.extractionModels`) share the same EU
  routing with no per-model changes.
- **Use EU cost rates (1.1× global)**: `zai-glm-5-2` at `1.54 / 4.84 /
  0.154 / 0` and `mistral-medium-3.5` at `1.65 / 8.25` (cached read/write
  omitted to preserve the built-in `0`). EUR prices are not used; pi cost
  tracking is USD.
- **Expose only the documented reasoning levels** `off` and `high` via
  `thinkingLevelMap` (all other levels `null`, hidden from UI cycling), and
  accept that pi 0.84.2 sends `prompt_mode: "reasoning"` rather than a distinct
  `reasoning_effort` for this model.
- **Rejected a local compatibility extension** to force `reasoning_effort` for
  `zai-glm-5-2`, because it is heavier plumbing than the declarative config and
  would need to be removed once upstream pi adds the model to
  `usesReasoningEffort`. The same `thinkingLevelMap` becomes forward-compatible
  automatically at that point.
- **Keep `opencode-go/glm-5.2`** alongside `mistral/zai-glm-5-2` rather than
  replacing it, since `enabledModels` is additive and the two routes are
  distinct providers.

## Date

2026-08-15
