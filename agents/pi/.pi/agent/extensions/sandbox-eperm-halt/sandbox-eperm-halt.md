# Sandbox EPERM Halt Extension

Sandbox EPERM Halt is a single-purpose pi extension that detects sandbox permission failures (EPERM / "Operation not permitted") in built-in tool results and halts the agent for the rest of the current turn.

## Purpose

When a tool call is blocked by the sandbox (e.g., Safehouse on macOS), the operation fails with a permission error (EPERM). Without intervention, the LLM may try equivalent commands or different tools to achieve the same goal, which will also be blocked. This extension detects EPERM failures and, when the per-turn count reaches a configurable threshold, injects a steering message telling the model to stop trying and ask the user, then aborts the current turn — reusing and extending the mechanism introduced in the guardrails extension.

**Important:** This is not containment or file secrecy. It is a best-effort "stop trying" signal layered on top of sandbox enforcement. For actual containment, use Safehouse or your platform's sandboxing solution.

## How it works

- **Trigger:** On any built-in tool's `tool_result` event where `isError === true` and the output content matches `\boperation not permitted\b` (case-insensitive) or `\bEPERM\b`.
- **Counting:** A per-turn counter tracks how many EPERM errors occur in the current turn. Below the configured threshold, errors pass through silently — the model sees the natural tool error and can attempt recovery.
- **Action:** When the per-turn EPERM count reaches the threshold: emit a user-visible warning notification, send a steering message to the LLM (`deliverAs: "steer"`), and call `ctx.abort()` to halt the current turn.
- **Deduplication:** Per-turn state (counter + `haltedThisTurn` flag) resets on `turn_end` and `agent_start`.
- **Config reload:** Threshold is loaded at `session_start`; edit the config file and run `/reload` to pick up changes.

## Tool scope

All built-in tools are watched: `bash`, `read`, `write`, `edit`, `grep`, `find`, `ls`. Custom/extension tools are excluded because their error text is not standardized.

## Detection details

The `isError` gate is required to avoid false positives from successful results whose content merely mentions "Operation not permitted" (e.g., reading documentation or a skill file). Built-in tool `details` do not carry exit codes or errno values, so detection must be content-text based.

- **bash:** On non-zero exit, the bash tool throws; the result's content includes stderr (e.g., `bash: ...: Operation not permitted`) plus the appended "Command exited with code N".
- **read/write/edit/grep/find/ls:** On EPERM, the tool throws; the result's content includes the Node error string (e.g., `Error: EPERM: operation not permitted, open '/path'`).

## Behavior and limitations

- **Best-effort:** In parallel tool mode, sibling tool calls from the same assistant message may already be in flight when the threshold-crossing EPERM result fires; abort stops the next LLM call but cannot un-run in-flight siblings.
- **Not a hard guarantee:** The model could ignore the steering message on the next turn; abort only stops the *current* turn.
- **Below-threshold pass-through:** Below the configured threshold, EPERM errors pass through silently (no notification, no steering message, no abort). The model sees the natural tool error and can attempt a different approach for that call.
- **Scope:** Only built-in tools; only EPERM-style permission failures. Other errors (ENOENT, EACCES, etc.) do not trigger.

## Configuration

The extension is configured via a global and/or project-local config file.

### Config file locations

| Location | Scope |
|----------|-------|
| `~/.pi/agent/sandbox-eperm-halt.conf` | Global (all projects) |
| `<project>/.pi/sandbox-eperm-halt.conf` | Project-local (trusted projects only) |

Project-local values override global values. Project config is loaded only when the project is trusted (see [pi trust docs](../../../../../docs/trust/index.md)).

### Config format

Simple key-value lines. Whole-line comments start with `#` or `;`. Inline comments are not supported.

```ini
# Halt after this many EPERM errors in one turn.
# Valid values: a positive integer (>= 1), or "off" to disable.
#   threshold = 1   -> halt on the first EPERM (original behavior)
#   threshold = 3   -> halt after the third EPERM in the same turn
#   threshold = off -> disable EPERM checking entirely
threshold = 3
```

### Validation

- `threshold` must be a positive integer (`>= 1`) or the literal `off`.
- On parse/validation error, that scope is ignored and a warning is shown; the extension falls back to the other scope's setting or the default (`3`).
- Errors in one scope do not affect the other scope.
- Changes take effect after `/reload` or the next session.

### Disable (`off`)

Setting `threshold = off` fully disables EPERM checking — no counting, no notifications, no steering messages, no aborts. This is useful when you want to suppress the extension's interference for a particular project or globally. Project-local `off` overrides a global integer threshold.

## Post-stow setup

No extra setup is required. The extension is auto-discovered by pi after stow.

## Relation to guardrails

This extension reuses the guardrails "stop the current turn" mechanism but differs in three ways:

1. **Trigger event:** `tool_result` (post-execution), not `tool_call` (pre-execution). A sandbox EPERM cannot be known before the operation runs.
2. **Tool scope:** All built-in tools, not just `bash`. This deliberately goes beyond the "command guardrails are bash-only" boundary — that CIR covered command safety; this covers sandbox containment failures, which occur across filesystem tools.
3. **Trigger basis:** Sandbox EPERM Halt reacts to observed permission-denied failures from the sandbox, whereas guardrails reacts to configured command-pattern matches before execution.

See [guardrails extension](../guardrails/guardrails.md) for command-pattern-based blocking.
