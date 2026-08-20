# CIR: Prune dormant enabled models from Pi model picker

## Intent

Reduce clutter in Pi's `enabledModels` picker list by removing models that have no
route, answer-extraction, or session-start role, while retaining
`opencode-go/minimax-m3` and a single Kimi model (`opencode-go/kimi-k2.7-code`) per
user preference.

## Behavior

GIVEN the Pi `enabledModels` list in `agents/pi/.pi/agent/settings.json`
WHEN Pi builds its model selector
THEN only the 15 retained models are present and selectable, and all 7 routed
models, the 3 answer-extraction models, and `opencode-go/longcat-2.0` (enabled-only
A/B) remain enabled.

## Constraints

- No model used by a prompt-template route may be removed (routed set:
  `opencode-go/glm-5.3`, `opencode-go/glm-5.3-flash`, `opencode-go/gpt-5.6-luna`,
  `opencode-go/hy3`, `mistral/zai-glm-5-2`, `openai-codex/gpt-5.6-sol`,
  `openai-codex/gpt-5.6-luna`).
- No model used by `answer.extractionModels` may be removed
  (`mistral/mistral-medium-3.5`, `opencode-go/deepseek-v4-flash`,
  `mistral/mistral-small-2603`).
- `opencode-go/longcat-2.0` stays enabled for its enabled-only A/B role.
- This is a deliberate hygiene pass that relaxes the earlier additive-only rule
  (see Supersedes).

## Decisions

- **Pruned (8):** `opencode-go/kimi-k2.6`, `opencode-go/kimi-k3`,
  `opencode-go/deepseek-v4-pro`, `opencode/laguna-s-2.1-free`,
  `opencode-go/glm-5.2`, `opencode-go/qwen3.6-plus`, `opencode-go/qwen3.8-max`,
  `openai-codex/gpt-5.6-terra`. All were enabled but appeared in no route,
  extraction list, or session-start config — pure picker clutter.
- **Kept `opencode-go/minimax-m3`:** user override; MiniMax remains a useful
  manual general/implement option.
- **Kept one Kimi — `kimi-k2.7-code`:** it is the code-tuned Kimi variant
  ($0.95/$4, 262k ctx, ~1,350 req/5h on Go) and the best fit for implementation/
  review support among the three. `kimi-k2.6` (general, redundant with the code
  variant) and `kimi-k3` (expensive at $3/$15, only ~110 req/5h on Go, and its
  reasoning role is already covered by Sol / GLM-5.3 / Qwen) were dropped.
- **`glm-5.2` dropped:** superseded by the routed `glm-5.3`.
- **`deepseek-v4-pro` dropped:** previously removed from the Break route; dormant.
  Aligns with the user's preference for GLM over DeepSeek where a choice exists.

## Date

2026-08-31

## Supersedes

- `docs/pi/cir/2026-08-13-pi-routing-stage-model-reevaluation.md` — the
  "enabledModels remains additive-only" constraint and the "stay enabled as manual
  models" listing for the pruned models.
- `docs/pi/cir/2026-08-15-mistral-eu-endpoint.md` — the retention of
  `opencode-go/glm-5.2` as an enabled manual model.
- `docs/pi/cir/2026-08-31-pi-plan-route-glm-5-3-primary.md` — its temporary
  manual-retention decision for `opencode-go/glm-5.2`.
- `docs/pi/cir/2026-08-31-pi-implement-glm-5-3-flash-primary.md` — its
  additive-only retention constraint for models removed from automatic routing.

Additive-only still holds for routing changes; this CIR permits deliberate pruning
of dormant models.
