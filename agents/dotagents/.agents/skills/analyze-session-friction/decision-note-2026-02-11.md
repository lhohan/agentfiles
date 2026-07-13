# Decision Note: analyze-session-friction update (2026-02-11)

## Keep / Add / Drop

### Keep
- Evidence-first findings with required transcript quotes.
- Tool-agnostic recommendation posture unless evidence is tool-specific.
- Focus on actionable AGENTS.md / skills / workflow improvements.
- No-finding behavior: explicitly report when no substantive inefficiencies exist.

### Add
- Seven staged phases with explicit outputs:
  1) Definition
  2) Timeline
  3) Root Cause (5-Whys)
  4) Contributing Factors
  5) Classification
  6) Recommendation vs Implementation decision
  7) Verification
- Root-cause rigor requirement using a 5-Whys chain per significant finding.
- Verification criteria per finding/recommendation to measure recurrence prevention.
- Controlled implementation mode with guardrails when the user explicitly asks to implement.
- Concrete output fragment example in `SKILL.md`.

### Drop
- Implicit, unstructured process flow that did not require explicit per-stage outputs.
- Suggestion-only phrasing without a documented exception path for user-requested implementation.

## Rationale

- The reference framework's phase structure improves consistency and post-mortem quality.
- Full "implement, don't recommend" behavior conflicts with this repo's analysis-oriented use of the skill.
- Controlled implementation mode preserves safety and user control while allowing direct follow-through when explicitly requested.
