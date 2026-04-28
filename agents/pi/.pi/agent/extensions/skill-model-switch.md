# Skill Model Switch

Intercepts explicit `/skill:<name>` commands before skill expansion and switches to a configured model when a mapping exists.

## Scope

- Only explicit `/skill:<name>` invocations are inspected.
- Prompt templates (`/template`) and extension commands (`/cmd`) are not affected.

## Config file

Create `skill-model-switch.json` next to this extension file (e.g. `~/.pi/agent/extensions/skill-model-switch.json`):

```json
{
  "code-review": "openai-codex/gpt-5.4",
  "grill-me": "opencode-go/deepseek-v4-pro"
}
```

Format: flat object where keys are exact skill names and values are exact `provider/model-id` strings.

- The extension is tolerant of a missing config file.
- Invalid JSON or non-object values are treated as "no mapping" and do not break execution.

## Behaviour

1. When raw input starts with `/skill:<name>`, the extension loads the JSON mapping.
2. If the skill name has an exact match, the mapped `provider/model-id` is resolved through Pi's model registry.
3. If the model resolves and differs from the current model, `pi.setModel()` switches to it.
4. Normal skill expansion continues regardless of whether a switch occurred.

## Failure-open guarantees

- Missing or invalid config → current model unchanged, skill executes normally.
- Unmapped skill → current model unchanged, skill executes normally.
- Mapped model does not resolve → current model unchanged, skill executes normally.
- Model switch throws → current model unchanged, skill executes normally.

## Persistence caveat

**`pi.setModel()` changes the active model for the current Pi session. There is no automatic restoration after the skill run completes. The switch persists until the user manually changes the model or starts a new session.**
