import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExitCode, runPlanLoop } from '../../src/index.js';
import { resetConfigCache } from '../../src/core/config.js';
import {
  captureStderr,
  emptyCritique,
  withEnvAsync,
  writeDefaultPlanLoopConfig,
  writeFakeBin,
  writeLargeStructuredPlanFile,
  writeStructuredPlanFile,
  type StderrCapture,
} from '../helpers/harness.js';

let tmp: string;
let fake: string;
let work: string;
let capture: StderrCapture;

type EnvOverrides = Record<string, string | undefined>;

function baseEnv(extra: EnvOverrides = {}): EnvOverrides {
  return {
    PATH: `${fake}:${process.env.PATH ?? ''}`,
    PLAN_LOOP_CONFIG_FILE: path.join(tmp, 'plan-loop.json'),
    PLAN_LOOP_WORK_DIR: work,
    PLAN_LOOP_PLANS_DIR: path.join(tmp, 'plans'),
    PLAN_LOOP_STATE_DIR: path.join(tmp, 'state'),
    PLAN_LOOP_CLARIFY: '0',
    PLAN_LOOP_RETRY_COUNT: '0',
    PLAN_LOOP_RESUME: undefined,
    FAKE_CODEX_PROMPT: path.join(tmp, 'codex.prompt'),
    FAKE_CODEX_OUTPUT: path.join(tmp, 'empty.json'),
    ...extra,
  };
}

function summaryFinalLines(): string[] {
  return readFileSync(path.join(work, 'summary.md'), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('- FINAL:'));
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'plan-loop-packageint.'));
  fake = path.join(tmp, 'bin');
  writeFakeBin(fake);
  work = path.join(tmp, 'work');
  mkdirSync(work);
  mkdirSync(path.join(tmp, 'plans'), { recursive: true });
  mkdirSync(path.join(tmp, 'state'), { recursive: true });
  writeDefaultPlanLoopConfig(path.join(tmp, 'plan-loop.json'));
  emptyCritique(path.join(tmp, 'empty.json'));
  resetConfigCache();
  capture = captureStderr();
});

afterEach(() => {
  capture.restore();
  rmSync(tmp, { recursive: true, force: true });
});

describe('package emission through runPlanLoop', () => {
  it('emits a validated package and one combined FINAL status when split fires', async () => {
    writeStructuredPlanFile(path.join(tmp, 'input.md'), 'Package Run');

    const result = await withEnvAsync(baseEnv({ PLAN_LOOP_SPLIT: 'always' }), () =>
      runPlanLoop({
        input: path.join(tmp, 'input.md'),
        iters: 1,
        effort: 'low',
        fix: false,
        translate: false,
      }),
    );

    expect(result.exitCode).toBe(ExitCode.Ok);
    const pkg = path.join(work, 'plan.package');
    for (const name of ['README.md', 'plan.md', 'run.md', 'journal.md', 'remaining-debt.md']) {
      expect(existsSync(path.join(pkg, name)), name).toBe(true);
    }
    // plan.package/plan.md stays byte-equal to the post-fix plan.final.md.
    expect(
      readFileSync(path.join(pkg, 'plan.md')).equals(
        readFileSync(path.join(work, 'plan.final.md')),
      ),
    ).toBe(true);
    // The split decision is recorded; package and final findings are both present and distinct.
    expect(existsSync(path.join(work, 'plan.split.json'))).toBe(true);
    expect(existsSync(path.join(work, 'findings.json'))).toBe(true);
    expect(existsSync(path.join(work, 'package-findings.json'))).toBe(true);

    const summary = readFileSync(path.join(work, 'summary.md'), 'utf8');
    expect(summary).toContain('- split_decision: split');
    expect(summary).toContain('- package_dir:');
    expect(summary).toContain('- package_validation: ok');
    expect(summaryFinalLines()).toHaveLength(1);
    expect(summary).toContain('- FINAL: clean');

    const canonicalWork = realpathSync(work);
    expect(result.splitDecision).toBe('split');
    expect(result.packageDir).toBe(path.join(canonicalWork, 'plan.package'));
    expect(result.finalPlanPath).toBe(path.join(canonicalWork, 'plan.final.md'));
  });

  it('emits a clean package for a P0-starting plan through a forced split', async () => {
    // The original reproducer: a Haiku-authored plan whose Work Plan starts at
    // P0. The package must validate clean end to end, not just in unit emit.
    writeLargeStructuredPlanFile(path.join(tmp, 'input.md'), 'P0 Package Run', 3, 0);

    const result = await withEnvAsync(baseEnv({ PLAN_LOOP_SPLIT: 'always' }), () =>
      runPlanLoop({
        input: path.join(tmp, 'input.md'),
        iters: 1,
        effort: 'low',
        fix: false,
        translate: false,
      }),
    );

    expect(result.exitCode).toBe(ExitCode.Ok);
    const pkg = path.join(work, 'plan.package');
    // The label number drives the filename ordinal, so P0 -> phase-0-*.
    expect(readdirSync(pkg).some((name) => /^phase-0-.+\.md$/.test(name))).toBe(true);
    const summary = readFileSync(path.join(work, 'summary.md'), 'utf8');
    expect(summary).toContain('- split_decision: split');
    expect(summary).toContain('- package_validation: ok');
    expect(summaryFinalLines()).toHaveLength(1);
    expect(summary).toContain('- FINAL: clean');
  });

  it('blocks an otherwise-clean run when a forced split hits an empty Work Plan', async () => {
    const input = path.join(tmp, 'empty-wp.md');
    writeStructuredPlanFile(input, 'Empty Work Plan');
    writeFileSync(input, readFileSync(input, 'utf8').replace('1. Fixture step.', ''));

    const result = await withEnvAsync(baseEnv({ PLAN_LOOP_SPLIT: 'always' }), () =>
      runPlanLoop({ input, iters: 1, effort: 'low', fix: false, translate: false }),
    );

    expect(result.exitCode).toBe(ExitCode.Blocked);
    expect(existsSync(path.join(work, 'plan.package'))).toBe(false);
    expect(existsSync(path.join(work, 'plan.split.json'))).toBe(true);
    const finals = summaryFinalLines();
    expect(finals).toHaveLength(1);
    expect(finals[0]).toContain('blocked');
    expect(finals[0]).toContain('empty');
  });
});
