# CIR: Remove deprecated and unreachable models, repair the persona-prompt anchor

## Intent

After a catalog refresh, probe the configured models rather than trusting catalog
membership, and drop every enabled model the provider actually refuses. The same
pass repaired the pi-026 persona extension, which had silently stopped matching
Pi's rewritten built-in prompt.

Trigger: a probe sweep of all 47 enabled models found two models withdrawn
upstream (`410 ModelDeprecated`), one blocked by country, three behind a
train-on-data consent gate, and two refused for missing credits.

## Behavior

GIVEN Pi starts with the repository configuration
WHEN the model selector is built
THEN every enabled model can answer a one-word prompt from the current account
and network location.

GIVEN Zerostack resolves `[quick_models.smart-latest]`
WHEN it sends a request
THEN it names a model the `opencode-go` endpoint still serves.

GIVEN a session starts with Pi's built-in system prompt
WHEN the persona extension runs
THEN the role wording is removed and no "Could not find target string" warning is
printed.

## Constraints

- Catalog membership is not reachability. `pi --list-models` still lists
  `opencode-go/mimo-v2.5` and `mimo-v2.5-pro` while the endpoint answers
  `410 ModelDeprecated` for both. Only a live call distinguishes the two states.
- The `openai` account is not uniformly funded: `gpt-6-luna` answers, while
  `gpt-6.1-sol` and `gpt-6.1-terra` return "You have no credits remaining". A
  working OpenAI model is no evidence that its siblings are usable.
- `*-contributor*` and other free IDs fail closed behind a per-account console
  toggle ("Allow paid endpoints that train on request data"). Until the toggle is
  set they return `400`, and enabling consent also means the requests train on
  user data. `opencode-go/crouton-alpha-free` and
  `opencode-go/iceman-contributor-free` stay enabled despite this, on explicit user
  request, and are expected to fail when called.
- **No Muse model may be enabled in any provider.** Stated as a standing user
  preference, so `muse-spark-1.2`, `muse-spark-1.3`,
  `muse-spark-1.2-contributor`, `muse-spark-1.3-contributor`,
  `muse-spark-open`, and their `openrouter/meta/*` equivalents stay absent from
  `enabledModels` even when a catalog refresh lists them as available.
- The persona extension stays a strict-anchor rewrite (pi-026): it matches one
  literal sentence and warns once when that sentence is gone. It is deliberately
  not a tolerant regex, so a future Pi prompt rewrite announces itself in the
  console instead of silently changing behaviour.

## Decisions

- **Removed `opencode-go/mimo-v2.5` and `opencode-go/mimo-v2.5-pro` from
  `enabledModels`.** Both return `410 ModelDeprecated`; the provider names
  `mimo-v2.6-flash` and `mimo-v2.6-pro` as successors. No replacement entry was
  added because both successors were already enabled, so a swap would have created
  duplicates. Cost is unchanged either way ($0.14/$0.28 and $0.435/$0.87).
- **Kept `opencode-go/crouton-alpha-free` and
  `opencode-go/iceman-contributor-free` enabled on explicit user request**, knowing
  both refuse every call from this location. This reverses their earlier removal in
  the same sweep and restores the arrangement the previous CIR recorded.
- **Removed `opencode-go/muse-spark-1.2-contributor` and
  `opencode-go/muse-spark-1.3-contributor` permanently.** The user rejects Muse
  outright, so these are not candidates for re-enabling even if the training-consent
  gate is later switched on.
- **Moved the `review` and `review-plan` routes from `mistral/zai-glm-5-2` to
  `mistral/zai-glm-5-3`**, matching the enabled model and Vibe's `review` entry.
  `zai-glm-5-2` was enabled nowhere and served only as a route target.
- **Moved the `run-stage-plan` fallback rank from `mistral/zai-glm-5-2` to
  `mistral/zai-glm-5-3`**, leaving the primary `opencode-go/glm-5.3` untouched.
  No reference to `mistral/zai-glm-5-2` remains in any configuration file.
- **Repointed Zerostack `[quick_models.smart-latest]` from `mimo-v2.5-pro` to
  `mimo-v2.6-pro`**, leaving the declared 0.435/0.87 cost metadata untouched
  because the catalog reports identical prices for both.
- **Updated the persona extension anchor** from
  `You are an expert coding assistant operating inside ` to
  `You are a coding assistant running inside pi, a coding agent harness.`, with
  the replacement `You are running inside pi, a coding agent harness.` Pi 1.5.0
  rewrote its prompt opening, so the old anchor never matched and pi-026 had been
  inactive since that release. Verified by a run that no longer prints the warning.
  Rejected loosening the anchor to a pattern that survives rewrites: the decision
  record treats the warning as the intended tripwire.
- **Restored `openai/gpt-6.1-sol` and `openai/gpt-6.1-terra` to `enabledModels` on
  explicit user request**, knowing both return "no credits remaining". Rejected
  treating an unfunded model as a defect: visibility in the selector was the user's
  stated preference. No route, default, or extraction list names them, so the
  breakage is limited to a manual selection.

## Notes

Probes used `pi -p "Reply with exactly: OK" --model <id> --no-session --no-tools`.
All eight local models (`omlx/*`, `local-rec/flint`), all four `mistral` entries,
every prompt-route model (`deepseek-v4.1-flash`, `glm-5.3`, `hy3`, `gpt-5.6-luna`,
`zai-glm-5-3`), and `openrouter/cohere/north-mini-code:free` answered `OK`.

Every prompt route now names either `opencode-go` or `mistral/zai-glm-5-3`.

`openai-codex` and `google` remain unauthenticated with no enabled models, so
nothing can call them.

## Date

2026-11-06

## Supersedes

None. The Muse removal is a new constraint; the retention of
`opencode-go/crouton-alpha-free` and `opencode-go/iceman-contributor-free` keeps the
arrangement recorded in
`docs/pi/cir/2026-11-06-pi-model-catalog-sync-and-stale-model-replacement.md`.
