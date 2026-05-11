# Maintainer setup

This page covers the tooling and day-to-day commands used to maintain and evolve the packages in this repository.

## Quickstart

1. **Install Prerequisites**:
   - [Mise](https://mise.jdx.dev/) (for Stow and runtime management)
   - GNU Stow (`brew install stow` or `apt-get install stow`)

2. **Clone and Link**:
   ```bash
   git clone https://github.com/lhohan/agentfiles.git
   cd agentfiles
   mise stow  # Link all packages
   ```

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
- `mise stow vibe` — link only package `vibe`
- `mise unstow` — remove links for all packages
- `mise restow agents-shared` — recreate links for package `agents-shared`
- `mise restow dotagents` — recreate links for package `dotagents`
- `mise restow pi` — recreate links for package `pi`
- `mise restow vibe` — recreate links for package `vibe`
- `mise check` — preview link actions for all packages
- `mise check agents-shared` — preview link actions for package `agents-shared`
- `mise check dotagents` — preview link actions for package `dotagents`
- `mise check pi` — preview link actions for package `pi`
- `mise check vibe` — preview link actions for package `vibe`

### Helper scripts

- `scripts/commit-pi-day-to-day` — use `jj` to commit only `agents/pi/.pi/agent/settings.json` with the message `pi: day-to-day updates`
