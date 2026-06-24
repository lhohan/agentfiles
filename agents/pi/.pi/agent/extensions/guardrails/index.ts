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
 * Configurable Guardrails Extension
 *
 * Loads global and project-local YAML guardrail rules, then intercepts built-in
 * tool calls to warn or block based on configured regex matches.
 *
 * Doc sync checklist (update docs when changing):
 * - config file locations and precedence
 * - rule fields and per-tool match semantics
 * - config error handling
 * - /guardrails command behavior
 * - post-stow npm install step
 */

const SUPPORTED_TOOLS = [
  "bash",
  "read",
  "write",
  "edit",
  "grep",
  "find",
  "ls",
] as const;

type SupportedTool = (typeof SUPPORTED_TOOLS)[number];
type GuardrailMode = "off" | "warn" | "block";
type ScopeName = "global" | "project";

const SUPPORTED_TOOL_SET = new Set<SupportedTool>(SUPPORTED_TOOLS);

interface RawRule {
  name: unknown;
  tools: unknown;
  pattern: unknown;
  mode: unknown;
  pathPattern?: unknown;
  reason?: unknown;
  allow?: unknown;
}

interface ConfigFile {
  rules: unknown;
}

interface CompiledRule {
  name: string;
  scope: ScopeName;
  tools: SupportedTool[];
  patternSource: string;
  pattern: RegExp;
  mode: GuardrailMode;
  pathPatternSource?: string;
  pathPattern?: RegExp;
  reason?: string;
  allowSource?: string;
  allow?: RegExp;
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

interface RuleMatchContext {
  toolName: SupportedTool;
  primaryValue?: string;
  pathValue?: string;
  allowValue?: string;
}

interface RuleMatchResult {
  warnings: CompiledRule[];
  block?: CompiledRule;
}

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
  field: "pattern" | "pathPattern" | "allow",
  ruleName: string,
  scope: ScopeName,
): RegExp {
  try {
    return new RegExp(value);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `[guardrails] Invalid ${field} regex for rule "${ruleName}" in ${scope} scope: ${message}`,
    );
  }
}

function formatRule(rule: CompiledRule): string {
  const fields = [
    `[${rule.mode}]`,
    `${rule.name}`,
    `scope=${rule.scope}`,
    `tools=${rule.tools.join(",")}`,
    `pattern=${JSON.stringify(rule.patternSource)}`,
  ];

  if (rule.pathPatternSource) {
    fields.push(`pathPattern=${JSON.stringify(rule.pathPatternSource)}`);
  }

  if (rule.allowSource) {
    fields.push(`allow=${JSON.stringify(rule.allowSource)}`);
  }

  if (rule.reason) {
    fields.push(`reason=${JSON.stringify(rule.reason)}`);
  }

  return fields.join(" ");
}

function validateTools(
  tools: unknown,
  ruleName: string,
  scope: ScopeName,
): SupportedTool[] {
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new Error(
      `[guardrails] Rule "${ruleName}" in ${scope} scope must declare a non-empty tools array.`,
    );
  }

  const normalized = tools.map((tool) => {
    if (typeof tool !== "string" || !SUPPORTED_TOOL_SET.has(tool as SupportedTool)) {
      throw new Error(
        `[guardrails] Rule "${ruleName}" in ${scope} scope uses unsupported tool "${String(tool)}". Supported tools: ${SUPPORTED_TOOLS.join(", ")}.`,
      );
    }
    return tool as SupportedTool;
  });

  return Array.from(new Set(normalized));
}

function compileRule(rawRule: RawRule, scope: ScopeName): CompiledRule {
  if (typeof rawRule.name !== "string" || rawRule.name.trim().length === 0) {
    throw new Error(`[guardrails] ${scope} scope contains a rule with a missing or empty name.`);
  }

  const name = rawRule.name.trim();
  const tools = validateTools(rawRule.tools, name, scope);

  if (typeof rawRule.pattern !== "string") {
    throw new Error(
      `[guardrails] Rule "${name}" in ${scope} scope must provide pattern as a string.`,
    );
  }

  if (
    rawRule.mode !== "off" &&
    rawRule.mode !== "warn" &&
    rawRule.mode !== "block"
  ) {
    throw new Error(
      `[guardrails] Rule "${name}" in ${scope} scope has invalid mode "${String(rawRule.mode)}". Expected off, warn, or block.`,
    );
  }

  if (
    rawRule.pathPattern !== undefined &&
    typeof rawRule.pathPattern !== "string"
  ) {
    throw new Error(
      `[guardrails] Rule "${name}" in ${scope} scope must provide pathPattern as a string when present.`,
    );
  }

  if (rawRule.reason !== undefined && typeof rawRule.reason !== "string") {
    throw new Error(
      `[guardrails] Rule "${name}" in ${scope} scope must provide reason as a string when present.`,
    );
  }

  if (rawRule.allow !== undefined && typeof rawRule.allow !== "string") {
    throw new Error(
      `[guardrails] Rule "${name}" in ${scope} scope must provide allow as a string when present.`,
    );
  }

  return {
    name,
    scope,
    tools,
    patternSource: rawRule.pattern,
    pattern: compileRegex(rawRule.pattern, "pattern", name, scope),
    mode: rawRule.mode,
    pathPatternSource: rawRule.pathPattern,
    pathPattern:
      typeof rawRule.pathPattern === "string"
        ? compileRegex(rawRule.pathPattern, "pathPattern", name, scope)
        : undefined,
    reason: rawRule.reason,
    allowSource: rawRule.allow,
    allow:
      typeof rawRule.allow === "string"
        ? compileRegex(rawRule.allow, "allow", name, scope)
        : undefined,
  };
}

function stripInlineComment(value: string): string {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && inDouble) {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (char === "#" && !inSingle && !inDouble) {
      return value.slice(0, i).trimEnd();
    }
  }

  return value.trimEnd();
}

function parseScalar(rawValue: string): string {
  const value = stripInlineComment(rawValue).trim();
  if (value.length === 0) return "";

  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseToolsArray(rawValue: string): string[] {
  const value = stripInlineComment(rawValue).trim();
  if (!value.startsWith("[") || !value.endsWith("]")) {
    throw new Error(
      `[guardrails] tools must use inline YAML array syntax like [bash, read].`,
    );
  }

  const inner = value.slice(1, -1).trim();
  if (inner.length === 0) return [];

  return inner
    .split(",")
    .map((item) => parseScalar(item))
    .filter((item) => item.length > 0);
}

function parseSimpleYamlConfig(rawText: string, path: string): ConfigFile {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const rules: Array<Record<string, unknown>> = [];
  let sawRules = false;
  let currentRule: Record<string, unknown> | undefined;

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    if (!sawRules) {
      if (trimmed === "rules:") {
        sawRules = true;
        continue;
      }

      throw new Error(
        `[guardrails] Expected top-level "rules:" in ${path} at line ${lineNumber}.`,
      );
    }

    if (rawLine.startsWith("  - ")) {
      const rest = rawLine.slice(4);
      const separator = rest.indexOf(":");
      if (separator <= 0) {
        throw new Error(
          `[guardrails] Invalid rule entry in ${path} at line ${lineNumber}. Expected "- key: value".`,
        );
      }

      currentRule = {};
      rules.push(currentRule);
      const key = rest.slice(0, separator).trim();
      const rawValue = rest.slice(separator + 1);
      currentRule[key] =
        key === "tools" ? parseToolsArray(rawValue) : parseScalar(rawValue);
      continue;
    }

    if (rawLine.startsWith("    ")) {
      if (!currentRule) {
        throw new Error(
          `[guardrails] Found rule field before any rule entry in ${path} at line ${lineNumber}.`,
        );
      }

      const rest = rawLine.slice(4);
      const separator = rest.indexOf(":");
      if (separator <= 0) {
        throw new Error(
          `[guardrails] Invalid rule field in ${path} at line ${lineNumber}. Expected "key: value".`,
        );
      }

      const key = rest.slice(0, separator).trim();
      const rawValue = rest.slice(separator + 1);
      currentRule[key] =
        key === "tools" ? parseToolsArray(rawValue) : parseScalar(rawValue);
      continue;
    }

    throw new Error(
      `[guardrails] Unsupported YAML structure in ${path} at line ${lineNumber}. Keep the file to a top-level rules list with inline scalar fields.`,
    );
  }

  if (!sawRules) {
    throw new Error(
      `[guardrails] ${path} must define a top-level "rules:" key.`,
    );
  }

  return { rules };
}

function parseConfigFile(path: string, scope: ScopeName): CompiledRule[] {
  const rawText = readFileSync(path, "utf8");
  const value = parseSimpleYamlConfig(rawText, path) as ConfigFile | null | undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `[guardrails] ${scope} config ${path} must be a YAML object with a top-level rules: array.`,
    );
  }

  if (!Array.isArray(value.rules)) {
    throw new Error(
      `[guardrails] ${scope} config ${path} must define rules as an array.`,
    );
  }

  const seenNames = new Set<string>();
  const compiledRules: CompiledRule[] = [];

  for (const rawRule of value.rules) {
    if (!rawRule || typeof rawRule !== "object" || Array.isArray(rawRule)) {
      throw new Error(
        `[guardrails] ${scope} config ${path} contains a rule that is not a YAML object.`,
      );
    }

    const compiled = compileRule(rawRule as RawRule, scope);
    if (seenNames.has(compiled.name)) {
      throw new Error(
        `[guardrails] ${scope} config ${path} defines duplicate rule name "${compiled.name}". Rule names must be unique within a scope.`,
      );
    }
    seenNames.add(compiled.name);
    compiledRules.push(compiled);
  }

  return compiledRules;
}

function resolveScopeFile(
  baseDir: string,
  basename: string,
  scope: ScopeName,
  ctx: ExtensionContext,
): string | undefined {
  const yamlPath = join(baseDir, `${basename}.yaml`);
  const ymlPath = join(baseDir, `${basename}.yml`);
  const hasYaml = existsSync(yamlPath);
  const hasYml = existsSync(ymlPath);

  if (hasYaml && hasYml) {
    notify(
      ctx,
      `[guardrails] Ignoring ${scope} scope because both ${yamlPath} and ${ymlPath} exist. Keep only one.`,
      "warning",
    );
    return undefined;
  }

  if (hasYaml) return yamlPath;
  if (hasYml) return ymlPath;
  return undefined;
}

async function loadScope(
  baseDir: string,
  basename: string,
  scope: ScopeName,
  ctx: ExtensionContext,
): Promise<LoadedScope | undefined> {
  const path = resolveScopeFile(baseDir, basename, scope, ctx);
  if (!path) return undefined;

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
    "guardrails",
    "global",
    ctx,
  );
  const projectScope = await loadScope(
    join(ctx.cwd, ".pi"),
    "guardrails",
    "project",
    ctx,
  );
  return mergeRules(globalScope, projectScope);
}

function contextFromEvent(event: ToolCallEvent): RuleMatchContext | undefined {
  if (isToolCallEventType("bash", event)) {
    return {
      toolName: "bash",
      primaryValue: event.input.command,
      allowValue: event.input.command,
    };
  }

  if (isToolCallEventType("read", event)) {
    return {
      toolName: "read",
      primaryValue: event.input.path,
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  if (isToolCallEventType("write", event)) {
    return {
      toolName: "write",
      primaryValue: event.input.content,
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  if (isToolCallEventType("edit", event)) {
    return {
      toolName: "edit",
      primaryValue: event.input.edits
        .map(
          (edit, index) =>
            `edit ${index + 1}\noldText:\n${edit.oldText}\nnewText:\n${edit.newText}`,
        )
        .join("\n\n"),
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  if (isToolCallEventType("grep", event)) {
    return {
      toolName: "grep",
      primaryValue: event.input.pattern,
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  if (isToolCallEventType("find", event)) {
    return {
      toolName: "find",
      primaryValue: event.input.pattern,
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  if (isToolCallEventType("ls", event)) {
    return {
      toolName: "ls",
      primaryValue: event.input.path,
      pathValue: event.input.path,
      allowValue: event.input.path,
    };
  }

  return undefined;
}

function evaluateRules(
  rules: CompiledRule[],
  context: RuleMatchContext,
): RuleMatchResult {
  const warnings: CompiledRule[] = [];
  let block: CompiledRule | undefined;

  for (const rule of rules) {
    if (!rule.tools.includes(context.toolName)) continue;
    if (rule.mode === "off") continue;

    if (rule.allow && context.allowValue && regexMatches(rule.allow, context.allowValue)) {
      continue;
    }

    if (!context.primaryValue || !regexMatches(rule.pattern, context.primaryValue)) {
      continue;
    }

    if (
      rule.pathPattern &&
      (!context.pathValue || !regexMatches(rule.pathPattern, context.pathValue))
    ) {
      continue;
    }

    if (rule.mode === "warn") {
      warnings.push(rule);
      continue;
    }

    if (rule.mode === "block" && !block) {
      block = rule;
    }
  }

  return { warnings, block };
}

function buildBlockReason(rule: CompiledRule, toolName: SupportedTool): string {
  if (rule.reason && rule.reason.trim().length > 0) {
    return `Guardrail "${rule.name}" blocked ${toolName}: ${rule.reason}`;
  }
  return `Guardrail "${rule.name}" blocked ${toolName}.`;
}

function notifyMatches(
  ctx: ExtensionContext,
  toolName: SupportedTool,
  match: RuleMatchResult,
) {
  for (const rule of match.warnings) {
    notify(
      ctx,
      `[guardrails] Warning for ${toolName} from rule "${rule.name}"${rule.reason ? `: ${rule.reason}` : "."}`,
      "warning",
    );
  }

  if (match.block) {
    notify(
      ctx,
      `[guardrails] Blocked ${toolName} by rule "${match.block.name}"${match.block.reason ? `: ${match.block.reason}` : "."}`,
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
    `Loaded rules: ${summary.total} total, ${summary.active} active (${summary.block} block, ${summary.warn} warn, ${summary.off} off)`,
    `Scopes: global=${currentState.globalRules}, project=${currentState.projectRules}`,
    `Loaded at: ${new Date(currentState.lastLoadedAt).toISOString()}`,
  ];

  if (currentState.rules.length === 0) {
    lines.push("No guardrail rules are currently loaded.");
    return lines;
  }

  lines.push("--- rules ---");
  lines.push(...currentState.rules.map(formatRule));
  return lines;
}

function buildTestContext(
  toolName: SupportedTool,
  value: string,
): RuleMatchContext {
  if (toolName === "bash") {
    return {
      toolName,
      primaryValue: value,
      allowValue: value,
    };
  }

  if (toolName === "read" || toolName === "ls") {
    return {
      toolName,
      primaryValue: value,
      pathValue: value,
      allowValue: value,
    };
  }

  return {
    toolName,
    primaryValue: value,
  };
}

function buildTestLines(
  currentState: GuardrailsState,
  toolName: SupportedTool,
  value: string,
): string[] {
  const context = buildTestContext(toolName, value);
  const match = evaluateRules(currentState.rules, context);
  const lines = [
    `Test tool: ${toolName}`,
    `Test value: ${JSON.stringify(value)}`,
    "Note: pathPattern and path-based allow rules only match when the tested tool input includes a path.",
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

async function showLines(
  ctx: ExtensionCommandContext,
  title: string,
  lines: string[],
) {
  if (!ctx.hasUI) {
    console.log(lines.join("\n"));
    return;
  }

  await ctx.ui.select(title, lines);
}

function parseTestArgs(
  args: string,
): { toolName: SupportedTool; value: string } | { error: string } {
  const trimmed = args.trim();
  if (trimmed !== "test" && !trimmed.startsWith("test ")) {
    return { error: "Usage: /guardrails [test <tool> <value>]" };
  }

  const rest = trimmed.slice("test".length).trimStart();
  if (rest.length === 0) {
    return { error: "Usage: /guardrails test <tool> <value>" };
  }

  const firstSpace = rest.search(/\s/);
  const rawTool = firstSpace === -1 ? rest : rest.slice(0, firstSpace);
  const value = firstSpace === -1 ? "" : rest.slice(firstSpace + 1);

  if (!SUPPORTED_TOOL_SET.has(rawTool as SupportedTool)) {
    return {
      error: `Unknown tool "${rawTool}". Supported tools: ${SUPPORTED_TOOLS.join(", ")}.`,
    };
  }

  if (value.length === 0) {
    return { error: "Usage: /guardrails test <tool> <value>" };
  }

  return {
    toolName: rawTool as SupportedTool,
    value,
  };
}

async function handleGuardrailsCommand(
  args: string,
  ctx: ExtensionCommandContext,
) {
  if (args.trim().length === 0) {
    await showLines(ctx, "Guardrails", buildListLines(state));
    return;
  }

  if (args.trim() !== "test" && !args.trim().startsWith("test ")) {
    notify(ctx, "[guardrails] Usage: /guardrails [test <tool> <value>]", "warning");
    return;
  }

  const parsed = parseTestArgs(args);
  if ("error" in parsed) {
    notify(ctx, `[guardrails] ${parsed.error}`, "warning");
    return;
  }

  await showLines(
    ctx,
    "Guardrail Test",
    buildTestLines(state, parsed.toolName, parsed.value),
  );
}

export default function guardrailsExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    state = await loadGuardrails(ctx);
  });

  pi.on("tool_call", async (event, ctx): Promise<ToolCallEventResult | void> => {
    const matchContext = contextFromEvent(event);
    if (!matchContext) return;

    const match = evaluateRules(state.rules, matchContext);
    if (match.warnings.length === 0 && !match.block) return;

    notifyMatches(ctx, matchContext.toolName, match);

    if (!match.block) return;

    return {
      block: true,
      reason: buildBlockReason(match.block, matchContext.toolName),
    };
  });

  pi.registerCommand("guardrails", {
    description: "List loaded guardrail rules or test a mock value against them",
    handler: async (args, ctx) => {
      await handleGuardrailsCommand(args, ctx);
    },
  });
}
