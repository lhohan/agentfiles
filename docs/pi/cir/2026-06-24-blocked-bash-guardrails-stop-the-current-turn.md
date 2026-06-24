# CIR: Blocked Bash Guardrails Stop the Current Turn

## Intent

Make blocked bash guardrails not only reject a single command but also steer the model to stop trying nearby shell commands, abort the current turn, and hand control back to the user. Prevent same-turn command substitution by halting the turn on the first blocked bash command each turn.

## Behavior

GIVEN a bash tool_call matches a `block` guardrail rule
WHEN it is the first blocked bash command in the current turn
THEN the guardrails extension returns `block: true` with the configured reason, emits a notification, sends a steering message via `pi.sendMessage()` with `deliverAs: "steer"` instructing the model to stop and ask the user how to proceed, and calls `ctx.abort()` to halt the current turn

GIVEN a subsequent bash tool_call in the same turn also matches a `block` guardrail rule
WHEN the steering flag has already been set
THEN the guardrails extension still returns `block: true` with the configured reason, but does not emit a duplicate steering message

GIVEN a turn ends
WHEN the `turn_end` event fires
THEN the per-turn steering flag is cleared so a fresh steering message can be emitted on the next turn

GIVEN a blocked turn aborts before `turn_end` fires
WHEN a new agent cycle starts
THEN the steering flag is also cleared on `agent_start`

GIVEN a `warn` guardrail rule matches a bash command
WHEN the command is only warned (not blocked)
THEN no steering message is emitted; warn-only behavior is unchanged

GIVEN a non-bash tool call (read, write, edit, etc.)
WHEN guardrails evaluate it
THEN the tool call is ignored; no blocking or steering occurs

## Constraints

- Abort is stronger than steering alone, but it is still not absolute containment.
- In parallel tool mode, sibling bash calls or other tool calls from the same assistant message may still execute before the abort lands.
- Warn rules do not emit steering messages. Steering is reserved for block outcomes only.
- The guardrails config format, `/guardrails` command, and rule evaluation order are unchanged.
- The steering flag is a module-level boolean scoped to the Pi process lifetime, reset on `session_start`, every `turn_end`, and `agent_start` to cover aborted turns.

## Decisions

- **Use `pi.sendMessage()` with `deliverAs: "steer"`** because it queues the message after the current assistant turn's tool calls finish executing, which is the earliest reliable delivery point.
- **Add a per-turn boolean flag** rather than a counter or per-rule tracking, because the only requirement is deduplication of the steering message within one turn.
- **Call `ctx.abort()` after a block** because a blocked command should stop the turn rather than rely on model compliance.
- **Reset on `turn_end` and `agent_start`** because aborted turns may not emit `turn_end`, and the next agent cycle still needs a clean per-turn state.
- **No per-rule steering knobs** in v1 — all block rules share one global deduplication flag.
- **Rejected tool-set manipulation** (disabling the `bash` tool after a block) because it would be more invasive, harder to revert, and is deferred to a possible future iteration.

## Date

2026-06-24

## Supersedes

- None. This CIR adds steering behavior, it does not replace any prior guardrails decision.
