// Shared HTML helpers for the report and the review index. One style block keeps
// both artefacts looking the same. Everything is inlined: no scripts, no CDN.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function htmlTable(headers, rows) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/**
 * Background tint for a scored cell. Hue moves red to green with the percentile
 * value; alpha stays low enough to read the number in both colour schemes.
 */
export function scoreTint(score) {
  const clamped = Math.max(0, Math.min(1, score));
  const hue = Math.round(clamped * 140);
  const alpha = (0.1 + clamped * 0.22).toFixed(2);
  return `background: hsl(${hue} 65% 45% / ${alpha})`;
}

/** Background tint for an empty coverage cell, by reason. */
export function stateTint(state) {
  const tints = {
    'no alias': 'background: hsl(35 90% 50% / 0.18)',
    'excluded unit': 'background: hsl(265 55% 50% / 0.16)',
    'evidence only': 'background: hsl(210 70% 50% / 0.14)',
    'not on board': '',
    'no source': '',
  };
  return tints[state] ?? '';
}

const STATE_HELP = {
  scored: 'A scored observation exists for this capability.',
  'evidence only': 'Observations exist but are unscored: proxy-family evidence or a contested unit.',
  'no alias': 'A tier A source carries this capability, but no alias record connects it to this route. Add an alias record.',
  'excluded unit': 'A tier A source carries this capability, but every unit is excluded as a small board or stale.',
  'not on board': 'A tier A source carries this capability and the route is aliased, but the board publishes no row for this model.',
  'no source': 'No tier A benchmark carries this capability. A new source is needed, not a fix.',
};

export function stateTitle(state) {
  return STATE_HELP[state] ?? state;
}

export function coverageLegend() {
  const entries = ['scored', 'evidence only', 'no alias', 'excluded unit', 'not on board', 'no source'];
  const swatches = entries
    .map((state) => {
      const style = state === 'scored' ? scoreTint(1) : stateTint(state);
      return `<li><span class="swatch" style="${style}"></span><code>${escapeHtml(state)}</code> — ${escapeHtml(STATE_HELP[state])}</li>`;
    })
    .join('');
  return `<ul class="legend">${swatches}</ul>`;
}

export function renderPage({ title, heading, body, generatedAt }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.5; margin: 0 auto; max-width: 72rem; padding: 2rem 1rem; }
h1 { font-size: 1.6rem; } h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid currentColor; padding-bottom: .25rem; }
h3 { font-size: 1.05rem; margin-top: 1.5rem; }
table { border-collapse: collapse; width: 100%; margin: .75rem 0; font-size: .875rem; }
th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: .35rem .5rem; text-align: left; vertical-align: top; }
th { background: color-mix(in srgb, currentColor 8%, transparent); }
code { font-family: ui-monospace, monospace; font-size: .9em; }
.muted { opacity: .75; } .gap { color: #b45309; } .warn { color: #b45309; font-weight: 600; }
ul { padding-left: 1.25rem; }
ul.legend { list-style: none; padding-left: 0; font-size: .85rem; }
.swatch { display: inline-block; width: .85rem; height: .85rem; border-radius: 2px; margin-right: .4rem; vertical-align: middle; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); }
footer { margin-top: 3rem; font-size: .8rem; opacity: .7; }
</style>
</head>
<body>
<h1>${escapeHtml(heading)}</h1>
${body}
${generatedAt ? `<footer>Generated ${escapeHtml(generatedAt)}. Self-contained: no scripts, no external assets.</footer>` : ''}
</body>
</html>
`;
}
