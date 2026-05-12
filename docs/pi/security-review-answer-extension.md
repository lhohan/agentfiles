# Security review: pi-answer and @siddr/pi-shared-qna

Date: 2026-05-11
Task: agf-7zl.2

## Scope and inputs
- Package: `pi-answer`
- Source: `https://github.com/sids/pi-extensions` (`answer/`)
- Version: `0.1.4`
- npm gitHead: `56b852ca9c0215a3d4c9d04bf736d8474fd4c83f`

Dependency in scope:
- Package: `@siddr/pi-shared-qna`
- Source: `https://github.com/sids/pi-extensions` (`shared/`)
- Version: `0.1.3` (resolved from `^0.1.0`)
- npm gitHead: `c3ecac31bf39f1fc1356d5839c7edd0625950fcd`

## 1) Install surface
- install method: npm package install via Pi (`pi install npm:pi-answer`)
- install-time scripts: none in either package (`preinstall/install/postinstall/prepare` absent)
- build step: none required at install (published `.ts` sources)
- shipped artifact vs source: sampled files match npm `gitHead` commits exactly

`install_path_summary`: npm package install, no lifecycle scripts, runtime execution inside Pi extension host.

`artifact_traceability`: **clear** (sampled tarball files match repository commits from npm metadata).

## 2) High-signal files inspected
- `pi-answer@0.1.4`: `package.json`, `index.ts`, `qna-adapter.ts`, `utils.ts`, tests, README, changelog
- `@siddr/pi-shared-qna@0.1.3`: `package.json`, `qna-tui.ts`, `session-editor-component.ts`, README, changelog
- npm metadata (`npm view`) and tarball manifests (`npm pack --dry-run`)

## 3) Dangerous capability scan
### pi-answer
- `fs.readFile` on:
  - global agent settings (`<agentDir>/settings.json`)
  - project settings (`<cwd>/.pi/settings.json`)
  - classification: **required/justified**
- network LLM call via `complete(...)` using selected provider model:
  - sends last assistant message text for extraction
  - classification: **required/justified**
- `pi.sendMessage(...)` and `pi.appendEntry(...)` (draft persistence to session log)
  - classification: **required/justified**
- No shell execution, no `child_process`, no eval/dynamic code execution found.

### @siddr/pi-shared-qna
- `createRequire(...)` + fallback require from `~/.bun/install/global/node_modules/@mariozechner/pi-tui`
  - classification: **justified** (compat fallback), but increases local integrity dependence
- No network calls, no shell execution, no eval found.

## 4) Lifecycle script audit
- `pi-answer`: no lifecycle scripts
- `@siddr/pi-shared-qna`: no lifecycle scripts

Risk impact from install scripts: **none observed**.

## 5) Dependency risk
- `pi-answer` direct deps: 1 (`@siddr/pi-shared-qna@^0.1.0`)
- `@siddr/pi-shared-qna` direct deps: 0
- both rely on peer deps from Pi runtime (`@mariozechner/*`)

Key risk:
- dependency range is loose (`^0.1.0`), so transitive resolution can drift

## 6) Maintainer/repo trust signals
- single maintainer identity across npm and repo (`siddr` / `sids.reddy@gmail.com`)
- consistent commit activity
- package changelogs present
- no GitHub releases/tags used for signed release attestations

Trust caveats:
- single-maintainer bus factor
- no signed tags/verified release process evidence in review scope

## 7) Network and exfiltration model
- outbound path: model provider API selected in Pi model registry
- data sent: last assistant message text (for question extraction), plus prompt
- no evidence of hidden telemetry or extra outbound endpoints

Exfiltration assessment: **bounded but real** (normal for LLM extension). Do not use with sensitive content unless acceptable for configured provider.

## 8) Execution capability / blast radius
The extension can:
- read Pi session branch history (assistant messages)
- read two settings files (`agent settings`, `.pi/settings.json`)
- write session custom entries (draft state)
- send a user-visible message and trigger a turn

It cannot (from reviewed code):
- execute shell commands
- install/run arbitrary binaries
- arbitrarily read workspace files beyond explicit settings paths
- dynamically fetch and execute remote code

## 9) Reproducibility and integrity
- npm tarballs are integrity-hashed (sha512)
- no package lock in published package context
- `pi-answer` dependency is not fully pinned (`^0.1.0`)
- sampled source/artifact match at npm `gitHead`

Integrity assessment: good source traceability, but full reproducibility is **partial** due to loose dependency range.

## 10) Verdict
### Summary
- Package: `pi-answer`
- Source: `https://github.com/sids/pi-extensions/tree/main/answer`
- Version: `0.1.4`
- Risk: **Medium**

### Key findings (top 3 risk drivers)
1. Runtime network exfil path to configured LLM provider (expected, but real).
2. Dependency drift risk from `@siddr/pi-shared-qna@^0.1.0` (not fully pinned).
3. Local-module fallback require path in shared package increases integrity dependence on local global Bun modules.

### Red flags
- No lifecycle-script red flags.
- No shell/eval/remote-code-loading found.
- Main red flag is version drift + local fallback module loading behavior.

### Positive signals
- No install-time scripts.
- Small dependency tree.
- Source artifacts match npm gitHead for sampled files.
- Clear, readable TypeScript code with tests in `pi-answer`.

### Unknowns
- No signed release/tag attestation workflow verified.
- Did not exhaustively diff every published file against source commit (sampled critical files matched).

### Recommended usage
- Safe install method:
  1. `npm pack pi-answer@0.1.4 --dry-run` (inspect files)
  2. Install pinned: `pi install npm:pi-answer@0.1.4`
- Isolation needed: **yes** (normal least-privilege/no-secrets environment for first trial)
- Pin version or commit: **yes** (pin package version; monitor `@siddr/pi-shared-qna` updates)

## Proceed / no-proceed recommendation
Proceed with a **limited trial** of `pi-answer@0.1.4` under normal extension sandbox assumptions, with:
- pinned package version,
- no sensitive content in initial trials,
- explicit rollback plan (`pi uninstall pi-answer`).
