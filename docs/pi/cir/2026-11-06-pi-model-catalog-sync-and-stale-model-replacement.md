# CIR: Sync every configured model with the live catalog and replace dead references

## Intent

Sweep every model reference in the agent configuration, not only Pi's
`enabledModels`, and replace references that no longer resolve. Trigger: a catalog
refresh on 2026-11-06 showed that several configured models had been renamed,
withdrawn, or silently shadowed by local duplicates, and that two providers could
not authenticate at all.

The sweep covered: `enabledModels`, prompt-template routes, the skill-to-model
mapping, `models.json` provider blocks, Zerostack, and Vibe.

## Behavior

GIVEN Pi starts with the repository configuration
WHEN it builds the model selector
THEN `pi --list-models` reports no unresolved-pattern warnings and every enabled
model resolves.

GIVEN any prompt template in `prompts/enhanced/`
WHEN its `model` list is read
THEN every listed model resolves to a provider with working credentials.

GIVEN `openai/*` is requested
WHEN Pi resolves credentials
THEN it authenticates with `OPENAI_API_KEY` instead of failing on a stale OAuth
token.

GIVEN Zerostack starts
WHEN it resolves `model`, `subagent_model`, or a `[quick_models.*]` entry
THEN every model ID exists in the `opencode-go` catalog.

## Constraints

- Local `models` entries in `models.json` shadow catalog entries for the same
  provider/model ID. Any duplicated full model spec freezes stale cost,
  `baseUrl`, `compat`, and `thinkingLevelMap` values. Use `modelOverrides` for the
  fields that genuinely differ.
- The `mistral` provider deliberately points at `https://api.eu.mistral.ai` and
  carries a 10% cost markup (`zai-glm-5-3` $1.54/$4.84, `mistral-medium-3.5`
  $1.65/$8.25). The markup currently covers only those two models, so
  `mistral-small-2603` and `mistral-large-4` still report catalog prices while
  costing more on the EU endpoint. Not corrected here.
- `opencode-go/iceman-contributor-free` and `opencode-go/crouton-alpha-free` are
  free because they train on request data. `iceman-contributor-free` rejects every
  request until training consent is enabled in the OpenCode console.
  `crouton-alpha-free` returns `403 RegionError: This model is not available in your
  country` from the current location and is enabled knowingly broken; it stays dead
  until the network location changes or the block lifts. Do not treat either entry
  as proof that the model is usable.
- `openai-codex` has no credentials and no local catalog. Depending on a Codex
  subscription, it may be unavailable permanently. Nothing may treat its models as
  reachable.
- `sessionStartModel` is referenced by `extensions/force-session-start-model.md` and
  `docs/pi/agent-operation-downgrade-analysis.md`, but `settings.json` does not
  define it, so that extension is inert. Session defaults come from
  `defaultProvider`/`defaultModel`.
- Vibe's `voxtral-mini-transcribe-realtime-2602`, `voxtral-mini-tts-latest`, and
  `mistral-vibe-cli-with-tools` IDs cannot be verified offline: no local catalog
  covers them.

## Decisions

- **MiniMax 3.1 is `opencode-go/minimax-m3.1-flash` only.** No non-flash
  `minimax-m3.1` exists in any provider catalog. The previous
  `minimax-m3.1-flash-free` entry was a local invention that now returns
  `400 Model is unavailable`; removed and replaced with the paid Flash variant
  ($0.15/$0.60, 1M context, 512K output), which was verified live.
- **Deleted every local `opencode-go` model definition** (`step-5-preview`,
  `beam-free`, `minimax-m3.1-flash-free`). All are catalog-provided or dead, and
  the local `step-5-preview` entry understated cost as $0/$0 against a real
  $1.00/$2.70.
- **Removed four phantom `enabledModels` entries**: `gemini-4-argon-contributor`
  (renamed to `gemini-4-argon` upstream), two `longcat-2.5-preview-free` entries
  (withdrawn), and `minimax-m3.1-flash-free`.
- **Enabled the four catalog models that were available but absent**, plus
  `gemini-4-argon` in place of the renamed entry: `minimax-m3.1-flash`,
  `kimi-k3.1-pro`, `hy4`, `gemini-4-argon`, `iceman-contributor-free`.
- **Enabled `opencode-go/crouton-alpha-free` on explicit user request**, although it
  is recognised as unreachable in the current country. Rejected leaving it out once
  the user confirmed the choice; the constraint above records the known defect so
  the entry is not mistaken for a working model.
- **Repaired the `openai` provider by deleting its stale OAuth entry** from
  `~/.pi/agent/auth.json` (backed up as `auth.json.bak-20261106`). The dead
  `refresh` token shadowed the valid `OPENAI_API_KEY`, so the provider reported
  `invalid_state`. After removal the provider reports `ready` and `gpt-6-luna`
  answers. Rejected deleting the `openai/*` models from `enabledModels` because the
  credential was the defect, not the model choice.
- **Removed the `openai-codex` ranks from all five prompt templates** because a
  model that cannot authenticate must not occupy a rank. Review and plan-review now
  name `mistral/zai-glm-5-2` directly — the model that was already running via
  fallback — so effective behaviour is unchanged; implement and break keep their two
  working ranks.
- **Cleared the `english-teacher-grader` skill mapping** instead of repointing it.
  `openai-codex/gpt-5.4-mini` failed twice over: no provider credentials and no such
  ID in the codex catalog. Rejected repointing to `mistral/mistral-small-2603`
  because no repeated need for a forced model on that skill has been shown.
- **Fixed two stale Zerostack IDs**: `deepseek-v4-flash` → `deepseek-v4.1-flash`
  (main subagent and `[quick_models.fast]`), `kimi-k2.6` → `kimi-k2.7-code`
  (`[quick_models.smart]`). Rejected `kimi-k3` ($3/$15) and `kimi-k3.1-pro` ($2/$10)
  as the direct successor because `kimi-k2.7-code` is the code-tuned replacement at
  $0.95/$4.
- **Replaced the 0.0/0.0 cost placeholders in Zerostack** with real catalog prices
  (0.15/0.60, 0.95/4.00, 0.435/0.87) so quick-model cost reporting is not false.
- **Converted the duplicated `mistral/zai-glm-5-3` model spec into a cost-only
  `modelOverrides` entry.** The model stays available through the provider's EU base
  URL with the same marked-up prices. Side effect: `thinking: off` becomes
  unavailable for this model, because the catalog declares `off: null`. The old local
  spec claimed `off: "none"`, which the provider never confirmed.

## Notes

`pi update --models` first failed for `openai` (`invalid_grant`) and
`openai-codex` (`credentials_not_configured`). After the auth repair, a second run
refreshed every catalog successfully, which surfaced one further new model
(`opencode-go/crouton-alpha-free`, free, train-on-data, enabled at user request
despite a confirmed country block).
`opengo-data.json` at the repository root remains a stale 2026-10-09 snapshot with
no consumers; it is left in place but must not be treated as current.

## Date

2026-11-06

## Supersedes

- `docs/pi/cir/2026-08-31-pi-enabled-models-hygiene-prune.md` — its retained model
  set, its rule to keep `opencode-go/minimax-m3`, and its additive-only retention
  constraints no longer describe the current configuration.
