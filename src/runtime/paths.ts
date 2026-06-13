import os from 'node:os';
import path from 'node:path';

export interface ArtifactRoots {
  readonly home: string;
  readonly runsDir: string;
  readonly stateDir: string;
}

export interface ArtifactRootOverrides {
  readonly home?: string;
}

// Single resolver for the run artifact roots. `runsDir` holds functional output
// (the per-run workdirs); `stateDir` holds the system run ledger. The clean
// default lives under `<home>/.agent-quorum`; the `PLAN_LOOP_PLANS_DIR`-only
// branch preserves the legacy single-var layout where state nests beside plans.
// Values are absolute when the inputs are absolute and never created here —
// callers own directory creation.
export function resolveArtifactRoots(overrides: ArtifactRootOverrides = {}): ArtifactRoots {
  const env = process.env;
  const home = overrides.home ?? env.PLAN_LOOP_HOME ?? path.join(os.homedir(), '.agent-quorum');
  const runsDir = env.PLAN_LOOP_PLANS_DIR ?? path.join(home, 'runs');
  const stateDir =
    env.PLAN_LOOP_STATE_DIR ??
    (env.PLAN_LOOP_PLANS_DIR
      ? path.join(env.PLAN_LOOP_PLANS_DIR, '.runs')
      : path.join(home, 'state'));
  return { home, runsDir, stateDir };
}
