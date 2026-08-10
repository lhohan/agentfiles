# Provider Registry

Shared across coding agents. Human-maintained. The live model catalog is the
agent's model store (e.g. `~/.pi/agent/models-store.json`); this file documents
providers, notable models, free-tier notes, and authentication state. A model
referenced by an agent profile but absent here is flagged `unverified-provider`
for manual confirmation. This file deliberately lists the models relevant to
routing today — it may lag the catalog, so the model store wins on existence,
context limits, and pricing.

## opencode-go

- **Auth:** yes (authenticated per CIR 2026-08-10-pi-five-stage-model-routing)
- **Notes:** the primary routing provider for Pi. OpenAI-compatible, reasoning-capable models, no free tier.
- **Models (catalog, `~/.pi/agent/models-store.json`):**
  `deepseek-v4-flash` ($0.07/$0.14, 1M ctx), `deepseek-v4-pro` ($0.435/$0.87),
  `glm-5.1`, `glm-5.2` ($1.4/$4.4), `gpt-5.6-luna` ($0.1/$0.6, 1.05M ctx, text+image),
  `grok-4.5` ($2/$6), `hy3` ($0.14/$0.58, 256k ctx), `kimi-k2.6`, `kimi-k2.7-code`,
  `kimi-k3` ($3/$15), `mimo-v2.5`, `mimo-v2.5-pro`, `minimax-m2.7`, `minimax-m3`,
  `qwen3.6-plus`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`

## opencode

- **Auth:** yes (authenticated per CIR 2026-08-10-pi-five-stage-model-routing)
- **Notes:** broad catalog including free-tier models (`*-free`) and premium frontier models. Pi routes Implement secondary through this provider.
- **Models relevant to routing (catalog):**
  `laguna-s-2.1-free` ($0, 256k ctx), plus free tier: `deepseek-v4-flash-free`,
  `ling-3.0-tiny-free`, `longcat-2.0-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`,
  `north-mini-code-free`, `big-pickle`; premium: `claude-opus-5`, `claude-sonnet-5`,
  `gemini-3.6-flash`, `gpt-5.6-sol`, `kimi-k3`, `qwen3.6-plus`

## mistral

- **Auth:** yes (used for `sessionStartModel` and `answer.extractionModels` in Pi settings)
- **Notes:** Pi uses `mistral/mistral-medium-3.5` as the fixed session-start model and for answer extraction. Not part of the five routed stages.
- **Models:** `mistral-medium-3.5` ($1.5/$7.5, 262k ctx, text+image, reasoning); broader catalog (`codestral-*`, `devstral-*`, `magistral-*`, `mistral-small-*`, `pixtral-*`, `ministral-*`) available in the model store.

## openai-codex

- **Auth:** unknown — confirm manually. Referenced in Pi `answer.extractionModels` (`openai-codex/gpt-5.4-mini`).
- **Notes:** not used by the five routed stages; do not route to it without confirmation.

## openrouter

- **Auth:** no (no OpenRouter key configured; documented escape hatch in CIR)
- **Notes:** not routable until a key exists. Models such as `openrouter/poolside/laguna-s-2.1` ($0.09/$0.18) were considered and rejected for lack of auth. Treat any openrouter model as unavailable until auth is confirmed.
