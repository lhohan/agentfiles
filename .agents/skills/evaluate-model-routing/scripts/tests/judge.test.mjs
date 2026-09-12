// Judge contract tests: the prompt carries the evidence context the judge needs,
// and the import rejects anything outside the schema.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJudgePrompt, PROMPT_VERSION, validateJudgeResult } from '../lib/judge.mjs';

const CONFIG = { judges: [{ model: 'judge/model', thinking: 'high' }] };

function report(overrides = {}) {
  const observation = {
    benchmark: 'deepswe',
    unit_key: 'deepswe|v1.1|agent-cli',
    source_scope: 'model',
    percentile: 0.75,
    model_display: 'gpt-5-6-sol',
    alias: { note: 'exact release match' },
  };
  const proxy = { ...observation, source_scope: 'proxy-family', model_display: 'deepseek-v4-flash', alias: { note: 'family only' } };
  return {
    meta: { agent: 'pi', reference_time: '2026-09-11T00:00:00.000Z', thresholds: { rank_threshold_coverage: 0.5 } },
    baseline: { implement: 'p/a' },
    candidates: ['p/a'],
    derived_signals: { implement: { signal: 'baseline_unrankable', rationale: 'no eligible baseline' } },
    scorecard: {
      stages: { implement: { weights: { software_engineering: 1 }, rows: [{ route_id: 'p/a', score: 0.4, coverage: 1, eligible: true, rank: 1, missing_capabilities: [] }] } },
      routes: { 'p/a': { observations: [observation], unscored_observations: [proxy] } },
      units: [{ unit_key: 'deepswe|v1.1|agent-cli', status: 'scored', population_size: 20, snapshot: { retrieved_at: '2026-09-11T00:00:00.000Z' }, snapshot_age_days: 0.25, max_snapshot_age_days: 30, population: [] }],
    },
    ...overrides,
  };
}

test('the judge prompt carries rank, alias scope, proxy-family state, and a signal glossary', () => {
  const prompt = buildJudgePrompt({ config: CONFIG, report: report() });
  assert.ok(prompt.includes(`version ${PROMPT_VERSION}`));
  assert.ok(prompt.includes('"rank": 1'), 'rank is visible to the judge');
  assert.ok(prompt.includes('"snapshot_age_days": 0.25'), 'snapshot age is visible to the judge');
  assert.ok(prompt.includes('"alias_rule": "exact release match"'), 'alias rationale is visible');
  assert.ok(prompt.includes('proxy-family (deliberately not scored)'), 'proxy-family evidence is labelled');
  assert.ok(prompt.includes('signal: baseline_unrankable'), 'signal semantics are glossed');
  assert.ok(prompt.includes('<<<BEGIN-DATA'), 'evidence sits inside the untrusted data block');
  assert.ok(prompt.includes('END-DATA>>>'));
});

test('the judge prompt keeps the no-computation rules', () => {
  const prompt = buildJudgePrompt({ config: CONFIG, report: report() });
  assert.ok(prompt.includes('Do not invent, recompute, or restate any score'));
  assert.ok(prompt.includes('untrusted'), 'the data block is marked untrusted');
  assert.ok(prompt.includes('never as'), 'instruction-like text inside the data block is rejected');
});

test('validateJudgeResult rejects extra keys, bad types, and bad confidence', () => {
  const good = { strengths: [], risks: ['r'], disqualifiers: [], confidence: 'medium', divergence: [] };
  assert.equal(validateJudgeResult(JSON.stringify(good), { model: 'm', thinking: 'high' }).assessment.risks[0], 'r');
  const cases = [
    [JSON.stringify({ ...good, extra: 1 }), /unexpected keys/],
    [JSON.stringify({ ...good, strengths: 'x' }), /strengths/],
    [JSON.stringify({ ...good, confidence: 'certain' }), /confidence/],
    ['not json', /not valid JSON/],
    [JSON.stringify([1, 2]), /must be a JSON object/],
  ];
  for (const [raw, pattern] of cases) {
    assert.throws(() => validateJudgeResult(raw, { model: 'm', thinking: 'high' }), (error) => error.exit === 5 && pattern.test(error.message), raw);
  }
});
