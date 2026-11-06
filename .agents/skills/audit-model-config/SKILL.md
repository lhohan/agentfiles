---
name: audit-model-config
description: >
  Find and fix model references that no longer work: refresh Pi's model catalogs, then audit every configured model across this repository (enabled models, prompt-template routes, extraction and skill mappings, models.json definitions and overrides, Zerostack, Vibe) against the live catalog, provider auth, and real reachability. Use when the user asks to review or update their models, when a model ID looks stale, after a provider renames or withdraws a model, when Pi prints "No models match pattern", or when a configured model fails at runtime.
---

# Audit Model Config

Answer one question: does every model this setup names actually exist and work?

This skill changes configuration. For the different question — *which* model should
run a stage — use `evaluate-model-routing`, which is recommendation-only.

## Scripts

| Path | Use |
|---|---|
| `scripts/audit-models.mjs` | Deterministic audit. Zero dependencies. Read-only, sends no prompts. Exit 0 clean, 1 findings, 2 error. |

```bash
node .agents/skills/audit-model-config/scripts/audit-models.mjs            # human report
node .agents/skills/audit-model-config/scripts/audit-models.mjs --json     # machine output
node .agents/skills/audit-model-config/scripts/audit-models.mjs --all-providers
```

The script resolves the repository from its own path. Use `--repo <path>` only for
another checkout.

## Workflow

### 1. Refresh the catalog first

```bash
pi update --models
```

A credential failure aborts the refresh for that provider only. Fix it before you
audit, or the diff is computed against a stale catalog. Read the error, do not
retry blindly.

### 2. Read the audit

Run the script. It reports: catalog age per provider, dead enabled entries,
provider auth status, every reference outside `enabledModels`, local definitions
that disagree with the catalog, overrides and their deltas, and models available
but not enabled.

Treat these as real defects:

- **Dead enabled entry** — enabled but absent from the catalog. Remove it, or
  replace it with the current ID.
- **Unresolved reference** — a route, extraction model, skill mapping, or other
  harness config names a model that does not resolve. Fix it or drop the rank.
- **Local definition differing from the catalog** — a duplicate model spec in
  `models.json` shadows catalog metadata. Keep only the fields that genuinely
  differ, as a `modelOverrides` entry.
- **Stale override** — an override key with no catalog entry. Remove it.
- **Provider not ready** — nothing on that provider can run. Check `~/.pi/agent/auth.json`
  for an OAuth entry that shadows a working API key. The audit prints a hint when
  the environment variable is set but the provider is still not ready.

### 3. Probe reachability where the catalog cannot prove it

Catalog membership is not proof that a provider accepts the call. The audit prints
a ready-to-run loop for the models that need a probe. Run it. Read the error class:

| Response | Meaning | Action |
|---|---|---|
| `OK` | Works | Nothing |
| `400 … Model is unavailable` | Withdrawn upstream | Replace or remove the reference |
| `400 … trains on request data` | Consent gate in the provider console | Ask the user before relying on it |
| `403 RegionError` | Country block | Ask the user; enable only on request |
| `OAuth refresh failed … invalid_grant` | Stale credential | Repair auth, then re-audit |
| Timeout | Endpoint down, or a local model is not running | Re-probe once, then report |

Probing costs tokens. Probe the audit's list, not the whole catalog.

### 4. Decide with the user

Never change a route or a default model silently. Ask before:

- adding models to `enabledModels`
- replacing a model in a route, extraction list, or skill mapping
- removing a reference that other configuration may still rely on

Prefer the catalog's ID over a hand-written one. Prefer a `modelOverrides` entry
over a duplicated full model spec. Prefer removing a dead reference over keeping it
"in case it returns" — a model that cannot run is worse than an absent one.

### 5. Apply

The files that hold model references in this repository:

| File | Holds |
|---|---|
| `agents/pi/.pi/agent/settings.json` | `enabledModels`, `defaultModel`, `answer.extractionModels`, optional `sessionStartModel` |
| `agents/pi/.pi/agent/prompts/**/*.md` | `model:` frontmatter, comma-separated fallback order |
| `agents/pi/.pi/agent/extensions/skill-model-switch.json` | skill → `provider/model` |
| `agents/pi/.pi/agent/models.json` | local model definitions and `modelOverrides` per provider |
| `agents/zerostack/.config/zerostack/config.toml` | `model`, `subagent_model`, `[quick_models.*]` |
| `agents/vibe/.vibe/config.toml` | `active_model`, `[[models]]`, audio and tool models |

Edit files in the repository, never the linked copies in `~/`.

When you change a model's cost metadata, also check its declared prices in other
harnesses. Zerostack and Vibe carry their own `input_token_cost` values, and a `0.0`
placeholder is not the same as a free model.

### 6. Verify

```bash
node .agents/skills/audit-model-config/scripts/audit-models.mjs   # expect "No findings."
pi --list-models | grep -c Warning                                # expect 0
mise check
```

Then probe the models you changed. Do not claim success without the probe output.

`mise verify` may fail on `verify-links` inside a sandbox that denies access to
`~/.codex`, `~/.vibe`, or `~/.config/opencode`. Report that as an environment
limit, and tell the user to re-run outside the sandbox. Do not treat it as a
regression.

### 7. Record

Write a CIR under `docs/pi/cir/` when the change replaces a model, changes a route,
or removes configuration. Include the ID that failed, the ID that replaced it, the
evidence, and the rejected alternatives. Update `README.md` only if the workflow or
commands changed.

## Traps

- `pi --list-models` validates catalog membership only. It cannot tell you whether
  a provider will accept the call, or whether the account is blocked.
- A local `models` entry in `models.json` silently freezes cost, `baseUrl`,
  `compat`, and `thinkingLevelMap`. Adding a duplicate to fix one field is a
  common mistake.
- A stale OAuth credential outranks a valid API key environment variable.
- Free models are usually free because they train on request data or are region
  limited. Say so before recommending one.
- Model IDs are renamed, not only added: a `-contributor` suffix or a date suffix
  can disappear. Diff both directions.
- Old snapshots such as `opengo-data.json` in this repository are not the catalog.
  Never audit against them.
- Route fallback lists fail open. A dead first rank looks identical to a working
  one until you read the model that actually ran.
