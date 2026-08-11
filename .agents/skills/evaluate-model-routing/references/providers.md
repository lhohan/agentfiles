# Provider Registry

Shared across coding agents. Human-maintained. This file is a lightweight registry of the
model providers you subscribe to and their availability. It deliberately does **not** list
individual models — catalogs change too fast and the model store is authoritative.

For the live list of models, context limits, and pricing, use:

- Each provider's page on [models.dev](https://models.dev/providers/) (links per row below), or
- Your local model store: `~/.pi/agent/models-store.json`.

A `model_id` whose provider prefix is not listed here is flagged `unverified-provider` for manual confirmation during profile verification. Provider availability is confirmed manually — this skill never reads credentials.

## Providers

| Provider (prefix) | Subscription          | Availability                            | Models |
| ---               | ---                   | ---                                     | ---    |
| `opencode-go`     | OpenCode Go           | yes (per CIR 2026-08-10-pi-five-stage-model-routing) | [models.dev](https://models.dev/providers/opencode-go/) |
| `opencode`        | OpenCode Zen          | yes (per CIR 2026-08-10-pi-five-stage-model-routing) | [models.dev](https://models.dev/providers/opencode/) |
| `mistral`         | Mistral Vi / Vive Pro | yes                                     | [models.dev](https://models.dev/providers/mistral/) |
| `openai-codex`    | OpenAI Codex          | unknown — confirm manually              | not on models.dev; Codex models under [`openai`](https://models.dev/providers/openai/) |
| `openrouter`      | OpenRouter            | no (no API key configured)              | [models.dev](https://models.dev/providers/openrouter/) |
