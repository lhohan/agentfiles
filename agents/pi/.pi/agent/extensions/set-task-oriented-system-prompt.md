# Set Task-Oriented System Prompt Extension

Removes Pi's built-in "expert coding assistant" wording from the generated system prompt.

We keep this because this Pi setup is optimized for correctness-critical coding work. Direct task framing is less noisy than role-based persona framing, and the rationale is recorded in `docs/pi/decisions.md` as `pi-026`.

Implementation details live in `set-task-oriented-system-prompt.ts`.

## Notes

- Runs during `before_agent_start` and rewrites the generated system prompt for that agent start (first message, after reload etc).
- Only targets Pi's built-in system prompt wording; it does not rewrite user prompts, skills, or custom system prompts.
