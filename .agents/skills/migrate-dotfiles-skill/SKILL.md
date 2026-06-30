---
name: migrate-dotfiles-skill
description: Move a skill from ~/dotfiles into this repo under agents/dotagents/ and stow it. Use when the user asks to move, migrate, or bring a skill from dotfiles into the agentfiles repository.
---

# Migrate a Skill from Dotfiles

## Trigger Conditions

Use this skill when the user asks to:
- Move, migrate, copy, or bring a skill from `~/dotfiles` into this repo
- "Pull in" a skill from dotfiles to agentfiles
- Any phrasing that involves a skill currently at `~/dotfiles/agentsfiles/shared/skills/<name>/` being relocated into `agents/dotagents/.agents/skills/<name>/`

## Migration Checklist

Execute in order. Do not skip verification.

### 1. Remove the old symlink

Dotfiles skills are typically installed as folded dir-symlinks from `~/.agents/skills/<name>/` → `~/dotfiles/agentsfiles/shared/skills/<name>/`. Stow does not recognise manually-created folded symlinks as managed — `stow -D` cannot remove them. Use `rm` directly:

```bash
rm ~/.agents/skills/<name>
```

### 2. Copy source files into agentfiles

Copy all files verbatim from the dotfiles source into the target location under this repo:

```bash
mkdir -p agents/dotagents/.agents/skills/<name>
cp -r ~/dotfiles/agentsfiles/shared/skills/<name>/* agents/dotagents/.agents/skills/<name>/
```

Exclude `.DS_Store` if present. Verify with `diff -rq` that no files were dropped or corrupted.

Do **not** edit SKILL.md content unless the user explicitly asks for changes. Preserve YAML front matter.

### 3. Add LICENSE (if applicable)

**Decision rule:**
- **Upstream / external origin** (Matt Pocock, GitHub repo, etc.): add the verbatim LICENSE file from the upstream source. For skills from `mattpocock/skills`, use the MIT license at `https://github.com/mattpocock/skills/blob/main/LICENSE`.
- **User's own skill** (the user wrote it): no LICENSE needed. This matches existing precedent — `build-walking-skeleton`, `code-review`, `interrogate-plan`, etc. have no LICENSE file.

If unsure, ask. Do not fabricate a license.

### 4. Check for stow conflicts

```bash
mise check dotagents
```

The output should show MKDIR + LINK lines for the new skill only — no CONFLICT or ERROR lines. Existing skills are skipped with "already points to" messages.

### 5. Stow the skill

```bash
mise stow dotagents
```

This creates `~/.agents/skills/<name>/` as a real directory with per-file symlinks pointing back into this repo's `agents/dotagents/.agents/skills/<name>/`.

### 6. Delete the dotfiles source (true move)

```bash
rm -rf ~/dotfiles/agentsfiles/shared/skills/<name>
```

Verify it's gone:

```bash
ls ~/dotfiles/agentsfiles/shared/skills/<name> 2>&1  # should fail with "No such file"
```

### 7. Final verification

```bash
ls -la ~/.agents/skills/<name>/   # real dir + per-file symlinks into agentfiles repo
mise check dotagents              # clean, no conflicts
```

Spot-check a file: `head -3 ~/.agents/skills/<name>/SKILL.md` — front matter intact.

## Commit Convention

Use the `dotagents:` prefix per the `agentfiles-commit-prefixes` skill:

```
dotagents: migrate <skill-name> skill from dotfiles
```
