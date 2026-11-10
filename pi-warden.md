Rules the rules guard judges on every write and edit in this repository. Each heading below is one rule; running `/warden rules check` is expected to flag the two `when: turn` rules ("needs another file to judge"), because a turn rule is judged on the whole diff by design. Leave those two alone.

# No hardcoded secrets
Source code must not contain passwords, API keys, tokens, or connection URLs with credentials. Read them from the environment, a function parameter, or the config module.

# Comments explain why, not what
A comment states a reason, a constraint, a workaround, or a non-obvious invariant. A comment that restates what the next line plainly does is a violation.

# Errors are not swallowed
A `catch` block must handle the error, report it, or re-raise it. An empty catch block, or one whose body is only a comment, is a violation.

# No partial implementations
Implement features fully. A comment that says "for now", "simplified", or "later", or a stub body, is a violation. If a part genuinely cannot be done, say so in your reply instead of stubbing it.

# Committed scripts never erase uncommitted work
A committed script, Makefile target, or config file must not run `git reset --hard`, `git checkout -- .`, `git clean -fd`, or a similar command that discards untracked or uncommitted changes. A clean tree is reached with a worktree, not a reset.

# Changes stay inside the repository
source: AGENTS.md:9

A write or edit whose target path lies outside this repository is a violation: an absolute path under `~/`, a path that escapes with `..`, or a linked file resolved through the stow target. The same content is changed in the repository file it links from.

# A changed task updates the README
when: turn
source: AGENTS.md:39

A diff that changes a user-facing task in `mise.toml` — a task name, its arguments, or what it does — also changes `README.md` in the same diff.

# A policy change comes with a record
when: turn
source: AGENTS.md:40

A diff that changes the package model or an operational policy — the contents of `AGENTS.md`, which packages exist under `agents/`, or the task graph in `mise.toml` — also adds or updates a record under `docs/cir/` or `docs/<package>/cir/` in the same diff.

# A decision record states a durable decision
paths: docs/cir/**, docs/*/cir/**, docs/decisions.md, docs/*/decisions.md
source: AGENTS.md:60

An added or changed record names a durable, structural decision chosen among plausible alternatives. A record that is one-time cleanup, a migration step, a current version inventory, mechanical implementation detail, or task history is a violation.

# A workflow prompt stays a thin adapter
paths: agents/**/prompts/**/*.md, .pi/agent/prompts/**/*.md
source: AGENTS.md:45

A prompt file declares `skill: <name>` in its frontmatter, and its body invokes that skill. A prompt with no `skill:` key, or a body that lists numbered workflow stages instead of invoking a skill, is a violation.

# A workflow stage skill is named for its stage
paths: agents/**/.agents/skills/**/SKILL.md
source: AGENTS.md:46

A skill that carries one shared workflow stage lives in a directory named `run-stage-<stage>`. A stage skill whose directory name lacks the `run-stage-` prefix is a violation.
