# Force Session Start Model

Resets the active model to a user-configured value (`sessionStartModel` in `settings.json`) at the start of every new session.

Pi's `/model` selector immediately persists the chosen model as `defaultModel`/`defaultProvider` in `settings.json`, so the last-used model always becomes the next session's starting model. There is no built-in distinction between desired default and last-used.

This extension uses a separate config key (`sessionStartModel`) to avoid colliding with Pi's own `defaultModel` persistence.

## Scope

- Fires on `session_start` for reasons `"startup"` and `"new"` only.
- Does NOT fire on `"resume"`, `"fork"`, `"reload"`, or `"continue"` — those restore model from session state or are not fresh-session starts.

## Config key

Add to `~/.pi/agent/settings.json`:

```json
{
  "sessionStartModel": "opencode-go/deepseek-v4-pro"
}
```

Format: `"provider/modelId"` as a single string.

- If the key is absent, the extension does nothing.
- If the key is present but the model is not found or has no API key configured, the extension warns and leaves the current model unchanged.

## Behaviour

1. On `session_start` with reason `"startup"` or `"new"`, reads `sessionStartModel` from `settings.json`.
2. If absent or empty, exits silently (no-op).
3. Splits the value on the first `/` into provider and model ID.
4. Resolves the model through Pi's model registry.
5. If found: calls `pi.setModel()` and notifies success.
6. If not found: notifies a warning, model unchanged.

## Failure-open guarantees

- Missing config key → no-op, model unchanged.
- Invalid format (no `/` or empty parts) → warning, model unchanged.
- Model not found in registry → warning, model unchanged.
- `pi.setModel()` throws → warning, model unchanged.

## Limitations

- The `/` split is naive: a model ID containing `/` (e.g., OpenRouter `openai/gpt-4o`) requires the user to pick a provider that avoids ambiguity in the split. This is accepted as a user-responsibility trade-off.
- Project-local overrides are out of scope for v1.

## Related decisions

- `pi-028` in `docs/pi/decisions.md` — rationale for using a separate config key.
