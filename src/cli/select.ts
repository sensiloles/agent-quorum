import path from 'node:path';
import {
  compareRunsByRecency,
  readRunRecords,
  resolveRunState,
  type RunRecord,
} from '../core/run-store.js';
import { pgidOf, ppidOf } from '../runtime/proc.js';
import { systemProbes } from './probes.js';

export type Selector =
  | { readonly kind: 'pid'; readonly value: number }
  | { readonly kind: 'id'; readonly value: string }
  | { readonly kind: 'name'; readonly value: string }
  | { readonly kind: 'last' }
  | { readonly kind: 'work'; readonly value: string };

export interface SelectorFlags {
  readonly last?: boolean;
  readonly work?: string;
}

export type ResolvedRun = RunRecord | { readonly workDir: string };

export function isRunRecord(resolved: ResolvedRun): resolved is RunRecord {
  return 'runId' in resolved;
}

export function resolveLogPath(resolved: ResolvedRun): string {
  return isRunRecord(resolved) ? resolved.logPath : path.join(resolved.workDir, 'run.log');
}

export interface ResolveSelectorOptions {
  readonly stateDir: string;
}

const PID_TOKEN = /^[0-9]+$/;
// A runId is `r<base36>-<hex>` (P2); a leading-`r` prefix of that shape reads as
// an id, anything else as a name. A name misclassified here still resolves
// because id resolution falls back to name resolution and vice versa.
const RUN_ID_LIKE = /^r[0-9a-z]+(-[0-9a-f]*)?$/;
const PID_WALK_LIMIT = 64;

// Numeric tokens are always pids — runIds carry a non-digit `r` prefix, so a
// bare all-digits token can never be one.
export function parseSelector(
  token: string | undefined,
  flags: SelectorFlags = {},
): Selector | undefined {
  if (flags.work !== undefined && flags.work !== '') {
    return { kind: 'work', value: flags.work };
  }
  if (flags.last === true) {
    return { kind: 'last' };
  }
  if (token === undefined || token === '') {
    return undefined;
  }
  if (PID_TOKEN.test(token)) {
    return { kind: 'pid', value: Number(token) };
  }
  if (RUN_ID_LIKE.test(token)) {
    return { kind: 'id', value: token };
  }
  return { kind: 'name', value: token };
}

function mostRecent(records: readonly RunRecord[]): RunRecord | undefined {
  return [...records].sort(compareRunsByRecency)[0];
}

function resolveById(value: string, records: readonly RunRecord[]): RunRecord | undefined {
  const exact = records.find((record) => record.runId === value);
  if (exact !== undefined) {
    return exact;
  }
  return mostRecent(records.filter((record) => record.runId.startsWith(value)));
}

function resolveByName(value: string, records: readonly RunRecord[]): RunRecord | undefined {
  return mostRecent(records.filter((record) => record.name === value));
}

// Walk the pid and its ancestors and match the live record that owns the tree,
// by pid first and pgid second. A pid only ever resolves a live run; a finished
// run's pid is gone.
function resolveByPid(pid: number, records: readonly RunRecord[]): RunRecord | undefined {
  const live = records.filter((record) => resolveRunState(record, systemProbes) === 'running');
  const chain = new Set<number>();
  let cursor: number | undefined = pid;
  for (let depth = 0; cursor !== undefined && cursor > 1 && depth < PID_WALK_LIMIT; depth += 1) {
    chain.add(cursor);
    cursor = ppidOf(cursor);
  }
  const byPid = live.find((record) => chain.has(record.pid));
  if (byPid !== undefined) {
    return byPid;
  }
  const targetPgid = pgidOf(pid);
  if (targetPgid === undefined) {
    return undefined;
  }
  return live.find((record) => record.pgid === targetPgid);
}

export function resolveSelector(
  selector: Selector,
  options: ResolveSelectorOptions,
): ResolvedRun | undefined {
  if (selector.kind === 'work') {
    return { workDir: selector.value };
  }
  const records = readRunRecords(options.stateDir);
  switch (selector.kind) {
    case 'pid': {
      return resolveByPid(selector.value, records);
    }
    case 'last': {
      return mostRecent(records);
    }
    case 'id': {
      return resolveById(selector.value, records) ?? resolveByName(selector.value, records);
    }
    case 'name': {
      return resolveByName(selector.value, records) ?? resolveById(selector.value, records);
    }
    default: {
      selector satisfies never;
      return undefined;
    }
  }
}
