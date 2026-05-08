import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Force Session Start Model Extension
 *
 * Resets the active model to `sessionStartModel` from settings.json on
 * every fresh session, without colliding with Pi's own defaultModel persistence.
 *
 * Doc sync checklist (update when changing):
 * - settings key name and format
 * - session_start reason filter
 * - failure-open behaviour
 * - doc lives at force-session-start-model.md
 */

const SETTINGS_PATH = join(homedir(), ".pi", "agent", "settings.json");

function readSessionStartModel(): string | undefined {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const settings = JSON.parse(raw);
    const value = settings?.sessionStartModel;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  } catch {
    // fail open: missing, unreadable, or invalid JSON
  }
  return undefined;
}

function parseModelRef(ref: string): { provider: string; modelId: string } | undefined {
  const idx = ref.indexOf("/");
  if (idx <= 0 || idx === ref.length - 1) return undefined;
  return {
    provider: ref.slice(0, idx),
    modelId: ref.slice(idx + 1),
  };
}

export default function forceSessionStartModel(pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    // Only fire on fresh sessions, not resume/reload/fork/continue
    if (event.reason !== "startup" && event.reason !== "new") return;

    const modelRef = readSessionStartModel();
    if (!modelRef) return;

    const parsed = parseModelRef(modelRef);
    if (!parsed) {
      ctx.ui.notify(
        `[force-session-start-model] Invalid model format in sessionStartModel: "${modelRef}". Expected "provider/modelId".`,
        "warning",
      );
      return;
    }

    const model = ctx.modelRegistry.find(parsed.provider, parsed.modelId);
    if (!model) {
      ctx.ui.notify(
        `[force-session-start-model] Model not found: ${parsed.provider}/${parsed.modelId}. Check sessionStartModel in settings.json.`,
        "warning",
      );
      return;
    }

    const current = ctx.model;
    if (
      current &&
      current.provider === model.provider &&
      current.id === model.id
    ) {
      return;
    }

    try {
      await pi.setModel(model);
      ctx.ui.notify(
        `[force-session-start-model] Model set to ${parsed.provider}/${parsed.modelId}.`,
        "info",
      );
    } catch (err) {
      ctx.ui.notify(
        `[force-session-start-model] Failed to set model ${parsed.provider}/${parsed.modelId}: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    }
  });
}
