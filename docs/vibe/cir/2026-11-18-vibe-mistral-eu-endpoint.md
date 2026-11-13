# CIR: Route Vibe's Mistral provider through the EU endpoint

## Intent

Vibe called `https://api.mistral.ai/v1` while Pi called `https://api.eu.mistral.ai`
with a ×1.1 cost uplift. That left two harnesses disagreeing about the same
provider, and left Vibe outside the data-residency decision recorded in
`docs/pi/cir/2026-08-15-mistral-eu-endpoint.md`. Point Vibe at the EU endpoint and
price it the same way Pi prices it.

## Behavior

GIVEN `agents/vibe/.vibe/config.toml` defines provider `mistral`
WHEN Vibe sends any chat request
THEN the request goes to `https://api.eu.mistral.ai/v1`.

GIVEN a model entry carries `input_price`, `output_price`, or `cached_input_price`
WHEN Vibe reports cost
THEN the price is the EU list price, not the standard list price.

## Constraints

- The EU endpoint accepts the model IDs Vibe names. Verified against the live API
  on 2026-11-18: `mistral-large-4` and `zai-glm-5-3` both answered on
  `api.eu.mistral.ai/v1` with the existing `MISTRAL_API_KEY`.
- `MISTRAL_API_KEY` works on both hosts, so no credential change is needed.
- Vibe's `backend = "mistral"` was not exercised end to end. `vibe -p` fails in
  this sandbox with `initialize failed: app-server closed`, before and after the
  change, so the evidence above comes from direct API calls, not from a Vibe run.
- `[[transcribe_providers]]` (`wss://api.mistral.ai`) and `[[tts_providers]]`
  (`https://api.mistral.ai`) stay on the standard host. Whether the EU host serves
  the Voxtral realtime and TTS sockets is unverified, and voice mode has no
  scriptable probe here. Voice traffic therefore remains outside the EU endpoint.
- `browser_auth_base_url` and `browser_auth_api_base_url` stay on
  `console.mistral.ai`; they are console endpoints, not inference.

## Decisions

- **Moved the `mistral` provider `api_base` to `https://api.eu.mistral.ai/v1`.**
  Rejected keeping the standard host: it would preserve the split between the two
  harnesses and contradict the EU-residency intent.
- **Uplifted prices by 1.1×** to match the regional rate: `mistral-large-4`
  0.68/2.09 → 0.77/2.31, `zai-glm-5-3` 1.4/4.4/0.14 → 1.54/4.84/0.154. The values
  now equal the Pi `modelOverrides` for the same models.
- **Left the Voxtral audio endpoints unchanged.** Changing them without a probe
  would trade a known-working voice path for an unverified one.
- **Did not remove the explicit price fields.** Vibe's fallback behaviour when they
  are absent is untested, and a wrong price is worse than a maintained one.

## Notes

Verification: `python3 -m tomllib` parses the edited `config.toml`, `mise check vibe`
plans the package with no conflict, and direct calls to `api.eu.mistral.ai/v1`
returned content for both model IDs. End-to-end Vibe verification is blocked by
the sandbox and should be re-run outside it.
