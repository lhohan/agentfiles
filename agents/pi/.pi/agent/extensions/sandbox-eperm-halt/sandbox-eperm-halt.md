# Sandbox EPERM Halt Extension

Sandbox EPERM Halt is a single-purpose pi extension that detects sandbox permission failures (EPERM / "Operation not permitted") in built-in tool results and halts the agent for the rest of the current turn.

## Purpose

When a tool call is blocked by the sandbox (e.g., Safehouse on macOS), the operation fails with a permission error (EPERM). Without intervention, the LLM may try equivalent commands or different tools to achieve the same goal, which will also be blocked. This extension detects that first EPERM failure, injects a steering message telling the model to stop trying and ask the user, and aborts the current turn — reusing and extending the mechanism introduced in the guardrails extension.

**Important:** This is not containment or file secrecy. It is a best-effort "stop trying" signal layered on top of sandbox enforcement. For actual containment, use Safehouse or your platform's sandboxing solution.

## How it works

- **Trigger:** On any built-in tool's `tool_result` event where `isError === true` and the output content matches `\boperation not permitted\b` (case-insensitive) or `\bEPERM\b`.
- **Action:** On the first EPERM in a turn: emit a user-visible warning notification, send a steering message to the LLM (`deliverAs: "steer"`), and call `ctx.abort()` to halt the current turn.
- **Deduplication:** A per-turn flag (`haltedThisTurn`) ensures the steer message and abort fire only once per turn, reset on `turn_end` and `agent_start`.

## Tool scope

All built-in tools are watched: `bash`, `read`, `write`, `edit`, `grep`, `find`, `ls`. Custom/extension tools are excluded because their error text is not standardized.

## Detection details

The `isError` gate is required to avoid false positives from successful results whose content merely mentions "Operation not permitted" (e.g., reading documentation or a skill file). Built-in tool `details` do not carry exit codes or errno values, so detection must be content-text based.

- **bash:** On non-zero exit, the bash tool throws; the result's content includes stderr (e.g., `bash: ...: Operation not permitted`) plus the appended "Command exited with code N".
- **read/write/edit/grep/find/ls:** On EPERM, the tool throws; the result's content includes the Node error string (e.g., `Error: EPERM: operation not permitted, open '/path'`).

## Behavior and limitations

- **Best-effort:** In parallel tool mode, sibling tool calls from the same assistant message may already be in flight when the first EPERM result fires; abort stops the next LLM call but cannot un-run in-flight siblings.
- **Not a hard guarantee:** The model could ignore the steering message on the next turn; abort only stops the *current* turn.
- **Scope:** Only built-in tools; only EPERM-style permission failures. Other errors (ENOENT, EACCES, etc.) do not trigger.

## Configuration

None. Zero-config, single-purpose.

## Post-stow setup

No extra setup is required. The extension is auto-discovered by pi after stow.

## Relation to guardrails

This extension reuses the guardrails "stop the current turn" mechanism but differs in three ways:

1. **Trigger event:** `tool_result` (post-execution), not `tool_call` (pre-execution). A sandbox EPERM cannot be known before the operation runs.
2. **Tool scope:** All built-in tools, not just `bash`. This deliberately goes beyond the "command guardrails are bash-only" boundary — that CIR covered command safety; this covers sandbox containment failures, which occur across filesystem tools.
3. **Trigger basis:** Sandbox EPERM Halt reacts to observed permission-denied failures from the sandbox, whereas guardrails reacts to configured command-pattern matches before execution.

See [guardrails extension](../guardrails/guardrails.md) for command-pattern-based blocking.
