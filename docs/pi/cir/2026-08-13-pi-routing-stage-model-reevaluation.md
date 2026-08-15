# CIR: Capability-evidenced stage routing with provider-quota balance

## Intent

Route each Pi stage to the strongest model its budget can sustain, using
capability-specific evidence (AA-IFBench, DeepSWE, SWE Atlas Q&A,
Terminal-Bench, CodeRabbit review), while balancing the OpenCode Go pool for
frequent stages and ChatGPT Plus quota for review gates. Session start moves to
MiniMax M3 so the General model stops leaking into every stage through the
prompt-template current-model retention behaviour.

## Behavior

GIVEN a Pi enhanced task stage is invoked
WHEN its prompt-template model chain is resolved
THEN Pi selects the first available model in the configured order:

| Stage | Chain (primary → fallback) |
|---|---|
| General | `opencode-go/minimax-m3` |
| Plan | `opencode-go/glm-5.2` → `opencode-go/deepseek-v4-pro` → `opencode-go/hy3` |
| Review Plan | `openai-codex/gpt-5.6-sol` → `opencode-go/deepseek-v4-pro` → `opencode-go/hy3` |
| Implement | `opencode-go/deepseek-v4-pro` → `opencode-go/deepseek-v4-flash` → `openai-codex/gpt-5.6-luna` → `opencode/laguna-s-2.1-free` |
| Review | `openai-codex/gpt-5.6-sol` → `opencode-go/glm-5.2` |
| Break | `opencode-go/hy3` → `openai-codex/gpt-5.6-luna` → `opencode-go/gpt-5.6-luna` → `opencode-go/deepseek-v4-pro` |

GIVEN a new Pi session starts
WHEN `sessionStartModel` is applied
THEN it starts with `opencode-go/minimax-m3` at `high` thinking.

## Constraints

- `enabledModels` remains additive-only. Qwen3.8 Max, Kimi K2.6/K2.7 Code,
  Mistral Medium 3.5, Qwen3.6 Plus, Go-Luna and Terra stay enabled as manual models.
- MiniMax M3 must not appear in any stage chain (General only), so retention
  cannot pull stages back to the session-start model.
- Review fallbacks must cross provider: same-provider fallbacks (e.g. Sol→Terra)
  effectively never fire because failures are provider- or quota-level.
- Review gates stay model-family independent of the implementer (DeepSeek) and
  the planner (GLM-5.2).
- Break keeps Hy3 primary; experimentation happens via `/model`, not routing.

## Decisions

- **General = MiniMax M3.** #1 independent AA-IFBench (82.9%), multimodal,
  1M context, reasoning-capable, $0.30/$1.20 on Go with 0-day retention.
  GPT-5.6 Luna had no published instruction-following score, and its
  session-start position caused the retention behaviour to route most stages
  back to it. Kimi K3 rejected for this role on cost (~490 req/month vs M3's
  ~16,000).
- **Plan = GLM-5.2.** Best repository-scale evidence of the enabled set
  (SWE Atlas Q&A 48.1; Terminal-Bench 81.0), acceptable Go cost
  (~4,300 req/month). Kimi K3 rejected on cost; DeepSeek V4 Pro rejected as
  primary (SWE Atlas Q&A 27.2; algorithmic rather than repo-scale strengths);
  MiniMax M3 rejected (independent DeepSWE 13.3%).
- **Implement = DeepSeek V4 Pro.** Best engineering per Go-dollar
  (DeepSWE 63% vs Flash 53% vs Laguna 40.4%), strong tool use
  (Tool-Decathlon 52.8). Flash is the cheap volume fallback (115 t/s decode,
  but very verbose — per-task wall-clock roughly ties Pro). Qwen3.8 Max
  rejected as fallback (810 req/month; user asked for an OpenAI model instead),
  so Luna on `openai-codex` sits third for provider diversity.
- **Review = Sol primary, GLM-5.2 fallback.** CodeRabbit issue recall 69.7%
  vs Terra 52.5%; Sol's noise is filtered by the prompt's severity/confidence
  requirements. The fallback crosses provider and family — same-provider
  Sol→Terra would never trigger in practice.
- **Review Plan and Break unchanged.** Sol was already primary for plan
  review; the user keeps Hy3 for break and experiments manually.
- **Quota balance.** Frequent stages (General, Plan, Implement) on the Go pool;
  the three review stages on ChatGPT Plus.

## Date

2026-08-13

## Supersedes

- `docs/pi/cir/2026-08-13-pi-routing-openai-capacity-and-review-gates.md`
