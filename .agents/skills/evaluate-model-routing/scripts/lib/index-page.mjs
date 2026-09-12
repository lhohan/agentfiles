// Review index. One page listing every routing review, so a series is readable
// without opening each report. Reads committed report.json files only.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml, htmlTable, renderPage } from './html.mjs';
import { invalidInput } from './errors.mjs';

export const INDEX_FILENAME = 'index.html';

/** Read every run directory under `root` that holds a report.json. */
export function collectRuns(root) {
  if (!existsSync(root)) {
    throw invalidInput('Review root does not exist', root, ['Run a review first, or pass --root <dir>.']);
  }
  const runs = [];
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const reportPath = join(root, name.name, 'report.json');
    if (!existsSync(reportPath)) {
      runs.push({ dir: name.name, status: 'incomplete', reason: 'no report.json' });
      continue;
    }
    let report;
    try {
      report = JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch (error) {
      runs.push({ dir: name.name, status: 'incomplete', reason: `report.json is not valid JSON: ${error.message}` });
      continue;
    }
    runs.push({ dir: name.name, status: 'ok', report });
  }
  runs.sort((a, b) => {
    const left = a.report?.meta?.run_date ?? a.dir;
    const right = b.report?.meta?.run_date ?? b.dir;
    return right.localeCompare(left) || b.dir.localeCompare(a.dir);
  });
  return runs;
}

function stageSummary(report) {
  const ranked = [];
  const evidenceOnly = [];
  for (const [stage, stageReport] of Object.entries(report.scorecard.stages)) {
    if (stageReport.rows.some((row) => row.eligible)) ranked.push(stage);
    else evidenceOnly.push(stage);
  }
  return { ranked, evidenceOnly };
}

function calibrationCell(report) {
  if (!report.calibration) return 'not run';
  const { detected, scored, total, status } = report.calibration;
  if (status === 'awaiting-responses') return 'awaiting responses';
  return `${detected}/${scored} of ${total}`;
}

export function renderIndexPage({ runs, generatedAt }) {
  const complete = runs.filter((run) => run.status === 'ok');
  const incomplete = runs.filter((run) => run.status !== 'ok');

  const rows = complete.map((run) => {
    const { report } = run;
    const { ranked, evidenceOnly } = stageSummary(report);
    const decisions = report.recommendations.length > 0
      ? [...new Set(report.recommendations.map((entry) => entry.decision))].sort().join(', ')
      : 'missing-recommendations';
    return [
      `<a href="${escapeHtml(run.dir)}/report.html">${escapeHtml(run.dir)}</a>`,
      escapeHtml(report.meta.agent),
      escapeHtml(report.meta.run_date),
      escapeHtml(report.meta.pipeline_version),
      ranked.length === 0 ? '<span class="warn">none</span>' : escapeHtml(ranked.join(', ')),
      escapeHtml(evidenceOnly.join(', ') || 'none'),
      report.judge ? escapeHtml(`${report.judge.model} (${report.judge.assessment.confidence} self-report)`) : 'missing-judge',
      escapeHtml(calibrationCell(report)),
      escapeHtml(decisions),
      `<a href="${escapeHtml(run.dir)}/report.json">json</a> · <a href="${escapeHtml(run.dir)}/report.md">md</a>`,
    ];
  });

  const body = [
    '<section><h2>Reviews</h2>',
    complete.length === 0 ? '<p>No completed reviews.</p>' : htmlTable(
      ['Run', 'Agent', 'Date', 'Pipeline', 'Stages ranked', 'Stages evidence-only', 'Judge', 'Calibration', 'Recommendations', 'Other formats'],
      rows,
    ),
    '</section>',
    incomplete.length === 0 ? '' : `<section><h2>Incomplete run directories</h2><ul>${incomplete
      .map((run) => `<li><code>${escapeHtml(run.dir)}</code> — ${escapeHtml(run.reason)}</li>`)
      .join('')}</ul></section>`,
  ].join('\n');

  return renderPage({ title: 'Model-routing reviews', heading: 'Model-routing reviews', body, generatedAt });
}

/** Write the index next to the run directories. */
export function writeIndex({ root, generatedAt = new Date().toISOString() }) {
  const runs = collectRuns(root);
  const path = join(root, INDEX_FILENAME);
  writeFileSync(path, renderIndexPage({ runs, generatedAt }));
  return { path, runs: runs.length, complete: runs.filter((run) => run.status === 'ok').length };
}
