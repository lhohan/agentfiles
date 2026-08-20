# CIR: Mistral GLM-5.2 as backup on reasoning stages

## Intent

Use `mistral/zai-glm-5-2` (EU-hosted, text-only) as the rank-2 backup for Pi's
reasoning stages — Plan, Review Plan, and Review — and trim the Break route to
three models. This realizes the earlier Mistral-backup design while keeping the
`glm-5.3` Plan primary.

## Behavior

GIVEN a reasoning stage (plan, review_plan, review) is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in this order:

| Stage | Rank 1 | Rank 2 |
|---|---|---|
| plan | `opencode-go/glm-5.3` | `mistral/zai-glm-5-2` |
| review_plan | `openai-codex/gpt-5.6-sol` | `mistral/zai-glm-5-2` |
| review | `openai-codex/gpt-5.6-sol` | `mistral/zai-glm-5-2` |

GIVEN the break stage is invoked
WHEN its chain is resolved
THEN Pi selects: `opencode-go/hy3` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna`.

## Constraints

- `mistral/zai-glm-5-2` is already enabled; no `enabledModels` change required.
- Keep Mistral as backup only on text/reasoning stages. Do not use it as backup for
  implement (image-capable primary) or general chat.
- Break stays at three models; remove `opencode-go/deepseek-v4-pro` from its chain.

## Decisions

- **Mistral backup on reasoning stages** because GLM-5.2 is a strong text planner and
  the Mistral EU endpoint gives a privacy-resident, low-cost buffer that stays idle
  until a primary fails.
- **Not on Implement/Break/General** because Mistral GLM-5.2 is text-only
  (`input=["text"]`); Implement's primary is image-capable, so a text-only backup
  would drop screenshots. Break and General keep image/agentic backups.
- **Trim Break to three** to remove redundant DeepSeek V4 Pro depth behind two
  already-diverse fallbacks.

## Date

2026-08-31

## Supersedes

- `docs/pi/cir/2026-08-13-pi-routing-stage-model-reevaluation.md` — review_plan and
  review rows (DeepSeek V4 Pro fallback) and the run_stage_break row (DeepSeek V4 Pro
  at rank 4). Plan is covered by `2026-08-31-pi-plan-route-glm-5-3-primary.md`.
