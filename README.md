# agentfiles

Dotfiles, but for agents.

## The dotfiles

If you want to go straight to the 'dotfiles', go [here](agents/).

### Repository Setup

Agent configuration files are managed with Mise and GNU Stow.

```text
.
├── .agents/                # repo-local skills and agent instructions
├── agents/                 # managed dotfiles packages
│   ├── agents-shared/      # shared AGENTS.md for Pi, OpenCode, and Codex
│   ├── dotagents/          # shared global skills under ~/.agents/skills/
│   ├── pi/                 # Pi package
│   ├── vibe/               # Vibe package
│   ├── zerostack/          # ZeroStack package
│   └── …                   # other agent packages as needed
└── docs/                   # package-specific documentation
    ├── agents-shared/
    ├── dotagents/
    ├── pi/
    ├── vibe/
    ├── zerostack/
    └── …                   # other package docs as needed
```

- `agents/` contains all managed agent packages.
- Every direct `agents/<name>/` subdirectory is a Stow package, so its contents are symlinked into the home directory.
- Keep only package directories directly under `agents/`.

## Agents shared

[Agents-shared](agents/agents-shared) provides one canonical [`AGENTS.md`](agents/agents-shared/CANONICAL/AGENTS.md) symlinked to Pi, OpenCode, and Codex global paths.

## .agents skills

[Dotagents](agents/dotagents) installs reusable global skills under `~/.agents/skills/`.

- [detect-jujutsu](agents/dotagents/.agents/skills/detect-jujutsu/) and [use-jujutsu](agents/dotagents/.agents/skills/use-jujutsu/) are the stable Jujutsu guidance pair. Combine them with instructions in [`AGENTS.md`](agents/agents-shared/CANONICAL/AGENTS.md).
- [use-jujutsu-workspaces](agents/dotagents/.agents/skills/use-jujutsu-workspaces/) is an experimental, under-construction companion for `jj workspace` workflows when running parallel agent work. It is not yet a default recommendation alongside the main Jujutsu skills.
- [karpathy-guidelines](agents/dotagents/.agents/skills/karpathy-guidelines/) is a reusable coding-behaviour skill. To default-enable it for a project, add this to the project's `AGENTS.md`: `- Use the skill 'karpathy-guidelines' for coding tasks.`
- [document-architectural-decisions](agents/dotagents/.agents/skills/document-architectural-decisions/) guides creation and review of Architecture Decision Records using traditional ADRs or Y-statements.
- [document-change-intentions-using-change-intent-records](agents/dotagents/.agents/skills/document-change-intentions-using-change-intent-records/) is a new skill under evaluation for documenting change intent worth remembering with lightweight Change Intent Records (CIRs), based on Bryan Liles' [Change Intent Records](https://blog.bryanl.dev/posts/change-intent-records/) pattern.
- [landing-the-plane](agents/dotagents/.agents/skills/landing-the-plane/) runs the end-of-task closure workflow.

## Pi

Located in [Pi](agents/pi).

  - A global [`APPEND_SYSTEM.md`](agents/pi/.pi/agent/APPEND_SYSTEM.md) for Pi-specific startup and questionnaire-steering behaviour
  - A `/plan` prompt at [`agents/pi/.pi/agent/prompts/enhanced/plan.md`](agents/pi/.pi/agent/prompts/enhanced/plan.md) for read-only planning before implementation.
  - A `/review` prompt at [`agents/pi/.pi/agent/prompts/enhanced/review.md`](agents/pi/.pi/agent/prompts/enhanced/review.md) for read-only code review.
  - A `/break` prompt at [`agents/pi/.pi/agent/prompts/enhanced/break.md`](agents/pi/.pi/agent/prompts/enhanced/break.md) for read-only adversarial QA and failure-mode hunting.
  - A `/review-plan` prompt at [`agents/pi/.pi/agent/prompts/enhanced/review-plan.md`](agents/pi/.pi/agent/prompts/enhanced/review-plan.md) for critical review of plan text before execution.
  - [custom themes](agents/pi/.pi/agent/themes/)

### Extensions

- A [Jujutsu-aware footer extension](agents/pi/.pi/agent/extensions/) that shows jj file counts plus the nearest bookmark name and ahead count in the TUI. Requires [Jujutsu (jj)](https://github.com/martinvonz/jj) on `PATH`. [Documentation](agents/pi/.pi/agent/extensions/jj-footer.md).

- A [Questionnaire extension](agents/pi/.pi/agent/extensions/questionnaire.ts) for bounded multi-question clarification flows. [Documentation](agents/pi/.pi/agent/extensions/questionnaire.md).

- A [Discovery tools extension](agents/pi/.pi/agent/extensions/discovery-tools.md) that keeps Pi's built-in `grep`, `find`, and `ls` tools active alongside the default coding tools. [Documentation](agents/pi/.pi/agent/extensions/discovery-tools.md).

- A [Brave search extension](agents/pi/.pi/agent/extensions/brave-search.ts) that registers `web_search`, `fetch_content`, and `get_fetched_content`. [Documentation](agents/pi/.pi/agent/extensions/brave-search.md)
    - requires [Brave `bx`](https://github.com/brave/bx) on `PATH` with a configured API key

- A [Usage statistics extension](agents/pi/.pi/agent/extensions/usage-stats.ts) that tracks skill, loaded extensions, command, tool, and model usage into a local JSONL file, with standalone reporting executables at [`~/.pi/agent/bin/pi-usage-report`](agents/pi/.pi/agent/bin/pi-usage-report) and [`~/.pi/agent/bin/pi-usage-report-html`](agents/pi/.pi/agent/bin/pi-usage-report-html). The reports include configurable time-interval filtering, consistent most-used, least-used, and full-list artifact rankings for skills, custom tools, and enabled models, inline extension context for extension-owned commands/tools, and an HTML at-a-glance summary. [Documentation](agents/pi/.pi/agent/extensions/usage-stats.md)

- A [Task-oriented system prompt extension](agents/pi/.pi/agent/extensions/set-task-oriented-system-prompt.ts) that removes Pi's built-in "expert coding assistant" wording from the generated system prompt. [Documentation](agents/pi/.pi/agent/extensions/set-task-oriented-system-prompt.md)

- A [Skill model switch extension](agents/pi/.pi/agent/extensions/skill-model-switch.ts) that switches to a configured model before executing explicit `/skill:<name>` commands. Mapping is read from an adjacent JSON config file. [Documentation](agents/pi/.pi/agent/extensions/skill-model-switch.md)

- A [Force session start model extension](agents/pi/.pi/agent/extensions/force-session-start-model.ts) that resets the active model and thinking level to user-configured values on every new session, avoiding collision with Pi's own `defaultModel` persistence. [Documentation](agents/pi/.pi/agent/extensions/force-session-start-model.md)

- A [Command guardrails extension](agents/pi/.pi/agent/extensions/guardrails/index.ts) that enforces opt-in warn/block rules for Pi `bash` tool calls from global and project-local `guardrails.conf` files. It is command safety, not file secrecy or sandboxing. [Documentation](agents/pi/.pi/agent/extensions/guardrails/guardrails.md)
    - no extra setup required

- A [Sandbox EPERM halt extension](agents/pi/.pi/agent/extensions/sandbox-eperm-halt/index.ts) that detects sandbox permission failures (EPERM / "Operation not permitted") in built-in tool results and halts the agent for the current turn. It is a best-effort "stop trying" signal layered on top of sandbox containment. [Documentation](agents/pi/.pi/agent/extensions/sandbox-eperm-halt/sandbox-eperm-halt.md)
    - no extra setup required

## Vibe

Located in [Vibe](agents/vibe).

- A [`config.toml`](agents/vibe/.vibe/config.toml) for the [Vibe CLI](https://github.com/Mistral-AI-Club/vibe-cli) with Mistral provider settings, model aliases, and tool permission profiles.

## ZeroStack

Located in [ZeroStack](agents/zerostack).

- A [`config.toml`](agents/zerostack/.config/zerostack/config.toml) for [ZeroStack](https://zerostack.dev) with Opencode Go provider configuration, model settings, and permission profiles.
- An [`AGENTS.md`](agents/zerostack/.config/zerostack/agent/AGENTS.md) in Zerostack's config location that that instructs every Zerostack session to integrate Agent Skills. This requires [`skills-primer`](https://codeberg.org/hanlho/skills-primer) to be available on the CLI.

## Decisions and Change Intent Records

Decision logs remain active reference material:
- See [`docs/decisions.md`](./docs/decisions.md) for repo-wide decisions
- See `docs/<agent>/decisions.md` for agent-specific decisions

For new durable change intent, we prefer lightweight Change Intent Records (CIRs):
- Repo-wide CIRs live in [`docs/cir/`](./docs/cir/)
- Package-scoped CIRs live in `docs/<package>/cir/`
- A CIR may supersede an earlier decision record when it replaces or invalidates that prior decision

The [`document-change-intentions-using-change-intent-records`](agents/dotagents/.agents/skills/document-change-intentions-using-change-intent-records/) skill provides guidance on when and how to create CIRs.

## Contributing

For issues or pull requests visit [Codeberg](https://codeberg.org/hanlho/agentfiles).

## Maintainer setup

For maintainer-only tooling, common tasks, and setup instructions see [`SETUP.md`](SETUP.md).
