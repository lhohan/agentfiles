import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  ToolCallEvent,
  ToolCallEventResult,
} from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Command Guardrails Extension
 *
 * Loads global and project-local guardrails.conf files, then intercepts bash
 * tool calls to warn or block based on configured command regex matches.
 *
 * Doc sync checklist (update docs when changing):
 * - config file locations and precedence
 * - rule fields and command match semantics
 * - config error handling
 * - /guardrails command behavior
 */

type GuardrailMode = "off" | "warn" | "block";
type ScopeName = "global" | "project";

interface RawRule {
  name: string;
  match?: string;
  mode?: string;
  reason?: string;
}

interface CompiledRule {
  name: string;
  scope: ScopeName;
  matchSource: string;
  match: RegExp;
  mode: GuardrailMode;
  reason?: string;
}

interface LoadedScope {
  scope: ScopeName;
  path: string;
  rules: CompiledRule[];
}

interface GuardrailsState {
  rules: CompiledRule[];
  globalRules: number;
  projectRules: number;
  lastLoadedAt: number;
}

interface RuleMatchResult {
  warnings: CompiledRule[];
  block?: CompiledRule;
}

const CONFIG_FILENAME = "guardrails.conf";
const SUPPORTED_KEYS = new Set(["match", "mode", "reason"]);
const EMPTY_STATE: GuardrailsState = {
  rules: [],
  globalRules: 0,
  projectRules: 0,
  lastLoadedAt: 0,
};

let state: GuardrailsState = EMPTY_STATE;

function notify(
  ctx: ExtensionContext,
  message: string,
  level: "info" | "warning" | "error" = "info",
) {
  if (ctx.hasUI) {
    ctx.ui.notify(message, level);
    return;
  }

  if (level === "error") {
    console.error(message);
  } else if (level === "warning") {
    console.warn(message);
  } else {
    console.log(message);
  }
}

function regexMatches(regex: RegExp, value: string): boolean {
  regex.lastIndex = 0;
  return regex.test(value);
}

function compileRegex(
  value: string,
  ruleName: string,
  scope: ScopeName,
): RegExp {
  try {
    return new RegExp(value);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `[guardrails] Invalid match regex for rule "${ruleName}" in ${scope} scope: ${message}`,
    );
  }
}

function formatRule(rule: CompiledRule): string {
  const fields = [
    `[${rule.mode}]`,
    `${rule.name}`,
    `scope=${rule.scope}`,
    `match=${JSON.stringify(rule.matchSource)}`,
  ];

  if (rule.reason) {
    fields.push(`reason=${JSON.stringify(rule.reason)}`);
  }

  return fields.join(" ");
}

function parseIniConfig(rawText: string, path: string): RawRule[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const rules: RawRule[] = [];
  const seenSections = new Set<string>();
  let currentRule: RawRule | undefined;
  let currentKeys: Set<string> | undefined;

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (
      trimmed.length === 0 ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(";")
    ) {
      continue;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const name = trimmed.slice(1, -1).trim();
      if (name.length === 0) {
        throw new Error(
          `[guardrails] Empty rule section in ${path} at line ${lineNumber}.`,
        );
      }

      if (seenSections.has(name)) {
        throw new Error(
          `[guardrails] ${path} defines duplicate rule section "${name}". Rule names must be unique within a scope.`,
        );
      }

      seenSections.add(name);
      currentRule = { name };
      currentKeys = new Set();
      rules.push(currentRule);
      continue;
    }

    if (!currentRule || !currentKeys) {
      throw new Error(
        `[guardrails] Found key outside a rule section in ${path} at line ${lineNumber}.`,
      );
    }

    const separator = rawLine.indexOf("=");
    if (separator <= 0) {
      throw new Error(
        `[guardrails] Invalid config line in ${path} at line ${lineNumber}. Expected "key = value".`,
      );
    }

    const key = rawLine.slice(0, separator).trim();
    const value = rawLine.slice(separator + 1).trim();

    if (!SUPPORTED_KEYS.has(key)) {
      throw new Error(
        `[guardrails] Rule "${currentRule.name}" in ${path} uses unsupported key "${key}". Supported keys: match, mode, reason.`,
      );
    }

    if (currentKeys.has(key)) {
      throw new Error(
        `[guardrails] Rule "${currentRule.name}" in ${path} repeats key "${key}".`,
      );
    }

    currentKeys.add(key);
    if (key === "match") {
      currentRule.match = value;
    } else if (key === "mode") {
      currentRule.mode = value;
    } else {
      currentRule.reason = value;
    }
  }

  return rules;
}

function compileRule(rawRule: RawRule, scope: ScopeName): CompiledRule {
  if (typeof rawRule.match !== "string" || rawRule.match.length === 0) {
    throw new Error(
      `[guardrails] Rule "${rawRule.name}" in ${scope} scope must provide match as a JavaScript regex string.`,
    );
  }

  if (
    rawRule.mode !== "off" &&
    rawRule.mode !== "warn" &&
    rawRule.mode !== "block"
  ) {
    throw new Error(
      `[guardrails] Rule "${rawRule.name}" in ${scope} scope has invalid mode "${String(rawRule.mode)}". Expected off, warn, or block.`,
    );
  }

  if (rawRule.reason !== undefined && rawRule.reason.length === 0) {
    throw new Error(
      `[guardrails] Rule "${rawRule.name}" in ${scope} scope must provide a non-empty reason when reason is present.`,
    );
  }

  return {
    name: rawRule.name,
    scope,
    matchSource: rawRule.match,
    match: compileRegex(rawRule.match, rawRule.name, scope),
    mode: rawRule.mode,
    reason: rawRule.reason,
  };
}

function parseConfigFile(path: string, scope: ScopeName): CompiledRule[] {
  const rawText = readFileSync(path, "utf8");
  return parseIniConfig(rawText, path).map((rule) => compileRule(rule, scope));
}

async function loadScope(
  baseDir: string,
  scope: ScopeName,
  ctx: ExtensionContext,
): Promise<LoadedScope | undefined> {
  const path = join(baseDir, CONFIG_FILENAME);
  if (!existsSync(path)) return undefined;

  try {
    return {
      scope,
      path,
      rules: parseConfigFile(path, scope),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    notify(ctx, message, "warning");
    return undefined;
  }
}

function mergeRules(
  globalScope: LoadedScope | undefined,
  projectScope: LoadedScope | undefined,
): GuardrailsState {
  const globalRules = globalScope?.rules ?? [];
  const projectRules = projectScope?.rules ?? [];
  const projectRuleNames = new Set(projectRules.map((rule) => rule.name));
  const merged = [
    ...globalRules.filter((rule) => !projectRuleNames.has(rule.name)),
    ...projectRules,
  ];

  return {
    rules: merged,
    globalRules: globalRules.length,
    projectRules: projectRules.length,
    lastLoadedAt: Date.now(),
  };
}

async function loadGuardrails(
  ctx: ExtensionContext,
): Promise<GuardrailsState> {
  const globalScope = await loadScope(
    join(homedir(), ".pi", "agent"),
    "global",
    ctx,
  );
  const projectScope = await loadScope(join(ctx.cwd, ".pi"), "project", ctx);
  return mergeRules(globalScope, projectScope);
}

function commandFromEvent(event: ToolCallEvent): string | undefined {
  if (!isToolCallEventType("bash", event)) return undefined;
  return event.input.command;
}

function evaluateRules(
  rules: CompiledRule[],
  command: string,
): RuleMatchResult {
  const warnings: CompiledRule[] = [];

  for (const rule of rules) {
    if (rule.mode === "off") continue;
    if (!regexMatches(rule.match, command)) continue;

    if (rule.mode === "warn") {
      warnings.push(rule);
      continue;
    }

    return { warnings, block: rule };
  }

  return { warnings };
}

function buildBlockReason(rule: CompiledRule): string {
  if (rule.reason && rule.reason.trim().length > 0) {
    return `Guardrail "${rule.name}" blocked bash command: ${rule.reason}`;
  }
  return `Guardrail "${rule.name}" blocked bash command.`;
}

function notifyMatches(
  ctx: ExtensionContext,
  match: RuleMatchResult,
) {
  for (const rule of match.warnings) {
    notify(
      ctx,
      `[guardrails] Warning for bash command from rule "${rule.name}"${rule.reason ? `: ${rule.reason}` : "."}`,
      "warning",
    );
  }

  if (match.block) {
    notify(
      ctx,
      `[guardrails] Blocked bash command by rule "${match.block.name}"${match.block.reason ? `: ${match.block.reason}` : "."}`,
      "warning",
    );
  }
}

function summarizeRules(rules: CompiledRule[]): {
  total: number;
  active: number;
  warn: number;
  block: number;
  off: number;
} {
  const counts = {
    total: rules.length,
    active: 0,
    warn: 0,
    block: 0,
    off: 0,
  };

  for (const rule of rules) {
    if (rule.mode === "warn") {
      counts.warn++;
      counts.active++;
    } else if (rule.mode === "block") {
      counts.block++;
      counts.active++;
    } else {
      counts.off++;
    }
  }

  return counts;
}

function buildListLines(currentState: GuardrailsState): string[] {
  const summary = summarizeRules(currentState.rules);

  const lines = [
    `Command guardrails: ${summary.total} total, ${summary.active} active (${summary.block} block, ${summary.warn} warn, ${summary.off} off)`,
    `Scopes: global=${currentState.globalRules}, project=${currentState.projectRules}`,
    `Loaded at: ${currentState.lastLoadedAt === 0 ? "never" : new Date(currentState.lastLoadedAt).toISOString()}`,
  ];

  if (currentState.rules.length === 0) {
    lines.push("No command guardrail rules are currently loaded.");
    return lines;
  }

  lines.push("--- rules ---");
  lines.push(...currentState.rules.map(formatRule));
  return lines;
}

function buildTestLines(
  currentState: GuardrailsState,
  command: string,
): string[] {
  const match = evaluateRules(currentState.rules, command);
  const lines = [
    `Test command: ${JSON.stringify(command)}`,
  ];

  if (match.warnings.length === 0 && !match.block) {
    lines.push("Matched rules: none");
    return lines;
  }

  if (match.warnings.length > 0) {
    lines.push("--- warnings ---");
    lines.push(...match.warnings.map(formatRule));
  }

  if (match.block) {
    lines.push("--- block ---");
    lines.push(formatRule(match.block));
  }

  return lines;
}

function showLines(
  ctx: ExtensionCommandContext,
  lines: string[],
) {
  const message = lines.join("\n");
  if (!ctx.hasUI) {
    console.log(message);
    return;
  }

  ctx.ui.notify(message, "info");
}

function parseTestArgs(args: string): { command: string } | { error: string } {
  const trimmed = args.trim();
  if (trimmed !== "test" && !trimmed.startsWith("test ")) {
    return { error: "Usage: /guardrails [test <command...>]" };
  }

  const command = trimmed.slice("test".length).trimStart();
  if (command.length === 0) {
    return { error: "Usage: /guardrails test <command...>" };
  }

  return { command };
}

async function handleGuardrailsCommand(
  args: string,
  ctx: ExtensionCommandContext,
) {
  if (args.trim().length === 0) {
    showLines(ctx, buildListLines(state));
    return;
  }

  if (args.trim() !== "test" && !args.trim().startsWith("test ")) {
    notify(ctx, "[guardrails] Usage: /guardrails [test <command...>]", "warning");
    return;
  }

  const parsed = parseTestArgs(args);
  if ("error" in parsed) {
    notify(ctx, `[guardrails] ${parsed.error}`, "warning");
    return;
  }

  showLines(ctx, buildTestLines(state, parsed.command));
}

export default function guardrailsExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    state = await loadGuardrails(ctx);
  });

  pi.on("tool_call", async (event, ctx): Promise<ToolCallEventResult | void> => {
    const command = commandFromEvent(event);
    if (!command) return;

    const match = evaluateRules(state.rules, command);
    if (match.warnings.length === 0 && !match.block) return;

    notifyMatches(ctx, match);

    if (!match.block) return;

    return {
      block: true,
      reason: buildBlockReason(match.block),
    };
  });

  pi.registerCommand("guardrails", {
    description: "List command guardrails or test a bash command against them",
    handler: async (args, ctx) => {
      await handleGuardrailsCommand(args, ctx);
    },
  });
}
