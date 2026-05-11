# Force Session Start Model

Forces the active ("default") model to a user-configured value at the start of every new session. [Source](./force-session-start-model.ts).

Use when you want a stable starting model that survives `/model` changes across sessions. Pi normally persists whichever model you last selected, so there's no built-in distinction between "preferred default" and "last used."

## Config

Add a `sessionStartModel` key to `~/.pi/agent/settings.json`:

```json
{
  "sessionStartModel": "mistral/mistral-medium-3.5"
}
```

Format: `"provider/modelId"`. If the key is absent, the extension does nothing.

## Scope

Fires on `session_start` for `"startup"` and `"new"` only. Does not fire on `"resume"`, `"fork"`, or `"reload"`.

## Limitations

- The `/` split is naive: model IDs containing `/` (e.g., OpenRouter `openai/gpt-4o`) need a provider that avoids ambiguity.
- Project-local overrides are out of scope.
- If the model can't be resolved or set, the extension warns and leaves the current model unchanged.

## Related

- [pi-028](../../../../docs/pi/decisions.md#pi-028-use-a-sessionstartmodel-setting-separate-from-pis-built-in-defaultmodel-accepted) — rationale for the separate config key.
