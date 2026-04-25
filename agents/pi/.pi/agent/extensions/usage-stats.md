# Usage Statistics Extension

Collects anonymous usage statistics for Pi skills, prompt templates, extension commands, custom tools, and model selections.

## What is tracked

| Event | Trigger | Fields |
|---|---|---|
| `skill_invoked` | User types `/skill:name` | `name`, `args` |
| `prompt_invoked` | User types `/templatename` | `name`, `args` |
| `extension_command_invoked` | User types `/extcommand` | `name`, `args` |
| `skill_command_invoked` | User types `/skill:name` (alternative form) | `name`, `args` |
| `custom_tool_called` | Agent calls a non-built-in tool | `tool` |
| `skill_loaded` | Agent `read`s a `SKILL.md` file | `path` |
| `model_used` | First provider request of an agent run | `model` |
| `model_select` | Model changes via `/model`, cycling, or restore | `model`, `previousModel`, `source` |
| `session_start` | New, resume, fork, or reload | `reason`, `hasPreviousSession` |
| `resources_discovered` | Startup or `/reload` | `reason`, `promptCount` |

`model_used` counts the model actually invoked for a prompt. `model_select` records every browsing or cycling action, so the two can diverge when a user cycles through several models before sending a message.

The `skill_loaded` event stores the raw `path`, but the viewer groups by the parent directory name (e.g., `detect-jujutsu/SKILL.md` → `detect-jujutsu`). Skills installed in multiple locations with the same directory name are collapsed into one row.

Built-in tools (`read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`) are intentionally **not** tracked to reduce noise.

Prompt templates are identified from `pi.getCommands()` (`source: "prompt"`) and additionally inferred in `before_agent_start` by matching the expanded prompt text against prompt-template prefixes. This covers flows where prompt invocations bypass `input` interception.

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

# Limit table rows
~/.pi/agent/bin/pi-usage-report --top=5
```

### HTML Report

A visually rich HTML report with charts and interactive tables is also available:

```bash
# Generate report and open in browser
~/.pi/agent/bin/pi-usage-report-html

# Custom output path
~/.pi/agent/bin/pi-usage-report-html --output=/path/to/report.html

# Include more recent events
~/.pi/agent/bin/pi-usage-report-html --recent=200
```

The HTML report is self-contained (no external dependencies) and includes:
- Summary metric cards
- Activity timeline chart
- Bar charts for skills, tools, and prompts
- Donut chart for model distribution
- Sortable data tables
- Recent events log with colour-coded badges
- Automatic dark/light mode based on system preference

## Installation

The extension is auto-discovered by Pi when this package is stowed:

```bash
mise stow pi
```

Then restart Pi or run `/reload`.

## Flush behaviour

Events are buffered in memory and flushed to disk every 2 seconds, or immediately on `session_shutdown` (quit, `/reload`, session switch).
