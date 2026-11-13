---
name: compare-implementations
description: Compare two or more implementations of the same request across workspaces, branches, or revisions. Use when choosing between competing solutions or identifying which design choices to retain.
---

# Compare Implementations

Compare implementations against the original request, not against each other as a specification. Assess correctness before design. Do not assume any candidate is correct or that combining candidates is better.

## Inputs and boundaries

Obtain the original request and any relevant specifications or acceptance criteria, and identify at least two accessible candidates. Ask for essential missing inputs before drawing conclusions. Request relevant constraints and a common baseline if available; a baseline is useful but not required.

Do not modify any candidate or integrate changes unless explicitly asked. Before running a check, inspect its likely effects, including build files, caches, databases, network access, and shared services. Run it only when its effects are controlled and acceptable. If safe execution is impractical, use static analysis and report the limitation. Follow each workspace's applicable project instructions and VCS rules.

## Method

1. **Establish requirements.** Read the request and specifications first. List explicit requirements, constraints, and acceptance criteria. Separate facts, assumptions, ambiguities, and reasonable interpretations. Do not infer requirements solely from an implementation or its tests.
2. **Inspect candidates independently.** Identify each candidate and its state. Read relevant instructions, changes, tests, documentation, and surrounding code. When possible, compare each candidate to a confirmed common baseline, not just to another candidate. If the baseline is uncertain or unknown, say so and limit claims about which changes each candidate introduced.
3. **Evaluate correctness.** Map each requirement to evidence for every candidate. Examine normal behaviour, important edge cases, errors, integration, and regressions. Run relevant checks when safe and practical. Seek equivalent requirement coverage rather than forcing identical commands across different environments. Record commands, results, environment differences, missing coverage, and checks not run. Passing tests alone do not prove correctness; an unverified requirement is not automatically a failure. Record failed checks and continue inspecting the other candidates where safe.
4. **Assess scope.** Identify omissions and material additions. For each addition, assess whether it is required, needed for integration or safety, supported by existing constraints, or unsupported. Explain the evidence and uncertainty. An addition is not unjustified merely because the request does not name it.
5. **Compare design.** Consider architecture fit, clarity, abstractions, complexity, coupling, maintainability, testability, and operational impact where relevant. Identify strengths and weaknesses with concrete reasons. Do not prefer more code, abstractions, or a newer design without a benefit. If proposing a combination, identify dependencies, conflicts, and integration and verification risks.
6. **Extract lessons.** Explain which decisions helped or harmed the outcome and what to repeat or avoid. Label hypotheses as such.

## Report

Keep the report proportional to the comparison. Include:

- **Recommendation:** Choose a candidate, recommend one conditional on specific fixes or checks, propose a justified combination, choose none, or defer judgment when evidence is insufficient. Explain why.
- **Requirements and correctness:** Use a table with each requirement, an assessment for each candidate, and supporting evidence. Mark ambiguous and unverified items explicitly.
- **Findings:** List material defects, omissions, and regressions by severity. Give impact, paths and line numbers where possible, and a reproduction or verification method. Keep design preferences separate from defects.
- **Scope and design:** Explain material additions and their justification, what to retain or avoid in each candidate, and trade-offs or risks in combining parts.
- **Lessons:** Give actionable, evidence-backed lessons and distinguish hypotheses.
- **Verification and limits:** List checks and results, checks not run, environment differences, missing information, and unresolved questions.

Cite concrete evidence. Separate observations, inferences, assumptions, and recommendations. Do not rank an implementation higher merely because its checks could run while another's could not.
