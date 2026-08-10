# CIR: Five-Stage Model Routing for the Pi Agent Pipeline

## Intent

Re-route pi's Plan → Review Plan → Implement → Review → Break pipeline per the user's revised model-routing proposal. Break the DeepSeek monoculture by adding HY3-led planning, GPT-5.6-luna adversarial anchors, DeepSeek V4 Flash as the core implementation/review model, and Laguna S 2.1 (free tier) as the Implement secondary — while keeping every routed model on already-authenticated providers (`opencode-go`, `opencode`).

## Behavior

GIVEN any of the five enhanced prompts (`/plan`, `/review-plan`, `/implement`, `/review`, `/break`) is invoked
WHEN `pi-prompt-template-model@0.7.3` resolves the frontmatter `model:` chain
THEN the session uses the first available model in that chain, in this order:

| Stage | Chain (primary → fallback) |
|---|---|
| Plan | `opencode-go/hy3` → `opencode-go/gpt-5.6-luna` → `opencode-go/deepseek-v4-flash` |
| Review Plan | `opencode-go/gpt-5.6-luna` → `opencode-go/hy3` |
| Implement | `opencode-go/deepseek-v4-flash` → `opencode/laguna-s-2.1-free` |
| Review | `opencode-go/deepseek-v4-flash` → `opencode-go/gpt-5.6-luna` |
| Break | `opencode-go/gpt-5.6-luna` → `opencode-go/hy3` → `opencode-go/deepseek-v4-flash` |

GIVEN the model selector is opened
WHEN the user invokes `/model`
THEN `opencode/laguna-s-2.1-free` is offered as an available model (it is listed in `enabledModels` in `agents/pi/.pi/agent/settings.json`)

## Constraints

- Prompt frontmatter stays limited to model controls (`model`, `thinking`, `restore`) per pi-019; prompt bodies are untouched.
- Every routed model must live on an already-authenticated provider (`opencode-go` or `opencode`). No new API keys; no OpenRouter key.
- `enabledModels` is additive-only. Existing entries must not be trimmed: `defaultModel` (`opencode-go/deepseek-v4-flash`), `sessionStartModel` (`mistral/mistral-medium-3.5`), and `answer.extractionModels` all reference entries in that list.
- The proposal's price/benchmark figures are partially stale (DeepSeek Flash is $0.07/$0.14 on opencode-go, not $0.09/$0.18; the "50× cheaper than GPT-5.6" math implied the sol variant, but `gpt-5.6-luna` was chosen). This CIR records the actual provider IDs and prices so the doc set stays truthful.

## Decisions

- **HY3 as Plan primary** (`opencode-go/hy3`, $0.14/$0.58) because it offers frontier-tier repo understanding and reasoning for planning at a fraction of frontier cost, and because it is not DeepSeek — reducing correlated blind spots early in the pipeline. GPT-5.6-luna and DeepSeek Flash remain as fallbacks.
- **GPT-5.6-luna anchors Review Plan and Break** (`opencode-go/gpt-5.6-luna`) for adversarial independence from the DeepSeek/HY3 stack — a different model family means different blind spots. Rejected the `openai-codex` GPT variants because the user chose the opencode-go route; this accepts losing proxy-level isolation (Break/Review previously ran on `openai-codex` directly, now all five stages route via opencode-go). Model-family diversity is retained; proxy-level diversity is not.
- **DeepSeek V4 Flash as Implement/Review core** (`opencode-go/deepseek-v4-flash`) for the dominant quality/price ratio on code-grounded work; `deepseek-v4-pro` is dropped from all chains (the proposal names only the flash variant).
- **Laguna S 2.1 free tier as Implement secondary** (`opencode/laguna-s-2.1-free`, $0) because Laguna does not exist on the Go catalog and the OpenRouter route (`openrouter/poolside/laguna-s-2.1`, $0.09/$0.18) has no key configured; the free tier is sufficient for the A/B experiment. Rejected the paid OpenRouter route for now — it is the documented escape hatch if free-tier rate limits cause latency or fallback churn.
- **Qwen3.7 Flash tertiary Implement slot dropped** because it exists only on OpenRouter; the only authenticated Qwen substitute (`opencode-go/qwen3.6-plus` at $0.50/$3.00) inverts the budget logic. Sub-budget cost arbitrage is deferred until an OpenRouter key exists.
- **Fixed the stale `kimi-k2.6` secondary and trailing comma in `implement.md`** — treated as a typo, not intentional semantics; the previous Plan chain (`kimi-k3`, `glm-5.2`, `gpt-5.5`) is likewise replaced.
- **Supersedes pi-027**, which set `/plan` = `openai-codex/gpt-5.4` and `/review-plan` = `opencode-go/deepseek-v4-pro`; the complementary-lens intent survives, but both model choices are outdated.
- **Quality-first ordering (policy, 2026-08-10):** routing decisions rank model quality first; budget is a tiebreaker between near-equal models, never the headline justification. Premium models stay selectable via `/model` (the selector list is additive-only), so expensive models remain available for manual use when deeper reasoning is wanted. After the GLM-5.2/Kimi-K3 review: dropping or excluding a model must be evidence-based (benchmarked), not price-based; candidates with no benchmark evidence are marked unverified rather than assumed worse.

## Validation protocol (from the proposal)

- **A/B, weeks 1–2:** HY3 vs DeepSeek Flash on Plan → reduction in architectural revision cycles; Laguna vs DeepSeek Flash on Implement → bug escape rate on merged PRs; review/break issue-overlap audit → fewer than 40% shared issues flagged.
- **Rollback criteria:** Laguna bug escape rate > DeepSeek → revert Implement to DeepSeek primary; HY3 plan quality < DeepSeek → deprioritize HY3 and use GPT-5.6-luna backup; cost increase >20% without quality gain → rebalance toward the Core tier.
- **Next review:** after a 5-PR A/B test cycle or a major model release.

## Date

2026-08-10

## Supersedes

- pi-027 in `docs/pi/decisions.md`
