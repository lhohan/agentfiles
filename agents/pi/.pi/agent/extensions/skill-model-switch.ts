import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Skill Model Switch Extension
 *
 * Intercepts explicit `/skill:<name>` commands before skill expansion
 * and switches to a configured model when a mapping exists.
 *
 * Doc sync checklist (update docs when changing):
 * - config file path and format
 * - failure-open behaviour
 * - scope limit to explicit `/skill:name`
 * - persistence caveat from pi.setModel()
 */

const CONFIG_PATH = join(dirname(__filename), "skill-model-switch.json");

/** Load and validate the skill-to-model mapping file. Fails open. */
export function loadMapping(path: string): Record<string, string> | undefined {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // fail open: missing, unreadable, invalid JSON, or non-object
  }
  return undefined;
}

/** Extract the skill name from an explicit `/skill:<name>` command. */
export function extractSkillName(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/skill:")) return undefined;
  const parts = trimmed.split(/\s+/);
  const name = parts[0].slice("/skill:".length);
  return name || undefined;
}

/** Split a provider/model-id reference into its parts. */
export function parseModelRef(ref: string): { provider: string; modelId: string } | undefined {
  const idx = ref.indexOf("/");
  if (idx <= 0 || idx === ref.length - 1) return undefined;
  return {
    provider: ref.slice(0, idx),
    modelId: ref.slice(idx + 1),
  };
}

export default function skillModelSwitchExtension(pi: ExtensionAPI) {
  pi.on("input", async (event, ctx) => {
    const skillName = extractSkillName(event.text);
    if (!skillName) return { action: "continue" as const };

    const mapping = loadMapping(CONFIG_PATH);
    if (!mapping) return { action: "continue" as const };

    const modelRef = mapping[skillName];
    if (!modelRef) return { action: "continue" as const };

    const parsed = parseModelRef(modelRef);
    if (!parsed) return { action: "continue" as const };

    try {
      const model = ctx.modelRegistry.find(parsed.provider, parsed.modelId);
      if (!model) return { action: "continue" as const };

      const current = ctx.model;
      if (
        current &&
        current.provider === model.provider &&
        current.id === model.id
      ) {
        return { action: "continue" as const };
      }

      await pi.setModel(model);
    } catch {
      // fail open: do not break skill execution
    }

    return { action: "continue" as const };
  });
}
