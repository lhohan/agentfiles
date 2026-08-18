# CIR: Restore Pi's native Mistral adapter for GLM 5.2

## Intent

Use Pi's native Mistral adapter for `mistral/zai-glm-5-2` while waiting for
Pi to fix the streamed tool-call parsing bug, rather than maintaining a local
OpenAI-compatible or custom-parser workaround.

## Behavior

GIVEN `mistral/zai-glm-5-2` is selected
WHEN Pi resolves the model configuration
THEN it uses `api: "mistral-conversations"` and the provider-level EU Mistral
endpoint, with no model-level OpenAI-compatible endpoint override.

GIVEN thinking is set to a supported non-off level
WHEN Pi sends a request for `mistral/zai-glm-5-2`
THEN the native Mistral adapter requests reasoning using its native request
format and Pi exposes the resulting thinking blocks.

GIVEN GLM 5.2 emits tool-call deltas without a stable ID in every delta
WHEN the current Pi native parser receives the stream
THEN the known tool-call parsing failure remains an accepted limitation until
an upstream Pi fix is available.

## Constraints

- Do not add a custom parser extension for this model.
- Do not use `openai-completions` or a model-level `/v1` URL as a workaround.
- Preserve the EU endpoint and EU pricing metadata recorded in
  `docs/pi/cir/2026-08-15-mistral-eu-endpoint.md`.
- Reassess this configuration after a Pi release or upstream change addresses
  index-first Mistral tool-call assembly.
- `models.json` remains schema-clean; this CIR is the durable reference rather
  than an unsupported inline JSON comment.

## Decisions

- **Restore `mistral-conversations` with reasoning enabled** because the goal is
to follow Pi's native implementation and observe the upstream fix path.
- **Reject the OpenAI-compatible workaround** even though it currently gives
more reliable tool calls, because it disables structured reasoning and diverges
from Pi's native Mistral integration.
- **Reject a custom extension** because it duplicates Pi provider plumbing and
would create a local maintenance burden.
- **Supersede `pi-030`'s accepted workaround configuration**; its failure
analysis remains valid historical evidence.

## Related records

- Restores the native endpoint and model configuration described in
  `docs/pi/cir/2026-08-15-mistral-eu-endpoint.md`.

## Date

2026-08-18

## Supersedes

- `docs/pi/decisions.md` entry `pi-030` (configuration choice only; the
  documented failure analysis remains reference material)
