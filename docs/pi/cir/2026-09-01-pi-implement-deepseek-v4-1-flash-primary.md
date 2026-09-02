# CIR: Use DeepSeek V4.1 Flash first for Pi implementation

## Intent

Make `opencode-go/deepseek-v4.1-flash` the primary Pi implementation model while
keeping the established Luna fallback chain. Enable the model for direct use and
retain GLM-5.3-Flash as a manual rollback option.

## Behavior

GIVEN the Pi `implement` stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in this order:

1. `opencode-go/deepseek-v4.1-flash`
2. `opencode-go/gpt-5.6-luna`
3. `openai-codex/gpt-5.6-luna`

GIVEN the user opens Pi's model selector
WHEN enabled OpenCode Go models are listed
THEN DeepSeek V4.1 Flash is available as `opencode-go/deepseek-v4.1-flash`.

## Constraints

- Use the versioned OpenCode Go ID `opencode-go/deepseek-v4.1-flash`. Do not
  confuse it with the older `opencode-go/deepseek-v4-flash` model.
- The local Pi catalogue also contains the unversioned `deepseek-flash` alias,
  but `models.dev` and the live OpenCode Go model endpoint identify
  `deepseek-v4.1-flash` as the canonical provider model ID.
- Keep the Implement route to three models.
- Keep `thinking: high` so this change tests the model without also changing the
  reasoning setting.
- Keep both Luna routes as fallbacks, including OpenAI Codex as the final
  provider fallback.
- Keep GLM-5.3-Flash enabled for manual comparison and immediate rollback.
- Do not change the Plan, Review Plan, Review, Break, or General routes.

## Decisions

- **Use DeepSeek V4.1 Flash first** because its vendor-reported DeepSWE v1.1 and
  Terminal-Bench 2.1 results exceed GLM-5.3-Flash, including a published Pi
  scaffold result.
- Treat the temporary four-times OpenCode Go allowance as added capacity, not
  as the reason for the routing decision. The quality case still applies when
  usage is equal.
- Keep the existing fallbacks because they preserve model-family and provider
  diversity without increasing route depth.
- Reject routing DeepSeek V4.1 Flash into planning or review stages because
  direct planning and review evidence is not yet available.
- Roll back to GLM-5.3-Flash if local implementation trials show lower task
  completion, repeated malformed tool calls, truncation, or disruptive usage
  limits after the promotion ends.

## Date

2026-09-01

## Supersedes

- `docs/pi/cir/2026-08-31-pi-implement-glm-5-3-flash-primary.md` — Implement
  primary model only.
