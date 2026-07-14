# CIR: Enable PI_CACHE_RETENTION=long as global default

## Intent

Make Pi use extended prompt-cache retention (Anthropic 1h TTL, OpenAI 24h) by default for all interactive sessions, improving response speed for long, single-model coding sessions.

## Behavior

GIVEN Pi is invoked from an interactive fish shell
WHEN the shell initialises
THEN `PI_CACHE_RETENTION` is exported with value `long`

GIVEN a benchmarking or debugging session should use default retention
WHEN the user needs to override
THEN `env PI_CACHE_RETENTION= pi -p "..."` restores the default for that single invocation

## Constraints

- Shared lock-in `~/dotfiles/packages/home-manager/.config/home-manager/fish.nix` via `programs.fish.interactiveShellInit`.
- Placement follows the established convention: all LLM-related env (API keys, BEADS) lives in `interactiveShellInit`; `home.sessionVariables` is deliberately empty.
- `PI_CACHE_RETENTION` is an env var only — there is no `settings.json` key for it.
- The option has no effect on subscription-based auth (`openai-codex/gpt-*`, Claude Pro/Max) or providers that ignore the field (`mistral/*`); it is harmless when ignored.

## Decisions

- **Global default, not opt-in**, because the user's setup (mostly direct-API providers, long sessions, value cross-session cache warmth) does not argue for opt-in. Per-command override is trivial.
- **Place in `fish.nix` `interactiveShellInit`** to keep all LLM environment variables collocated, consistent with existing API-key and BEADS lines. `home.sessionVariables` is kept deliberately empty.
- **Record decision in `agentfiles`** because the env line lives in a different repo (`~/dotfiles`); the CIR is the durable artefact owned here.

## Date

2026-07-15
