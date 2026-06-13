# Examples

Two ways to drive agent-quorum, both shown end to end:

- **CLI** — the `plan-loop` bin, exactly as an installed user runs it.
- **API** — the `agent-quorum` package, in [`api.ts`](api.ts).

Everything here uses the same public surfaces the tool ships; there is no
example-only wrapper. [`task.example.md`](task.example.md) is a tiny sample
prompt you can feed to either path.

Prerequisites: Node ≥ 24 and at least one authenticated provider CLI (`codex`,
`claude`, or `cursor-agent`).

## Two ways to invoke the CLI

| Context          | Command                   | Build needed?                   |
| ---------------- | ------------------------- | ------------------------------- |
| Installed user   | `plan-loop …`             | n/a (global bin)                |
| Inside this repo | `pnpm run plan:self -- …` | no (runs from source via `tsx`) |

`plan:self` is a one-line convenience in `package.json`: it points the run
artifacts at this repo's `.agents/plans/` ledger and otherwise _is_ the
`plan-loop` bin. Substitute `plan-loop` for `pnpm run plan:self --` in any
command below to read it as an installed user would.

## CLI walkthrough

```sh
# 1. Plan from a task prompt (creates plan.v0, then loops to convergence).
pnpm run plan:self -- --prompt examples/task.example.md --effort high --iters 3

# 1b. Or refine an existing plan file instead of a prompt.
pnpm run plan:self -- my-plan.md

# 2. Detach a long run into its own process group with run.log redirection.
pnpm run plan:self -- launch --effort high --prompt examples/task.example.md

# 3. Inspect runs.
pnpm run plan:self -- status            # list runs (interactive picker in a TTY)
pnpm run plan:self -- show --last       # artifact paths + state of the latest run
pnpm run plan:self -- logs --last -f    # follow a detached run's log until it ends

# 4. Steer a run mid-flight.
pnpm run plan:self -- intervene --last "prefer an additive migration"
```

When the loop converges it writes, under the run's workdir:

- `plan.final.md` — the converged plan; always the entry point.
- `summary.md` — one-page run summary (iterations, health, artifact paths).
- `plan.package/` — present only when the split policy fires.

## API walkthrough

[`api.ts`](api.ts) runs the same loop through the typed package API, which
returns a structured `RunResult` and never calls `process.exit`:

```sh
pnpm run build   # the example imports the published "agent-quorum" name
PLAN_LOOP_PLANS_DIR=.agents/plans pnpm exec tsx examples/api.ts examples/task.example.md
```

It calls `runPlanLoop`, prints the convergence health, then reads the run back
out of the durable ledger with `listRuns` and `getRunStatus` — the API
counterparts of `plan-loop status`. See [`../docs/api.md`](../docs/api.md) for
the full surface, including `launchPlanLoop`, `addIntervention`, and
`pruneRuns`.
