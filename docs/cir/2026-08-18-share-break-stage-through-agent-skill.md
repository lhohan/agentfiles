# CIR: Share the Break Stage Through an Agent Skill

## Intent

Share the `break` workflow between Pi and Mistral Vibe without duplicating its
instructions, or replacing Vibe's normal system prompt.

## Behavior

GIVEN the user invokes the break stage in Pi or Mistral Vibe
WHEN the tool loads the stage instructions
THEN both tools use the canonical
`agents/dotagents/.agents/skills/run-stage-break/SKILL.md` content

GIVEN the user invokes `/run-stage-break [focus]` in Pi
WHEN Pi executes the prompt template
THEN Pi uses its configured model chain and injects the shared
`run-stage-break` skill
before passing the focus arguments as the user task

GIVEN the user invokes `/run-stage-break [focus]` in Mistral Vibe
WHEN Vibe resolves user-invocable skills
THEN Vibe loads the shared `run-stage-break` skill and keeps its normal system prompt

## Constraints

- The shared file must follow the Agent Skills format and set
  `user-invocable: true` so Vibe exposes `/run-stage-break`.
- The shared skill must remain tool-neutral enough for both Pi and Vibe.
- Pi-specific model routing belongs in the Pi prompt wrapper, not in the shared
  skill.
- The break stage is read-only analysis. It must not edit files, change
  configuration, run mutating commands, or make commits.
- The Vibe global skill must remain discoverable through the stowed
  `~/.agents/skills/` path.
- Changes must not replace Vibe's default system prompt.

## Decisions

- **Use `agents/dotagents/.agents/skills/run-stage-break/SKILL.md` as the
  canonical source** because both Pi and Vibe support the shared Agent Skills
  directory layout.
- **Use matching `run-stage-*` names across harnesses where practical** so a
  shared workflow is discoverable by the same name; keep harness-specific
  wrappers for routing and control behaviour.
- **Keep Pi's `run-stage-break.md` as a thin wrapper** containing model
  selection, thinking level, restore behaviour, and `skill: run-stage-break`; the
  workflow instructions stay in the shared skill. Pi and Vibe expose the same
  `/run-stage-break` command.
- **Use Vibe's `/run-stage-break` user-invocable skill command instead of a
  custom Vibe agent** because the stage is a reusable workflow, while model and
  permission changes are not required for this first slice.
- **Reject direct reuse of the Pi prompt as a Vibe system prompt** because Pi
  frontmatter and `$@` are not Vibe's skill interface, and Vibe system prompts
  replace the normal Vibe system prompt.
- **Reject a prompt-body generator for this slice** because the Agent Skills
  interface provides direct sharing without another synchronisation mechanism.

## Date

2026-08-18
