# Plan: Fix questionnaire tool line wrapping

**Status**: Applied  
**Date**: 2026-06-23  
**Applied**: 2026-06-23  
**Verified**: All `add` calls replaced with wrapping helpers; `truncateToWidth` retained only in `renderCall` for intentional single-line truncation.  
**Author**: Pi (planning mode)  
**Target file**: `~/dev/agentfiles/agents/pi/.pi/agent/extensions/questionnaire.ts` (symlinked from `~/.pi/agent/extensions/questionnaire.ts`)

---

## Summary

The questionnaire extension currently truncates long lines (prompt text, option labels, descriptions, help text, tab bar) instead of wrapping them. This causes content to be cut off mid-sentence in narrow terminals. The fix is to replace the `truncateToWidth`-based rendering with `wrapTextWithAnsi`-based wrapping, mirroring Pi's upstream example extension.

---

## Root Cause

The local `questionnaire.ts` (a fork of Pi's upstream example) uses a helper:

```ts
const add = (s: string) => lines.push(truncateToWidth(s, width));
```

`truncateToWidth` from `@earendil-works/pi-tui` (aliased as `@mariozechner/pi-tui` by Pi) truncates any line exceeding `width` to a single line with an ellipsis. This means long prompts, option descriptions, the tab bar, help text, and submit summaries are silently cut off instead of being wrapped onto multiple lines.

The upstream Pi example (`examples/extensions/questionnaire.ts` in the Pi distribution) uses `wrapTextWithAnsi` + `visibleWidth` with a `addWrappedWithPrefix` helper that wraps continuation lines aligned under their prefix. That is the correct, established pattern.

---

## Applied Changes

The fix was applied to `~/dev/agentfiles/agents/pi/.pi/agent/extensions/questionnaire.ts` on 2026-06-23.

### Changes made:
1. **Imports**: Added `visibleWidth` and `wrapTextWithAnsi` to the imports from `@mariozechner/pi-tui`
2. **Wrapping helpers**: Replaced the single `add` helper (which used `truncateToWidth`) with two new helpers:
   - `addWrapped(text)`: wraps text at full `width`
   - `addWrappedWithPrefix(prefix, text)`: wraps text at `width - prefixWidth`, with continuation lines indented under the prefix
3. **Updated all render calls**: Replaced every `add(...)` call with the appropriate wrapping helper:
   - Tab bar: `addWrappedWithPrefix(" ", tabs.join(""))`
   - Prompts: `addWrappedWithPrefix(" ", theme.fg("text", q.prompt))`
   - Options: `addWrappedWithPrefix(prefix, theme.fg(color, labelText))`
   - Descriptions: `addWrappedWithPrefix("     ", theme.fg("muted", opt.description))`
   - Editor lines: `addWrappedWithPrefix("  ", line)` with `editor.render(Math.max(1, width - 2))`
   - Help text: `addWrappedWithPrefix(" ", theme.fg("dim", help))`
   - Submit summary lines: `addWrappedWithPrefix(" ", ...)`
4. **Borders preserved**: Full-width `─` borders remain single-line (no wrapping)
5. **renderCall unchanged**: Still uses `truncateToWidth(labels, 40)` for compact single-line display

---

## Proposed Changes

### 1. Update imports

Add `wrapTextWithAnsi` and `visibleWidth` to the existing imports from `@mariozechner/pi-tui`:

```ts
import { 
  Editor, 
  type EditorTheme, 
  Key, 
  matchesKey, 
  Text, 
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi 
} from "@mariozechner/pi-tui";
```

> **Note**: `truncateToWidth` is kept because it is legitimately used in `renderCall` for a single-line label truncation.

### 2. Replace the `add` helper with wrapping helpers

Remove:
```ts
const add = (s: string) => lines.push(truncateToWidth(s, width));
```

Add two helpers (mirroring the upstream example):

```ts
function addWrapped(text: string) {
    lines.push(...wrapTextWithAnsi(text, width));
}

function addWrappedWithPrefix(prefix: string, text: string) {
    const prefixWidth = visibleWidth(prefix);
    if (prefixWidth >= width) {
        addWrapped(prefix + text);
        return;
    }
    const wrapped = wrapTextWithAnsi(text, width - prefixWidth);
    const continuationPrefix = " ".repeat(prefixWidth);
    for (let i = 0; i < wrapped.length; i++) {
        lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
    }
}
```

> **Note**: `visibleWidth` computes the visible (printable) width of a string, ignoring ANSI escape codes. `wrapTextWithAnsi` handles ANSI sequences internally, preserving styles across line breaks.

### 3. Rewrite the `render` function body

Replace every `add(...)` call with the appropriate wrapping helper, ensuring continuation lines align under their prefix:

| Current (truncating) | New (wrapping) |
|---|---|
| `add(" " + tabs.join(""))` | `addWrappedWithPrefix(" ", tabs.join(""))` |
| `add(theme.fg("text", ` ${q.prompt}`))` | `addWrappedWithPrefix(" ", theme.fg("text", q.prompt))` |
| `add(prefix + theme.fg(color, \`${i + 1}. ${opt.label}\`))` | `addWrappedWithPrefix(prefix, theme.fg(color, \`${i + 1}. ${opt.label}${isOther && inputMode ? " ✎" : ""}\`))` |
| `add(\`     ${theme.fg("muted", opt.description)}\`)` | `addWrappedWithPrefix("     ", theme.fg("muted", opt.description))` |
| `add(theme.fg("text", ` ${q.prompt}`))` (else branch) | `addWrappedWithPrefix(" ", theme.fg("text", q.prompt))` |
| `add(theme.fg("muted", " Your answer:"))` | `addWrappedWithPrefix(" ", theme.fg("muted", "Your answer:"))` |
| Editor lines: `add(" " + line)` | `addWrappedWithPrefix("  ", line)` (and render editor at `width - 2`) |
| `add(theme.fg("dim", help))` | `addWrappedWithPrefix(" ", theme.fg("dim", help))` |
| Submit tab lines (answer summaries, "Ready to submit", "Press Enter...", "Unanswered...") | `addWrappedWithPrefix(" ", ...)` |

**Special case — Editor lines in input mode:**

Current:
```ts
for (const line of editor.render(width - 2)) {
    add(` ${line}`);
}
```

New:
```ts
for (const line of editor.render(Math.max(1, width - 2))) {
    addWrappedWithPrefix("  ", line);
}
```

The `Editor` component already wraps its own text internally, but wrapping again via `addWrappedWithPrefix` with a 2-space prefix ensures even very long unbreakable input (e.g., a pasted URL) will wrap rather than overflow.

**Borders:**

Keep the top/bottom borders as-is (single-line, full-width):
```ts
lines.push(theme.fg("accent", "─".repeat(width)));
```

### 4. No changes to `renderCall` and `renderResult`

- `renderCall` uses `truncateToWidth(labels, 40)` intentionally for a compact one-line tool-call display — keep as-is.
- `renderResult` returns a `Text` component that Pi's TUI renders according to its own rules — no changes needed.

---

## Files to Modify

| File | Action | Lines affected |
|------|--------|----------------|
| `~/dev/agentfiles/agents/pi/.pi/agent/extensions/questionnaire.ts` | Edit | Imports, `render` function (add helpers, replace `add` calls) |

> **Note**: This file is symlinked to `~/.pi/agent/extensions/questionnaire.ts`. Editing the source file is sufficient; the symlink ensures the global extension picks up the change.

---

## Verification Plan

### Prerequisites
- Ensure Pi is running version ≥ 0.79.10 (user's current version).
- The fix relies on `wrapTextWithAnsi` and `visibleWidth` from `@earendil-works/pi-tui`, which are aliased to `@mariozechner/pi-tui` by Pi's loader (confirmed in `core/extensions/loader.js`).

### Manual test steps
1. Apply the edit to `questionnaire.ts`.
2. In Pi, run `/reload` (or restart Pi) to reload extensions and recompile TypeScript.
3. Trigger the `questionnaire` tool with a call that includes:
   - A long `prompt` (200+ characters)
   - At least one option with a long `description` (100+ characters)
   - Multiple questions (to exercise the tab bar)
   Example:
   ```json
   {
     "questions": [
       {
         "id": "scope",
         "label": "Scope",
         "prompt": "This is a very long question prompt that definitely exceeds the typical terminal width of 80 or 120 columns and should wrap onto multiple lines instead of being truncated mid-sentence",
         "options": [
           {"value": "a", "label": "Option A", "description": "This is a very long description for Option A that also exceeds typical terminal width and should wrap properly"},
           {"value": "b", "label": "Option B", "description": "Short"}
         ]
       },
       {
         "id": "priority",
         "label": "Priority",
         "prompt": "Another long prompt for the second question to test multi-question tab bar wrapping behavior",
         "options": [{"value": "high", "label": "High"}, {"value": "low", "label": "Low"}]
       }
     ]
   }
   ```
4. Resize your terminal to a narrow width (≈40–60 columns).
5. Confirm the following **do NOT truncate** and **DO wrap**:
   - [ ] Long question prompts
   - [ ] Long option labels
   - [ ] Long option descriptions
   - [ ] Tab bar (when many questions)
   - [ ] Help text at the bottom
   - [ ] Submit summary lines
   - [ ] Editor input area (in "Type something" mode)
6. Confirm borders (`─`) remain single-line and full-width.
7. Confirm continuation lines are indented under their prefix (e.g., wrapped prompt lines align with the first line's leading space).
8. Confirm ANSI colors are preserved across wrapped lines (no style bleed).

### Regression check
- [ ] Run the questionnaire in a wide terminal (>120 cols) — no wrapping should occur, and no visual artifacts.
- [ ] Single-question mode — same wrapping behavior as multi-question.
- [ ] Escape/cancel works as before.
- [ ] Tab navigation, Enter selection, and Submit flow work unchanged.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wrapping breaks ANSI color state | Low | `wrapTextWithAnsi` tracks ANSI codes via `AnsiCodeTracker`; upstream example uses the same approach |
| Continuation lines misalign | Low | `visibleWidth` correctly measures prefix width ignoring ANSI; continuation prefix uses same-width spaces |
| Performance impact | Negligible | Wrapping is O(n) on visible text; no loops over large data |
| Editor width mismatch | Low | `editor.render(width - 2)` accounts for the 2-space prefix added by `addWrappedWithPrefix` |

---

## Dependencies

- Pi ≥ 0.79.10 (user's current version) — includes `@earendil-works/pi-tui` with `wrapTextWithAnsi` and `visibleWidth`.
- No new npm packages required.
- No changes to Pi core or pi-tui.

---

## Out of Scope

- Adding horizontal scrolling or a pager for very long content.
- Changing the truncation behavior in `renderCall` or `renderResult`.
- Upstreaming this fix to Pi's example (user's local fork only).
- Adding unit tests (none exist for this extension; verification is manual).

---

## Verification Results

**To be completed after testing in Pi.**

---

## References

- Upstream Pi questionnaire example: `/nix/store/qz3161jknfkx6bag21iyangnpddpqywd-pi-0.79.10/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/questionnaire.ts`
- `wrapTextWithAnsi` / `visibleWidth` exports: `@earendil-works/pi-tui/dist/utils.d.ts`
- Pi's module aliasing: `core/extensions/loader.js` (aliases `@mariozechner/pi-tui` → bundled pi-tui)
