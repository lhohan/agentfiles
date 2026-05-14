# web-browser skill

CDP-based browser automation for site exploration, debugging, and "web vision" tasks. Remote controls Chrome/Chromium over the Chrome DevTools Protocol.

## Source

Vendored from [mitsuhiko/agent-stuff/skills/web-browser](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser). Refer to the source repository for license terms.

## Prerequisites

- **Chrome or Chromium** installed at a standard macOS path (or set `BROWSER_BIN`)
- **Node.js** (for the helper scripts)
- `ws` npm package (single dependency)

## Installation

```bash
# 1. Stow the dotagents package to create symlinks
cd ~/dev/agentfiles && mise stow

# 2. Install npm dependency (one-time)
# Scripts are symlinks; run npm ci where the real files live (in the repo).
cd agents/dotagents/.agents/skills/web-browser/scripts && npm ci
```

The stow step creates symlinks at `~/.agents/skills/web-browser/` pointing back to the repo files. After `npm ci` in the repo path, all scripts are ready to use.

> **⚠️ Do not install from `~/.agents/skills/web-browser/scripts`.** Node resolves ESM imports from the real repo path (symlink target), not the symlink location. Installing in `~/.agents/...` leaves stale `node_modules` that Node ignores.

## Quick start

```bash
cd ~/.agents/skills/web-browser

# Start Chrome with remote debugging (fresh isolated profile)
./scripts/start.js

# Navigate to a page
./scripts/nav.js https://example.com

# Get info
./scripts/eval.js 'document.title'

# Screenshot
./scripts/screenshot.js --full-page

# Clean up — close the Chrome window or kill the process
```

## Command reference

| Command | Description |
|---------|-------------|
| `start.js [--profile] [--reset-profile]` | Start Chrome with remote debugging |
| `nav.js <url> [--new]` | Navigate to URL, optionally in new tab |
| `eval.js '<code>'` | Execute JavaScript in active tab |
| `screenshot.js [--full-page] [--device <name>]` | Take a screenshot (PNG to temp dir) |
| `pick.js '<prompt>'` | Interactive element picker |
| `dismiss-cookies.js [--reject]` | Accept/reject cookie consent dialogs |
| `emulate.js <device> [--landscape] [--reset] [--list]` | Set/clear device emulation |
| `watch.js` | Background CDP event logging (auto-started) |
| `logs-tail.js [--follow]` | Tail latest JSONL log file |
| `net-summary.js` | Summarise network requests from logs |

## Device presets

- `iphone-se` — iPhone SE (375×667 @2x)
- `iphone-14` — iPhone 14 (390×844 @3x)
- `pixel-7` — Pixel 7 (412×915 @2.625x)
- `galaxy-s20` — Galaxy S20 (360×800 @3x)

List all with: `./scripts/emulate.js --list`

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_BIN` | auto-detected | Path to Chrome/Chromium binary |
| `BROWSER_DEBUG_PORT` | `9222` | Remote debugging port |
| `BROWSER_DEBUG_HOST` | `localhost` | Remote debugging host |
| `DEBUG` | — | Set to `1` for verbose script logging |

## Typical debug flow

```bash
cd ~/.agents/skills/web-browser
./scripts/start.js
./scripts/nav.js https://example.com
./scripts/emulate.js iphone-14
./scripts/nav.js https://example.com    # reload with mobile UA
./scripts/dismiss-cookies.js
./scripts/screenshot.js --full-page
```
