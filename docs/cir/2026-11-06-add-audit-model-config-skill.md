# CIR: Add a repo-local skill for auditing and repairing model configuration

## Intent

Capture the workflow used on 2026-11-06, when a catalog refresh showed that four
enabled models no longer resolved, one route ranked a provider with no credentials
first, three harness configs named withdrawn model IDs, and two model definitions
in `models.json` silently shadowed catalog metadata.

That work is periodic: catalogs gain, rename, and withdraw models continuously, and
nothing in the repository detected the drift. The need is concrete and repeating,
so it justifies a skill under the `less-is-more` gate.

## Behavior

GIVEN the repository configuration and a refreshed Pi catalog
WHEN `node .agents/skills/audit-model-config/scripts/audit-models.mjs` runs
THEN it reports dead enabled entries, unresolved route and mapping references,
provider auth status, local definitions that disagree with the catalog, and stale
overrides, without writing configuration or sending a model prompt.

GIVEN the audit reports no findings and `pi --list-models` prints no warnings
WHEN the skill's verification step runs
THEN no configuration change is warranted.

## Constraints

- The audit must stay read-only and dependency-free. It shells out only to `pi`.
- Probing costs tokens and depends on account state, region, and consent gates, so it
  stays a human-run step that the script merely generates.
- Model changes are choices, not facts. The skill must ask before altering a route,
  a default model, or an extraction list.
- Repository-local skills are never stowed; they apply to this repository only.

## Decisions

- **A script for the deterministic part, prose for the judgement.** Catalog diffs,
  reference extraction, override deltas, and auth status are mechanical, so the script
  computes them. Reachability probing, replacement choice, and consent trade-offs
  need context, so the skill documents them. Rejected scripting the probe loop
  because a failure can mean a withdrawn model, a consent gate, a region block, or a
  stale credential, each needing a different response.
- **A new skill rather than an extension of `evaluate-model-routing`.** That skill is
  explicitly recommendation-only and never mutates configuration; this one repairs
  configuration with approval. Merging them would break a stated invariant.
- **Node ESM with no dependencies**, matching the existing
  `evaluate-model-routing/scripts/evaluate.mjs` convention.
- **The script reports the probe loop instead of running it**, so the operator sees
  which models cost money before any call is made.
- **Local-only definitions (`omlx`, `local-rec`) are informative, not findings.**
  Those providers have no catalog row to contradict. Only a catalog-backed model that
  disagrees with its catalog row is a defect.
- Rejected a pure prompt-only skill: reference extraction across six files and two
  TOML dialects invites omissions, and the earlier manual pass missed the Vibe
  `[[models]]` blocks until a second look.
- Rejected a shell script: parsing JSON and TOML shapes safely in POSIX shell is worse
  than reading one Node file, and the repository already runs Node for tooling.

## Date

2026-11-06

## Supersedes

None.
