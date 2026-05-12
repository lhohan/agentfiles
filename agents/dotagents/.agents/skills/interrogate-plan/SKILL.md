---
name: interrogate-plan
description: Inspect the codebase, infer behaviour and constraints, then resolve planning decisions that code cannot answer. Use when planning and inspection alone is insufficient to produce an implementation-ready plan.
---

Inspect the relevant parts of the codebase first using read-only tools. Infer as much as possible from code, tests, configuration, and documentation before asking the user anything.

When the user arrives with a pre-baked solution (e.g., "add X to Y", "Your proposed improvement: ...", "just do Z"), treat it as a hypothesis, not a settled requirement. Before enumerating semantic decisions, validate intent: ask whether the proposed change captures the full problem or only a partial solution, and whether unstated requirements (e.g., per-agent defaults, out-of-the-box behaviour) exist. Do not proceed to `write-implementation-plan` until the true requirements boundary is clear.

After inspection, switch into interrogation mode.

Interview the user about unresolved branches of the plan until there is shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer and the evidence or trade-off behind it.

Build a short behavioural inventory:
- current behaviour that is high-confidence
- constraints already fixed by the existing system
- inconsistencies, ambiguities, or missing information
- live semantic decisions not settled by the repository
- plan-relevant risks, assumptions, and trade-offs

A semantic decision is live when different choices would materially change behaviour, implementation, or documentation/decision-log truthfulness.

Treat code, tests, config, and docs as already-made decisions unless they conflict, appear incomplete, or depend on business or production context that cannot be safely inferred.

Walk the decision tree by separating settled, live, and irrelevant branches. Prune branches that are already settled by the repository or irrelevant to the requested plan. Continue examining live branches until each material decision is resolved by repository evidence, an explicit user answer, or an explicit user acceptance of an assumption or risk.

If you believe no questions are needed, first state why every material branch is already resolved by repository evidence or explicit task text.

Ask focused clarifying questions only about uncertainties that remain unresolved after inspection. Each question must be justified by observed evidence and should cite the relevant file, test, config, or behaviour when possible.

Typical reasons to ask:
- contradictory implementations
- unclear ownership or boundaries
- missing business rules
- production constraints
- migration, rollout, or compatibility concerns
- risk trade-offs not visible in source
- live semantic decisions where different choices would materially change behaviour, implementation, or documentation/decision-log truthfulness

Ask the fewest questions that will resolve the live branches, but no fewer. Each question should either settle a material decision or unblock the next one; drop questions that do neither. Ask questions one at a time when later questions depend on earlier answers. Batch independent questions only when doing so is clearly more efficient.

Do not stop merely because an implementable plan exists while material semantic decisions remain live.

When useful, provide a recommended answer or default, but only if it is grounded in observed code, explicit constraints, or clear trade-offs. If confidence is low, say so plainly.

Do not ask generic discovery questions if the answer can be inferred from inspection. Do not use the user as a substitute for codebase analysis.

Before producing the plan, summarise:
- inferred current behaviour
- decisions already fixed by the system
- live decisions resolved with the user
- assumptions being made
- remaining risks or unknowns

Produce a plan that is complete enough to implement safely: every material decision should be inferred from the codebase, confirmed with the user, or explicitly accepted by the user as an assumption or risk. Residual unknowns may be recorded as assumptions or risks only when inspection shows they are local, reversible, non-user-visible, and unlikely to affect behaviour, implementation direction, compatibility, migration, data integrity, security, or documentation/decision-log truthfulness.

If the risk depends on product intent, business policy, user expectations, or future maintenance preferences, ask the user rather than classifying it as low-risk yourself.

Stop questioning once no material semantic decisions remain live and any remaining unknowns are low-risk by the criteria above. Do not re-confirm decisions the user has already accepted.
