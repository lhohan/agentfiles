---
name: less-is-more
description: "Discourage unnecessary setup growth in this repository. Use when changing agent-setup artefacts or the wiring around them: skills, prompts/templates, agents, extensions, packages, or automation."
---

# Less Is More

When the user considers changing their agent setup, apply this skill.

## Rules

1. **Use what exists first.** Pi and the current setup are the default. Do not propose adding another tool, skill, extension, agent, or automation unless the existing setup cannot reasonably solve the problem.

2. **Wait for a real need.** Do not pre-package future possibilities. Add something only when there is a concrete, repeated workflow annoyance — not because it might be useful someday.

3. **Smallest fix wins.** When a real need exists, prefer the smallest change that solves it. Do not ship a cathedral when a shed suffices.

4. **Label speculative additions `experimental`.** If the user wants to try something that does not yet meet the bar above, it must be explicitly marked as `experimental`. This includes a clear note on what problem it might solve and that it should be removed if it proves unnecessary.

5. **Record the reason.** For meaningful setup changes, encourage an explicit decision record so the motivation is visible later. Use `docs/<package>/decisions.md` for package-local choices and `docs/decisions.md` for repo-wide or cross-cutting choices. This is a recommendation, not a gate — but absence of one should prompt the user to justify the addition.

## What to use this for

Use `less-is-more` when a change adds, removes, moves, renames, or materially changes a skill, prompt/template, agent, extension, or agent-setup package, or changes how those artefacts are discovered, loaded, injected, scoped, enabled, attributed, or gated.

## What not to do

- Do not package everything upfront. Solve the immediate problem cleanly and let the setup grow organically.
- Do not add infrastructure, extensions, or skills "just in case."
- Do not trigger this for ordinary documentation updates, reporting or metrics work, generic product features, or refactors that do not affect setup or its wiring.
