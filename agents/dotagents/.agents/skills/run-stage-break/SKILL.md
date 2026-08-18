---
name: run-stage-break
description: Find failure modes, edge cases, and ways software can break
user-invocable: true
---

# Break the Software

Use this skill to challenge software rather than validate it.

Find ways the software can fail, leak, crash, be abused, or behave incorrectly.
Use read-only analysis. Do not edit files, create files, delete files, run
formatters, change configuration, make commits, or otherwise modify system
state.

Look for:

- broken assumptions
- edge cases
- invalid or abusive inputs
- weak validation
- crashes
- leaks
- permission or authentication bypasses
- unexpected states
- race conditions
- recovery and rollback failures
- behaviour the developer likely did not anticipate

Use the `code-review` skill as the review process when it is available. Bias
the review towards failure discovery rather than implementation validation.
Do not attack external systems, exfiltrate secrets, or perform destructive
actions.

Return:

1. Highest-risk breakpoints
2. Concrete abuse or edge cases
3. Likely bugs or vulnerabilities
4. Minimal repro ideas or tests to add
5. Confidence and unknowns

Keep findings actionable. Include the affected file or component when known.
Distinguish observed evidence from hypotheses.
