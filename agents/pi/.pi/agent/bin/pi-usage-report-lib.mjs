/**
 * Shared usage statistics parsing and reporting library.
 *
 * Consumed by both the terminal reporter (pi-usage-report)
 * and the HTML reporter (pi-usage-report-html).
 *
 * When adding a new event type in usage-stats.ts, update
 * createCollector().processEntry below so both reporters stay in sync.
 */

import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { basename, dirname, join, resolve } from "node:path";

const HOME = process.env.HOME || "";
const AGENT_DIR = HOME ? join(HOME, ".pi", "agent") : "";

export const STATS_PATH = `${process.env.HOME}/.pi/agent/usage-stats.jsonl`;

const BUILTIN_TOOLS = new Set([
  "read",
  "bash",
  "edit",
  "write",
  "grep",
  "find",
  "ls",
]);

const DAY_MS = 24 * 60 * 60 * 1000;

export const TIME_INTERVAL_OPTIONS = [
  { value: "today", label: "today" },
  { value: "last 3 days", label: "last 3 days" },
  { value: "last 7 days", label: "last 7 days" },
  { value: "last 10 days", label: "last 10 days" },
  { value: "last 30 days", label: "last 30 days" },
  { value: "last 90 days", label: "last 90 days" },
  { value: "last year", label: "last year" },
  { value: "all", label: "all" },
];

const TIME_INTERVAL_VALUES = new Set(TIME_INTERVAL_OPTIONS.map((option) => option.value));

export function normalizeTimeInterval(value = "all") {
  const normalized = String(value || "all").trim().toLowerCase();
  if (TIME_INTERVAL_VALUES.has(normalized)) return normalized;
  throw new Error(
    `Invalid time interval: ${value}. Expected one of: ${TIME_INTERVAL_OPTIONS.map((option) => option.value).join(", ")}`,
  );
}

function intervalStartMs(interval, now = Date.now()) {
  switch (normalizeTimeInterval(interval)) {
    case "all":
      return Number.NEGATIVE_INFINITY;
    case "today": {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }
    case "last 3 days":
      return now - 3 * DAY_MS;
    case "last 7 days":
      return now - 7 * DAY_MS;
    case "last 10 days":
      return now - 10 * DAY_MS;
    case "last 30 days":
      return now - 30 * DAY_MS;
    case "last 90 days":
      return now - 90 * DAY_MS;
    case "last year":
      return now - 365 * DAY_MS;
  }
}

export function entryMatchesTimeInterval(entry, interval = "all", now = Date.now()) {
  const normalized = normalizeTimeInterval(interval);
  if (normalized === "all") return true;
  if (!entry || typeof entry.t !== "number" || !Number.isFinite(entry.t)) return false;
  return entry.t >= intervalStartMs(normalized, now) && entry.t <= now;
}

export function skillNameFromPath(path) {
  if (!path || typeof path !== "string") return path;
  const name = basename(dirname(path));
  if (name && name !== ".") return name;
  return path;
}

function extensionNameFromEntry(entry) {
  if (!entry || typeof entry !== "object") return "unknown";
  if (typeof entry.extension === "string" && entry.extension) return entry.extension;
  if (typeof entry.name === "string" && entry.name) return entry.name;
  if (typeof entry.extensionName === "string" && entry.extensionName) return entry.extensionName;
  if (typeof entry.extensionPath === "string" && entry.extensionPath) {
    return basename(entry.extensionPath).replace(/\.[^.]+$/, "");
  }
  if (typeof entry.path === "string" && entry.path) {
    return basename(entry.path).replace(/\.[^.]+$/, "");
  }
  return "unknown";
}

function eventExtensionName(entry) {
  if (!entry || typeof entry !== "object") return undefined;
  if (typeof entry.extension === "string" && entry.extension) return entry.extension;
  if (typeof entry.extensionName === "string" && entry.extensionName) return entry.extensionName;
  if (typeof entry.extensionPath === "string" && entry.extensionPath) {
    return basename(entry.extensionPath).replace(/\.[^.]+$/, "");
  }
  if (typeof entry.path === "string" && entry.path) {
    return basename(entry.path).replace(/\.[^.]+$/, "");
  }
  return undefined;
}

function rememberExtensionOwner(owners, name, extension) {
  if (typeof name !== "string" || !name.trim()) return;
  if (typeof extension !== "string" || !extension.trim()) return;
  owners.set(name, extension);
}

export function formatExtensionOwnedName(name, extension) {
  const base = typeof name === "string" && name.trim() ? name.trim() : "unknown";
  if (typeof extension !== "string" || !extension.trim() || extension === "unknown") return base;
  return `${base} (${extension.trim()})`;
}

export function extensionOwnedEntries(counts, owners = new Map()) {
  const displayCounts = new Map();
  for (const [name, count] of counts.entries()) {
    const displayName = formatExtensionOwnedName(name, owners.get(name));
    displayCounts.set(displayName, (displayCounts.get(displayName) || 0) + count);
  }
  return sortMap(displayCounts);
}

export function createCollector({ trackTimeline = false } = {}) {
  const counters = {
    promptInvoked: new Map(),
    extensionCommandInvoked: new Map(),
    extensionLoaded: new Map(),
    extensionInstalled: new Map(),
    extensionUsed: new Map(),
    customToolCalled: new Map(),
    customToolExtensions: new Map(),
    skillLoaded: new Map(),
    modelUsed: new Map(),
    modelSelect: new Map(),
    extensionCommandExtensions: new Map(),
    sessionStart: 0,
  };

  const recent = [];
  const timeline = trackTimeline ? [] : null;

  function processEntry(entry) {
    recent.push(entry);
    if (recent.length > 1000) recent.shift();

    if (timeline) {
      timeline.push(entry);
    }

    switch (entry.event) {
      case "skill_loaded": {
        const name = skillNameFromPath(entry.path);
        counters.skillLoaded.set(name, (counters.skillLoaded.get(name) || 0) + 1);
        break;
      }
      case "skill_invoked":
        counters.skillLoaded.set(
          entry.name,
          (counters.skillLoaded.get(entry.name) || 0) + 1,
        );
        break;
      case "prompt_invoked":
        counters.promptInvoked.set(
          entry.name,
          (counters.promptInvoked.get(entry.name) || 0) + 1,
        );
        {
          const ext = entry.extension;
          if (ext && ext !== "unknown") {
            counters.extensionUsed.set(
              ext,
              (counters.extensionUsed.get(ext) || 0) + 1,
            );
          }
        }
        break;
      case "extension_command_invoked":
        counters.extensionCommandInvoked.set(
          entry.name,
          (counters.extensionCommandInvoked.get(entry.name) || 0) + 1,
        );
        {
          const ext = eventExtensionName(entry);
          rememberExtensionOwner(counters.extensionCommandExtensions, entry.name, ext);
          if (ext) {
            counters.extensionUsed.set(
              ext,
              (counters.extensionUsed.get(ext) || 0) + 1,
            );
          }
        }
        break;
      case "extension_loaded":
      case "EXTENSION_LOADED": {
        const extension = extensionNameFromEntry(entry);
        counters.extensionLoaded.set(
          extension,
          (counters.extensionLoaded.get(extension) || 0) + 1,
        );
        counters.extensionUsed.set(
          extension,
          (counters.extensionUsed.get(extension) || 0) + 1,
        );
        break;
      }
      case "extension_inventory": {
        counters.extensionInstalled.set(entry.extension, true);
        break;
      }
      case "skill_command_invoked":
        counters.skillLoaded.set(
          entry.name,
          (counters.skillLoaded.get(entry.name) || 0) + 1,
        );
        break;
      case "custom_tool_called":
        counters.customToolCalled.set(
          entry.tool,
          (counters.customToolCalled.get(entry.tool) || 0) + 1,
        );
        {
          const ext = eventExtensionName(entry);
          rememberExtensionOwner(counters.customToolExtensions, entry.tool, ext);
          if (ext) {
            counters.extensionUsed.set(
              ext,
              (counters.extensionUsed.get(ext) || 0) + 1,
            );
          }
        }
        break;
      case "model_used":
        counters.modelUsed.set(
          entry.model,
          (counters.modelUsed.get(entry.model) || 0) + 1,
        );
        break;
      case "model_select":
        counters.modelSelect.set(
          entry.model,
          (counters.modelSelect.get(entry.model) || 0) + 1,
        );
        break;
      case "session_start":
        counters.sessionStart++;
        break;
    }
  }

  return { counters, recent, timeline, processEntry };
}

export function sortMap(map) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function sortRowsByUsageDesc(rows) {
  return rows.slice().sort((a, b) => {
    const byCount = b.count - a.count;
    if (byCount !== 0) return byCount;
    return a.name.localeCompare(b.name);
  });
}

function sortRowsByUsageAsc(rows) {
  return rows.slice().sort((a, b) => {
    const byCount = a.count - b.count;
    if (byCount !== 0) return byCount;
    return a.name.localeCompare(b.name);
  });
}

function stringSet(values) {
  const result = new Set();
  for (const value of values || []) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) result.add(trimmed);
  }
  return result;
}

export function createArtifactReport({
  id,
  label,
  itemLabel,
  counts,
  inventory = [],
  inventoryDiscovered = false,
  mostLimit = 10,
  leastLimit = 10,
  displayNameForName = (name) => name,
}) {
  const names = stringSet(inventory);
  for (const name of counts.keys()) {
    if (typeof name === "string" && name.trim()) names.add(name.trim());
  }

  const rows = Array.from(names, (name) => ({
    name: displayNameForName(name),
    count: counts.get(name) || 0,
  }));

  const full = sortRowsByUsageDesc(rows);
  const most = full.slice(0, mostLimit);
  const mostNames = new Set(most.map((row) => row.name));
  const least = sortRowsByUsageAsc(full)
    .filter((row) => !mostNames.has(row.name))
    .slice(0, leastLimit);

  return {
    id,
    label,
    itemLabel,
    inventoryDiscovered,
    includesZeroUse: inventoryDiscovered && stringSet(inventory).size > 0,
    most,
    least,
    full,
  };
}

export function createArtifactReports(counters, options = {}) {
  const discoveredInventories = options.inventories
    ? { inventories: options.inventories, discovered: options.discovered || {} }
    : discoverArtifactInventories(options);

  const { inventories, discovered } = discoveredInventories;

  return [
    createArtifactReport({
      id: "prompts",
      label: "Prompts",
      itemLabel: "Prompt",
      counts: counters.promptInvoked,
      inventory: inventories.prompts || [],
      inventoryDiscovered: !!discovered.prompts,
    }),
    createArtifactReport({
      id: "skills",
      label: "Skills",
      itemLabel: "Skill",
      counts: counters.skillLoaded,
      inventory: inventories.skills || [],
      inventoryDiscovered: !!discovered.skills,
    }),
    createArtifactReport({
      id: "customTools",
      label: "Custom Tools",
      itemLabel: "Tool",
      counts: counters.customToolCalled,
      inventory: inventories.customTools || [],
      inventoryDiscovered: !!discovered.customTools,
      displayNameForName: (name) => formatExtensionOwnedName(
        name,
        counters.customToolExtensions?.get(name),
      ),
    }),
    createArtifactReport({
      id: "enabledModels",
      label: "Enabled Models",
      itemLabel: "Model",
      counts: counters.modelUsed,
      inventory: inventories.enabledModels || [],
      inventoryDiscovered: !!discovered.enabledModels,
    }),
  ];
}

export function discoverArtifactInventories(options = {}) {
  const inventories = {
    prompts: discoverPromptInventory(options),
    skills: discoverSkillInventory(options),
    customTools: discoverCustomToolInventory(options),
    enabledModels: discoverEnabledModelInventory(options),
  };

  return {
    inventories,
    discovered: {
      prompts: inventories.prompts.length > 0,
      skills: inventories.skills.length > 0,
      customTools: inventories.customTools.length > 0,
      enabledModels: inventories.enabledModels.length > 0,
    },
  };
}

function defaultAgentDir(options = {}) {
  return options.agentDir || AGENT_DIR;
}

function defaultCwd(options = {}) {
  return options.cwd || process.cwd();
}

function expandHome(path) {
  if (typeof path !== "string") return path;
  if (path === "~") return HOME;
  if (path.startsWith("~/")) return join(HOME, path.slice(2));
  return path;
}

function resolveResourcePath(path, baseDir) {
  const expanded = expandHome(path);
  if (!expanded) return undefined;
  if (expanded.startsWith("/")) return expanded;
  return resolve(baseDir, expanded);
}

function safeJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function settingsFiles(options = {}) {
  const agentDir = defaultAgentDir(options);
  const cwd = defaultCwd(options);
  return [
    { path: join(agentDir, "settings.json"), baseDir: agentDir },
    { path: join(cwd, ".pi", "settings.json"), baseDir: join(cwd, ".pi") },
  ];
}

function settingsResourcePaths(key, options = {}) {
  const paths = [];
  for (const file of settingsFiles(options)) {
    const settings = safeJson(file.path);
    const values = Array.isArray(settings[key]) ? settings[key] : [];
    for (const value of values) {
      if (typeof value !== "string") continue;
      if (value.startsWith("!") || value.startsWith("-")) continue;
      const path = value.startsWith("+") ? value.slice(1) : value;
      if (path.includes("*")) continue;
      const resolved = resolveResourcePath(path, file.baseDir);
      if (resolved) paths.push(resolved);
    }
  }
  return paths;
}

function readEffectiveEnabledModels(options = {}) {
  let models = [];
  for (const file of settingsFiles(options)) {
    const settings = safeJson(file.path);
    if (Array.isArray(settings.enabledModels)) {
      models = settings.enabledModels.filter((value) => typeof value === "string" && value.trim());
    }
  }
  return models;
}

function safeRealpath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function directoryEntries(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function pathKind(path, dirent) {
  if (dirent.isFile()) return "file";
  if (dirent.isDirectory()) return "directory";
  if (!dirent.isSymbolicLink()) return "other";
  try {
    const stats = statSync(path);
    if (stats.isFile()) return "file";
    if (stats.isDirectory()) return "directory";
  } catch {
    return "other";
  }
  return "other";
}

function stripFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return markdown.trim();
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown.trim();
  return markdown.slice(end + 5).trim();
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function isManagedPromptMarkdown(markdown) {
  if (!markdown.startsWith("---\n")) return false;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return false;
  const frontmatter = markdown.slice(4, end);
  return /^(model|chain|skill|thinking|fresh|loop|converge|parallel|worktree|subagent|inheritContext|rotate|workers|reviewers|finalApplier|bestOfN|cwd)\s*:/m.test(frontmatter);
}

function addPromptFile(prompts, file) {
  if (!file.endsWith(".md")) return;
  try {
    const raw = readFileSync(file, "utf-8");
    const body = normalizeText(stripFrontmatter(raw));
    if (!body) return;
    prompts.add(basename(file, ".md"));
  } catch {
    // ignore unreadable prompt files
  }
}

function scanPromptDirFlat(dir, prompts) {
  if (!existsSync(dir)) return;
  for (const entry of directoryEntries(dir)) {
    const fullPath = join(dir, entry.name);
    if (pathKind(fullPath, entry) !== "file") continue;
    addPromptFile(prompts, fullPath);
  }
}

function scanManagedPromptDirRecursive(dir, prompts, visited = new Set()) {
  if (!existsSync(dir)) return;
  const real = safeRealpath(dir);
  if (visited.has(real)) return;
  visited.add(real);

  for (const entry of directoryEntries(dir)) {
    const fullPath = join(dir, entry.name);
    const kind = pathKind(fullPath, entry);
    if (kind === "directory") {
      scanManagedPromptDirRecursive(fullPath, prompts, visited);
      continue;
    }
    if (kind !== "file" || !entry.name.endsWith(".md")) continue;

    try {
      const raw = readFileSync(fullPath, "utf-8");
      if (!isManagedPromptMarkdown(raw)) continue;
      const body = normalizeText(stripFrontmatter(raw));
      if (!body) continue;
      prompts.add(basename(fullPath, ".md"));
    } catch {
      // ignore unreadable prompt files
    }
  }
}

export function discoverPromptInventory(options = {}) {
  const prompts = new Set();
  const agentDir = defaultAgentDir(options);
  const cwd = defaultCwd(options);
  const dirs = [
    join(agentDir, "prompts"),
    join(cwd, ".pi", "prompts"),
    ...settingsResourcePaths("prompts", options),
  ];

  for (const dir of dirs) {
    scanPromptDirFlat(dir, prompts);
    scanManagedPromptDirRecursive(dir, prompts);
  }

  return Array.from(prompts).sort();
}

function scanSkillLocation(dir, skills, { rootMarkdown = false } = {}, visited = new Set()) {
  if (!existsSync(dir)) return;
  const real = safeRealpath(dir);
  if (visited.has(real)) return;
  visited.add(real);

  for (const entry of directoryEntries(dir)) {
    const fullPath = join(dir, entry.name);
    const kind = pathKind(fullPath, entry);

    if (kind === "file") {
      if (rootMarkdown && entry.name.endsWith(".md")) {
        skills.add(basename(entry.name, ".md"));
      }
      continue;
    }

    if (kind !== "directory") continue;
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const skillFile = join(fullPath, "SKILL.md");
    if (existsSync(skillFile)) {
      skills.add(basename(fullPath));
    }

    scanSkillLocation(fullPath, skills, { rootMarkdown: false }, visited);
  }
}

function projectAncestors(cwd) {
  const result = [];
  let current = resolve(cwd);
  while (true) {
    result.push(current);
    if (existsSync(join(current, ".git"))) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return result;
}

export function discoverSkillInventory(options = {}) {
  const skills = new Set();
  const agentDir = defaultAgentDir(options);
  const cwd = defaultCwd(options);

  scanSkillLocation(join(agentDir, "skills"), skills, { rootMarkdown: true });
  if (HOME) scanSkillLocation(join(HOME, ".agents", "skills"), skills, { rootMarkdown: false });
  scanSkillLocation(join(cwd, ".pi", "skills"), skills, { rootMarkdown: true });

  for (const ancestor of projectAncestors(cwd)) {
    scanSkillLocation(join(ancestor, ".agents", "skills"), skills, { rootMarkdown: false });
  }

  for (const path of settingsResourcePaths("skills", options)) {
    if (path.endsWith(".md")) {
      skills.add(basename(path, ".md"));
    } else {
      scanSkillLocation(path, skills, { rootMarkdown: true });
    }
  }

  return Array.from(skills).sort();
}

function scanExtensionFileForTools(path, tools) {
  if (!path.endsWith(".ts") && !path.endsWith(".js") && !path.endsWith(".mjs")) return;
  let text;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return;
  }

  const registerToolPattern = /registerTool\s*\(\s*{[\s\S]{0,1200}?\bname\s*:\s*["']([A-Za-z0-9_-]+)["']/g;
  for (const match of text.matchAll(registerToolPattern)) {
    const name = match[1];
    if (!BUILTIN_TOOLS.has(name)) tools.add(name);
  }
}

function scanExtensionPathForTools(path, tools, visited = new Set()) {
  if (!existsSync(path)) return;
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return;
  }

  if (stats.isFile()) {
    scanExtensionFileForTools(path, tools);
    return;
  }

  if (!stats.isDirectory()) return;
  const real = safeRealpath(path);
  if (visited.has(real)) return;
  visited.add(real);

  for (const entry of directoryEntries(path)) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = join(path, entry.name);
    const kind = pathKind(fullPath, entry);
    if (kind === "file") {
      scanExtensionFileForTools(fullPath, tools);
    } else if (kind === "directory") {
      scanExtensionPathForTools(fullPath, tools, visited);
    }
  }
}

export function discoverCustomToolInventory(options = {}) {
  const tools = new Set();
  const agentDir = defaultAgentDir(options);
  const cwd = defaultCwd(options);
  const paths = [
    join(agentDir, "extensions"),
    join(cwd, ".pi", "extensions"),
    ...settingsResourcePaths("extensions", options),
  ];

  for (const path of paths) {
    scanExtensionPathForTools(path, tools);
  }

  return Array.from(tools).sort();
}

export function discoverEnabledModelInventory(options = {}) {
  return Array.from(stringSet(readEffectiveEnabledModels(options))).sort();
}

export function promptDisplayFromEntry(entry) {
  return {
    name: entry.name || "unknown",
    provenance: entry.sourceInfo?.path,
    extension: entry.extension,
  };
}

export function formatPromptDetail(entry) {
  const parts = [];
  parts.push(`name="${entry.name || "unknown"}"`);
  if (entry.args) parts.push(`args=${JSON.stringify(entry.args)}`);
  if (entry.sourceInfo?.path) parts.push(`path="${entry.sourceInfo.path}"`);
  if (entry.extension) parts.push(`extension="${entry.extension}"`);
  if (entry.inferred) parts.push("inferred=true");
  return parts.join(" ");
}

export function formatEventDetail(entry) {
  if (entry.event === "prompt_invoked") return formatPromptDetail(entry);

  if (entry.event === "custom_tool_called") {
    const parts = [
      `tool=${JSON.stringify(formatExtensionOwnedName(entry.tool, eventExtensionName(entry)))}`,
    ];
    for (const [key, value] of Object.entries(entry)) {
      if (["t", "event", "tool", "extension"].includes(key)) continue;
      parts.push(`${key}=${JSON.stringify(value)}`);
    }
    return parts.join(" ");
  }

  if (entry.event === "extension_command_invoked") {
    const parts = [
      `name=${JSON.stringify(formatExtensionOwnedName(entry.name, eventExtensionName(entry)))}`,
    ];
    for (const [key, value] of Object.entries(entry)) {
      if (["t", "event", "name", "extension"].includes(key)) continue;
      parts.push(`${key}=${JSON.stringify(value)}`);
    }
    return parts.join(" ");
  }

  return Object.entries(entry)
    .filter(([key]) => key !== "t" && key !== "event")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
}

/**
 * Read the stats file line-by-line, yielding parsed entries.
 * Skips blank lines and malformed JSON silently.
 */
export async function* readStatsEntries(path) {
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // skip malformed lines
    }
  }
}
