# agentfiles

Dotfiles but for agents.

## The dotfiles

If you want to go straight to the agent configurations, the actual dotfiles, go [here](agents/). 

## Repository Setup

Agent configuration files are managed with Mise and GNU Stow.

```text
.
├── .agents/                # not the agentfiles repo content
├── agents/                 # managed agent packages (a.k.a. the dotfiles)
│   ├── pi/                 # Pi package
│   └── …                   # other agent packages as needed
└── docs/                   # package-specific documentation
    ├── pi/
    └── …                   # other package docs as needed
```

- `agents/` contains all managed agent packages.
- Every direct `agents/<name>/` subdirectory is a Stow package, so its contents are symlinked into the home directory.
- Keep only package directories directly under `agents/`.

Currently managed agents:

- [Pi](agents/pi) includes:
  - a [Jujutsu-aware footer extension](agents/pi/.pi/agent/extensions/) that shows jj file counts, nearest bookmark distance, and cwd location in the TUI.
    - extension documentation: [`docs/pi/jj-footer-extension.md`](docs/pi/jj-footer-extension.md)
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
- `mise stow pi` — link only package `pi`
- `mise unstow` — remove links for all packages
- `mise restow pi` — recreate links for package `pi`
- `mise check` — preview link actions for all packages
- `mise check pi` — preview link actions for package `pi`

### Helper scripts

- `scripts/commit-pi-day-to-day` — use `jj` to commit only `agents/pi/.pi/agent/settings.json` with the message `pi: day-to-day updates`

## decisions

See [`decisions.md`](./decisions.md) for the repo-wide decisions, and `docs/<agent>/decisions.md` for agent-specific decisions.

## Contributing

For issues or pull requests visit [Codeberg](https://codeberg.org/hanlho/agentfiles).
