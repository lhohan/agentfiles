# agentfiles

Dotfiles but for agents.

## Layout

- `agents/` contains all managed agent packages.
- Every direct `agents/<name>/` subdirectory is a "Stow package" which means te content of it will be symlinked to the home directory (and therefore will become used).
- Keep only package directories directly under `agents/`.

Currently managed agents:

- [Pi](agents/pi) includes:
  - a [Jujutsu-aware footer extension](agents/pi/.pi/agent/extensions/) that shows jj file counts, nearest bookmark distance, and cwd location in the TUI.
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

## Decision log

See [`DECISIONS.md`](./DECISIONS.md) for the full decision log.

## Contributing

For issues or pull requests visit [Codeberg](https://codeberg.org/hanlho/agentfiles).
