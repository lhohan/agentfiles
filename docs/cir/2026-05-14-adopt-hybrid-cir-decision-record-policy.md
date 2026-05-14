# CIR: Adopt Hybrid CIR and Decision-Record Policy

## Intent

Move the repository into a hybrid documentation model where existing decision logs remain active reference material, while new durable change intent and decisions are captured as Change Intent Records (CIRs).

## Behavior

GIVEN a completed change with durable intent, rationale, constraints, or rejected alternatives worth preserving
WHEN an agent is completing a task and considering documentation
THEN the agent should invoke `document-change-intentions-using-change-intent-records` to decide whether a CIR is warranted

GIVEN a later change that replaces or invalidates a prior decision
WHEN creating a new CIR for that change
THEN the new CIR may use `Supersedes` to reference the prior decision record it replaces

## Constraints

- Existing `docs/**/decisions.md` files must remain as active reference material; they are not archives.
- No migration or rewriting of existing decision records as part of this policy adoption.
- CIRs complement, rather than replace, ADRs for architecture-level decisions.
- Package-scoped CIRs should live under `docs/<package>/cir/`.
- Repo-wide CIRs should live under `docs/cir/`.
- CIR creation must remain selective to avoid process bloat.

## Decisions

- **Adopt hybrid model** with existing decision logs as reference material and CIRs as the preferred mechanism for new durable change intent.
- **Allow CIRs to supersede decision records** when a later change replaces or invalidates prior rationale.
- **Keep ADR skill installed** as a complementary capability for architecture-level decisions.
- **Use package-scoped CIR locations** (`docs/<package>/cir/`) for package-specific change intent, with `docs/cir/` for repo-wide records.
- **Future-only application** — this policy applies to new records going forward, not retroactively.
- **Defer evaluation** — create a deferred task to evaluate after ~3 months whether CIRs should remain, be adjusted, or be rolled back in favour of decision records.

## Date

2026-05-14

## Supersedes

- Implicit default of adding all new package decisions to `docs/<package>/decisions.md` from repo-level `AGENTS.md`
