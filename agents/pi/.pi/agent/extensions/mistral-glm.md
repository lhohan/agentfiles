# Mistral GLM Stream Extension

Custom `streamSimple` provider for Z.ai GLM 5.2 via Mistral's OpenAI-compatible endpoint.

## Why this exists

The `zai-glm-5-2` model (a Z.ai GLM third-party model served through Mistral) has two incompatibilities with Pi's built-in parsers:

1. **`mistral-conversations`** — handles structured thinking blocks correctly, but mangles tool calls. It keys tool-call blocks on `${callId}:${index}`; when `toolCall.id` is absent in subsequent SSE deltas (as GLM does), `callId` changes and a duplicate block with an empty name is created.

2. **`openai-completions`** — handles tool calls correctly (index-based keying with name backfill), but cannot parse structured `content` arrays. When GLM returns `content: [{type:"thinking",...}]`, the parser coerces the array to `[object Object]`.

This extension combines the best of both: structured thinking block parsing (from `mistral-conversations`) and index-based tool-call keying with name backfill (from `openai-completions`).

## Usage

Select provider `mistral-glm`, model `zai-glm-5-2`. Requires `MISTRAL_API_KEY`.

## Decision record

See `docs/pi/decisions.md` entry **pi-030**.
