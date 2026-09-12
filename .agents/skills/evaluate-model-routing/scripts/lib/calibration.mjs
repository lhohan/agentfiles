// Judge calibration. Frozen scorecards with planted defects measure whether the
// judge notices them. Detection is keyword-based and therefore a proxy: it shows
// that a defect was addressed, not that the wording was correct.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildJudgePrompt } from './judge.mjs';
import { PROMPT_VERSION } from './judge.mjs';

const UNIT = { unit_key: 'calib|v1|agent-cli', status: 'scored', population_size: 20, snapshot: { retrieved_at: '2026-09-12T00:00:00.000Z' }, snapshot_age_days: 0, max_snapshot_age_days: 30, population: [] };

function observation(overrides = {}) {
  return {
    benchmark: 'deepswe',
    unit_key: UNIT.unit_key,
    source_scope: 'model',
    percentile: 0.8,
    model_display: 'calibration-model',
    alias: { note: 'exact release match' },
    capabilities: { software_engineering: 'primary' },
    ...overrides,
  };
}

function baseReport({ stages, routes, signals }) {
  return {
    meta: { agent: 'pi', reference_time: '2026-09-12T00:00:00.000Z', thresholds: { rank_threshold_coverage: 0.5, max_snapshot_age_days: 30, contested_tolerance: 0.05 }, judge: { model: 'judge/model', thinking: 'high', self_candidate: false } },
    baseline: { implement: 'p/baseline' },
    candidates: ['p/baseline', 'p/candidate'],
    derived_signals: signals,
    scorecard: {
      stages,
      routes,
      units: [UNIT],
    },
  };
}

function stageRow(overrides = {}) {
  return {
    route_id: 'p/candidate',
    score: 0.8,
    coverage: 1,
    eligible: true,
    rank: 1,
    tied_with: [],
    tie_kind: null,
    missing_capabilities: [],
    ...overrides,
  };
}

/**
 * Every scenario plants exactly one defect that a stated rule forbids. A judge
 * that reads its glossary should name it.
 */
export const SCENARIOS = [
  {
    id: 'rank-below-threshold',
    planted_defect: 'A stage ranks a route whose coverage is below rank_threshold_coverage, even though the rules forbid a rank below the threshold.',
    must_mention: [['coverage'], ['threshold', 'evidence only', 'rank']],
    build: () =>
      baseReport({
        stages: { implement: { weights: { software_engineering: 1 }, rows: [stageRow({ coverage: 0.2, score: 0.9 })] } },
        routes: { 'p/baseline': { observations: [], unscored_observations: [], alias_benchmarks: [] }, 'p/candidate': { observations: [observation()], unscored_observations: [], alias_benchmarks: ['deepswe'] } },
        signals: { implement: { signal: 'baseline_unrankable', baseline: 'p/baseline', rationale: 'example' } },
      }),
  },
  {
    id: 'proxy-family-scored',
    planted_defect: 'A family-level observation (source_scope proxy-family) is presented inside the scored observations, which promotes proxy evidence to a routed result.',
    must_mention: [['proxy', 'family'], ['scor', 'not scored', 'unscored']],
    build: () =>
      baseReport({
        stages: { implement: { weights: { software_engineering: 1 }, rows: [stageRow()] } },
        routes: {
          'p/baseline': { observations: [], unscored_observations: [], alias_benchmarks: [] },
          'p/candidate': { observations: [observation({ source_scope: 'proxy-family', model_display: 'other-release' })], unscored_observations: [], alias_benchmarks: ['deepswe'] },
        },
        signals: { implement: { signal: 'candidate_ahead', baseline: 'p/baseline', candidates_ahead: ['p/candidate'], rationale: 'example' } },
      }),
  },
  {
    id: 'cross-unit-averaged',
    planted_defect: 'Two observations from different units are averaged into one figure, which the rules forbid because values are only comparable inside one unit.',
    must_mention: [['unit'], ['average', 'averag', 'mix', 'combine', 'incomparable', 'compare']],
    build: () =>
      baseReport({
        stages: { implement: { weights: { software_engineering: 1 }, rows: [stageRow()] } },
        routes: {
          'p/baseline': { observations: [], unscored_observations: [], alias_benchmarks: [] },
          'p/candidate': {
            observations: [
              observation(),
              observation({ benchmark: 'tbench-v2.1', unit_key: 'calib2|v1|agent-cli', percentile: 0.2, capabilities: { tool_use: 'primary' } }),
            ],
            unscored_observations: [],
            alias_benchmarks: ['deepswe', 'tbench-v2.1'],
          },
        },
        signals: { implement: { signal: 'candidate_ahead', baseline: 'p/baseline', candidates_ahead: ['p/candidate'], rationale: 'example' } },
      }),
  },
];

export function scenarioById(id) {
  const scenario = SCENARIOS.find((entry) => entry.id === id);
  if (!scenario) throw new Error(`Unknown calibration scenario "${id}"`);
  return scenario;
}

/** Does the judge response address the planted defect? */
export function detectionFor(scenario, assessment) {
  const text = [...assessment.strengths, ...assessment.risks, ...assessment.disqualifiers, ...assessment.divergence].join(' ').toLowerCase();
  const groups = scenario.must_mention.map((alternatives) => alternatives.some((word) => text.includes(word.toLowerCase())));
  return { found: groups.every(Boolean), matched_groups: groups.filter(Boolean).length, groups: groups.length };
}

/**
 * Write one prompt per scenario and score every response that already exists.
 * @returns {{fixtures: any[], detected: number, total: number, awaiting: number}}
 */
export function calibrate({ config, runDir, promptVersion = PROMPT_VERSION }) {
  const dir = join(runDir, 'calibration');
  mkdirSync(dir, { recursive: true });
  const fixtures = [];
  for (const scenario of SCENARIOS) {
    const report = scenario.build();
    const promptPath = join(dir, `${scenario.id}.prompt.md`);
    writeFileSync(promptPath, buildJudgePrompt({ config, report }));
    const responsePath = join(dir, `${scenario.id}.result.json`);
    const fixture = {
      id: scenario.id,
      planted_defect: scenario.planted_defect,
      prompt_file: `${scenario.id}.prompt.md`,
      response_file: `${scenario.id}.result.json`,
      judge_command:
        `pi -p --model ${config.judges[0].model} --thinking ${config.judges[0].thinking} --no-session --no-tools ` +
        `--no-extensions --no-skills --no-prompt-templates --no-context-files < "${promptPath}" > "${responsePath}"`,
      found: null,
    };
    if (existsSync(responsePath)) {
      const raw = readFileSync(responsePath, 'utf8');
      const parsed = JSON.parse(raw);
      fixture.found = detectionFor(scenario, {
        strengths: parsed.strengths ?? [],
        risks: parsed.risks ?? [],
        disqualifiers: parsed.disqualifiers ?? [],
        divergence: parsed.divergence ?? [],
      }).found;
    }
    fixtures.push(fixture);
  }
  const answered = fixtures.filter((fixture) => fixture.found !== null);
  const result = {
    calibration_version: 1,
    prompt_version: promptVersion,
    judge: config.judges[0],
    status: answered.length === 0 ? 'awaiting-responses' : answered.length < fixtures.length ? 'partial' : 'complete',
    fixtures,
    detected: answered.filter((fixture) => fixture.found).length,
    scored: answered.length,
    total: fixtures.length,
    detection_note: 'Keyword detection is a proxy. It shows the judge addressed the planted defect, not that its wording or reasoning was correct.',
  };
  writeFileSync(join(dir, 'calibration.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
