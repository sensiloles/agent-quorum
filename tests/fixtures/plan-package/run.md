# Sample Large Plan - runbook

This runbook is the execution protocol for the change pack. It is independent of any planning loop or model runner.

## Arguments

```text
run                select the next pending phase pin from journal.md
run <override>     use an operator-provided starting point or constraint
```

## Step 0 - Position

Before editing files:

1. Read `README.md`.
2. Read `journal.md`.
3. Read this `run.md`.
4. Read the current `phase-*.md`.
5. Check the relevant repository state with read-only commands.
6. Compare the current state with `journal.md`.

If an override is provided, state what automatic positioning would have selected and why the override wins.

## Step 1 - Preflight

For the current phase:

1. Confirm all prerequisites in the phase file.
2. Confirm workspace rules from `AGENTS.md` / `CLAUDE.md`.
3. Run the phase preflight checks.
4. If any preflight check fails, stop and write a stop report in `journal.md`.

## Step 2 - Execute One Phase Pin

Execute exactly one pending phase pin:

1. Implement only the files and behavior named in the phase pin.
2. Keep unrelated cleanup out of the change.
3. Run the phase verification with `pnpm run <script>`.
4. Update `journal.md` with status, notes, and any plan deltas.
5. Commit only when the operator explicitly asks for commits.

## Step 3 - After Execution

After a phase pin:

1. Record completed checks in `journal.md`.
2. Mark the phase gate when all pins in that phase are done.
3. Decide whether to continue based on context, quality, and operator direction.
4. Stop at phase boundaries unless the operator asked to continue.

## Hard Rules

- Use repository entry points: `pnpm run <script>` and `pnpm exec <bin>`; never `npx`.
- Do not push without explicit operator instruction.
- Do not use `--no-verify` or force-push.
- Do not run destructive git or recursive package commands.
- Do not widen scope beyond the current phase pin.

## Self-monitoring

Stop immediately when any of these happens:

- Context is too full to complete the current phase pin safely.
- The same build, typecheck, lint, or test failure repeats three times.
- The implementation starts cycling through the same edits.
- A file, route, schema, or interface from the phase file is absent or materially different.
- A new dependency, migration, generated artifact, or downstream consumer appears that the plan does not cover.
- The operator gives a direction that conflicts with the current phase.

## Stop Report Format

```text
## YYYY-MM-DD - paused at <pin>

- Trigger: context | quality | dependency-drift | plan-mismatch | operator-decision
- Last completed phase: <phase and sha>
- Current phase in progress: <phase and pin>
- State:
  - build: <green | red>
  - typecheck: <green | red>
  - lint: <green | red>
  - test: <green | red | not run>
  - working-copy: <clean | dirty>
- Specific blocker:
  - <error, file, or missing decision>
- Files modified but not completed:
  - <path> - <reason>
- Recommended next action:
  - <continue | redo | split | ask operator>
- Plan deltas detected:
  - <delta or none>
```
