# CIR: interrogate-plan sequential one-question loop

**Date:** 2026-05-16  
**Amends:** dotagents-009  
**Scope:** `agents/dotagents/.agents/skills/interrogate-plan/SKILL.md`

## Context

`interrogate-plan` already incorporated grill-me-derived interrogation behaviour via dotagents-009, but still permitted batching questions ("Batch independent questions only when doing so is clearly more efficient") and made recommendations optional ("When useful, provide a recommended answer").

In practice this allowed the skill to fall back to multi-question prompts that reduced focus, skipped proposing defaults, and re-introduced the ambiguity that dotagents-009 was meant to eliminate.

## Decision

Replace the permissive batching allowance with a mandatory one-question-at-a-time loop. Replace the optional recommendation language with a mandatory question contract (propose default, state trade-off, cite evidence).

 behavioural changes encoded:

1. **One question at a time, always.** No batching under any condition.
2. **Recommend-by-default is mandatory.** Every question includes a recommended answer, supporting evidence, and the trade-off being optimised.
3. **Reject vague answers.** Call out what remains ambiguous and ask a sharper follow-up.
4. **Walk branches sequentially.** Never ask a downstream question while upstream ambiguity remains.
5. **Structured sections.** The skill body is reorganised into four numbered operational directives: Inspect, Inventory, Interrogate, Summarise+Plan.
6. **Skip only with evidence.** If no questions are needed, state why every material branch is already resolved.
7. **Existing strengths preserved.** Repository-first inspection, semantic decision analysis, risk handling, low-risk classification threshold, and the structured summary all remain intact.
8. **No personality, taxonomies, or checklists added.** The skill stays procedural.

## Rationale

- One-question-at-a-time forces the agent to resolve the highest-leverage decision first, which prunes the decision tree before later questions, making the whole interrogation shorter and more focused.
- Mandatory recommendations with evidence prevent the agent from dumping open-ended questions on the user without doing analytical work first.
- Sequential branch-walking eliminates the ambiguity that arose from batching "independent" questions that turned out to have hidden dependencies.

## Rejected alternatives

- **Keep batching as optional:** Reintroduces the failure mode where the agent asks multiple questions at once and the user answers only some.
- **Replace interrogate-plan with grill-me wholesale:** grill-me is a broader interview skill with different priorities; interrogate-plan is specifically for resolving planning decisions with repository evidence.
- **Add a "batch only if truly independent" rule:** Too much interpretation room; agents cannot reliably judge independence in advance.

## Impact

- Agents using this skill will ask fewer, sharper questions, one at a time.
- Plans should converge faster because each question resolves the blocking ambiguity.
- No changes to other skills or prompts are required.