# CIR: Drop withdrawn free models and enable LongCat 2.5 Free

## Intent

Repair the model selector warning that appears at every Pi start:
`Warning: No models match pattern "opencode-go/crouton-alpha-free"`. A catalog
refresh on 2026-11-11 showed that `opencode-go` now serves 32 models, and that
`crouton-alpha-free` is no longer one of them.

## Behavior

GIVEN Pi starts with the repository configuration
WHEN it builds the model selector
THEN it prints no unresolved-pattern warning.

GIVEN `enabledModels` in `agents/pi/.pi/agent/settings.json`
WHEN the `opencode-go` entries are resolved
THEN each entry exists in the live `opencode-go` catalog.

## Constraints

- `opencode-go/crouton-alpha-free` existed in the 2026-11-06 catalog but answered
  `403 RegionError` from this location. It is now absent from the catalog, so it
  cannot answer at all. The earlier decision to keep it enabled on user request no
  longer has a subject.
- `opencode-go/iceman-contributor-free` still exists in the catalog, but it
  refuses every request until the per-account training-consent toggle is on. It
  provided no usable model, so it is not worth a selector slot.
- `opencode-go/longcat-2.5-free` is free, multimodal (text and image), 1M context,
  262K output. It answered `OK` in a live probe, so it is not behind the consent
  gate that blocks `iceman-contributor-free` and `muse-spark-*`. Free tier means
  requests are treated as train-on-data until the provider states otherwise.
- `openrouter/cohere/north-mini-code:free` in Zerostack `[quick_models.free]` is
  untouched. It still answers.

## Decisions

- **Removed `opencode-go/crouton-alpha-free` from `enabledModels`.** It is
  withdrawn upstream, so removal is the only option that clears the warning.
  Rejected keeping it "in case it returns": a model that cannot resolve is worse
  than an absent one.
- **Removed `opencode-go/iceman-contributor-free` from `enabledModels`** on user
  request. The model stays catalog-available, so re-enabling it needs only one
  line once the consent toggle is set.
- **Enabled `opencode-go/longcat-2.5-free`** on user request, after a live probe
  answered `OK`. Rejected adding the paid `longcat-2.0` sibling instead, because
  `longcat-2.0` is already enabled.
- **Did not enable `mimo-v2.5` or `mimo-v2.5-pro`.** They are still listed in the
  catalog but answer `410 ModelDeprecated`. This keeps the decision in
  `2026-11-06-pi-remove-deprecated-and-unreachable-models.md`.
- **Did not enable `muse-spark-1.2-contributor` or `muse-spark-1.3-contributor`.**
  The standing preference against Muse models is unchanged.

## Notes

Verification: `pi update --models` refreshed every catalog except `openai-codex`,
which stays unauthenticated with no enabled models.
`node .agents/skills/audit-model-config/scripts/audit-models.mjs` reports
`No findings.` and `pi --list-models | grep -c Warning` returns 0.
`mise check pi` plans the `pi` package with no conflict.

`mise check` for all packages still fails on `vibe`: `~/.vibe/config.toml` is a
live regular file that Vibe rewrites, and it has drifted from
`agents/vibe/.vibe/config.toml`. That conflict predates this change and is not
caused by it. Do not stow `vibe` with `--adopt` before you choose which copy wins,
because Vibe holds the newer settings.

## Date

2026-11-11

## Supersedes

None. This CIR narrows the retention decision for
`opencode-go/crouton-alpha-free` and `opencode-go/iceman-contributor-free` that
`2026-11-06-pi-remove-deprecated-and-unreachable-models.md` recorded.
