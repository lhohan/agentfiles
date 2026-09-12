#!/usr/bin/env node
// Deterministic model-routing evaluation pipeline.
//
//   node evaluate.mjs <fetch|score|render|judge-prompt|judge-import|judge-calibrate|replay|all> [options]
//
// See references/evaluation-method.md for the data model and exit codes.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError, EXIT, formatError, invalidInput } from './lib/errors.mjs';
import { loadConfig } from './lib/config.mjs';
import { loadManifest } from './lib/manifest.mjs';
import { loadRegistry } from './lib/registry.mjs';
import { runFetch } from './lib/fetch.mjs';
import { score } from './lib/score.mjs';
import { buildReport, renderHtml, renderMarkdown } from './lib/report.mjs';
import { buildJudgePrompt, judgePromptFilename, validateJudgeResult } from './lib/judge.mjs';
import { calibrate } from './lib/calibration.mjs';
import { writeIndex } from './lib/index-page.mjs';
import { DEFAULT_MODEL_STORE, loadOperationalData } from './lib/operational.mjs';
import { readJson, stableStringify, writeJson } from './lib/util.mjs';

const REQUIRED_NODE_MAJOR = 20;
const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SKILL_DIR, '..', '..', '..');
const USAGE = `Usage: node evaluate.mjs <command> [options]

Commands:
  fetch         Fetch tier A sources, write observations.json
  score         Score observations.json into scorecard.json
  render        Write report.md, report.html, report.json
  judge-prompt  Write judge-prompt.md from the scorecard
  judge-import  Validate a judge response and store it
  replay        Re-score report.json and compare with the embedded scorecard
  judge-calibrate  Check the judge against frozen scorecards with planted defects
  index         Write index.html listing every review under the review root
  all           fetch, score, judge-prompt, render (recommendations may follow)

Options:
  --manifest <file>      Run manifest (required)
  --config <file>        Settings file (default: references/config.json)
  --run <dir>            Run directory (default: docs/routing-reviews/<date>-<agent>-<slug>)
  --sources <a,b>        Restrict fetch to these adapters
  --judge-result <file>  Judge response (default: <run>/judge-result.json)
  --model-store <file>   Optional local model catalog (default: ${DEFAULT_MODEL_STORE})
  --root <dir>           Review root for the index (default: docs/routing-reviews)
  --json                 Print machine-readable output on stdout
  --help                 Print this help

Exit codes:
  0 success  2 invalid input  3 source failure  4 no comparable data
  5 judge schema mismatch  6 replay mismatch  7 calibration miss`;

function majorVersion() {
  return Number.parseInt(process.versions.node.split('.')[0], 10);
}

function parseArgs(argv) {
  const options = { sources: [], json: false };
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const takeValue = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw invalidInput(`Option ${arg} needs a value`, 'The next argument is missing', [`Run: node evaluate.mjs --help`]);
      }
      index += 1;
      return value;
    };
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--manifest') options.manifest = takeValue();
    else if (arg === '--config') options.config = takeValue();
    else if (arg === '--run') options.run = takeValue();
    else if (arg === '--sources') options.sources = takeValue().split(',').map((value) => value.trim()).filter(Boolean);
    else if (arg === '--judge-result') options.judgeResult = takeValue();
    else if (arg === '--model-store') options.modelStore = takeValue();
    else if (arg === '--root') options.root = takeValue();
    else if (arg.startsWith('--')) {
      throw invalidInput(`Unknown option ${arg}`, 'Option is not part of the CLI contract', ['Run: node evaluate.mjs --help']);
    } else positionals.push(arg);
  }
  return { options, positionals };
}

function resolveRunDir(manifest, options) {
  if (options.run) return resolve(options.run);
  return join(REPO_ROOT, 'docs', 'routing-reviews', `${manifest.run_date}-${manifest.agent}-${manifest.run_slug}`);
}

function loadInputs(options) {
  if (!options.manifest) {
    throw invalidInput('A run manifest is required', 'No --manifest option was given', [
      'Build the manifest from the verified agent profile, then pass --manifest <file>.',
      'See references/manifest.example.json.',
    ]);
  }
  const manifest = loadManifest(resolve(options.manifest));
  const config = loadConfig(resolve(options.config ?? join(SKILL_DIR, 'references', 'config.json')));
  const registry = loadRegistry(join(SKILL_DIR, 'references', 'benchmarks.json'));
  const runDir = resolveRunDir(manifest, options);
  const stageTasks = new Set(Object.keys(config.stage_weights));
  for (const stage of manifest.stages) {
    if (!stageTasks.has(stage.task)) {
      throw invalidInput(`Manifest stage "${stage.task}" has no configured weights`, `config.stage_weights has: ${[...stageTasks].join(', ')}`, [
        'Add the stage to config.stage_weights, or correct the task id in the manifest.',
      ]);
    }
  }
  for (const recommendation of manifest.recommendations) {
    if (!stageTasks.has(recommendation.task)) {
      throw invalidInput(`Recommendation for "${recommendation.task}" does not name a configured stage`, `config.stage_weights has: ${[...stageTasks].join(', ')}`, [
        'Give every recommendation the task id of a stage in config.stage_weights.',
      ]);
    }
  }
  return { options, manifest, config, registry, runDir };
}

function readObservations(runDir) {
  const path = join(runDir, 'observations.json');
  if (!existsSync(path)) {
    throw invalidInput('observations.json is missing', path, ['Run fetch first, or run: node evaluate.mjs all --manifest <file>']);
  }
  return readJson(path);
}

function readJudge(runDir, config) {
  const path = join(runDir, 'judge-result.json');
  if (!existsSync(path)) return null;
  const stored = readJson(path);
  return {
    model: stored.model ?? config.judges[0].model,
    thinking: stored.thinking ?? config.judges[0].thinking,
    prompt_version: stored.prompt_version,
    received_at: stored.received_at,
    assessment: stored.assessment,
    self_candidate: stored.self_candidate ?? null,
  };
}

function buildReportFor({ runDir, config, registry, manifest, judge, calibration = null, operationalData }) {
  const observations = readObservations(runDir);
  const report = buildReport({
    config,
    registry,
    manifest,
    sources: observations.sources,
    failures: observations.failures,
    units: observations.units,
    scorecard: score({ config, registry, manifest, units: observations.units, referenceTime: observations.reference_time, operationalData }),
    judge,
    calibration,
    referenceTime: observations.reference_time,
  });
  return { report, observations };
}

function emit(options, payload, humanLines) {
  if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else if (humanLines) process.stdout.write(`${humanLines.join('\n')}\n`);
}

function commandFetch({ options, manifest, config, registry, runDir }) {
  return runFetch({ config, registry, sourceIds: options.sources, cacheDir: join(SKILL_DIR, 'scripts', 'cache') }).then(({ units, sources, failures }) => {
    mkdirSync(runDir, { recursive: true });
    const observations = {
      observations_version: 1,
      reference_time: new Date().toISOString(),
      agent: manifest.agent,
      sources,
      failures,
      units,
    };
    writeJson(join(runDir, 'observations.json'), observations);
    emit(options, { command: 'fetch', run_dir: runDir, sources, failures, units: units.length }, [
      `Fetched ${sources.filter((source) => source.status === 'ok').length} source(s); ${units.length} unit(s) written to ${join(runDir, 'observations.json')}`,
      ...failures.map((failure) => `Source failure: ${failure.adapter} — ${failure.message}`),
    ]);
    return failures.length > 0 ? EXIT.sourceFailure : EXIT.ok;
  });
}

function operationalForManifest(manifest, options) {
  const routes = [...new Set([...manifest.candidates, ...manifest.stages.flatMap((stage) => stage.routes.map((route) => route.model_id))])].sort();
  return loadOperationalData({ path: options.modelStore ?? DEFAULT_MODEL_STORE, routes });
}

function commandScore({ options, manifest, config, registry, runDir }) {
  const observations = readObservations(runDir);
  const operationalData = operationalForManifest(manifest, options);
  const scorecard = score({ config, registry, manifest, units: observations.units, referenceTime: observations.reference_time, operationalData });
  writeJson(join(runDir, 'scorecard.json'), scorecard);
  const scored = scorecard.units.filter((unit) => unit.status === 'scored').length;
  emit(options, { command: 'score', run_dir: runDir, scored_units: scored, signals: scorecard.signals }, [
    `Scored ${scored} unit(s). Signals: ${Object.entries(scorecard.signals).map(([stage, signal]) => `${stage}=${signal.signal}`).join(' ')}`,
  ]);
  if (scored === 0) {
    process.stderr.write('ERROR: No comparable data after exclusion rules\nCAUSE: every unit was excluded by the board-size, staleness, or unit rules\nNEXT:\n  - Check the source status in observations.json\n  - Report the reduced scope as evidence-only; do not impute scores\n');
    return EXIT.noComparableData;
  }
  return EXIT.ok;
}

function commandRender({ options, config, registry, manifest, runDir }) {
  const judge = readJudge(runDir, config);
  const calibrationPath = join(runDir, 'calibration', 'calibration.json');
  const calibration = existsSync(calibrationPath) ? readJson(calibrationPath) : null;
  const operationalData = operationalForManifest(manifest, options);
  const { report } = buildReportFor({ runDir, config, registry, manifest, judge, calibration, operationalData });
  const reportPath = join(runDir, 'report.json');
  writeFileSync(join(runDir, 'report.md'), renderMarkdown(report));
  writeFileSync(join(runDir, 'report.html'), renderHtml(report));
  writeJson(reportPath, report);
  emit(options, { command: 'render', run_dir: runDir, files: ['report.md', 'report.html', 'report.json'] }, [
    `Wrote report.md, report.html, report.json in ${runDir}`,
  ]);
  return EXIT.ok;
}

function commandJudgePrompt({ options, config, registry, manifest, runDir }) {
  const judge = readJudge(runDir, config);
  const operationalData = operationalForManifest(manifest, options);
  const { report } = buildReportFor({ runDir, config, registry, manifest, judge, operationalData });
  const prompt = buildJudgePrompt({ config, report });
  const path = join(runDir, judgePromptFilename());
  writeFileSync(path, prompt);
  const spec = config.judges[0];
  const command = `pi -p --model ${spec.model} --thinking ${spec.thinking} --no-session --no-tools --no-extensions --no-skills --no-prompt-templates --no-context-files < ${path} > ${join(runDir, 'judge-result.raw.json')}`;
  emit(options, { command: 'judge-prompt', prompt_file: path, judge_command: command }, [
    `Wrote ${path}`,
    'Run the judge as an isolated headless invocation (operator approval required):',
    `  ${command}`,
    'Then validate it: node evaluate.mjs judge-import --manifest <file> --judge-result <file>',
  ]);
  return EXIT.ok;
}

function commandJudgeImport({ options, config, runDir }) {
  const path = options.judgeResult ? resolve(options.judgeResult) : join(runDir, 'judge-result.json');
  if (!existsSync(path)) {
    throw invalidInput('Judge result file is missing', path, [
      'Run judge-prompt first, then run the judge command it prints.',
      'A missing judge is a valid report state: render without it and the report carries missing-judge.',
    ]);
  }
  const spec = config.judges[0];
  const validated = validateJudgeResult(readFileSync(path, 'utf8'), { model: spec.model, thinking: spec.thinking });
  writeJson(join(runDir, 'judge-result.json'), validated);
  emit(options, { command: 'judge-import', judge: validated }, [`Judge result validated and stored in ${join(runDir, 'judge-result.json')}`]);
  return EXIT.ok;
}

function commandJudgeCalibrate({ options, config, runDir }) {
  const result = calibrate({ config, runDir });
  const lines = [
    `Calibration: ${result.status} — ${result.detected}/${result.scored} planted defects detected (${result.total} fixtures)`,
  ];
  if (result.status !== 'complete') {
    lines.push('Run each fixture through the judge, then re-run this command:');
    for (const fixture of result.fixtures.filter((entry) => entry.found === null)) {
      lines.push(`  ${fixture.judge_command}`);
    }
  }
  for (const fixture of result.fixtures) {
    if (fixture.found !== null) lines.push(`  ${fixture.found ? 'detected' : 'MISSED  '} ${fixture.id}: ${fixture.planted_defect}`);
  }
  lines.push(`  ${result.detection_note}`);
  emit(options, { command: 'judge-calibrate', ...result }, lines);
  if (result.status !== 'awaiting-responses' && result.detected < result.scored) {
    process.stderr.write(
      'ERROR: The judge missed a planted defect\nCAUSE: keyword detection found no reference to the planted defect in the response\nNEXT:\n  - Read the missed prompt and response in <run>/calibration/\n  - Improve the prompt or change the judge model, then re-run judge-calibrate\n',
    );
    return EXIT.calibrationMiss;
  }
  return EXIT.ok;
}

function commandIndex({ options }) {
  const root = resolve(options.root ?? join(REPO_ROOT, 'docs', 'routing-reviews'));
  const result = writeIndex({ root });
  emit(options, { command: 'index', ...result }, [`Wrote ${result.path} (${result.complete} complete review(s), ${result.runs - result.complete} incomplete)`]);
  return EXIT.ok;
}

function commandReplay({ options, runDir }) {
  const path = join(runDir, 'report.json');
  if (!existsSync(path)) {
    throw invalidInput('report.json is missing', path, ['Run render first, or run: node evaluate.mjs all --manifest <file>']);
  }
  const report = readJson(path);
  const config = { ...report.inputs.config, _resolved: null, hash: report.meta.config_hash };
  const registry = { ...report.inputs.registry, byId: new Map(report.inputs.registry.benchmarks.map((entry) => [entry.id, entry])) };
  const manifest = { ...report.inputs.manifest, _resolved: null, hash: report.meta.manifest_hash };
  const recomputed = score({
    config,
    registry,
    manifest,
    units: report.units,
    referenceTime: report.meta.reference_time,
    operationalData: report.inputs.operational_data ?? report.scorecard.operational_data,
  });
  const matches = stableStringify(recomputed) === stableStringify(report.scorecard);
  emit(options, { command: 'replay', matches }, [matches ? 'Replay reproduced the embedded scorecard byte-identically.' : 'Replay mismatch.']);
  if (!matches) {
    process.stderr.write('ERROR: Replay mismatch\nCAUSE: the recomputed scorecard differs from the embedded scorecard\nNEXT:\n  - Compare report.json inputs with the current config.json and benchmarks.json\n  - Treat the report as unreproducible and re-run the pipeline\n');
    return EXIT.replayMismatch;
  }
  return EXIT.ok;
}

async function commandAll(context) {
  const fetchExit = await commandFetch(context);
  const scoreExit = commandScore(context);
  commandJudgePrompt(context);
  commandRender(context);
  if (fetchExit !== EXIT.ok) return fetchExit;
  if (scoreExit !== EXIT.ok) return scoreExit;
  return EXIT.ok;
}

async function main() {
  if (majorVersion() < REQUIRED_NODE_MAJOR) {
    throw new CliError({
      code: 'NODE_VERSION',
      message: `Node ${REQUIRED_NODE_MAJOR} or newer is required`,
      exit: EXIT.sourceFailure,
      cause: `running ${process.version}`,
      next: ['Install Node 24 (the tested version) and retry.'],
    });
  }
  const { options, positionals } = parseArgs(process.argv.slice(2));
  if (options.help || positionals.length === 0) {
    process.stdout.write(`${USAGE}\n`);
    return positionals.length === 0 && !options.help ? EXIT.invalidInput : EXIT.ok;
  }
  const [command, ...rest] = positionals;
  if (rest.length > 0) throw invalidInput(`Unexpected argument "${rest[0]}"`, 'Only one command is accepted', ['Run: node evaluate.mjs --help']);

  const context = command === 'index' ? { options } : loadInputs(options);
  switch (command) {
    case 'fetch':
      return await commandFetch(context);
    case 'score':
      return commandScore(context);
    case 'render':
      return commandRender(context);
    case 'judge-prompt':
      return commandJudgePrompt(context);
    case 'judge-import':
      return commandJudgeImport(context);
    case 'judge-calibrate':
      return commandJudgeCalibrate(context);
    case 'index':
      return commandIndex(context);
    case 'replay':
      return commandReplay(context);
    case 'all':
      return await commandAll(context);
    default:
      throw invalidInput(`Unknown command "${command}"`, 'Command is not part of the CLI contract', ['Run: node evaluate.mjs --help']);
  }
}

main()
  .then((code) => {
    process.exitCode = code ?? EXIT.ok;
  })
  .catch((error) => {
    if (error instanceof CliError) {
      process.stderr.write(`${formatError(error)}\n`);
      process.exitCode = error.exit;
    } else {
      process.stderr.write(`ERROR: Unexpected failure\nCAUSE: ${error.stack ?? error.message}\nNEXT:\n  - This is a pipeline defect. Report it with the command you ran.\n`);
      process.exitCode = 1;
    }
  });
