import { CONFIG_DIR_NAME, type ExtensionAPI, type ExtensionContext, type ToolResultEvent } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Sandbox EPERM Halt Extension
 *
 * Detects sandbox permission failures (EPERM / "Operation not permitted") in
 * built-in tool results. If the per-turn EPERM count reaches the configured
 * threshold, emits a steering message telling the model to stop and ask the
 * user, then aborts the turn. Below the threshold, errors pass through
 * silently so the model can see the natural tool error and attempt recovery.
 *
 * Configuration: sandbox-eperm-halt.conf in global (~/.pi/agent/) and/or
 * project (.pi/) scope. threshold = 1 reproduces immediate-halt behavior;
 * threshold = off disables checking entirely. Project overrides global.
 *
 * Doc sync checklist:
 * - detection signature (isError + content match)
 * - tool scope (all built-in tools; custom tools excluded)
 * - steer + abort behavior and per-turn dedup
 * - best-effort nature (parallel sibling results may in-flight)
 * - config file locations, threshold values, project-trust gating
 * - count-based threshold vs immediate-first-halt
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
const CONFIG_FILENAME = "sandbox-eperm-halt.conf";
const DEFAULT_THRESHOLD = 3;

/** 0 = off, >= 1 = count */
type ThresholdValue = number;

let threshold: ThresholdValue = DEFAULT_THRESHOLD;
let haltedThisTurn = false;
let epermCountThisTurn = 0;

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

function parseThresholdValue(
  value: string,
): { valid: true; value: number } | { valid: false } {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "off") return { valid: true, value: 0 };

  const n = Number.parseInt(trimmed, 10);
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 1) {
    return { valid: false };
  }
  return { valid: true, value: n };
}

/**
 * Parse the first valid `threshold = <value>` line from a config file.
 * Returns undefined when the file has no threshold line or its value is invalid.
 */
function parseConfigFile(path: string): { value: number } | undefined {
  const raw = readFileSync(path, "utf8");
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

    const sepIndex = trimmed.indexOf("=");
    if (sepIndex <= 0) continue; // skip lines without a key=value pair

    const key = trimmed.slice(0, sepIndex).trim();
    const rawValue = trimmed.slice(sepIndex + 1).trim();
    if (key !== "threshold") continue;

    const parsed = parseThresholdValue(rawValue);
    if (!parsed.valid) return undefined;
    return { value: parsed.value };
  }
  return undefined; // no threshold key found
}

function loadConfig(ctx: ExtensionContext): ThresholdValue {
  // Global scope
  const globalPath = join(homedir(), CONFIG_DIR_NAME, "agent", CONFIG_FILENAME);
  let globalValue: number | undefined;
  if (existsSync(globalPath)) {
    try {
      const result = parseConfigFile(globalPath);
      if (result !== undefined) {
        globalValue = result.value;
      } else {
        ctx.ui.notify(
          `[sandbox-eperm-halt] Invalid threshold in ${globalPath}; using default ${DEFAULT_THRESHOLD}`,
          "warning",
        );
      }
    } catch {
      ctx.ui.notify(
        `[sandbox-eperm-halt] Error reading ${globalPath}; using default ${DEFAULT_THRESHOLD}`,
        "warning",
      );
    }
  }

  // Project scope (trusted only)
  let projectValue: number | undefined;
  if (ctx.isProjectTrusted()) {
    const projectPath = join(ctx.cwd, CONFIG_DIR_NAME, CONFIG_FILENAME);
    if (existsSync(projectPath)) {
      try {
        const result = parseConfigFile(projectPath);
        if (result !== undefined) {
          projectValue = result.value;
        } else {
          ctx.ui.notify(
            `[sandbox-eperm-halt] Invalid threshold in ${projectPath}; using default ${DEFAULT_THRESHOLD}`,
            "warning",
          );
        }
      } catch {
        ctx.ui.notify(
          `[sandbox-eperm-halt] Error reading ${projectPath}; using default ${DEFAULT_THRESHOLD}`,
          "warning",
        );
      }
    }
  }

  return projectValue ?? globalValue ?? DEFAULT_THRESHOLD;
}

export default function sandboxEpermHalt(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    threshold = loadConfig(ctx);
    epermCountThisTurn = 0;
    haltedThisTurn = false;
  });

  pi.on("tool_result", async (event, ctx) => {
    if (threshold === 0) return; // off — completely disabled

    if (!isEperm(event)) return;
    if (haltedThisTurn) return; // already halted this turn, no more steer/abort

    epermCountThisTurn += 1;

    if (epermCountThisTurn < threshold) return; // below threshold, silent pass-through

    // Threshold reached — halt the turn
    haltedThisTurn = true;

    ctx.ui.notify(
      `[sandbox-eperm-halt] EPERM ${epermCountThisTurn}/${threshold} in "${event.toolName}" — halting this turn. Ask the user how to proceed.`,
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
        details: { toolName: event.toolName, threshold, epermCountThisTurn },
      },
      { deliverAs: "steer" },
    );

    // Abort the current turn so the model can't keep trying within this turn.
    // Guard ctx.isIdle() because abort is a no-op (and unnecessary) once the
    // agent has already stopped.
    if (!ctx.isIdle()) ctx.abort();
  });

  // Reset per-turn state. turn_end is the guardrails precedent; also reset on
  // agent_start because an aborted turn may not emit turn_end.
  pi.on("turn_end", async () => {
    haltedThisTurn = false;
    epermCountThisTurn = 0;
  });
  pi.on("agent_start", async () => {
    haltedThisTurn = false;
    epermCountThisTurn = 0;
  });
}
