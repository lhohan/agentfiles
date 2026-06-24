# CIR: Sandbox EPERM Halt Extension

## Intent

Add a single-purpose pi extension that detects sandbox permission failures (EPERM / "Operation not permitted") in built-in tool results and halts the agent for the current turn by emitting a steering message and aborting. This reuses the "stop the current turn" mechanism from guardrails but triggers on `tool_result` (post-execution) across all built-in tools, not on a pre-execution bash command regex.

## Behavior

GIVEN a built-in tool's `tool_result` has `isError === true` and its content text matches `\boperation not permitted\b` (case-insensitive) or `\bEPERM\b`
WHEN it is the first matching EPERM in the current turn
THEN the extension:
- emits a user-visible warning notification
- sends a steering message via `pi.sendMessage()` with `deliverAs: "steer"` instructing the model to stop and ask the user
- calls `ctx.abort()` to halt the current turn

GIVEN a subsequent EPERM in the same turn
WHEN the per-turn flag has already been set
THEN the extension does nothing (deduplication)

GIVEN a turn ends or a new agent cycle starts
WHEN the `turn_end` or `agent_start` event fires
THEN the per-turn flag is cleared so a fresh halt can be emitted on the next turn

GIVEN a non-built-in (custom/extension) tool result
WHEN an EPERM-like string appears in content
THEN the extension ignores it (tool scope limited to built-in tools)

GIVEN a tool result with `isError === false` but content containing "Operation not permitted"
WHEN the result is evaluated
THEN the extension ignores it (the `isError` gate prevents false positives from successful results that merely mention the phrase)

## Constraints

- **Content-text detection only:** Built-in tool `details` do not carry exit codes or errno values, so detection must be based on the result's content text.
- **Best-effort:** In parallel tool mode, sibling tool calls from the same assistant message may already be in flight when the first EPERM result fires; abort stops the next LLM call but cannot un-run in-flight siblings.
- **Not containment:** This extension is a "stop trying" signal, not file secrecy or sandboxing. For actual containment, use Safehouse or your platform's sandboxing solution.
- **No configuration:** Zero-config, single-purpose (per `less-is-more`).

## Decisions

- **Operate on `tool_result`, not `tool_call`:** EPERM is unknowable pre-execution; this is the fundamental difference from guardrails.
- **All built-in tools, not bash-only:** Sandbox containment failures occur on filesystem tools (`read`, `write`, `edit`, `grep`, `find`, `ls`); this deliberately goes beyond CIR `2026-06-24-command-guardrails-are-bash-only.md`, which covered *command* safety. Sandbox containment is a different concern.
- **Steer + abort:** Same steering mechanism as guardrails (CIR `2026-06-24-blocked-bash-guardrails-stop-the-current-turn.md`), hardened with `ctx.abort()` to actually stop the turn rather than relying solely on model compliance.
- **Per-turn dedup flag, reset on `turn_end` and `agent_start`:** Guardrails uses `turn_end` only; the extra `agent_start` reset covers the abort path where `turn_end` may not fire.
- **`isError` gate:** Required to avoid false positives from successful results that merely contain the phrase.
- **Exclude custom/extension tools:** Non-standard error semantics; out of scope for v1.

## Date

2026-06-24

## Supersedes

None. This CIR adds a new extension; it does not replace or supersede any prior decision.
