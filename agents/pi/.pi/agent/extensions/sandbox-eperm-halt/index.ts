import type { ExtensionAPI, ToolResultEvent } from "@earendil-works/pi-coding-agent";

/**
 * Sandbox EPERM Halt Extension
 *
 * Detects sandbox permission failures (EPERM / "Operation not permitted") in
 * built-in tool results and halts the agent for the current turn: emits a
 * steering message telling the model to stop and ask the user, then aborts
 * the turn. Mirrors the guardrails "stop the current turn" mechanism, but
 * triggers on tool_result (post-execution) across all built-in tools rather
 * than on a pre-execution bash command regex.
 *
 * Doc sync checklist:
 * - detection signature (isError + content match)
 * - tool scope (all built-in tools; custom tools excluded)
 * - steer + abort behavior and per-turn dedup
 * - best-effort nature (parallel sibling results may in-flight)
 */

const EPERM_PATTERNS = [/\boperation not permitted\b/i, /\bEPERM\b/];
const BUILTIN_TOOLS = new Set([
  "read",
  "bash",
  "edit",
  "write",
  "grep",
  "find",
  "ls",
]);

let haltedThisTurn = false;

function resultText(event: ToolResultEvent): string {
  return event.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
}

function isEperm(event: ToolResultEvent): boolean {
  if (!BUILTIN_TOOLS.has(event.toolName)) return false;
  if (!event.isError) return false;
  const text = resultText(event);
  return EPERM_PATTERNS.some((re) => re.test(text));
}

export default function sandboxEpermHalt(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    if (!isEperm(event)) return;
    if (haltedThisTurn) return;
    haltedThisTurn = true;

    ctx.ui.notify(
      `[sandbox-eperm-halt] Sandbox permission failure in "${event.toolName}" — halting this turn. Ask the user how to proceed.`,
      "warning",
    );

    pi.sendMessage(
      {
        customType: "sandbox-eperm-halt",
        content:
          `A tool call (${event.toolName}) failed with a sandbox permission error (EPERM / "Operation not permitted"). ` +
          "Do not retry this operation, try equivalent commands, or route around it with other tools. " +
          "Stop and ask the user how to proceed.",
        display: true,
        details: { toolName: event.toolName },
      },
      { deliverAs: "steer" },
    );

    // Abort the current turn so the model can't keep trying within this turn.
    // Guard ctx.isIdle() because abort is a no-op (and unnecessary) once the
    // agent has already stopped.
    if (!ctx.isIdle()) ctx.abort();
  });

  // Reset the per-turn flag. turn_end is the guardrails precedent; also
  // reset on agent_start because an aborted turn may not emit turn_end.
  pi.on("turn_end", async () => {
    haltedThisTurn = false;
  });
  pi.on("agent_start", async () => {
    haltedThisTurn = false;
  });
}
