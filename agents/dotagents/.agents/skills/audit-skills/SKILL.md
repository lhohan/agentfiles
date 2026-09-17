---
name: audit-skills
description: >
  Audit the health of all skills and AGENTS.md files across all configured
  locations. Discovers the skills fleet-wide, flags contradictions between
  files, files over 200 lines, and placement errors where narrow rules sit in
  always-loaded files. Use when reviewing skill fleet health, before adding a
  new skill, or when agent instructions seem to conflict.
---

# Audit Skills

Audit the entire fleet of skills and AGENTS.md files across all locations.
Read-only: produces a report, does not edit files.

## When to use

- Before adding a new skill (check for existing overlap first).
- When agent instructions seem to conflict or contradict.
- Periodically, to keep the fleet healthy.
- When you suspect skills have grown too large or too numerous.

## When NOT to use

- Evaluating a single skill's quality — use `evaluate-skills`.
- Creating a new skill — use `skill-creator` or `writing-skills`.
- Importing an external skill — use `import-skill`.
- Writing an AGENTS.md from scratch — use `write-agents-files`.

## Step 1: Discover

Scan all configured skill locations and build a complete inventory.

### Locations to scan

Check each of these paths. Skip any that do not exist:

1. `~/.agents/skills/` — personal agent skills (stowed from agentfiles repo)
2. `~/.vibe/skills/` — Vibe built-in skills
3. `~/dotfiles/agentsfiles/shared/skills/` — dotfiles shared skills
4. `~/dev/agentfiles/.agents/skills/` — agentfiles repo skills
5. `~/dev/agent-chisels/agentfiles/shared/skills/` — agent-chisels skills
6. Any superpowers skills collection (look for `superpowers/skills/`)

Also find all `AGENTS.md` files:

```bash
find ~ -maxdepth 5 -name "AGENTS.md" -not -path "*/node_modules/*" 2>/dev/null
```

For each skill, record: name (frontmatter), location, lines (`wc -l`), description (first 80 chars).
For each AGENTS.md, record: path, lines, always-loaded? (root = yes, nested = no).

## Step 2: Size check

Flag any SKILL.md or AGENTS.md over 200 lines.

Report each flagged file with:

```
[OVER 200] path/to/SKILL.md (N lines)
```

200 lines is a fleet-health warning flag, not a creation constraint. Other
skills use different thresholds for different purposes:
- `evaluate-skills` uses 500 lines as a per-skill hard maximum.
- `write-agents-files` targets ~100 lines for AGENTS.md (authoring target,
  not a backstop).
- `writing-skills` uses word counts (<200 words for frequently-loaded).
A skill between 200-500 lines is not failing evaluation but will appear in
the fleet report as a candidate for splitting. Line count and word count
measure different things; a skill can pass one and fail the other. Check both.

## Step 3: Contradiction detection

Compare instructions across all discovered files for conflicting rules.

### What counts as a contradiction

- Two skills give opposite guidance for the same situation.
- A skill and an AGENTS.md disagree on a workflow rule.
- Two AGENTS.md files (at different levels) give conflicting instructions.

### How to detect

1. Extract rule-like statements from each file (imperative sentences: "always
   X", "never Y", "use Z when...").
2. Group by topic (testing, commits, VCS, sandboxing, etc.).
3. Within each topic group, flag pairs that disagree.

### Report format

```
[CONTRADICTION] Topic: <topic>
  File A: path/to/file-a.md — "always write tests first"
  File B: path/to/file-b.md — "write tests after implementation for simple cases"
  Note: <brief explanation of the conflict>
```

Rationale: "Contradictions cost more than length. Two rules that disagree tax
every run, forever, in reasoning quality you never see itemized."

## Step 4: Placement audit

Flag narrow rules that sit in always-loaded files where they do not belong.

### What counts as a placement error

- A rule specific to one tool (e.g. jj, Pi, Nix) in a root AGENTS.md that all
  agents read.
- A project-specific convention in a shared/global skills file.
- A narrow edge case in a file that loads into every session.

### How to detect

1. Identify always-loaded files: root AGENTS.md files, skills with
   `disable-model-invocation: false` or no such flag.
2. For each, check whether it contains narrow, context-specific rules.
3. Flag rules that would be irrelevant or confusing in a different project or
   agent context.

### Report format

```
[MISPLACED] path/to/AGENTS.md
  Rule: "always use jj abandon instead of git reset"
  Problem: narrow jj-specific rule in a root AGENTS.md read by all agents
  Suggestion: move to a jj-specific skill or a project-level AGENTS.md
```

Rationale: "Placement is most of the problem. Most contradictions start as
routing errors — something narrow got promoted into the always-loaded file."

## Step 5: Deletion discipline

When the audit suggests removing or consolidating a file or instruction,
require evidence before recommending deletion.

### Evidence required

- The instruction has not been triggered or referenced in recent sessions.
- The instruction conflicts with a newer one (cite both).
- The instruction is duplicated elsewhere (cite the duplicate).

### Report format

```
[DELETE CANDIDATE] path/to/file.md
  Reason: <evidence-based reason>
  Evidence: <what was checked>
  Risk: low | medium | high
```

Rationale: "Deletion must earn its case. An instruction that's been working
stays until YOUR evidence says otherwise."

## Step 6: Fleet health report

Produce a summary report with these sections:

### Summary

```
Skills audit report — <date>
Locations scanned: N | Skills found: N | AGENTS.md files: N
Files over 200 lines: N | Contradictions: N | Placement errors: N | Deletion candidates: N
```

### Inventory table

| Name | Location | Lines | Notes |
|---|---|---|---|

### Issues by severity

1. **Critical** — contradictions that cause agent confusion
2. **Warning** — files over 200 lines, placement errors
3. **Info** — deletion candidates, overlap notes

### Overlap notes

Flag skills that cover similar ground. Do not recommend deletion — just note
the overlap so the user can decide.

## Guardrails

- Read-only. Do not edit, move, or delete any file.
- Do not create new skills to fix gaps — that is the user's decision.
- Do not evaluate single-skill quality — that is `evaluate-skills`.
- Cite the file path and line for every finding.
- When in doubt, report the observation and let the user decide.
