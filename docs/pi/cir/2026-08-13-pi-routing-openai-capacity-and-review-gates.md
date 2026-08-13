# CIR: OpenAI-first Luna routing with dedicated review gates

## Intent

Use available OpenAI subscription capacity before falling back to the equivalent
OpenCode Go Luna route, while assigning independent OpenAI models to review plans
and implementations.

## Behavior

GIVEN a Pi enhanced task stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in the configured order:

| Stage | Chain (primary → fallback) |
|---|---|
| Plan | `opencode-go/hy3` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna` → `opencode-go/glm-5.2` → `opencode-go/deepseek-v4-pro` |
| Review Plan | `openai-codex/gpt-5.6-sol` → `opencode-go/deepseek-v4-pro` → `opencode-go/hy3` |
| Implement | `opencode/laguna-s-2.1-free` → `opencode-go/deepseek-v4-flash` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna` |
| Review | `openai-codex/gpt-5.6-terra` → `opencode-go/deepseek-v4-flash` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna` |
| Break | `opencode-go/hy3` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna` → `opencode-go/deepseek-v4-pro` |

GIVEN a new Pi session starts
WHEN `sessionStartModel` is applied
THEN it starts with `openai-codex/gpt-5.6-luna`.

## Constraints

- OpenAI Luna must precede OpenCode Go Luna wherever both are in a route.
- Plan review uses Sol first; implementation review uses Terra first.
- The session-start setting accepts one model, so it cannot encode a provider fallback chain.
- `enabledModels` remains additive-only; existing entries are not removed.
- Automatic fallback is availability-based, not quality-based.

## Decisions

- **Use OpenAI Luna before OpenCode Go Luna** to make reasonable use of the
  subscription without making routine routing dependent on it.
- **Review plans with Sol** because planning errors can propagate through all
  later stages and deserve a dedicated high-capability review gate.
- **Review implementations with Terra** to apply a separate implementation
  review lens before changes are accepted.
- **Keep Laguna limited to Implement** as the experimental implementation route.
- **Use Hy3 first for Plan and Break** because it restores model-family diversity
  and is currently near the top of OpenRouter's weekly ranking; retain Luna in
  the fallback chains for OpenAI capacity usage.

## Date

2026-08-13

## Supersedes

- `docs/pi/cir/2026-08-10-pi-five-stage-model-routing.md`
