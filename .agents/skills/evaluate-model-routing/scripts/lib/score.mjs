// Scoring. Percentile ranks are computed inside one unit; capability and stage
// scores are weighted means over what is present. Nothing is imputed.

import { ROLE_WEIGHTS } from './registry.mjs';
import { maxAgeFor, resolveAliases } from './config.mjs';

export const SMALL_BOARD_EXCLUDED = 10;
export const SMALL_BOARD_FLAGGED = 20;

/** Percentile rank in [0, 1] with midrank tie handling. */
export function percentileRanks(values, direction) {
  const n = values.length;
  return values.map((value) => {
    let less = 0;
    let equal = 0;
    for (const other of values) {
      if (other < value) less += 1;
      else if (other === value) equal += 1;
    }
    const rank = (less + 0.5 * equal) / n;
    return direction === 'lower' ? 1 - rank : rank;
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Two observations of one route in one unit disagree beyond their uncertainty. */
export function disagreements(observations, tolerance) {
  const conflicts = [];
  for (let i = 0; i < observations.length; i += 1) {
    for (let j = i + 1; j < observations.length; j += 1) {
      const a = observations[i];
      const b = observations[j];
      if (a.unit_key !== b.unit_key) continue;
      const bothIntervals = a.uncertainty && b.uncertainty;
      const disjoint = bothIntervals && (a.uncertainty.hi < b.uncertainty.lo || b.uncertainty.hi < a.uncertainty.lo);
      const farApart = !bothIntervals && Math.abs(a.value - b.value) > tolerance;
      if (disjoint || farApart) {
        conflicts.push({
          unit_key: a.unit_key,
          benchmark: a.benchmark,
          values: [a.value, b.value],
          source_models: [a.model_display, b.model_display],
          basis: disjoint ? 'disjoint published intervals' : `difference above contested_tolerance (${tolerance})`,
        });
      }
    }
  }
  return conflicts;
}

/**
 * @param {object} spec
 * @param {any} spec.config
 * @param {any} spec.registry
 * @param {any} spec.manifest
 * @param {any[]} spec.units
 * @param {string} spec.referenceTime ISO timestamp used for the staleness check
 */
export function score({ config, registry, manifest, units, referenceTime }) {
  const threshold = config.rank_threshold_coverage;
  const scoredUnits = [];
  const routeObservations = new Map();

  for (const unit of units) {
    const entry = registry.byId.get(unit.benchmark);
    const maxAge = maxAgeFor(config, unit.benchmark);
    const ageDays = (Date.parse(referenceTime) - Date.parse(unit.snapshot.retrieved_at)) / 86_400_000;
    const stale = !(ageDays <= maxAge);
    const values = unit.population.map((row) => row.value);
    const excluded = unit.population.length < SMALL_BOARD_EXCLUDED || stale;
    const ranks = excluded ? [] : percentileRanks(values, unit.direction);
    const smallBoard = !excluded && unit.population.length < SMALL_BOARD_FLAGGED;
    scoredUnits.push({
      unit_key: unit.unit_key,
      benchmark: unit.benchmark,
      benchmark_name: unit.benchmark_name,
      board: unit.board,
      version: unit.version,
      split: unit.split,
      metric: unit.metric,
      direction: unit.direction,
      harness_class: unit.harness_class,
      population_size: unit.population.length,
      status: stale ? 'stale-excluded' : (excluded ? 'small-board-excluded' : 'scored'),
      snapshot_age_days: Number(ageDays.toFixed(3)),
      max_snapshot_age_days: maxAge,
      small_board: smallBoard,
      dedupe: unit.dedupe,
      snapshot: unit.snapshot,
      population: unit.population.map((row, index) => ({
        model_key: row.modelKey,
        model_display: row.modelDisplay,
        value: row.value,
        percentile: excluded ? null : ranks[index],
        stale,
        attempts: row.attempts,
        date: row.date,
        effort: row.effort,
        harness_label: row.harnessLabel,
        uncertainty: row.uncertainty,
        caveat: row.caveat,
      })),
    });

    if (excluded) continue;

    for (const [index, row] of unit.population.entries()) {
      const aliases = resolveAliases(config, {
        sourceIds: [unit.benchmark, unit.adapter],
        sourceSlug: row.modelKey,
        sourceName: row.modelDisplay,
      });
      for (const alias of aliases) {
        const observation = {
          route_id: alias.route_id,
          unit_key: unit.unit_key,
          benchmark: unit.benchmark,
          benchmark_name: unit.benchmark_name,
          board: unit.board,
          version: unit.version,
          split: unit.split,
          metric: unit.metric,
          harness_class: unit.harness_class,
          harness_label: row.harnessLabel,
          effort: row.effort,
          model_display: row.modelDisplay,
          value: row.value,
          percentile: ranks[index],
          attempts: row.attempts,
          date: row.date,
          uncertainty: row.uncertainty,
          caveat: row.caveat,
          source_scope: alias.evidence_scope,
          alias: {
            source_name: alias.source_name,
            canonical_release: alias.canonical_release,
            verified: alias.verified ?? null,
            note: alias.note ?? null,
          },
          capabilities: entry.capabilities ?? {},
          url: entry.source_url,
          source_type: 'benchmark',
        };
        if (!routeObservations.has(alias.route_id)) routeObservations.set(alias.route_id, []);
        routeObservations.get(alias.route_id).push(observation);
      }
    }
  }

  const routes = [...new Set([...manifest.candidates, ...manifest.stages.flatMap((stage) => stage.routes.map((route) => route.model_id))])].sort();
  const routeReports = {};
  for (const route of routes) {
    const all = routeObservations.get(route) ?? [];
    const contestedUnits = new Set();
    const conflicts = disagreements(all, config.contested_tolerance);
    for (const conflict of conflicts) contestedUnits.add(conflict.unit_key);
    const scored = all.filter((observation) => observation.source_scope !== 'proxy-family' && !contestedUnits.has(observation.unit_key));
    const unscored = all.filter((observation) => observation.source_scope === 'proxy-family' || contestedUnits.has(observation.unit_key));
    routeReports[route] = {
      observations: scored,
      unscored_observations: unscored,
      conflicts,
      capacities_present: [...new Set(scored.flatMap((observation) => Object.keys(observation.capabilities)))].sort(),
    };
  }

  const stageReports = {};
  for (const [stage, weights] of Object.entries(config.stage_weights)) {
    const capabilityIds = Object.keys(weights);
    const totalWeight = capabilityIds.reduce((sum, id) => sum + weights[id], 0);
    const rows = [];
    for (const route of routes) {
      const observations = routeReports[route].observations;
      // Each unit contributes to at most one capability in this stage.
      const unitAssignments = new Map();
      for (const observation of observations) {
        const relevant = Object.keys(observation.capabilities).filter((id) => capabilityIds.includes(id));
        if (relevant.length === 0) continue;
        const target = relevant.sort((a, b) => (weights[b] - weights[a]) || a.localeCompare(b))[0];
        if (!unitAssignments.has(observation.unit_key)) unitAssignments.set(observation.unit_key, { target, observation });
      }
      const capabilityScores = {};
      for (const [unitKey, { target, observation }] of unitAssignments) {
        const role = observation.capabilities[target];
        const weight = ROLE_WEIGHTS[role];
        if (weight === undefined) continue;
        if (!capabilityScores[target]) capabilityScores[target] = { weighted: 0, weight: 0, units: [] };
        capabilityScores[target].weighted += weight * observation.percentile;
        capabilityScores[target].weight += weight;
        capabilityScores[target].units.push({ unit_key: unitKey, percentile: observation.percentile, role, weight });
      }
      const capabilities = {};
      for (const [id, accumulator] of Object.entries(capabilityScores)) {
        capabilities[id] = {
          score: accumulator.weighted / accumulator.weight,
          stage_weight: weights[id],
          observations: accumulator.units,
        };
      }
      let presentWeight = 0;
      let weighted = 0;
      for (const [id, capability] of Object.entries(capabilities)) {
        presentWeight += weights[id];
        weighted += weights[id] * capability.score;
      }
      const coverage = totalWeight === 0 ? 0 : presentWeight / totalWeight;
      const missing = capabilityIds.filter((id) => !(id in capabilities));
      const eligible = coverage >= threshold && presentWeight > 0;
      const partial = presentWeight === 0 ? null : weighted / presentWeight;
      rows.push({
        route_id: route,
        score: eligible ? partial : null,
        unranked_partial_score: partial,
        coverage,
        scored_weight: presentWeight,
        eligible,
        missing_capabilities: missing.map((id) => ({ id, weight: weights[id] })),
        capabilities,
        contested_units: [...new Set(routeReports[route].conflicts.map((conflict) => conflict.unit_key))],
        proxy_family_observations: routeReports[route].unscored_observations.filter((observation) => observation.source_scope === 'proxy-family').length,
      });
    }
    const eligible = rows.filter((row) => row.eligible).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.route_id.localeCompare(b.route_id));
    // Equal scores must share a rank: a tie is not an ordering claim.
    let rank = 0;
    let previous = null;
    for (const row of eligible) {
      if (previous === null || Math.abs((row.score ?? 0) - previous) > 1e-12) {
        rank += 1;
        previous = row.score ?? 0;
      }
      row.rank = rank;
    }
    for (const row of eligible) {
      row.tied_with = eligible.filter((other) => other !== row && other.rank === row.rank).map((other) => other.route_id);
    }
    stageReports[stage] = { weights, rank_threshold_coverage: threshold, rows };
  }

  const rankedStageReports = {};
  for (const [stage, report] of Object.entries(stageReports)) {
    rankedStageReports[stage] = {
      ...report,
      scores: [...report.rows.filter((row) => row.eligible)].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
      evidence_only: report.rows.filter((row) => !row.eligible).map((row) => row.route_id),
    };
  }

  const baseline = {};
  for (const stage of manifest.stages) {
    baseline[stage.task] = stage.routes[0].model_id;
  }

  const signals = {};
  for (const [stage, stageReport] of Object.entries(rankedStageReports)) {
    const { rows } = stageReport;
    const baselineRoute = baseline[stage];
    const baselineRow = rows.find((row) => row.route_id === baselineRoute);
    const eligibleCandidates = rows.filter((row) => row.eligible && row.route_id !== baselineRoute).map((row) => row.route_id);
    if (!rows.some((row) => row.eligible)) {
      signals[stage] = {
        signal: 'no_comparable_evidence',
        baseline: baselineRoute ?? null,
        rationale: 'No route reaches the coverage threshold for this stage, so the stage carries no rank.',
      };
      continue;
    }
    if (!baselineRow || !baselineRow.eligible) {
      signals[stage] = {
        signal: 'baseline_unrankable',
        baseline: baselineRoute ?? null,
        baseline_coverage: baselineRow?.coverage ?? 0,
        eligible_candidates: eligibleCandidates,
        rationale: 'The baseline route has no eligible evidence for this stage; eligible candidates are listed without a baseline comparison.',
      };
      continue;
    }
    const ahead = rows
      .filter((row) => row.eligible && row.route_id !== baselineRoute && (row.score ?? 0) > baselineRow.score)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((row) => row.route_id);
    signals[stage] = {
      signal: ahead.length > 0 ? 'candidate_ahead' : 'baseline_ahead',
      baseline: baselineRoute,
      baseline_score: baselineRow.score,
      baseline_coverage: baselineRow.coverage,
      candidates_ahead: ahead,
      rationale:
        ahead.length > 0
          ? 'At least one eligible candidate scores above the baseline on this stage weight vector.'
          : 'No eligible candidate scores above the baseline on this stage weight vector.',
    };
  }

  return {
    reference_time: referenceTime,
    threshold_coverage: threshold,
    contested_tolerance: config.contested_tolerance,
    effort_rule: 'most recent date, then highest attempt count, then highest published reasoning effort',
    units: scoredUnits,
    routes: routeReports,
    stages: rankedStageReports,
    baseline,
    signals,
    scoring_note:
      'Percentile ranks are computed inside one unit. Capability and stage scores are weighted means over present observations only; missing weight is reported, never redistributed.',
  };
}
