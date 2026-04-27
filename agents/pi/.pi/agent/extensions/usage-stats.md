# Usage Statistics Extension

Collects anonymous usage statistics for Pi skills, prompt templates, loaded extensions, extension commands, custom tools, and model selections.

## What is tracked

| Event | Trigger | Fields |
|---|---|---|
| `skill_invoked` | User types `/skill:name` | `name`, `args` |
| `prompt_invoked` | User types `/templatename` | `name`, `args`, `sourceInfo`, `inferred`, `extension` |
| `extension_command_invoked` | User types an extension-provided slash command (e.g. `/extcommand`) | `name`, `args`, `extension` |
| `extension_loaded` | Agent loads an extension | `extension` |
| `extension_inventory` | Session start discovers extension-backed commands/tools | `extension` |
| `skill_command_invoked` | User types `/skill:name` (alternative form) | `name`, `args` |
| `custom_tool_called` | Agent calls a non-built-in tool (includes extension tools such as `web_search`) | `tool`, `extension` |
| `skill_loaded` | Agent `read`s a `SKILL.md` file | `path` |
| `model_used` | First provider request of an agent run | `model` |
| `model_select` | Model changes via `/model`, cycling, or restore | `model`, `previousModel`, `source` |
| `session_start` | New, resume, fork, or reload | `reason`, `hasPreviousSession` |

`model_used` counts the model actually invoked for a prompt. `model_select` records every browsing or cycling action, so the two can diverge when a user cycles through several models before sending a message.

The report merges `skill_loaded`, `skill_invoked`, and `skill_command_invoked` into a single **Skills** artifact view. `skill_loaded` entries are grouped by parent directory name (e.g., `detect-jujutsu/SKILL.md` → `detect-jujutsu`). Skills loaded from multiple paths are aggregated into one row, while repeated loads, invocations, and commands all contribute to the same per-skill count.

Built-in tools (`read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`) are intentionally **not** tracked to reduce noise.

Prompt templates are identified from `pi.getCommands()` (`source: "prompt"`). Extension-managed prompts (e.g. `/plan`, `/review` via `pi-prompt-template-model`) are discovered by scanning `~/.pi/agent/prompts` and `<cwd>/.pi/prompts` recursively for Markdown files with frontmatter indicating they are managed by `pi-prompt-template-model`.

For normal slash-command input, native prompt commands are recorded directly during `input` interception. For extension-managed prompts, the resolved command metadata is matched against scanned managed prompt entries before attribution to `pi-prompt-template-model`. `before_agent_start` still performs prefix-based inference as a fallback for flows where prompt invocations bypass `input` interception.

When an extension-managed prompt is recorded, the `prompt_invoked` entry includes:
- `extension: "pi-prompt-template-model"`
- `sourceInfo` with `path`, `source`, `scope`, and `origin` pointing at the prompt template file
- `inferred: true` only when captured by the `before_agent_start` fallback

Native Pi prompts take precedence over extension-managed prompts when both could match. The shared reporter counts `prompt_invoked` entries with an `extension` field toward that extension's usage.

## Data file

Append-only JSONL at:

```
~/.pi/agent/usage-stats.jsonl
```

Each line is a self-contained JSON object with at minimum `t` (timestamp) and `event` fields.

## Viewer

A standalone reporting executable is included:

```bash
# Full summary
~/.pi/agent/bin/pi-usage-report

# Show last 50 raw events
~/.pi/agent/bin/pi-usage-report --recent

# Show last N raw events
~/.pi/agent/bin/pi-usage-report --recent=100

# Filter to one event type
~/.pi/agent/bin/pi-usage-report --event=skill_invoked

# Filter all counters and tables to a time interval
~/.pi/agent/bin/pi-usage-report --interval="last 7 days"

# Show documented options and interval values
~/.pi/agent/bin/pi-usage-report --help

# Limit legacy non-artifact table rows
~/.pi/agent/bin/pi-usage-report --top=5
```

Both reporters support these time intervals: `today`, `last 3 days`, `last 7 days`, `last 10 days`, `last 30 days`, `last 90 days`, `last year`, and `all`. The default is `all`, preserving the previous full-history behaviour. Time-interval filtering happens before aggregation, so events outside the selected interval are excluded from counters, tables, timelines, and recent-event lists. The CLI `--event` filter and `--interval` filter both apply during ingestion.

The CLI report has fixed artifact sections for:

- **Prompts** (`prompt_invoked` counts)
- **Skills** (`skill_loaded`, `skill_invoked`, and `skill_command_invoked` counts)
- **Custom Tools** (`custom_tool_called` counts)
- **Enabled Models** (`model_used` counts)

Custom-tool rows display their owning extension inline when known, for example `web_search (bx)`. Extension slash-command rows use the same inline owner format, for example `/review (pi-prompt-template-model)`. The reports do not include a standalone extension-usage summary; extension context is shown beside the event or artifact that used it.

Each artifact section shows:

1. Top 10 most-used rows.
2. Top 10 least-used rows.
3. The full ranked list.

The top 10 least-used list excludes any row already shown in the top 10 most-used list, so the least-used list can contain fewer than ten rows for small inventories. Full rankings sort by usage count descending, then artifact name ascending. Least-used rankings sort by usage count ascending, then artifact name ascending.

Artifact inventory is discovered at report time by `bin/pi-usage-report-lib.mjs`; the telemetry extension does not write inventory snapshots for these artifact views. Zero-use rows are included only when current inventory can be rediscovered reliably:

- Prompts are rediscovered from Pi prompt locations, including native prompt templates and extension-managed prompt files matching the existing `pi-prompt-template-model` frontmatter heuristic.
- Skills are rediscovered from Pi skill locations such as `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, and project `.agents/skills/` directories.
- Custom tools are rediscovered from local Pi extension source files by scanning `pi.registerTool({ name: ... })` calls. If no local custom-tool inventory is found, the report falls back to observed usage only.
- Enabled Models are read from `enabledModels` in Pi settings. If `enabledModels` is absent or empty, enabled-model zero-use and inventory-backed least-used rows are skipped.

### HTML Report

A visually rich HTML report with charts and interactive tables is also available:

```bash
# Generate report and open in browser
~/.pi/agent/bin/pi-usage-report-html

# Custom output path
~/.pi/agent/bin/pi-usage-report-html --output=/path/to/report.html

# Include more recent events
~/.pi/agent/bin/pi-usage-report-html --recent=200

# Choose the initially selected interval in the generated report
~/.pi/agent/bin/pi-usage-report-html --interval="last 30 days"
```

The generated HTML report precomputes every supported interval and includes a self-contained selector for switching between them. The selector also honours an `?interval=...` query parameter, for example `usage-report.html?interval=last%207%20days`.

The HTML report is self-contained (no external dependencies) and includes:
- Summary metric cards
- An activity timeline near the top of the page
- An interactive time-interval selector for switching between the supported intervals without regenerating the report
- A compact 2×2 top 5 artifact-usage summary for prompts, skills, custom tools, and enabled models, with horizontal bars for quick comparison
- Donut charts for model and skill distribution
- Full artifact sections with top 10 most-used, top 10 least-used, and full ranked lists
- Extension slash-command tables with owning extension names inline
- Recent events log with colour-coded badges and inline extension ownership for custom-tool calls and extension slash commands
- Automatic dark/light mode based on system preference

## Maintenance contract

When adding or changing an event type in `usage-stats.ts`:

1. Update `bin/pi-usage-report-lib.mjs` — this feeds both reporters.
2. If the event needs visual treatment in the HTML report, add a CSS badge rule and any chart logic in `bin/pi-usage-report-html`.
3. If the event needs a CLI table column or special formatting, update `bin/pi-usage-report`.
4. Update the event table in this document.

The shared library (`pi-usage-report-lib.mjs`) owns:
- `STATS_PATH`
- `TIME_INTERVAL_OPTIONS`, `normalizeTimeInterval()`, and `entryMatchesTimeInterval()` — shared interval validation and filtering
- `createCollector()` — counters, extension owner maps, `processEntry`, `recent` / `timeline` tracking
- `skillNameFromPath()`
- `sortMap()`
- `createArtifactReports()` and `createArtifactReport()` — shared artifact ranking shape used by both reporters, including custom-tool owner display names
- Report-time inventory discovery for prompts, skills, custom tools, and enabled models
- `extensionOwnedEntries()` and `formatEventDetail()` — shared display formatting for extension-owned commands/tools and recent event details
- `readStatsEntries()` async generator

The CLI reporter owns:
- Report header, summary block, section headings, and dividers
- ASCII table formatting (`printTable`)
- `--event` and `--interval` filtering (ingestion-time)
- `--recent` timeline dump with aligned timestamps and event names

The CLI report is structured in three visual sections:
- **Summary** — line count, matched events, sessions started
- **Breakdown** — artifact rankings first, then extension slash-command and model-selection tables
- **Timeline** — optional recent events log, shown only with `--recent`

The HTML reporter owns:
- SVG chart generation (bar, donut, timeline)
- CSS styling and badge colours
- Self-contained HTML page assembly

## Installation

The extension is auto-discovered by Pi when this package is stowed:

```bash
mise stow pi
```

Then restart Pi or run `/reload`.

## Flush behaviour

Events are buffered in memory and flushed to disk every 2 seconds, or immediately on `session_shutdown` (quit, `/reload`, session switch).
