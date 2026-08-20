# CIR: Promote GLM-5.3 to Pi Plan primary, Mistral backup

## Intent

Promote `opencode-go/glm-5.3` to the primary model for Pi's `plan` stage, replacing
`opencode-go/glm-5.2`, and use `mistral/zai-glm-5-2` (EU-hosted) as the single
rank-2 backup. The earlier manual-retention decision for
`opencode-go/glm-5.2` was later superseded by
`2026-08-31-pi-enabled-models-hygiene-prune.md`.

## Behavior

GIVEN the Pi `plan` stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in this order:

1. `opencode-go/glm-5.3`
2. `mistral/zai-glm-5-2`

GIVEN the OpenCode Go enabled model list
WHEN Pi builds its model selector
THEN `opencode-go/glm-5.3` is present and selectable.

## Constraints

- Add `opencode-go/glm-5.3` to `enabledModels`. It is present in the model catalog
  but was not previously enabled.
- `mistral/zai-glm-5-2` is already enabled; no change required there.
- Do not use DeepSeek V4 Pro or Hy3 as Plan fallbacks (Mistral covers the
  reasoning-stage backup role).

## Decisions

- **GLM-5.3 over GLM-5.2 for planning** because vendor evidence shows a generational
  gain on planning and agentic benchmarks (DeepSWE 66.9 vs 46.2, Terminal-Bench 88.2
  vs 81.0 at max reasoning). Both are text-only; GLM-5.3 keeps the same modality fit
  for the plan stage.
- **Mistral GLM-5.2 as the backup** because it is a strong text planner and the
  Mistral EU endpoint gives a privacy-resident, low-cost buffer that stays idle until
  the primary fails. This matches the broader Mistral-backup routing in
  `2026-08-31-pi-routing-mistral-backup.md`.

## Date

2026-08-31

## Supersedes

- `docs/pi/cir/2026-08-13-pi-routing-stage-model-reevaluation.md` — Plan row and the
  "Plan = GLM-5.2" decision only. All other stage routings in that CIR remain active.
