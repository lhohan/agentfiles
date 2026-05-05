/**
 * Removes Pi's built-in "expert coding assistant" wording from the generated
 * system prompt. See docs/pi/decisions.md (pi-026) for the rationale.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// The exact built-in prompt prefix we're looking for.
const TARGET_STRING =
  "You are an expert coding assistant operating inside pi,";

// The replacement string removes the role-based persona while preserving the rest of Pi's framing.
const REPLACEMENT_STRING = "You are operating inside pi,";

// Flag to track if we've already warned about a failed replacement
let hasWarned = false;

function removeRoleBasedPersona(prompt: string) {
  const systemPrompt = prompt.replace(TARGET_STRING, REPLACEMENT_STRING);
  return {
    systemPrompt,
    applied: systemPrompt !== prompt,
  };
}

export default function systemPromptTaskOrientedExtension(pi: ExtensionAPI) {
  // Modify the system prompt to remove role-based persona language
  pi.on("before_agent_start", async (event, ctx) => {
    // Only replace Pi's built-in prompt, never custom prompts.
    if (event.systemPromptOptions?.customPrompt) {
      return undefined;
    }

    const updated = removeRoleBasedPersona(event.systemPrompt);
    if (updated.applied) {
      return {
        systemPrompt: updated.systemPrompt,
      };
    }

    if (!hasWarned) {
      // Warn only once per session that the replacement couldn't be made
      hasWarned = true;
      console.warn(
        "\n[system-prompt-task-oriented] Warning: Could not find target string in system prompt. " +
          'The pi system prompt may have changed. Expected: "' +
          TARGET_STRING +
          '"',
      );
    }

    return undefined;
  });
}
