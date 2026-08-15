# CIR: Replace DeepSeek V4 Pro in Pi implement route after price hike

## Intent

Remove `opencode-go/deepseek-v4-pro` as the primary model in Pi's `implement` stage routing
and replace it with `opencode-go/gpt-5.6-luna`, in response to DeepSeek's announced V4 price
increase effective 2026-08-16 16:00 UTC. Add `opencode-go/hy3` as a late-stage fallback for
model-family diversity.

## Context

DeepSeek announced peak/off-peak pricing for V4-Pro and V4-Flash on August 13, 2026, effective
August 16. V4 Pro output rises from $0.87 to $1.98/M (off-peak) and $3.96/M (peak) — a 2.3×–4.6×
increase. Cache-hit input rises 6×–12×. Through OpenCode Go's dollar-value budget model, the $15
monthly allocation for V4 Pro shrinks from ~17,150 requests/month to ~5,200 (off-peak) or ~2,600
(peak), making it the worst value-per-request in the enabled set for the implement primary slot.

GPT-5.6 Luna occupies the same OpenCode Go $15 budget tier and scores higher on Terminal-Bench v2.1
(91.1% vs 46.2%), SWE-bench Pro (62.7% vs 55.4%), and AA Agentic subscore (84.1 vs 70.6–74.5).

DeepSeek V4 Flash retains the 2× usage promotion and $60 budget tier, remaining ample post-hike as
the rank-2 volume workhorse.

## Behavior

GIVEN the Pi `implement` stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in the configured order:

| Rank | Model | Provider | Budget tier |
|---|---|---|---|
| 1 | `opencode-go/gpt-5.6-luna` | OpenCode Go | $15 |
| 2 | `opencode-go/deepseek-v4-flash` | OpenCode Go | $60 (2× promo) |
| 3 | `openai-codex/gpt-5.6-luna` | OpenAI Codex | unknown |
| 4 | `opencode-go/hy3` | OpenCode Go | $60 |
| 5 | `opencode/laguna-s-2.1-free` | OpenCode Zen | free |

Previous chain (superseded for implement only):

| Rank | Model |
|---|---|
| 1 | `opencode-go/deepseek-v4-pro` |
| 2 | `opencode-go/deepseek-v4-flash` |
| 3 | `openai-codex/gpt-5.6-luna` |
| 4 | `opencode/laguna-s-2.1-free` |

## Decisions

- **Replace V4 Pro with GPT-5.6 Luna as implement primary** because Luna has equal or better evidence
  on Terminal-Bench, SWE-bench Pro, and AA Agentic at the same OpenCode Go budget tier, and is not
  exposed to the DeepSeek price hike.
- **Keep DeepSeek V4 Flash at rank 2** because it retains the 2× usage promotion and $60 budget,
  making it the cheapest per-request volume workhorse even after the hike.
- **Add Hy3 at rank 4** for model-family diversity. No public coding benchmark for Hy3 was found;
  it is experimental and unlikely to fire in normal operation (behind two OpenCode Go models and
  one OpenAI Codex model).
- **No change to other stages** (plan, review_plan, review, break, general). DeepSeek V4 Pro remains
  as a secondary or late fallback in plan, review_plan, and break — those stages are less
  token-intensive and the budget pressure is minimal.

## Constraints

- `enabledModels` remains additive-only. `opencode-go/hy3` and `opencode-go/gpt-5.6-luna` are already
  enabled — no new additions needed.
- New routed models must live on an already-authenticated provider. `opencode-go/hy3` and
  `opencode-go/gpt-5.6-luna` are on OpenCode Go (confirmed available).
- `openai-codex/gpt-5.6-luna` at rank 3 is unchanged from the prior chain.

## Risks

- GPT-5.6 Luna may trail DeepSeek V4 Pro on certain isolated coding evaluations (e.g., LiveCodeBench),
  but compensates with superior agentic and tool-use evidence, which is more relevant to Pi's
  implement workflow.
- Hy3 capability is unverified by public benchmarks. Added at rank 4 as experimental late fallback.
- DeepSeek may reduce V4 Pro prices later (950-supernode scale). This change is reversible via a
  single-line frontmatter revert.

## Date

2026-08-15

## Supersedes

- `docs/pi/cir/2026-08-13-pi-routing-openai-capacity-and-review-gates.md` — implement row only.
  All other stage routings in that CIR remain active.