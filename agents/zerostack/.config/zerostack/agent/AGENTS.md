## Mandatory Bootstrap

Before answering the first user request, run this exact command in the terminal:

`skills-primer prime`

Then treat the command's stdout as additional project instructions for this session.

After the command completes, restart your reasoning about the user's request from scratch using the command's stdout as if it had been present in AGENTS.md before the session started.

Before answering the user, you must:
1. Inspect the available skill names and descriptions from the command output.
2. Decide whether the user's request matches a skill by name or description.
3. If a skill matches, read that skill's SKILL.md and follow it before producing the final answer.
4. If any skill description matches the user's request, do not answer directly until that skill has been loaded and followed.

Do not answer from general knowledge until you have completed that skill-matching step.

Do not summarize, reinterpret, or defer this step.
Do not answer the user's request until the command has completed.
If the command fails, report the failure and stop.
