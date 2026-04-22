# agentfiles

Dotfiles, but for agents.

## The dotfiles

If you want to go straight to the dotfiles, go [here](agents/).

Note: as with dotfiles, this repository is not meant to be checked out and _used_ on your own systems. For example [some skills](agents/dotagents/.agents/skills/find-docs/SKILL.md) may call out to third party services.

## Repository Setup

Agent configuration files are managed with Mise and GNU Stow.

```text
.
├── .agents/                # repo-local skills and agent instructions
├── agents/                 # managed dotfiles packages
│   ├── agents-shared/      # shared AGENTS.md for Pi, OpenCode, and Codex
│   ├── dotagents/          # shared global skills under ~/.agents/skills/
│   ├── pi/                 # Pi package
│   └── …                   # other agent packages as needed
└── docs/                   # package-specific documentation
    ├── agents-shared/
    ├── dotagents/
    ├── pi/
    └── …                   # other package docs as needed
```

- `agents/` contains all managed agent packages.
- Every direct `agents/<name>/` subdirectory is a Stow package, so its contents are symlinked into the home directory.
- Keep only package directories directly under `agents/`.

Currently managed dotfiles:

- [Agents-shared](agents/agents-shared) provides one canonical `AGENTS.md` symlinked to Pi, OpenCode, and Codex global paths.
- [Dotagents](agents/dotagents) installs reusable global skills under `~/.agents/skills/`.
- [Pi](agents/pi) includes:
  - a global [`APPEND_SYSTEM.md`](agents/pi/.pi/agent/APPEND_SYSTEM.md) for Pi-specific startup and questionnaire-steering behaviour
  - a `/plan` prompt at [`agents/pi/.pi/agent/prompts/plan.md`](agents/pi/.pi/agent/prompts/plan.md) for read-only planning before implementation.
  - a [Jujutsu-aware footer extension](agents/pi/.pi/agent/extensions/) that shows jj file counts, nearest bookmark distance, and cwd location in the TUI.
    - extension documentation: [`jj-footer.md`](agents/pi/.pi/agent/extensions/jj-footer.md)
  - a questionnaire extension at [`agents/pi/.pi/agent/extensions/questionnaire.ts`](agents/pi/.pi/agent/extensions/questionnaire.ts) for bounded multi-question clarification flows ([docs](agents/pi/.pi/agent/extensions/questionnaire.md))
  - a Brave search extension at [`agents/pi/.pi/agent/extensions/brave-search.ts`](agents/pi/.pi/agent/extensions/brave-search.ts) that registers `web_search`, `fetch_content`, and `get_fetched_content`
    - requires [Brave `bx`](https://github.com/brave/bx) on `PATH` with a configured API key
    - extension documentation: [`brave-search.md`](agents/pi/.pi/agent/extensions/brave-search.md)
  - [custom themes](agents/pi/.pi/agent/themes/)

## Tooling

- [GNU Stow](https://www.gnu.org/software/stow/) symlinks the configuration files in `agents/` into the home directory.
- [Mise](https://mise.jdx.dev) manages the repo tasks and installs the required tooling.

### Stow

Stow runs in `--no-folding` mode so nested files become symlinks.

Canonical Stow settings live in `.stowrc`:

- `--dir=agents`
- `--target=~`
- `--no-folding`

## Common tasks

- `mise stow` — link all packages under `agents/`
- `mise stow agents-shared` — link only package `agents-shared`
- `mise stow dotagents` — link only package `dotagents`
- `mise stow pi` — link only package `pi`
- `mise unstow` — remove links for all packages
- `mise restow agents-shared` — recreate links for package `agents-shared`
- `mise restow dotagents` — recreate links for package `dotagents`
- `mise restow pi` — recreate links for package `pi`
- `mise check` — preview link actions for all packages
- `mise check agents-shared` — preview link actions for package `agents-shared`
- `mise check dotagents` — preview link actions for package `dotagents`
- `mise check pi` — preview link actions for package `pi`

### Helper scripts

- `scripts/commit-pi-day-to-day` — use `jj` to commit only `agents/pi/.pi/agent/settings.json` with the message `pi: day-to-day updates`

## decisions

See [`docs/decisions.md`](./docs/decisions.md) for the repo-wide decisions, and `docs/<agent>/decisions.md` for agent-specific decisions.

## Contributing

For issues or pull requests visit [Codeberg](https://codeberg.org/hanlho/agentfiles).
