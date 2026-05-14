---
name: interrogate-plan
description: Inspect the codebase, infer behaviour and constraints, then resolve planning decisions that code cannot answer. Use when planning and inspection alone is insufficient to produce an implementation-ready plan.
---

## 1. Inspect first

Read the relevant parts of the codebase before asking any question. Infer as much as possible from code, tests, configuration, and documentation.

When the user arrives with a pre-baked solution ("add X to Y", "just do Z"), treat it as a hypothesis. Before enumerating decisions, validate intent: ask whether the proposed change captures the full problem or only a partial solution, and whether unstated requirements exist. Do not proceed to `write-implementation-plan` until the true requirements boundary is clear.

## 2. Build a behavioural inventory

After inspection, list:

- current behaviour that is high-confidence
- constraints already fixed by the existing system
- inconsistencies, ambiguities, or missing information
- live semantic decisions not settled by the repository
- plan-relevant risks, assumptions, and trade-offs

A semantic decision is **live** when different choices would materially change behaviour, implementation, or documentation truthfulness.

Treat code, tests, config, and docs as already-made decisions unless they conflict, appear incomplete, or depend on context that cannot be safely inferred.

## 3. Interrogate one question at a time

This is the dominant operating mode. Walk unresolved branches sequentially.

**Never batch questions.** Never ask a downstream question while an upstream ambiguity remains. Resolve or accept each decision before moving to the next.

For each question:

1. **Identify** the highest-leverage unresolved semantic decision.
2. **Propose** a recommended default answer, grounded in observed code, explicit constraints, or a clear trade-off.
3. **State** the trade-off being optimised and the evidence behind the recommendation.
4. **Ask** exactly one question to resolve or narrow it.

If the user's answer is vague, reject it by narrowing: call out what remains ambiguous and ask a sharper follow-up.

Continue until every live semantic decision is resolved by repository evidence, an explicit user answer, or an explicit user acceptance of an assumption or risk.

If you believe no questions are needed, state why every material branch is already resolved by repository evidence or explicit task text. Do not proceed past this point if any live decision remains unresolved.

**Do not ask generic discovery questions** when the answer can be inferred from inspection. Do not use the user as a substitute for codebase analysis.

Typical reasons to ask:
- contradictory implementations
- unclear ownership or boundaries
- missing business rules
- production constraints
- migration, rollout, or compatibility concerns
- risk trade-offs not visible in source

## 4. Produce the summary and plan

Before writing the plan, summarise:

- inferred current behaviour
- decisions already fixed by the system
- live decisions resolved with the user
- assumptions being made
- remaining risks or unknowns

Produce a plan complete enough to implement safely: every material decision inferred from the codebase, confirmed with the user, or explicitly accepted by the user as an assumption or risk.

Residual unknowns may be recorded as assumptions or risks only when inspection shows they are local, reversible, non-user-visible, and unlikely to affect behaviour, implementation direction, compatibility, migration, data integrity, security, or documentation truthfulness.

If a risk depends on product intent, business policy, user expectations, or future maintenance preferences, ask the user rather than classifying it as low-risk yourself.

Stop questioning once no material semantic decisions remain live and any remaining unknowns are low-risk by the criteria above. Do not re-confirm decisions the user has already accepted.