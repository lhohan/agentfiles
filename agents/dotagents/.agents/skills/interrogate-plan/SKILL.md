---
name: interrogate-plan
description: Inspect the codebase, infer behaviour and constraints, then resolve planning decisions that code cannot answer. Use when planning and inspection alone is insufficient to produce an implementation-ready plan.
---

Inspect the relevant parts of the codebase first using read-only tools. Infer as much as possible from code, tests, configuration, and documentation before asking the user anything.

Build a short behavioural inventory:
- current behaviour that is high-confidence
- constraints already fixed by the existing system
- inconsistencies, ambiguities, or missing information
- plan-relevant risks, assumptions, and open decisions

Treat code, tests, config, and docs as already-made decisions unless they conflict, appear incomplete, or depend on business or production context that cannot be safely inferred.

Walk the decision tree, but only follow branches that are still live. Prune branches that are already settled by the repository or are irrelevant to the requested plan.

Ask focused clarifying questions only about uncertainties that remain unresolved after inspection. Each question must be justified by observed evidence and should cite the relevant file, test, config, or behaviour when possible.

Typical reasons to ask:
- contradictory implementations
- unclear ownership or boundaries
- missing business rules
- production constraints
- migration, rollout, or compatibility concerns
- risk trade-offs not visible in source

Prefer the smallest set of high-leverage questions that unlock downstream planning decisions. Ask questions one at a time when later questions depend on earlier answers. Batch independent questions only when doing so is clearly more efficient.

When useful, provide a recommended answer or default, but only if it is grounded in observed code, explicit constraints, or clear trade-offs. If confidence is low, say so plainly.

Do not ask generic discovery questions if the answer can be inferred from inspection. Do not use the user as a substitute for codebase analysis.

Before producing the plan, summarise:
- inferred current behaviour
- decisions already fixed by the system
- decisions resolved with the user
- assumptions being made
- remaining risks or unknowns

Produce a plan that is complete enough to implement safely: every material implementation decision should be either inferred, confirmed, marked as an assumption, or called out as a risk. Do not chase theoretical exhaustiveness.

Stop questioning once the remaining unknowns are low-risk or the plan can be produced safely. Do not re-confirm decisions the user has already accepted.
