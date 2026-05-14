---
name: web-browser
description: "Browser automation via Chrome DevTools Protocol (CDP). Navigate pages, evaluate JavaScript, take screenshots, pick elements, dismiss cookie dialogs, and emulate mobile devices — all without Puppeteer or Playwright."
source: "https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser"
license: "Refer to source repository for license terms."
---

# Web Browser Skill

Minimal CDP tools for collaborative site exploration. Remote controls Google Chrome or Chromium over the Chrome DevTools Protocol.

## Prerequisites

- **Chrome/Chromium** installed at a standard macOS path, or set `BROWSER_BIN`
- **Node.js** (for the scripts)
- **npm dependencies:** `cd scripts && npm ci` (installs `ws` WebSocket library)

## Setup

```bash
# Install npm dependency (one-time)
# Scripts are symlinked from the repo; run npm ci where the real files live.
cd agents/dotagents/.agents/skills/web-browser/scripts && npm ci

# Start Chrome with remote debugging
./scripts/start.js
```

> **⚠️ Do not install from `~/.agents/skills/web-browser/scripts`.** The scripts are symlinks; Node resolves imports from the real repo path. Installing in the symlink target leaves stale `node_modules` that Node ignores.

## Start Chrome

```bash
./scripts/start.js                          # Fresh isolated profile (default)
./scripts/start.js --profile                # Copy your profile into isolated cache
./scripts/start.js --reset-profile          # Clear selected cached profile before launch
```

Starts Chrome with remote debugging (default port `:9222`).

Profile behaviour:
- Default mode uses: `~/.cache/agent-web/browser/fresh-profile`
- `--profile` mode uses: `~/.cache/agent-web/browser/profile-copy`
- The skill **does not attach to your live Chrome profile directly**
- If `:9222` is already used by an unknown instance, start will fail instead of reusing it

If Chrome is installed in a non-standard location, set:

```bash
BROWSER_BIN=/path/to/chrome ./scripts/start.js
```

Optional debug endpoint override:

```bash
BROWSER_DEBUG_PORT=9333 ./scripts/start.js
```

## Navigate

```bash
./scripts/nav.js https://example.com
./scripts/nav.js https://example.com --new
```

Navigate current tab or open a new tab.

## Device Emulation (Mobile)

```bash
./scripts/emulate.js --list                                  # List available presets
./scripts/emulate.js iphone-14                                # Set emulation
./scripts/emulate.js pixel-7 --landscape                      # Landscape orientation
./scripts/emulate.js --reset                                  # Clear emulation
```

Sets an active device emulation preference (viewport, DPR, touch, UA) that persists across commands.

## Evaluate JavaScript

```bash
./scripts/eval.js 'document.title'
./scripts/eval.js 'document.querySelectorAll("a").length'
./scripts/eval.js 'JSON.stringify(Array.from(document.querySelectorAll("a")).map(a => ({ text: a.textContent.trim(), href: a.href })).filter(link => !link.href.startsWith("https://")))'
```

Execute JavaScript in active tab (async context). Use single quotes to avoid shell escaping issues.

## Screenshot

```bash
./scripts/screenshot.js                            # Current viewport
./scripts/screenshot.js --full-page                # Full document height
./scripts/screenshot.js --device iphone-14          # With device emulation
./scripts/screenshot.js --device pixel-7 --full-page
```

Returns a temp file path to the PNG.

## Pick Elements

```bash
./scripts/pick.js "Click the submit button"
```

Interactive element picker. Click to select, Cmd/Ctrl+Click for multi-select, Enter to finish.

## Dismiss Cookie Dialogs

```bash
./scripts/dismiss-cookies.js              # Accept cookies
./scripts/dismiss-cookies.js --reject     # Reject cookies (where possible)
```

Automatically dismisses EU cookie consent dialogs. Run after navigating to a page:

```bash
./scripts/nav.js https://example.com && ./scripts/dismiss-cookies.js
```

## Background Logging (Console + Errors + Network)

Automatically started by `start.js`. Writes JSONL logs to:

```
~/.cache/agent-web/logs/YYYY-MM-DD/<targetId>.jsonl
```

Manually start:
```bash
./scripts/watch.js
```

Tail latest log:
```bash
./scripts/logs-tail.js                 # Dump current log and exit
./scripts/logs-tail.js --follow        # Keep following
```

Summarise network responses:
```bash
./scripts/net-summary.js
```

## Quick Mobile Debug Flow

```bash
./scripts/start.js
./scripts/nav.js https://example.com
./scripts/emulate.js iphone-14
./scripts/nav.js https://example.com         # reload with mobile UA
./scripts/dismiss-cookies.js
./scripts/screenshot.js --full-page
```
