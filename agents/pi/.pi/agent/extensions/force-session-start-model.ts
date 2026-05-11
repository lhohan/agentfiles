import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Force Session Start Model Extension
 *
 * Resets the active model and thinking level to `sessionStartModel` from settings.json on
 * every fresh session, without colliding with Pi's own defaultModel persistence.
 *
 * Settings format:
 * { "model": "provider/model-id", "thinkingLevel": "off|minimal|low|medium|high|xhigh" }
 *
 * Doc sync checklist (update when changing):
 * - settings key name and format
 * - session_start reason filter
 * - failure-open behaviour
 * - doc lives at force-session-start-model.md
 */

const SETTINGS_PATH = join(homedir(), ".pi", "agent", "settings.json");
const VALID_THINKING_LEVELS = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const);

type ThinkingLevel =
  typeof VALID_THINKING_LEVELS extends Set<infer T> ? T : never;

interface SessionStartModelConfig {
  model: string;
  thinkingLevel?: unknown;
}

function readSessionStartModel(): SessionStartModelConfig | undefined {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const settings = JSON.parse(raw);
    const value = settings?.sessionStartModel;

    if (!value) return undefined;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const config = value as Record<string, unknown>;
      if (typeof config.model === "string" && config.model.trim().length > 0) {
        return {
          model: config.model.trim(),
          thinkingLevel: config.thinkingLevel,
        };
      }
    }
  } catch {
    // fail open: missing, unreadable, or invalid JSON
  }
  return undefined;
}

function parseModelRef(
  ref: string,
): { provider: string; modelId: string } | undefined {
  const idx = ref.indexOf("/");
  if (idx <= 0 || idx === ref.length - 1) return undefined;
  return {
    provider: ref.slice(0, idx),
    modelId: ref.slice(idx + 1),
  };
}

function isValidThinkingLevel(
  level: string | undefined,
): level is ThinkingLevel {
  return (
    level !== undefined && VALID_THINKING_LEVELS.has(level as ThinkingLevel)
  );
}

function parseConfig<TModel>(
  config: SessionStartModelConfig,
  ctx: {
    modelRegistry: {
      find: (provider: string, modelId: string) => TModel | undefined;
    };
  },
):
  | {
      model: TModel;
      thinkingLevel: ThinkingLevel | undefined;
    }
  | { message: string } {
  const modelRef = config.model;
  const maybeThinkingLevel = config.thinkingLevel;

  const parsed = parseModelRef(modelRef);
  if (!parsed) {
    return {
      message: `[force-session-start-model] Invalid model format in sessionStartModel: "${modelRef}". Expected "provider/modelId".`,
    };
  }

  const model = ctx.modelRegistry.find(parsed.provider, parsed.modelId);
  if (!model) {
    return {
      message: `[force-session-start-model] Model not found: ${parsed.provider}/${parsed.modelId}. Check sessionStartModel in settings.json.`,
    };
  }

  let thinkingLevel: ThinkingLevel | undefined;
  if (maybeThinkingLevel !== undefined) {
    if (
      typeof maybeThinkingLevel !== "string" ||
      !isValidThinkingLevel(maybeThinkingLevel)
    ) {
      return {
        message: `[force-session-start-model] Invalid thinking level: "${String(maybeThinkingLevel)}". Valid values: ${Array.from(VALID_THINKING_LEVELS).join(", ")}.`,
      };
    }
    thinkingLevel = maybeThinkingLevel;
  }

  return {
    model,
    thinkingLevel,
  };
}

export default function forceSessionStartModel(pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    // Only fire on fresh sessions, not resume/reload/fork/continue
    if (event.reason !== "startup" && event.reason !== "new") return;

    const config = readSessionStartModel();
    if (!config) return;

    const parseResult = parseConfig(config, ctx);
    if ("message" in parseResult) {
      ctx.ui.notify(parseResult.message, "warning");
      return;
    }

    const { model, thinkingLevel } = parseResult;

    // If nothing needs to change, return early
    const current = ctx.model;
    const needsModelChange =
      !current ||
      current.provider !== model.provider ||
      current.id !== model.id;

    const currentThinkingLevel = pi.getThinkingLevel();
    const needsThinkingChange =
      thinkingLevel !== undefined && thinkingLevel !== currentThinkingLevel;

    if (!needsModelChange && !needsThinkingChange) return;

    // apply changes
    try {
      if (needsModelChange) {
        await pi.setModel(model);
      }

      if (needsThinkingChange) {
        await pi.setThinkingLevel(thinkingLevel);
      }

      let message = `[force-session-start-model] Model set to ${model.provider}/${model.id}.`;
      if (isValidThinkingLevel(thinkingLevel)) {
        message += ` Thinking level set to "${thinkingLevel}".`;
      }
      ctx.ui.notify(message, "info");
    } catch (err) {
      ctx.ui.notify(
        `[force-session-start-model] Failed to apply session start settings: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    }
  });
}
