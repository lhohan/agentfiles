// Report model and renderers. One fixed form: Markdown plus self-contained HTML.
// Every remote value is escaped before it reaches the HTML.

import { stripInternal } from './util.mjs';
import { coverageLegend, escapeHtml, htmlTable, renderPage, safeUrl, scoreTint, stateTint, stateTitle } from './html.mjs';

export const PIPELINE_VERSION = 6;
export const REPORT_SECTIONS = [
  'Run metadata',
  'Executive summary',
  'Baseline route table and re-evaluation',
  'Capability coverage matrix',
  'Deterministic scorecard per stage',
  'Fuzzy assessment (judge)',
  'Divergences and contradictions',
  'Recommendation per stage',
  'Validation and rollback criteria',
  'Evidence appendix',
];

export function buildReport({ config, registry, manifest, sources, failures, units, scorecard, judge, calibration = null, referenceTime }) {
  const routes = [...new Set([...manifest.candidates, ...manifest.stages.flatMap((stage) => stage.routes.map((route) => route.model_id))])].sort();
  const judgeModel = config.judges[0]?.model ?? null;
  return {
    report_version: PIPELINE_VERSION,
    meta: {
      agent: manifest.agent,
      profile: manifest.profile,
      profile_verified_at: manifest.profile_verified_at,
      run_date: manifest.run_date,
      run_slug: manifest.run_slug,
      reference_time: referenceTime,
      manifest_hash: manifest.hash,
      config_hash: config.hash,
      pipeline_version: PIPELINE_VERSION,
      thresholds: {
        rank_threshold_coverage: config.rank_threshold_coverage,
        max_snapshot_age_days: config.max_snapshot_age_days,
        contested_tolerance: config.contested_tolerance,
      },
      judge: judgeModel === null ? null : { model: judgeModel, thinking: config.judges[0].thinking, self_candidate: routes.includes(judgeModel) },
    },
    registry_summary: registry.benchmarks.map((entry) => ({ id: entry.id, name: entry.name, tier: entry.tier, capabilities: entry.capabilities ?? {} })),
    sources,
    failures,
    units,
    candidates: routes,
    baseline: scorecard.baseline,
    chains: Object.fromEntries(manifest.stages.map((stage) => [stage.task, stage.routes.map((route) => route.model_id)])),
    scorecard,
    judge,
    calibration,
    recommendations: manifest.recommendations,
    derived_signals: scorecard.signals,
    notes: manifest.notes,
    inputs: {
      config: stripInternal(config),
      manifest: stripInternal(manifest),
      registry: stripInternal(registry),
    },
  };
}

function fmt(value, digits = 3) {
  return typeof value === 'number' ? value.toFixed(digits) : 'n/a';
}

function pct(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function rankLabel(row) {
  if (row.rank === null || row.rank === undefined) return '-';
  if (!row.tied_with?.length) return `${row.rank}`;
  return `${row.rank} (tied with ${row.tied_with.join(', ')}${row.tie_kind === 'within-tolerance' ? ', within tolerance' : ''})`;
}

function calibrationLine(report) {
  if (!report.calibration) return 'Judge calibration: not run for this review.';
  const { detected, scored, total, status, prompt_version: promptVersion } = report.calibration;
  if (status === 'awaiting-responses') return `Judge calibration: prompts written for ${total} frozen fixtures; no responses recorded yet.`;
  return `Judge calibration: ${detected}/${scored} planted defects detected on frozen fixtures (prompt version ${promptVersion}, ${total} fixtures). Detection is keyword-based and is a proxy for attention, not for correctness.`;
}

function uniqueCapabilities(report) {
  const ids = new Set();
  for (const weights of Object.values(report.scorecard.stages)) {
    for (const id of Object.keys(weights.weights)) ids.add(id);
  }
  return [...ids].sort();
}

function capabilityMatrix(report) {
  const capabilities = uniqueCapabilities(report);
  const rows = [];
  for (const route of report.candidates) {
    const cells = {};
    for (const capability of capabilities) {
      cells[capability] = capabilityCell(report, route, capability);
    }
    rows.push({ route, cells });
  }
  return { capabilities, rows };
}

/**
 * Why a capability cell is empty, in check order: `no source` needs a new
 * benchmark, `excluded unit` needs a larger or fresher board, `no alias` needs a
 * config record, and `not on board` needs a different model choice.
 */
export function capabilityCell(report, route, capability) {
  const routeReport = report.scorecard.routes[route];
  const scored = routeReport?.observations.filter((observation) => capability in observation.capabilities) ?? [];
  if (scored.length > 0) {
    return { state: 'scored', score: scored.reduce((sum, observation) => sum + observation.percentile, 0) / scored.length, n: scored.length };
  }
  const unscored = routeReport?.unscored_observations.filter((observation) => capability in observation.capabilities) ?? [];
  if (unscored.length > 0) return { state: 'evidence only', n: unscored.length };

  const diagnostics = report.scorecard.diagnostics?.[capability] ?? { tier_a_benchmarks: [], scored_units: [], excluded_units: [] };
  if (diagnostics.tier_a_benchmarks.length === 0) return { state: 'no source', n: 0 };
  // An excluded unit is a board fact: no route can score it whatever the aliases say.
  if (diagnostics.scored_units.length === 0) return { state: 'excluded unit', n: 0 };
  const aliased = (routeReport?.alias_benchmarks ?? []).filter((benchmark) => diagnostics.tier_a_benchmarks.includes(benchmark));
  if (aliased.length === 0) return { state: 'no alias', n: 0 };
  return { state: 'not on board', n: 0 };
}

function executiveSummary(report) {
  const units = report.scorecard.units;
  const scored = units.filter((unit) => unit.status === 'scored').length;
  const smallBoard = units.filter((unit) => unit.status === 'small-board-excluded').length;
  const stale = units.filter((unit) => unit.status === 'stale-excluded').length;
  const stageEntries = Object.entries(report.scorecard.stages);
  const rankable = stageEntries.filter(([, stage]) => stage.rows.some((row) => row.eligible)).map(([stage]) => stage);
  const unrankable = stageEntries.filter(([, stage]) => !stage.rows.some((row) => row.eligible)).map(([stage]) => stage);
  const matrix = capabilityMatrix(report);
  const sourceless = matrix.capabilities.filter((capability) => matrix.rows.every((row) => row.cells[capability].state === 'no source'));
  const noEvidenceRoutes = matrix.rows.filter((row) => matrix.capabilities.every((capability) => row.cells[capability].state !== 'scored')).map((row) => row.route);
  const lines = [
    `${units.length} comparable unit(s): ${scored} scored, ${smallBoard} excluded as a small board, ${stale} excluded as stale.`,
    rankable.length === 0 ? 'No stage has a route at or above the coverage threshold.' : `Stages that rank: ${rankable.join(', ')}.`,
    unrankable.length === 0 ? 'Every stage has at least one rankable route.' : `Stages that stay evidence-only (coverage below ${report.meta.thresholds.rank_threshold_coverage}): ${unrankable.join(', ')}.`,
    sourceless.length === 0 ? 'Every capability has a scored observation.' : `Capabilities with no observed evidence for these routes: ${sourceless.join(', ')}.`,
    noEvidenceRoutes.length === 0 ? 'Every route has at least one observation.' : `Routes with no observed evidence: ${noEvidenceRoutes.join(', ')}.`,
    report.failures.length === 0 ? 'All tier A sources responded.' : `${report.failures.length} source(s) failed: ${report.failures.map((failure) => failure.adapter).join(', ')}.`,
    report.judge ? 'A judge assessment is present.' : 'No judge assessment: this report carries the missing-judge state.',
  ];
  return lines;
}

export function renderMarkdown(report) {
  const out = [];
  const matrix = capabilityMatrix(report);

  out.push(`# Model-routing review: ${report.meta.agent}`, '');
  out.push('## 1. Run metadata', '');
  out.push(`- Agent: ${report.meta.agent}`);
  out.push(`- Profile: ${report.meta.profile ?? 'not recorded'} (verified ${report.meta.profile_verified_at ?? 'not recorded'})`);
  out.push(`- Run: ${report.meta.run_date}-${report.meta.run_slug}`);
  out.push(`- Reference time: ${report.meta.reference_time}`);
  out.push(`- Pipeline version: ${report.meta.pipeline_version}; config hash: ${report.meta.config_hash}; manifest hash: ${report.meta.manifest_hash}`);
  out.push(`- Coverage threshold: ${report.meta.thresholds.rank_threshold_coverage}; maximum snapshot age: ${report.meta.thresholds.max_snapshot_age_days} days; contested tolerance: ${report.meta.thresholds.contested_tolerance}`);
  out.push(
    `- Judge: ${report.meta.judge ? `${report.meta.judge.model} (thinking ${report.meta.judge.thinking})${report.meta.judge.self_candidate ? ', self-candidate' : ''}` : 'disabled'}`,
  );
  out.push('');
  out.push('Sources:', '');
  out.push('| Source | Status | Retrieved | SHA-256 | URL |', '|---|---|---|---|---|');
  for (const source of report.sources) {
    out.push(`| ${source.adapter} | ${source.status} | ${source.retrieved_at ?? 'n/a'} | ${source.sha256 ?? 'n/a'} | ${source.url} |`);
  }
  out.push('');

  out.push('## 2. Executive summary', '');
  for (const line of executiveSummary(report)) out.push(`- ${line}`);
  if (report.notes) out.push('', report.notes);
  out.push('');

  out.push('## 3. Baseline route table and re-evaluation', '');
  out.push('Configured baseline routes (rank 1) with their re-evaluation:', '');
  out.push('| Stage | Baseline (rank 1) | Status | Score | Coverage |', '|---|---|---|---|---|');
  for (const [stage, stageReport] of Object.entries(report.scorecard.stages)) {
    const baselineRoute = report.baseline[stage];
    const row = stageReport.rows.find((entry) => entry.route_id === baselineRoute);
    if (!row) continue;
    out.push(`| ${stage} | ${baselineRoute ?? 'none'} | ${row.eligible ? `rank ${row.rank}` : 'evidence only'} | ${row.score === null ? 'n/a' : fmt(row.score)} | ${pct(row.coverage)} |`);
  }
  out.push('');
  out.push('Full configured chains:', '');
  out.push('| Stage | Chain (rank order) |', '|---|---|');
  for (const [stage, chain] of Object.entries(report.chains)) {
    out.push(`| ${stage} | ${chain.join(' > ')} |`);
  }
  out.push('');

  out.push('## 4. Capability coverage matrix', '');
  out.push('Values are the mean percentile rank of the observations for that capability. Empty cells state why: `no source` (no tier A benchmark carries this capability), `excluded unit` (the board is too small or stale), `no alias` (add an alias record), `not on board` (the model has no published row).', '');
  out.push(`| Route | ${matrix.capabilities.join(' | ')} |`, `|---|${matrix.capabilities.map(() => '---').join('|')}|`);
  for (const row of matrix.rows) {
    const cells = matrix.capabilities.map((capability) => {
      const cell = row.cells[capability];
      if (cell.state === 'scored') return fmt(cell.score);
      return cell.state;
    });
    out.push(`| ${row.route} | ${cells.join(' | ')} |`);
  }
  out.push('');

  out.push('## 5. Deterministic scorecard per stage', '');
  for (const [stage, stageReport] of Object.entries(report.scorecard.stages)) {
    out.push(`### ${stage}`, '');
    out.push(`Weights: ${Object.entries(stageReport.weights).map(([id, weight]) => `${id} ${weight}`).join(', ')}`, '');
    out.push('| Rank | Route | Score | Coverage | Scored weight | Status | Missing capabilities |', '|---|---|---|---|---|---|---|');
    const ranked = [...stageReport.rows].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.route_id.localeCompare(b.route_id));
    for (const row of ranked) {
      out.push(
        `| ${rankLabel(row)} | ${row.route_id} | ${row.score === null ? 'n/a' : fmt(row.score)} | ${pct(row.coverage)} | ${fmt(row.scored_weight, 2)} | ${row.eligible ? 'ranked' : 'evidence only'} | ${row.missing_capabilities.map((entry) => `${entry.id} (${entry.weight})`).join(', ') || 'none'} |`,
      );
    }
    out.push('');
    out.push('Evidence-only rows carry no rank, no composite, and no recommendation. Their observations are in the evidence appendix.', '');
  }

  out.push('## 6. Fuzzy assessment (judge)', '');
  if (!report.judge) {
    out.push('State: `missing-judge`. No advisory assessment is present. The deterministic scorecard stands unchanged.', '');
  } else {
    const assessment = report.judge.assessment;
    out.push(`Judge: ${report.judge.model} (thinking ${report.judge.thinking})${report.judge.self_candidate ? ' — tagged `self-candidate`: the judge is under evaluation' : ''}`, '');
    out.push(`Prompt version: ${report.judge.prompt_version}; received: ${report.judge.received_at}`, '');
    out.push('Strengths:', '');
    for (const item of assessment.strengths) out.push(`- ${item}`);
    out.push('', 'Risks:', '');
    for (const item of assessment.risks) out.push(`- ${item}`);
    out.push('', 'Disqualifiers:', '');
    if (assessment.disqualifiers.length === 0) out.push('- none reported');
    for (const item of assessment.disqualifiers) out.push(`- ${item}`);
    out.push('', `Judge confidence: ${assessment.confidence}`, '');
    out.push('Divergence from the scorecard:', '');
    if (assessment.divergence.length === 0) out.push('- none reported');
    for (const item of assessment.divergence) out.push(`- ${item}`);
    out.push('', 'The judge is advisory. It cannot change a deterministic score.', '');
  }
  out.push(calibrationLine(report), '');

  out.push('## 7. Divergences and contradictions', '');
  const contested = report.candidates.flatMap((route) => report.scorecard.routes[route]?.conflicts.map((conflict) => ({ route, conflict })) ?? []);
  if (contested.length === 0) out.push('- No contested units were detected.', '');
  for (const { route, conflict } of contested) {
    out.push(`- Contested: ${route} in unit ${conflict.unit_key} — values ${conflict.values.join(' vs ')} from ${conflict.source_models.join(' vs ')} (${conflict.basis}). Excluded from aggregation.`);
  }
  for (const [stage, signal] of Object.entries(report.scorecard.signals)) {
    if (signal.signal === 'candidate_ahead') out.push(`- ${stage}: candidate ahead — ${signal.candidates_ahead.join(', ')} above ${signal.baseline}.`);
  }
  const stale = report.scorecard.units.filter((unit) => unit.status === 'stale-excluded');
  for (const unit of stale) out.push(`- Stale snapshot excluded: ${unit.unit_key} (age ${unit.snapshot_age_days} days, limit ${unit.max_snapshot_age_days}).`);
  for (const failure of report.failures) out.push(`- Source failure: ${failure.adapter} — ${failure.message}. Affected capabilities become coverage gaps.`);
  out.push('');

  out.push('## 8. Recommendation per stage', '');
  if (report.recommendations.length === 0) {
    out.push('State: `missing-recommendations`. The renderer does not invent a recommendation. It reports the deterministic signals only:', '');
    for (const [stage, signal] of Object.entries(report.derived_signals)) {
      out.push(`- ${stage}: ${signal.signal} — ${signal.rationale}`);
    }
    out.push('', 'Author the recommendation in the run manifest (`recommendations`) and re-run `render`.', '');
  } else {
    out.push('| Stage | Decision | Rationale |', '|---|---|---|');
    for (const recommendation of report.recommendations) {
      out.push(`| ${recommendation.task} | ${recommendation.decision} | ${recommendation.rationale} |`);
    }
    out.push('', 'Applying any change requires explicit user approval. Routing files are not modified by this pipeline.', '');
  }

  out.push('## 9. Validation and rollback criteria', '');
  out.push('- Measure before and after each applied change on the affected stage, with the same prompt and candidate models.');
  out.push('- Roll back the stage when the new primary fails a stage task twice in a row, or when it needs more retries than the previous primary for the same task.');
  out.push('- Keep the previous primary as the next rank so a rollback is a frontmatter edit, not a re-evaluation.');
  out.push('- Re-run this pipeline after any model release, provider change, or adapter failure.');
  out.push('');

  out.push('## 10. Evidence appendix', '');
  out.push('| Route | Benchmark | Board | Metric | Value | Percentile | Scope | Role | Date | Attempts | Uncertainty | URL |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const route of report.candidates) {
    const routeReport = report.scorecard.routes[route];
    if (!routeReport) continue;
    for (const observation of [...routeReport.observations, ...routeReport.unscored_observations]) {
      const role = Object.entries(observation.capabilities).map(([id, value]) => `${id}:${value}`).join(' ');
      const uncertainty = observation.uncertainty ? `${observation.uncertainty.kind} ${fmt(observation.uncertainty.lo)}-${fmt(observation.uncertainty.hi)}` : 'not published';
      out.push(
        `| ${route} | ${observation.benchmark_name} | ${observation.board} | ${observation.metric} (${observation.harness_class}) | ${fmt(observation.value)} | ${fmt(observation.percentile)} | ${observation.source_scope} | ${role} | ${observation.date ?? 'n/a'} | ${observation.attempts ?? 'n/a'} | ${uncertainty} | ${observation.url} |`,
      );
    }
  }
  out.push('');
  out.push('Comparable units and exclusions:', '');
  out.push('| Unit | Population | Status | Snapshot | SHA-256 |', '|---|---|---|---|---|');
  for (const unit of report.scorecard.units) {
    out.push(`| ${unit.unit_key} | ${unit.population_size} | ${unit.status}${unit.small_board ? ' (small-board flag)' : ''} | ${unit.snapshot.retrieved_at} | ${unit.snapshot.sha256.slice(0, 16)}… |`);
  }
  out.push('');
  out.push('Rejected and evidence-only frameworks are recorded in `references/benchmarks.md` with their tier and caveats.', '');
  return `${out.join('\n')}\n`;
}

function reportTitle(report) {
  return `Model-routing review: ${report.meta.agent} ${report.meta.run_date}`;
}

export function renderHtml(report) {
  const matrix = capabilityMatrix(report);
  const sections = [];

  const sourceRows = report.sources.map((source) => [
    escapeHtml(source.adapter),
    escapeHtml(source.status),
    escapeHtml(source.retrieved_at ?? 'n/a'),
    escapeHtml((source.sha256 ?? 'n/a').slice(0, 16)),
    `<a href="${escapeHtml(safeUrl(source.url))}">${escapeHtml(source.url)}</a>`,
  ]);

  sections.push(`<section><h2>1. Run metadata</h2>
<p>Agent <strong>${escapeHtml(report.meta.agent)}</strong>; profile ${escapeHtml(report.meta.profile ?? 'not recorded')}; run ${escapeHtml(`${report.meta.run_date}-${report.meta.run_slug}`)}; reference time ${escapeHtml(report.meta.reference_time)}.</p>
<p>Pipeline version ${report.meta.pipeline_version}; config hash <code>${escapeHtml(report.meta.config_hash)}</code>; manifest hash <code>${escapeHtml(report.meta.manifest_hash)}</code>.</p>
<p>Coverage threshold ${escapeHtml(report.meta.thresholds.rank_threshold_coverage)}; maximum snapshot age ${escapeHtml(report.meta.thresholds.max_snapshot_age_days)} days; contested tolerance ${escapeHtml(report.meta.thresholds.contested_tolerance)}.</p>
<p>Judge: ${report.meta.judge ? `${escapeHtml(report.meta.judge.model)} (thinking ${escapeHtml(report.meta.judge.thinking)})${report.meta.judge.self_candidate ? ' — <em>self-candidate</em>' : ''}` : 'disabled'}.</p>
${htmlTable(['Source', 'Status', 'Retrieved', 'SHA-256', 'URL'], sourceRows)}</section>`);

  sections.push(`<section><h2>2. Executive summary</h2><ul>${executiveSummary(report)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('')}</ul>${report.notes ? `<p>${escapeHtml(report.notes)}</p>` : ''}</section>`);

  const baselineRows = Object.entries(report.scorecard.stages).flatMap(([stage, stageReport]) => {
    const row = stageReport.rows.find((entry) => entry.route_id === report.baseline[stage]);
    return row
      ? [[escapeHtml(stage), escapeHtml(report.baseline[stage] ?? 'none'), row.eligible ? `rank ${row.rank}` : '<span class="warn">evidence only</span>', escapeHtml(row.score === null ? 'n/a' : fmt(row.score)), escapeHtml(pct(row.coverage))]]
      : [];
  });
  const chainRows = Object.entries(report.chains).map(([stage, chain]) => [escapeHtml(stage), escapeHtml(chain.join(' > '))]);
  sections.push(`<section><h2>3. Baseline route table and re-evaluation</h2>${htmlTable(['Stage', 'Baseline (rank 1)', 'Eligible', 'Score', 'Coverage'], baselineRows)}${htmlTable(['Stage', 'Configured chain (rank 1)'], chainRows)}</section>`);

  const matrixRows = matrix.rows.map((row) => [
    escapeHtml(row.route),
    ...matrix.capabilities.map((capability) => {
      const cell = row.cells[capability];
      const label = cell.state === 'scored' ? fmt(cell.score) : cell.state;
      const style = cell.state === 'scored' ? scoreTint(cell.score) : stateTint(cell.state);
      const title = cell.state === 'scored' ? `${stateTitle('scored')} Mean percentile ${fmt(cell.score)} over ${cell.n} observation(s).` : stateTitle(cell.state);
      const marked = cell.state === 'no source' || cell.state === 'not on board' ? `<span class="muted">${escapeHtml(label)}</span>` : escapeHtml(label);
      return `<span title="${escapeHtml(title)}" style="display:block;padding:.15rem .3rem;border-radius:2px;${style}">${marked}</span>`;
    }),
  ]);
  sections.push(`<section><h2>4. Capability coverage matrix</h2><p class="muted">Values are the mean percentile rank of the observations for that capability. Tint shows the same information as the number; the text always states the reason.</p>${coverageLegend()}${htmlTable(['Route', ...matrix.capabilities], matrixRows)}</section>`);

  const stageBlocks = Object.entries(report.scorecard.stages)
    .map(([stage, stageReport]) => {
      const rows = [...stageReport.rows]
        .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.route_id.localeCompare(b.route_id))
        .map((row) => [
          escapeHtml(rankLabel(row)),
          escapeHtml(row.route_id),
          escapeHtml(row.score === null ? 'n/a' : fmt(row.score)),
          escapeHtml(pct(row.coverage)),
          escapeHtml(fmt(row.scored_weight, 2)),
          row.eligible ? 'ranked' : '<span class="warn">evidence only</span>',
          escapeHtml(row.missing_capabilities.map((entry) => `${entry.id} (${entry.weight})`).join(', ') || 'none'),
        ]);
      const weights = Object.entries(stageReport.weights).map(([id, weight]) => `${id} ${weight}`).join(', ');
      return `<h3>${escapeHtml(stage)}</h3><p class="muted">Weights: ${escapeHtml(weights)}</p>${htmlTable(['Rank', 'Route', 'Score', 'Coverage', 'Scored weight', 'Status', 'Missing capabilities'], rows)}`;
    })
    .join('');
  sections.push(`<section><h2>5. Deterministic scorecard per stage</h2>${stageBlocks}</section>`);

  const judgeHtml = report.judge
    ? `<p>Judge ${escapeHtml(report.judge.model)} (thinking ${escapeHtml(report.judge.thinking)})${report.judge.self_candidate ? ' — tagged <code>self-candidate</code>: the judge is under evaluation' : ''}. Prompt version ${escapeHtml(report.judge.prompt_version)}; received ${escapeHtml(report.judge.received_at)}.</p>
<p><strong>Strengths</strong></p><ul>${report.judge.assessment.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
<p><strong>Risks</strong></p><ul>${report.judge.assessment.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
<p><strong>Disqualifiers</strong></p><ul>${report.judge.assessment.disqualifiers.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>none reported</li>'}</ul>
<p>Confidence: ${escapeHtml(report.judge.assessment.confidence)}</p>
<p><strong>Divergence</strong></p><ul>${report.judge.assessment.divergence.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>none reported</li>'}</ul>
<p class="muted">The judge is advisory. It cannot change a deterministic score.</p>`
    : '<p>State <code>missing-judge</code>. No advisory assessment is present. The deterministic scorecard stands unchanged.</p>';
  sections.push(`<section><h2>6. Fuzzy assessment (judge)</h2>${judgeHtml}<p class="muted">${escapeHtml(calibrationLine(report))}</p></section>`);

  const divergenceItems = [
    ...report.candidates.flatMap((route) => report.scorecard.routes[route]?.conflicts.map((conflict) => `Contested: ${route} in ${conflict.unit_key} — ${conflict.values.join(' vs ')} (${conflict.basis}).`) ?? []),
    ...Object.entries(report.scorecard.signals).filter(([, signal]) => signal.signal === 'candidate_ahead').map(([stage, signal]) => `${stage}: ${signal.candidates_ahead.join(', ')} ahead of ${signal.baseline}.`),
    ...report.scorecard.units.filter((unit) => unit.status === 'stale-excluded').map((unit) => `Stale snapshot excluded: ${unit.unit_key} (${unit.snapshot_age_days} days).`),
    ...report.failures.map((failure) => `Source failure: ${failure.adapter} — ${failure.message}.`),
  ];
  sections.push(`<section><h2>7. Divergences and contradictions</h2><ul>${divergenceItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>None detected.</li>'}</ul></section>`);

  const recommendationHtml =
    report.recommendations.length === 0
      ? `<p>State <code>missing-recommendations</code>. The renderer does not invent a recommendation.</p><ul>${Object.entries(report.derived_signals)
          .map(([stage, signal]) => `<li>${escapeHtml(stage)}: ${escapeHtml(signal.signal)} — ${escapeHtml(signal.rationale)}</li>`)
          .join('')}</ul>`
      : `${htmlTable(['Stage', 'Decision', 'Rationale'], report.recommendations.map((recommendation) => [escapeHtml(recommendation.task), escapeHtml(recommendation.decision), escapeHtml(recommendation.rationale)]))}<p class="muted">Applying any change requires explicit user approval. Routing files are not modified by this pipeline.</p>`;
  sections.push(`<section><h2>8. Recommendation per stage</h2>${recommendationHtml}</section>`);

  sections.push(`<section><h2>9. Validation and rollback criteria</h2><ul>
<li>Measure before and after each applied change on the affected stage, with the same prompt and candidate models.</li>
<li>Roll back the stage when the new primary fails a stage task twice in a row, or needs more retries than the previous primary for the same task.</li>
<li>Keep the previous primary as the next rank so a rollback is a frontmatter edit, not a re-evaluation.</li>
<li>Re-run this pipeline after any model release, provider change, or adapter failure.</li></ul></section>`);

  const evidenceRows = report.candidates.flatMap((route) =>
    [...(report.scorecard.routes[route]?.observations ?? []), ...(report.scorecard.routes[route]?.unscored_observations ?? [])].map((observation) => [
      escapeHtml(route),
      escapeHtml(observation.benchmark_name),
      escapeHtml(`${observation.board} / ${observation.metric} / ${observation.harness_class}`),
      escapeHtml(fmt(observation.value)),
      escapeHtml(fmt(observation.percentile)),
      escapeHtml(observation.source_scope),
      escapeHtml(Object.entries(observation.capabilities).map(([id, role]) => `${id}:${role}`).join(' ')),
      escapeHtml(observation.date ?? 'n/a'),
      escapeHtml(observation.attempts ?? 'n/a'),
      escapeHtml(observation.uncertainty ? `${observation.uncertainty.kind} ${fmt(observation.uncertainty.lo)}-${fmt(observation.uncertainty.hi)}` : 'not published'),
      `<a href="${escapeHtml(safeUrl(observation.url))}">source</a>`,
    ]),
  );
  const unitRows = report.scorecard.units.map((unit) => [
    escapeHtml(unit.unit_key),
    escapeHtml(unit.population_size),
    escapeHtml(`${unit.status}${unit.small_board ? ' (small-board flag)' : ''}`),
    escapeHtml(unit.snapshot.retrieved_at),
    escapeHtml(unit.snapshot.sha256.slice(0, 16)),
  ]);
  sections.push(`<section><h2>10. Evidence appendix</h2>${htmlTable(['Route', 'Benchmark', 'Board / metric / harness', 'Value', 'Percentile', 'Scope', 'Role', 'Date', 'Attempts', 'Uncertainty', 'Source'], evidenceRows)}${htmlTable(['Unit', 'Population', 'Status', 'Snapshot', 'SHA-256'], unitRows)}<p class="muted">Rejected and evidence-only frameworks are recorded in <code>references/benchmarks.md</code>.</p></section>`);

  return renderPage({
    title: reportTitle(report),
    heading: `Model-routing review: ${report.meta.agent} (${report.meta.run_date})`,
    body: sections.join('\n'),
  });
}
