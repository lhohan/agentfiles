# CIR: Enable GPT-6.2 and two unused opencode-go models

## Intent

A catalog refresh on 2026-11-18 showed four models that the repository did not
enable, on providers that are already authenticated and in use. Enable them so the
model selector offers the current generation of each family.

## Behavior

GIVEN Pi starts with the repository configuration
WHEN it builds the model selector
THEN `enabledModels` resolves to 48 entries with no unresolved-pattern warning.

GIVEN `openai/gpt-6.2-astra`, `openai/gpt-6.2-sol`, `opencode-go/qwen4-max`, or
`opencode-go/hy4-flash-free` is selected
WHEN Pi sends a prompt
THEN the provider answers; each model returned `OK` in a live probe on 2026-11-18.

## Constraints

- The four additions are enabled but **not routed**. No prompt stage references
  them. Per CIR `2026-08-31-pi-enabled-models-hygiene-prune.md`, a model with no
  route, extraction, or session-start role is a candidate for later pruning.
- `openai/gpt-6.2-astra` and `openai/gpt-6.2-sol` exist in the live catalog but
  no Pi changelog entry names them. Their generation is inferred from version
  order against the already-enabled `gpt-6.1-sol`/`gpt-6.1-terra` pair; the
  catalog is the only evidence.
- `opencode-go/hy4-flash-free` is free, so requests are treated as train-on-data
  until the provider states otherwise. It answered `OK`, so it is outside the
  consent gate that blocks `iceman-contributor-free` and `muse-spark-*`.
- `local-rec/flint` stays enabled by user decision, although it fails every probe
  with `Stream ended without finish_reason`. The user is checking the server.
- The `opencode` provider key is expired (`401 api_key_expired`) and `google` has
  no credentials. Neither is related to the four additions.

## Decisions

- **Enabled `openai/gpt-6.2-astra`** — 8/40 per million against 10/50 for the
  enabled `gpt-6-astra`, and a later generation.
- **Enabled `openai/gpt-6.2-sol`** — 2/10, the same price as `gpt-6.1-sol`.
- **Enabled `opencode-go/qwen4-max`** — 1.5/4.5, 1M context, the only unused paid
  `opencode-go` model.
- **Enabled `opencode-go/hy4-flash-free`** — 1M context, image input, no cost.
- **Did not enable `mistral/zai-glm-5-3-flash`.** The user declined it. It stays
  catalog-available at 0.15/0.5; re-enabling needs one line.
- **Did not change any route.** Which stage should run GPT-6.2 is a separate
  decision for `evaluate-model-routing`, not an enablement consequence.
- **Did not remove `local-rec/flint`.** User decision, with the failure recorded
  above so a later session does not re-diagnose it as new.
- **Did not touch `opencode` or `google` credentials.** Both need user action
  outside this repository.

## Notes

Verification: `node .agents/skills/audit-model-config/scripts/audit-models.mjs`
reports `No findings.`, `pi --list-models | grep -c Warning` returns 0, and
`mise check pi` plans the package with no conflict. Probes for the four added
models returned `OK`; probes for all seven `omlx/*` models returned `OK`.
