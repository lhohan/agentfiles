# Force Session Start Model

Forces the active ("default") model and thinking level to user-configured values at the start of every new session. [Source](./force-session-start-model.ts).

Use when you want a stable starting model and thinking level that survives `/model` and `/thinking` changes across sessions. Pi normally persists whichever model and thinking level you last selected, so there's no built-in distinction between "preferred default" and "last used."

## Config

Add a `sessionStartModel` key to `~/.pi/agent/settings.json`:

```json
{
  "sessionStartModel": {
    "model": "mistral/mistral-medium-3.5",
    "thinkingLevel": "medium"
  }
}
```

**Settings:**
- `model` (required): Format `"provider/modelId"`
- `thinkingLevel` (optional): One of `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`

If the key is absent or `model` is not provided, the extension does nothing.

## Scope

Fires on `session_start` for `"startup"` and `"new"` only. Does not fire on `"resume"`, `"fork"`, or `"reload"`.

## Limitations

- The `/` split is naive: model IDs containing `/` (e.g., OpenRouter `openai/gpt-4o`) need a provider that avoids ambiguity.
- Project-local overrides are out of scope.
- If the model can't be resolved or set, the extension warns and leaves the current model unchanged.
- If the thinking level is invalid, the extension warns and does not apply any changes.
- Thinking level changes are applied after model changes.

## Related

- [pi-028](../../../../../docs/pi/decisions.md#pi-028-use-a-sessionstartmodel-setting-separate-from-pis-built-in-defaultmodel-accepted) — rationale for the separate config key.
