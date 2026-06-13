import type { RunStateProbes } from '../core/run-store.js';
import { isAlive, pgidOf, procStartToken } from '../runtime/proc.js';

// The CLI's binding of the real process probes the store depends on. The store
// stays pure and unit-testable by taking probes as input; every CLI entry that
// infers live run state passes this single system implementation.
export const systemProbes: RunStateProbes = { isAlive, pgidOf, procStartToken };
