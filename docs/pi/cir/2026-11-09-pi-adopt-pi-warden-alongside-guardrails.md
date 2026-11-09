# CIR: Adopt `pi-warden` Alongside Guardrails to Strengthen Security

## Intent

Strengthen this repository's agent security posture by adding the third-party Pi package `pi-warden` on top of the existing layers (`guardrails` extension, Safehouse containment, sandbox EPERM halt), and manage it the same way as the other third-party packages: a pinned entry in the stowed `agents/pi/.pi/agent/settings.json`.

The primary goal is security. Post-hoc correction of a sloppy agent turn is secondary.

## Behavior

GIVEN a Pi session starts with this repository's settings stowed at `~/.pi/agent/settings.json`
WHEN Pi loads configured packages
THEN `pi-warden` loads at the pinned version, together with `guardrails`, and neither package disables the other

GIVEN a bash, write, or edit call that matches a destructive offline pattern (force push, `reset --hard`, recursive delete outside scratch, `DROP`)
WHEN the call is about to run
THEN `pi-warden` holds it before execution, independent of any `guardrails` rule and without needing an API key

GIVEN no TypeSafe key is configured
WHEN a guarded call is judged
THEN only local pattern checks run and no request leaves the machine

GIVEN a TypeSafe key is configured and `/warden enable` has run
WHEN guarded calls, user requests, and rules files are judged
THEN redacted samples are sent to `api.typesafe.ai` as described by the extension's own `disclosure` string

GIVEN a later decision is needed between coexisting and replacing
WHEN evidence from real use is available
THEN the decision is recorded as a new CIR that supersedes this one, not by silently uninstalling a layer

## Constraints

- **Pinned version, reviewed before bump.** `npm:pi-warden@2.7.0` is pinned per the precedent of decision `pi-003` (pin `pi-web-access` to a reviewed release). Bumping the version requires a fresh review; the package published 60 releases in about seven weeks.
- **Review evidence is per version.** The review for 2.7.0 verified the shipped tarball by rebuilding `dist/` from tag `v2.7.0` source and diffing it byte-for-byte (135 files, 0 differences). That check does not transfer to later versions.
- **Egress is accepted, not eliminated.** With a key enabled, redacted code, prompts, and rules-file content leave the machine to a third party. Redaction is regex-based and best-effort. Do not enable the key in projects where that egress is unacceptable.
- **Coexistence is provisional.** Do not remove `guardrails` or the sandbox EPERM halt while both layers run. Removing a layer needs evidence, not preference.
- **Not containment.** `pi-warden` runs inside the harness with the agent's permissions. It is a guard, not a sandbox; containment stays with Safehouse.
- **Host compatibility is unverified.** `pi-warden` declares peers `>=0.85.1 <2` while `pi-typesafe` declares `<1`; both were only smoke-tested against Pi-Bolt 1.5.0.

## Decisions

- **Coexist with `guardrails` for now** because the two cover different windows (`guardrails` is opt-in configured pre-execution command regex; `pi-warden` adds an always-on destructive floor plus judged holds) and there is no measured evidence yet that either is redundant.
- **Manage it in this repo, not globally** because `~/.pi/agent/settings.json` is a stow symlink into `agents/pi/.pi/agent/settings.json`, so a "global" install would either write into the repo anyway or diverge from it.
- **Treat it as an external package, not a local extension** because it is third-party and upstream-maintained; forking or vendoring would take on the review and update burden that pinning avoids.
- **Trial before pinning** using `pi-bolt -e npm:pi-warden@2.7.0`, which loads the package for one invocation without adding it to settings.
- **Start without a key** so the first weeks exercise only the offline patterns and no data leaves the machine.
- Rejected **replacing `guardrails` immediately** because no real-use evidence exists, and a guard that appeared redundant in a review may still catch commands the other misses.
- Rejected **installing the git source or an unpinned npm spec** because both move without a review, defeating the purpose of the security review.
- Rejected **writing a local wrapper extension around `pi-warden`** because it would duplicate enforcement logic and add a maintenance surface with no security gain.

## Date

2026-11-09

## Supersedes

None. This CIR adds a package; it does not replace or supersede any prior decision. Decision `pi-003` remains the standing pinning policy this record follows.
