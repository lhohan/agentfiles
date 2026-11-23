#!/usr/bin/env node
// Audit every model reference in the agent configuration against the live Pi catalog.
//
// Zero dependencies. Read-only: never writes configuration, never sends a prompt.
// Exit codes: 0 clean, 1 findings present, 2 usage or runtime error.
//
// Usage:
//   node scripts/audit-models.mjs [--repo <path>] [--json] [--all-providers]

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(SCRIPT_DIR, "../../../..");
const USAGE = "usage: audit-models.mjs [--repo <path>] [--json] [--all-providers]";

// Env vars that a stale OAuth credential can shadow.
const API_KEY_ENV = { openai: "OPENAI_API_KEY", mistral: "MISTRAL_API_KEY", openrouter: "OPENROUTER_API_KEY" };

// ---------------------------------------------------------------------------
// helpers

function parseArgs(argv) {
  const opts = { repo: DEFAULT_REPO, json: false, allProviders: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--all-providers") opts.allProviders = true;
    else if (arg === "--repo") opts.repo = resolve(argv[(i += 1)]);
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`unknown argument: ${arg} (${USAGE})`);
  }
  return opts;
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readIfExists = (p) => (existsSync(p) ? readFileSync(p, "utf8") : undefined);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function splitRef(ref) {
  const idx = ref.indexOf("/");
  return idx === -1 ? { provider: undefined, id: ref } : { provider: ref.slice(0, idx), id: ref.slice(idx + 1) };
}

// ---------------------------------------------------------------------------
// catalog

/** Resolved model list via the Pi CLI, with a catalog-store fallback. */
function loadCatalog(storePath) {
  try {
    const out = execFileSync("pi", ["--list-models"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    const models = [];
    for (const line of out.split("\n")) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 2 || cols[0] === "provider") continue;
      models.push({ provider: cols[0], id: cols[1] });
    }
    const warnings = out
      .split("\n")
      .filter((l) => l.startsWith("Warning:"))
      .map((l) => l.replace(/^Warning:\s*/, ""));
    return { source: "pi --list-models", models, warnings, degraded: false };
  } catch (err) {
    const raw = readIfExists(storePath);
    if (!raw) throw new Error(`pi --list-models failed and no catalog store at ${storePath}: ${err.message}`);
    const models = [];
    for (const [provider, entry] of Object.entries(JSON.parse(raw))) {
      for (const m of entry.models ?? []) models.push({ provider, id: m.id });
    }
    return { source: `catalog store (${storePath})`, models, warnings: [], degraded: true };
  }
}

/** Per-provider catalog rows and refresh times from the Pi catalog store. */
function loadStoreMeta(storePath) {
  const raw = readIfExists(storePath);
  if (!raw) return {};
  try {
    const meta = {};
    for (const [provider, entry] of Object.entries(JSON.parse(raw))) {
      meta[provider] = {
        checkedAt: entry.checkedAt ? new Date(entry.checkedAt).toISOString() : undefined,
        models: Object.fromEntries((entry.models ?? []).map((m) => [m.id, m])),
      };
    }
    return meta;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// reference collection

/** `model:` frontmatter lists from prompt templates. */
function collectRouteRefs(repo) {
  const dir = join(repo, "agents/pi/.pi/agent/prompts");
  if (!existsSync(dir)) return [];
  const refs = [];
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    const front = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
    const line = front?.[1].match(/^model:\s*(.+)$/m);
    if (!line) continue;
    for (const id of line[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      refs.push({ where: `${relative(repo, file)} → model`, ref: id });
    }
  }
  return refs;
}

/**
 * Section-typed TOML scan covering the shapes Zerostack actually uses:
 * top-level model/provider pairs, `[quick_models.*]`, `[[models]]` name/provider
 * pairs behind aliases, audio model blocks, and harness tool model keys.
 */
function scanTomlModels(repo, relPath) {
  const text = readIfExists(join(repo, relPath));
  if (!text) return [];

  const sections = [];
  let current = { section: "top", keys: {} };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("[")) {
      sections.push(current);
      current = { section: line.replace(/^\[+|\]+$/g, ""), keys: {} };
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"/);
    if (kv) current.keys[kv[1]] = kv[2];
  }
  sections.push(current);

  // Pass 1: aliases, so top-level alias references resolve regardless of order.
  const aliases = {};
  for (const { section, keys } of sections) {
    if (/transcribe_models|tts_models/.test(section) && keys.alias) {
      aliases[keys.alias] = { ref: keys.name ?? keys.alias, checkable: false, note: "audio model, not in Pi's chat catalog" };
    }
    if (/^tools\./.test(section) && keys.model) {
      aliases[keys.model] = { ref: keys.model, checkable: false, note: "harness tool model, not in Pi's chat catalog" };
    }
    if (/^models$/.test(section) && keys.alias && (keys.name ?? keys.model)) {
      aliases[keys.alias] = { ref: keys.provider ? `${keys.provider}/${keys.name ?? keys.model}` : (keys.name ?? keys.model), checkable: true };
    }
  }

  // Pass 2: emit references.
  const refs = [];
  const push = (where, ref, extra = {}) => ref && refs.push({ where, ref, ...extra });

  for (const { section, keys } of sections) {
    if (/transcribe_models|tts_models/.test(section)) continue;
    if (/^tools\./.test(section)) {
      const alias = aliases[keys.model];
      push(`${relPath} [${section}] → model`, alias?.ref ?? keys.model, {
        aliasOf: alias ? keys.model : undefined,
        checkable: false,
        note: alias?.note ?? "harness tool model, not in Pi's chat catalog",
      });
      continue;
    }
    if (/^models$/.test(section)) {
      const id = keys.name ?? keys.model;
      const ref = keys.provider && id ? `${keys.provider}/${id}` : id;
      push(`${relPath} [[models]]${keys.alias ? ` ${keys.alias}` : ""}`, ref);
      continue;
    }
    if (section === "top") {
      const top = keys.model;
      if (top) push(`${relPath} → model`, keys.provider ? `${keys.provider}/${top}` : top);
      if (keys.subagent_model) {
        push(`${relPath} → subagent_model`, keys.subagent_provider ? `${keys.subagent_provider}/${keys.subagent_model}` : keys.subagent_model);
      }
      for (const key of ["active_model", "active_transcribe_model", "active_tts_model"]) {
        const value = keys[key];
        if (!value) continue;
        const alias = aliases[value];
        push(`${relPath} → ${key}`, alias?.ref ?? value, {
          aliasOf: alias ? value : undefined,
          checkable: alias ? alias.checkable : true,
          note: alias?.note,
        });
      }
      continue;
    }
    if (/^quick_models\./.test(section) && keys.model) {
      push(`${relPath} [${section}] → model`, keys.provider ? `${keys.provider}/${keys.model}` : keys.model);
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// audit

function audit(repo) {
  const piDir = join(repo, "agents/pi/.pi/agent");
  const settingsPath = join(piDir, "settings.json");
  if (!existsSync(settingsPath)) throw new Error(`not the agentfiles repo: missing ${settingsPath}`);

  const settings = readJson(settingsPath);
  const modelsPath = join(piDir, "models.json");
  const localConfig = existsSync(modelsPath) ? readJson(modelsPath) : { providers: {} };
  const storePath = join(homedir(), ".pi/agent/models-store.json");

  const catalog = loadCatalog(storePath);
  const storeMeta = loadStoreMeta(storePath);
  const catalogSet = new Set(catalog.models.map((m) => `${m.provider}/${m.id}`));
  const catalogProviders = [...new Set(catalog.models.map((m) => m.provider))].sort();

  const enabled = settings.enabledModels ?? [];
  const enabledByProvider = {};
  for (const m of enabled) {
    const p = splitRef(m).provider ?? "(bare)";
    enabledByProvider[p] = (enabledByProvider[p] ?? 0) + 1;
  }

  const skillMapPath = join(piDir, "extensions/skill-model-switch.json");
  const refs = [
    ...collectRouteRefs(repo),
    ...(settings.answer?.extractionModels ?? []).map((m) => ({
      where: "settings.json → answer.extractionModels",
      ref: `${m.provider}/${m.id}`,
    })),
    ...(settings.sessionStartModel?.model
      ? [{ where: "settings.json → sessionStartModel", ref: settings.sessionStartModel.model }]
      : []),
    ...Object.entries(existsSync(skillMapPath) ? readJson(skillMapPath) : {}).map(([skill, ref]) => ({
      where: `extensions/skill-model-switch.json → ${skill}`,
      ref,
    })),
    ...scanTomlModels(repo, "agents/zerostack/.config/zerostack/config.toml"),
  ].map((r) => {
    const { provider, id } = splitRef(r.ref);
    const checkable = r.checkable ?? true;
    const resolved =
      !checkable || (provider ? catalogSet.has(`${provider}/${id}`) : catalog.models.some((m) => m.id === id));
    return { ...r, provider, id, checkable, resolved };
  });

  // Local definitions. A provider with no catalog-store rows (omlx, local-rec) is
  // defined here by design; only a *catalog-backed* model that disagrees with its
  // catalog row is a defect.
  const localDefs = [];
  for (const [provider, entry] of Object.entries(localConfig.providers ?? {})) {
    for (const model of entry.models ?? []) {
      const key = `${provider}/${model.id}`;
      const catalogModel = storeMeta[provider]?.models?.[model.id];
      const differing = [];
      if (catalogModel) {
        for (const field of ["api", "contextWindow", "maxTokens", "reasoning", "input", "cost", "compat"]) {
          if (model[field] === undefined) continue;
          if (JSON.stringify(model[field]) !== JSON.stringify(catalogModel[field])) differing.push(field);
        }
      }
      localDefs.push({
        provider,
        id: model.id,
        resolvable: catalogSet.has(key),
        catalogBacked: Boolean(catalogModel),
        differing,
      });
    }
  }

  const overrides = [];
  for (const [provider, entry] of Object.entries(localConfig.providers ?? {})) {
    for (const [id, override] of Object.entries(entry.modelOverrides ?? {})) {
      const catalogModel = storeMeta[provider]?.models?.[id];
      const deltas = [];
      for (const field of ["input", "output", "cacheRead", "cacheWrite"]) {
        const want = override.cost?.[field];
        const have = catalogModel?.cost?.[field];
        if (want === undefined || have === undefined || want === have) continue;
        const pct = have === 0 ? null : Math.round((want / have - 1) * 100);
        deltas.push(`cost.${field} ${have} → ${want}${pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct}%)`}`);
      }
      if (override.thinkingLevelMap && catalogModel?.thinkingLevelMap) {
        for (const level of new Set([...Object.keys(override.thinkingLevelMap), ...Object.keys(catalogModel.thinkingLevelMap)])) {
          const want = override.thinkingLevelMap[level];
          const have = catalogModel.thinkingLevelMap[level];
          if (want !== undefined && want !== have) deltas.push(`thinkingLevelMap.${level} ${have === null ? "null" : have} → ${want}`);
        }
      }
      overrides.push({ provider, id, inCatalog: Boolean(catalogModel), deltas });
    }
  }

  const auth = {};
  const providersUsed = [...new Set([...enabled.map((m) => splitRef(m).provider), ...refs.map((r) => r.provider)])]
    .filter(Boolean)
    .sort();
  for (const provider of providersUsed) {
    let result;
    try {
      result = JSON.parse(
        execFileSync("pi", ["auth", "check", "--provider", provider, "--json"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 60_000,
        }),
      );
    } catch (err) {
      try {
        result = JSON.parse(err.stdout ?? "");
      } catch {
        result = { status: "error", reason: String(err.message ?? err) };
      }
    }
    if (result.status !== "ready" && API_KEY_ENV[provider] && process.env[API_KEY_ENV[provider]]) {
      result.hint = `${API_KEY_ENV[provider]} is set, yet the provider is not ready — a stale OAuth entry in ~/.pi/agent/auth.json may shadow it`;
    }
    auth[provider] = result;
  }

  const missingFromEnabled = {};
  for (const provider of catalogProviders) {
    const missing = catalog.models
      .filter((m) => m.provider === provider && !enabled.includes(`${provider}/${m.id}`))
      .map((m) => m.id);
    if (missing.length) missingFromEnabled[provider] = missing;
  }

  return {
    repo,
    catalog,
    catalogProviders,
    storeMeta,
    enabled,
    enabledByProvider,
    refs,
    localDefs,
    overrides,
    auth,
    missingFromEnabled,
  };
}

function findingsOf(a) {
  return {
    deadEnabled: a.enabled.filter((m) => !a.catalog.models.some((c) => `${c.provider}/${c.id}` === m)),
    unresolvedRefs: a.refs.filter((r) => !r.resolved),
    shadowingDefs: a.localDefs.filter((d) => d.catalogBacked && d.differing.length),
    staleOverrides: a.overrides.filter((o) => !o.inCatalog),
    notReadyProviders: Object.entries(a.auth)
      .filter(([, v]) => v.status !== "ready")
      .map(([p, v]) => `${p}: ${v.status}${v.reason ? ` (${v.reason})` : ""}`),
    catalogWarnings: a.catalog.warnings,
  };
}

// ---------------------------------------------------------------------------
// report

function report(a, opts) {
  const f = findingsOf(a);
  const L = [];

  L.push("# Model config audit", "");
  L.push(`Repo: \`${a.repo}\``);
  L.push(`Catalog: ${a.catalog.source} — ${a.catalog.models.length} models, ${a.catalogProviders.length} providers`);
  const refreshed = Object.entries(a.storeMeta)
    .filter(([, v]) => v.checkedAt)
    .map(([p, v]) => `${p} ${v.checkedAt.replace(".000Z", "Z")}`)
    .join(", ");
  if (refreshed) L.push(`Last catalog refresh: ${refreshed}`);
  if (a.catalog.degraded) L.push("**Degraded:** `pi --list-models` failed; the store was read alone.");
  L.push("");

  L.push(`## Enabled models (${a.enabled.length})`, "");
  L.push(Object.entries(a.enabledByProvider).map(([p, n]) => `- ${p}: ${n}`).join("\n"));
  L.push(
    "",
    f.deadEnabled.length ? `**Dead enabled entries:** ${f.deadEnabled.map((m) => `\`${m}\``).join(", ")}` : "Dead enabled entries: none",
    "",
  );

  L.push("## Provider auth", "");
  for (const [provider, r] of Object.entries(a.auth)) {
    const detail = r.authType ? ` (${r.authType})` : r.reason ? ` (${r.reason})` : "";
    L.push(`- \`${provider}\`: ${r.status}${detail}${r.hint ? ` — ${r.hint}` : ""}`);
  }
  L.push("");

  L.push("## References outside enabledModels", "");
  if (!a.refs.length) L.push("- none");
  for (const r of a.refs) {
    const alias = r.aliasOf ? ` (alias \`${r.aliasOf}\`)` : "";
    if (!r.checkable) L.push(`- \`${r.where}\` → \`${r.ref}\`${alias} — not catalog-verifiable: ${r.note}`);
    else L.push(`- \`${r.where}\` → \`${r.ref}\`${r.resolved ? "" : " — **UNRESOLVED**"}`);
  }
  L.push("");

  L.push("## Local model definitions in models.json", "");
  if (!a.localDefs.length) L.push("- none");
  for (const d of a.localDefs) {
    const key = `\`${d.provider}/${d.id}\``;
    if (!d.catalogBacked) L.push(`- ${key}: local-only provider definition, no catalog row to compare`);
    else if (d.differing.length) L.push(`- ${key}: **differs from catalog** in ${d.differing.join(", ")}`);
    else L.push(`- ${key}: matches catalog`);
  }
  L.push("");

  L.push("## Overrides", "");
  if (!a.overrides.length) L.push("- none");
  for (const o of a.overrides) {
    const key = `\`${o.provider}/${o.id}\``;
    if (!o.inCatalog) L.push(`- ${key}: no catalog entry — override is stale`);
    else if (!o.deltas.length) L.push(`- ${key}: matches catalog`);
    else L.push(`- ${key}: ${o.deltas.join("; ")}`);
  }
  L.push("");

  const detailProviders = opts.allProviders ? a.catalogProviders : Object.keys(a.enabledByProvider).filter((p) => p !== "(bare)");
  const missing = Object.entries(a.missingFromEnabled);
  if (missing.length) {
    L.push("## Available but not enabled", "");
    for (const [provider, ids] of missing) {
      L.push(
        detailProviders.includes(provider)
          ? `- ${provider}: ${ids.join(", ")}`
          : `- ${provider}: ${ids.length} models not enabled (detail suppressed; use --all-providers)`,
      );
    }
    L.push("");
  }

  const localOnly = a.localDefs.filter((d) => !d.catalogBacked).map((d) => `${d.provider}/${d.id}`);
  const probe = [...new Set([...f.deadEnabled, ...f.unresolvedRefs.filter((r) => r.provider).map((r) => r.ref), ...localOnly])];
  L.push("## Reachability not proven", "");
  if (!probe.length) {
    L.push("- none — every reference resolves in the catalog");
  } else {
    L.push("Catalog membership is not proof that the provider accepts the call. Probe:", "", "```bash");
    L.push(`for m in ${probe.join(" ")}; do`);
    L.push(`  printf '%-44s ' "$m"`);
    L.push(`  timeout 150 pi -p "Reply with exactly: OK" --model "$m" --no-session --no-tools 2>&1 | tail -1`);
    L.push("done", "```");
  }
  L.push("");

  const total = Object.values(f).reduce((n, v) => n + v.length, 0);
  L.push(total ? `**${total} finding(s).**` : "**No findings.**");
  return { text: L.join("\n"), findings: f };
}

// ---------------------------------------------------------------------------

try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
  } else {
    const audited = audit(opts.repo);
    if (opts.json) {
      const f = findingsOf(audited);
      console.log(JSON.stringify({ ...audited, findings: f }, null, 2));
      process.exitCode = Object.values(f).some((v) => v.length) ? 1 : 0;
    } else {
      const { text, findings } = report(audited, opts);
      console.log(text);
      process.exitCode = Object.values(findings).some((v) => v.length) ? 1 : 0;
    }
  }
} catch (err) {
  console.error(`audit-models: ${err.message}`);
  process.exitCode = 2;
}
