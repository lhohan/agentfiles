// Judge calibration tests: the planted defects are real, the detector works, and
// the command reports its states without calling a model.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { calibrate, detectionFor, SCENARIOS } from '../lib/calibration.mjs';
import { buildJudgePrompt } from '../lib/judge.mjs';

const skillDir = resolve(import.meta.dirname, '..', '..');
const cli = join(skillDir, 'scripts', 'evaluate.mjs');
const manifestPath = join(skillDir, 'references', 'manifest.example.json');
const CONFIG = { judges: [{ model: 'judge/model', thinking: 'high' }] };

function run(args) {
  try {
    return { code: 0, stdout: execFileSync('node', [cli, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), stderr: '' };
  } catch (error) {
    return { code: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

test('every scenario builds a prompt the judge can consume', () => {
  for (const scenario of SCENARIOS) {
    const prompt = buildJudgePrompt({ config: CONFIG, report: scenario.build() });
    assert.ok(prompt.includes('version 3'), `${scenario.id} prompt carries the prompt version`);
    assert.ok(prompt.includes('<<<BEGIN-DATA'), `${scenario.id} prompt carries the data block`);
  }
});

test('every scenario really plants its defect', () => {
  const [ranked, proxy, crossUnit] = SCENARIOS.map((scenario) => scenario.build());
  const rankedRow = ranked.scorecard.stages.implement.rows[0];
  assert.ok(rankedRow.rank !== null && rankedRow.coverage < ranked.meta.thresholds.rank_threshold_coverage, 'rank-below-threshold ranks a low-coverage route');

  const proxyObservation = proxy.scorecard.routes['p/candidate'].observations[0];
  assert.equal(proxyObservation.source_scope, 'proxy-family', 'proxy-family-scored puts family evidence in the scored list');

  const units = new Set(crossUnit.scorecard.routes['p/candidate'].observations.map((observation) => observation.unit_key));
  assert.equal(units.size, 2, 'cross-unit-averaged mixes two units in one candidate');
  assert.equal(crossUnit.scorecard.routes['p/candidate'].observations.filter((observation) => Object.keys(observation.capabilities).length === 1).length >= 2, true);
});

test('detection needs every keyword group', () => {
  const scenario = SCENARIOS[0];
  const complete = { strengths: ['coverage is below the threshold'], risks: [], disqualifiers: [], divergence: [] };
  const partial = { strengths: ['coverage looks fine'], risks: [], disqualifiers: [], divergence: [] };
  assert.equal(detectionFor(scenario, complete).found, true);
  assert.equal(detectionFor(scenario, partial).found, false);
});

test('calibrate writes one prompt per scenario and awaits responses', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-calib-'));
  const result = calibrate({ config: CONFIG, runDir });
  assert.equal(result.status, 'awaiting-responses');
  assert.equal(result.total, SCENARIOS.length);
  assert.equal(result.detected, 0);
  for (const fixture of result.fixtures) {
    assert.ok(existsSync(join(runDir, 'calibration', fixture.prompt_file)), `${fixture.id} prompt written`);
    assert.equal(fixture.found, null);
  }
  assert.ok(existsSync(join(runDir, 'calibration', 'calibration.json')));
});

test('calibrate scores an existing response and reports a miss', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-calib2-'));
  calibrate({ config: CONFIG, runDir });
  for (const scenario of SCENARIOS) {
    writeFileSync(
      join(runDir, 'calibration', `${scenario.id}.result.json`),
      JSON.stringify({ strengths: ['nothing to report'], risks: [], disqualifiers: [], divergence: [] }),
    );
  }
  const missed = calibrate({ config: CONFIG, runDir });
  assert.equal(missed.status, 'complete');
  assert.equal(missed.detected, 0);
  assert.equal(missed.scored, SCENARIOS.length);

  const good = { strengths: [], risks: [], disqualifiers: [], divergence: [] };
  const filled = {
    strengths: ['The response should flag this'],
    risks: SCENARIOS.map((scenario) => `${scenario.planted_defect} proxy unit coverage threshold average`),
    disqualifiers: [],
    divergence: [],
  };
  void good;
  writeFileSync(join(runDir, 'calibration', `${SCENARIOS[0].id}.result.json`), JSON.stringify(filled));
  const detected = calibrate({ config: CONFIG, runDir });
  assert.equal(detected.detected, 1);
});

test('judge-calibrate exits 0 while awaiting responses and 7 on a miss', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'emr-calib3-'));
  const awaiting = run(['judge-calibrate', '--manifest', manifestPath, '--run', runDir]);
  assert.equal(awaiting.code, 0, awaiting.stderr);
  assert.match(awaiting.stdout, /awaiting-responses/);

  for (const scenario of SCENARIOS) {
    writeFileSync(join(runDir, 'calibration', `${scenario.id}.result.json`), JSON.stringify({ strengths: [], risks: [], disqualifiers: [], confidence: 'low', divergence: [] }));
  }
  const miss = run(['judge-calibrate', '--manifest', manifestPath, '--run', runDir]);
  assert.equal(miss.code, 7);
  assert.match(miss.stderr, /missed a planted defect/);

  const calibration = JSON.parse(readFileSync(join(runDir, 'calibration', 'calibration.json'), 'utf8'));
  assert.equal(calibration.detected, 0);
  assert.equal(calibration.scored, SCENARIOS.length);
});
