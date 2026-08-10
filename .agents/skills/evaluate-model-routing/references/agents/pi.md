---
agent: pi
profile_version: 1
session_start_model: mistral/mistral-medium-3.5
enabled_models_source: agents/pi/.pi/agent/settings.json
tasks:
  - id: plan
    source: agents/pi/.pi/agent/prompts/enhanced/plan.md
    routes:
      - rank: 1
        model_id: opencode-go/hy3
      - rank: 2
        model_id: opencode-go/gpt-5.6-luna
      - rank: 3
        model_id: opencode-go/deepseek-v4-flash
  - id: review_plan
    source: agents/pi/.pi/agent/prompts/enhanced/review-plan.md
    routes:
      - rank: 1
        model_id: opencode-go/gpt-5.6-luna
      - rank: 2
        model_id: opencode-go/hy3
  - id: implement
    source: agents/pi/.pi/agent/prompts/enhanced/implement.md
    routes:
      - rank: 1
        model_id: opencode-go/deepseek-v4-flash
      - rank: 2
        model_id: opencode/laguna-s-2.1-free
  - id: review
    source: agents/pi/.pi/agent/prompts/enhanced/review.md
    routes:
      - rank: 1
        model_id: opencode-go/deepseek-v4-flash
      - rank: 2
        model_id: opencode-go/gpt-5.6-luna
  - id: break
    source: agents/pi/.pi/agent/prompts/enhanced/break.md
    routes:
      - rank: 1
        model_id: opencode-go/gpt-5.6-luna
      - rank: 2
        model_id: opencode-go/hy3
      - rank: 3
        model_id: opencode-go/deepseek-v4-flash
---
# Pi Agent Profile

Scope is **per-task stage routing only**. Pi's global `defaultModel`/`defaultProvider`
in `settings.json` are volatile (they change with every `/model` switch) and are
explicitly **out of scope** for this skill — do not document or verify them.

## Verification sources (read-only)

- Prompt chains: `agents/pi/.pi/agent/prompts/enhanced/*.md` (`model:` frontmatter)
- Enabled models: `agents/pi/.pi/agent/settings.json` (`enabledModels`)
- Session-start model: `settings.json` (`sessionStartModel.model`)
- Catalog metadata (context limits, pricing, inputs): `~/.pi/agent/models-store.json`
- Routing rationale: `docs/pi/cir/2026-08-10-pi-five-stage-model-routing.md`
- Related policy: `docs/pi/decisions.md` (pi-028 `sessionStartModel`, pi-006 prompt-owned model selection)

Never read credential or secret files under `~/.pi/agent/`. Provider availability is confirmed
manually via `references/providers.md`.

## Notes

- Route chains are enforced by `pi-prompt-template-model@0.7.3`, which resolves
  the prompt's `model:` frontmatter chain to the first available model.
- The five routed stages share only two authenticated providers (`opencode-go`,
  `opencode`). No OpenRouter key is configured — openrouter models are not routable.
- Model-family diversity: Plan/Review Plan/Break rotate between HY3 and GPT-5.6-luna
  (different families); Implement/Review core on DeepSeek V4 Flash. Proxy-level
  diversity was deliberately traded away (all five stages route via opencode-go
  except the Implement secondary).

## Application checklist (only after explicit user approval)

1. Edit the `model:` frontmatter in `agents/pi/.pi/agent/prompts/enhanced/<stage>.md`.
2. Keep frontmatter limited to model controls (`model`, `thinking`, `restore`) per pi-019.
3. Keep `enabledModels` additive-only — existing entries must not be trimmed.
4. New routed models must live on an already-authenticated provider.
5. Record the change in the Pi routing CIR and update this profile.
