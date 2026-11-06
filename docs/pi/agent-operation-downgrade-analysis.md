# Which agent operations tolerate a faster, weaker model

Analysis input for model-routing evaluation. Not a decision record: no routing
change is made or recommended here.

## Question

Not "how many calls can I move to Mercury 2.5". That assumes success rate
falls like a volume dial. The usable question is:

> Which operations are **error-absorbing** and have a **verification signal
> strong enough** that a weaker, faster model holds end-to-end pass rate?

## Method

Every LLM call site in the live Pi configuration was enumerated from source and
scored on three axes.

| Axis | Meaning |
|---|---|
| **Signal** | Does an independent check catch the failure *inside the same run*? |
| **Load-bearing** | Can a later step correct this error, or does every later step build on it? |
| **Volume** | How many times does it fire per task? |

A downgrade candidate needs (Signal **or** Absorbing) **and** high Volume.
An operation with no Signal and high Load-bearing risk must keep a strong model,
however cheap the replacement looks.

## Call sites found

| # | Operation | Source | Current model(s) |
|---|---|---|---|
| 1 | Plan | `agents/pi/.pi/agent/prompts/enhanced/run-stage-plan.md` | `opencode-go/glm-5.3` → `mistral/zai-glm-5-2` |
| 2 | Plan review (gate) | `.../review-plan.md` | `openai-codex/gpt-5.6-sol` → `mistral/zai-glm-5-2` |
| 3 | Implement loop | `.../implement.md` | `opencode-go/deepseek-v4.1-flash` → Luna |
| 4 | Code review (gate) | `.../review.md` | `openai-codex/gpt-5.6-sol` → `mistral/zai-glm-5-2` |
| 5 | Break / failure hunting | `.../run-stage-break.md` | `opencode-go/hy3` → Luna |
| 6 | Session driver | `settings.json --> sessionStartModel.model` | `openai-codex/gpt-5.6-luna` |
| 7 | Context compaction | Pi core, inherits the session model | not separately configured |
| 8 | Branch summary (`/tree`) | Pi core, inherits the session model | not separately configured |
| 9 | Answer extraction | `settings.json --> answer.extractionModels` | `omlx/Qwen3.5-9B-MLX-4bit`, `mistral-small-2603` |
| 10 | Per-skill override | `extensions/skill-model-switch.json` | `gpt-5.4-mini` for `english-teacher-grader` |

## Current-state check (2026-11-06)

The table above is the original enumeration. These rows have since changed; see
`docs/pi/cir/2026-11-06-pi-model-catalog-sync-and-stale-model-replacement.md`.

| # | Change |
|---|---|
| 2, 4 | `openai-codex/gpt-5.6-sol` removed; the route now names `mistral/zai-glm-5-2` directly |
| 3, 5 | `openai-codex/gpt-5.6-luna` removed from the fallback list |
| 6 | `sessionStartModel` is not defined in `settings.json`; this call site does not exist |
| 9 | `answer.extractionModels` is `omlx/mini` and `mistral/mistral-small-2603` |
| 10 | The `english-teacher-grader` mapping was cleared, so no per-skill override remains |

## Classification

| Operation | Signal | Load-bearing | Volume | Verdict |
|---|---|---|---|---|
| Implement inner loop (tool choice, reading results, next action) | **Strong** — exit codes, test output, compiler | Low; the environment rejects a bad step | High | **Best candidate** |
| Answer extraction (9) | **Strong** — fixed template, bounded schema | Low | Medium | Already cheap — correct today |
| Per-skill formatting (10) | **Strong** — narrow, human checks it instantly | Low | Low | Already cheap — correct today |
| Break / failure hunting (5) | Weak — a missed break is only proven later | Medium | Low | Testable, not safe by default |
| Plan (1) | Partial — `review-plan` and `implement` can catch it | **High**; propagates | Low | Hold |
| Session driver (6) | Mixed — immediate for the user, invisible for the model | Medium–high | Highest | Biggest lever, biggest risk |
| Branch summary (8) | **None** | Medium | Rare | Hold |
| Context compaction (7) | **None** | **High, silently** | Medium | **Reject as a target** (see below) |
| Plan review (2) | **None — it *is* the check** | High | Low | Keep strong model |
| Code review (4) | **None — it *is* the check** | High | Low | Keep strong model |

## Findings

### 1. The gates are already on the most expensive model, and that is right

`gpt-5.6-sol` is the costliest route in the chain and sits on exactly the two
operations with **no** verification signal. A review that quietly misses a bug
produces no error, no failed test, and no retry. There is nothing downstream to
catch it. These are the least substitutable calls in the system, which is why
they carry the strongest model.

### 2. Compaction is the counter-example, not the sweet spot

Every framing of a fast utility model lists context summarisation as the obvious
first migration. It is the worst one available here.

A wrong summary is unrecoverable by construction: the discarded span leaves the
context window, so no later step can re-read it and detect the loss. The failure
surfaces many turns later as a contradiction or a re-asked question, with no
attribution to the summariser. Pi's own docs state compaction is lossy and
truncate tool results to 2000 characters during serialisation
(`docs/compaction.md`).

High volume, zero signal, silent load-bearing risk. That is the profile to
avoid, not to migrate.

### 3. The migration budget is smaller than it looks

The heavy loop (`implement`) already runs on a cheap route at rank 1. Frontier
spend is concentrated in two single-call gates plus the session driver. Moving
absorbing calls to a cheaper model saves little, because the absorbing calls are
already cheap. The remaining frontier spend is precisely the spend that is
hardest to justify moving.

### 4. The real payoff is more checks, not weaker ones

A ~1,100 tok/s model does not primarily buy cost reduction. It buys **iteration
count**. The success-rate-positive use is to add verification passes that are
currently too slow to run:

```
implement step → cheap critic (fast) → strong review gate (unchanged)
```

Trading a strong model down holds success rate flat at best. Adding cheap
redundant checks can raise it. The second is the interesting direction, and it
leaves the gates untouched.

## What is blocked

The numeric half of the question cannot be answered from published data.

- No Tier A benchmark carries Mercury 2.5. Confirmed in
  `docs/routing-reviews/2026-09-14-pi-mercury-2-5/report.md`: every capability
  cell is `no source`, `no alias`, or `excluded unit`.
- Quality comparisons for the release are vendor-reported claims, not
  measurements.
- `openrouter` is recorded as unavailable in `references/providers.md`, so the
  model is not reachable for a local trial and is absent from `enabledModels`.

## Measurement plan

Run on real tasks, not head-to-head chat. One variable at a time.

1. **Fix a task set.** 10–20 tasks spanning an easy, a medium, and a hard
   `implement` case, plus one long session that forces at least two compactions.
2. **Establish a baseline.** Current chain; record end-to-end pass rate, wall
   time, and cost.
3. **Ablate one site at a time.** Swap only the implement inner loop. Everything
   else stays fixed, gates included.
4. **Measure pass rate, not per-step quality.** A weaker step that the test run
   catches is not a failure. Judge the run, not the call.
5. **Find the breakpoint per operation,** and re-run under a stricter pass
   definition before trusting it.
6. **Test compaction last and separately.** Give a long session a known
   constraint early, compact, and check whether the constraint survives. This
   measures silent loss directly and is the only fair test for operation 7.

Preconditions: a reachable, authenticated Mercury route, and the same model
available for the ablated site only. Until then this stays an inventory, not an
answer.

## Related

- Existing task `agf-gyc` — "source discovery for local capabilities and
  remaining evidence gaps". Mercury's missing benchmark evidence belongs there;
  no new task is needed.
- `docs/routing-reviews/2026-09-14-pi-mercury-2-5/report.md` — the routing
  evaluation for this model.
