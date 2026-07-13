---
name: analyze-session-friction
description: "Analyze a session to identify friction, wasted effort, and convergence problems with evidence. Use when asked to perform a retrospective of a session, transcript, or summary and return quote-backed findings plus concrete AGENTS.md, skill, and workflow recommendations."
---

# Analyze Session Friction

## Inputs

- Session transcript or summary
- Repo or project context (if available): stack, tasks, tooling, constraints, testing norms

## Objectives

- Identify wasted effort and friction with evidence
- Recommend concrete improvements in:
  - `AGENTS.md` guidance
  - Skill additions or updates
  - Workflow/process changes

## Modes

- Default: recommendation-only analysis. Do not edit files.
- Controlled implementation mode: only if the user explicitly asks for implementation after reviewing findings.
  Guardrails:
  - Apply only recommendations tied to explicit findings.
  - Keep changes scoped to requested files/workflows.
  - Preserve evidence-first reporting in final output.
  - Stop and ask if implementation would exceed requested scope.

## Workflow

Use this staged process and produce each stage output before moving on.

1. Definition
   - Define the session scope, objective, and success condition for the retrospective.
   - Output: 2-4 bullet scope statement.
2. Timeline
   - Build a concise turn sequence focused on pivots, reversals, and delays.
   - Output: numbered timeline of key events with turn references.
3. Root Cause
   - For each significant inefficiency, run explicit 5-Whys style tracing.
   - Output: root-cause chain per finding.
4. Contributing Factors
   - Separate primary root cause from secondary contributors (instructions, missing context, tool friction, assumptions).
   - Output: factor matrix per finding (root vs contributors).
5. Classification
   - Classify each finding as one of:
     - back-and-forth
     - misinterpretation
     - wrong-direction
     - redundant-exploration
     - slow-convergence
     - over-engineering
     - other
   - Output: category + impact level (`high|medium|low`) + rough wasted-turn estimate.
6. Recommendation or Implementation Decision
   - Default to recommendations.
   - If in controlled implementation mode, define exact edits and why each maps to a finding.
   - Output: decision summary (`recommend` or `implement`) with rationale.
7. Verification
   - Define how to verify recurrence prevention for each recommendation/edit.
   - Output: measurable success criteria and checks.
8. Optional Knowledge Capture
   - Capture reusable insight only when it extends beyond the immediate fix.
   - Output: optional `Knowledge Capture` block with insight + reuse target.

## Output Format

For each finding:

```markdown
### [NUMBER]. [Short title]

**Category:** [back-and-forth | misinterpretation | wrong-direction | redundant-exploration | slow-convergence | over-engineering | other]
**Impact:** [high|medium|low] — [estimate of wasted turns or time]

**Evidence:**
> [Exact quote(s) from transcript]
> — [who said it, position in conversation]

**What happened:** [Description of the inefficiency]

**What should have happened:** [The faster/better path]

**Recommendation:**
[Concrete action to prevent recurrence now: AGENTS.md rule, skill addition, workflow change, or process adjustment.]

**Knowledge Capture (optional):**
- **Insight:** [Generalizable principle/pattern learned from this session]
- **Reuse target:** [knowledge-base note | blog idea | workflow playbook | training example]
- **Seed title (optional):** [Short title for future writing or indexing]
```

If no findings exist, say so explicitly and do not fabricate findings.

## Example Fragment

```markdown
### 1. Clarification loop started too late

**Category:** slow-convergence
**Impact:** medium - ~4 wasted turns

**Evidence:**
> "I’ll just implement this now." - assistant, early session
> "Wait, I needed only planning output." - user, later correction

**What happened:** Execution started before confirming planning-only mode.

**Root cause (5 Whys):** Started coding -> no explicit mode check -> assumption from prior session -> missing guardrail in workflow skill -> no required "mode confirmation" checkpoint.

**Recommendation:**
Add AGENTS.md rule: "Before implementation, confirm mode when the request can be planning or execution."

**Knowledge Capture (optional):**
- **Insight:** Separate mode confirmation from execution intent when a request could be planning-only.
- **Reuse target:** workflow playbook
- **Seed title (optional):** Mode-First Handshake for Planning vs Execution

**Verification:**
- In 5 subsequent similar sessions, assistant asks for mode confirmation before edits.
- No user correction messages about wrong mode.
```

## Constraints

- Keep trigger behavior narrow: use only for completed-session retrospectives.
- Keep recommendations tool-agnostic unless the session evidence is tool-specific.
- Be evidence-based; every finding must include exact transcript quotes.
- Be concrete and actionable; avoid generic advice.
- Keep knowledge capture optional and non-redundant with recommendations.
- Analyze multiple sessions only if explicitly asked to do so.
