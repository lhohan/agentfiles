---
agent: pi
profile_version: 1
enabled_models_source: agents/pi/.pi/agent/settings.json
tasks:
  - id: run_stage_plan
    source: agents/pi/.pi/agent/prompts/enhanced/run-stage-plan.md
    routes:
      - rank: 1
        model_id: opencode-go/glm-5.2
      - rank: 2
        model_id: opencode-go/deepseek-v4-pro
      - rank: 3
        model_id: opencode-go/hy3
  - id: review_plan
    source: agents/pi/.pi/agent/prompts/enhanced/review-plan.md
    routes:
      - rank: 1
        model_id: openai-codex/gpt-5.6-sol
      - rank: 2
        model_id: opencode-go/deepseek-v4-pro
      - rank: 3
        model_id: opencode-go/hy3
  - id: implement
    source: agents/pi/.pi/agent/prompts/enhanced/implement.md
    routes:
      - rank: 1
        model_id: opencode-go/gpt-5.6-luna
      - rank: 2
        model_id: opencode-go/deepseek-v4-flash
      - rank: 3
        model_id: openai-codex/gpt-5.6-luna
      - rank: 4
        model_id: opencode-go/hy3
      - rank: 5
        model_id: opencode/laguna-s-2.1-free
  - id: review
    source: agents/pi/.pi/agent/prompts/enhanced/review.md
    routes:
      - rank: 1
        model_id: openai-codex/gpt-5.6-sol
      - rank: 2
        model_id: opencode-go/glm-5.2
  - id: run_stage_break
    source: agents/pi/.pi/agent/prompts/enhanced/run-stage-break.md
    routes:
      - rank: 1
        model_id: opencode-go/hy3
      - rank: 2
        model_id: openai-codex/gpt-5.6-luna
      - rank: 3
        model_id: opencode-go/gpt-5.6-luna
      - rank: 4
        model_id: opencode-go/deepseek-v4-pro
  - id: general
    source: agents/pi/.pi/agent/settings.json --> sessionStartModel.model
    routes:
      - rank: 1
        model_id: openai-codex/gpt-5.6-luna
---
# Pi Agent Profile

Scope is **per-task stage routing only**. Pi's global `defaultModel`/`defaultProvider`
in `settings.json` are volatile (they change with every `/model` switch) and are
explicitly **out of scope** for this skill — do not document or verify them.

## Verification sources (read-only)

- Prompt chains: `agents/pi/.pi/agent/prompts/enhanced/*.md` (`model:` frontmatter)
- Enabled models: `agents/pi/.pi/agent/settings.json` (`enabledModels`). Models can be added based on evaluation results.
- Session-start model: `settings.json` (`sessionStartModel.model`)
- Catalog metadata (context limits, pricing, inputs): `~/.pi/agent/models-store.json`
- Routing rationale: `docs/pi/cir/2026-08-13-pi-routing-openai-capacity-and-review-gates.md`
- Related policy: `docs/pi/decisions.md` (pi-028 `sessionStartModel`, pi-006 prompt-owned model selection)

Never read credential or secret files under `~/.pi/agent/`. Provider availability is confirmed manually via `references/providers.md`.

## Notes

- Route chains are enforced by `pi-prompt-template-model@0.7.3`, which resolves the prompt's `model:` frontmatter chain to the first available model.

## Application checklist (only after explicit user approval)

1. Edit the `model:` frontmatter in `agents/pi/.pi/agent/prompts/enhanced/<stage>.md`.
2. Keep frontmatter limited to model controls (`model`, `thinking`, `restore`) per pi-019.
3. Keep `enabledModels` additive-only — existing entries must not be trimmed.
4. New routed models must live on an already-authenticated provider.
5. Record the change in the Pi routing CIR and update this profile.
