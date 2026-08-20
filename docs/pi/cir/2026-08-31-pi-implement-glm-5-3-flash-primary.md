# CIR: Use GLM-5.3-Flash first for Pi implementation

## Intent

Make `opencode-go/glm-5.3-flash` the primary Pi implementation model and reduce
the automatic route to three models. Enable LongCat-2.0 for manual selection
without adding it to an automatic route.

## Behavior

GIVEN the Pi `implement` stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in this order:

1. `opencode-go/glm-5.3-flash`
2. `opencode-go/gpt-5.6-luna`
3. `openai-codex/gpt-5.6-luna`

GIVEN the user opens Pi's model selector
WHEN enabled OpenCode Go models are listed
THEN `opencode-go/glm-5.3-flash` and `opencode-go/longcat-2.0` are available for
manual selection.

GIVEN automatic stage routing is resolved
WHEN Pi reads all enhanced prompt chains
THEN `opencode-go/longcat-2.0` does not appear in any route.

## Constraints

- Keep `enabledModels` additive during this routing change. A later hygiene pass
  may prune dormant models that have no route, extraction, or session-start role;
  see `2026-08-31-pi-enabled-models-hygiene-prune.md`.
- Keep the Implement route to three models.
- Keep a separate OpenAI Codex route as the final provider fallback.
- LongCat-2.0 is enabled only; its current evidence does not justify automatic
  routing.

## Decisions

- **Use GLM-5.3-Flash first** because the user prefers its capability, image
  input, and zero-day OpenCode Go retention for implementation work.
- **Keep both Luna routes as fallbacks** to retain an established model and a
  provider-diverse final route.
- Remove DeepSeek V4 Flash, Hy3, and Laguna from automatic implementation
  routing because five total models added unnecessary fallback depth.
- Enable LongCat-2.0 only for manual evaluation because its high allowance is
  useful for experiments, but its software-engineering evidence is weaker than
  the routed models.

## Date

2026-08-31

## Supersedes

- `docs/pi/cir/2026-08-15-pi-implement-route-deepseek-price-hike.md` — Implement
  route only.
