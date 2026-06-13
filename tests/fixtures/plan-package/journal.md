# Sample Large Plan - journal

This file is the single source of truth for execution state. Keep it short enough to read at the start of every session.

## Current State

- Branch: `<branch or not created>`.
- Baseline: `<repo>@<sha or not recorded>`.
- Last completed phase: `none`.
- Current phase in progress: `P1`.
- Next step: execute `P1` (then `P2`).

## Progress

| #   | Phase | Pin | Status  | Notes        |
| --- | ----- | --- | ------- | ------------ |
| 1   | P1    | P1  | pending | Phase 1 work |
| 2   | P2    | P2  | pending | Phase 2 work |
| 3   | P3    | P3  | pending | Phase 3 work |
| 4   | P4    | P4  | pending | Phase 4 work |

Status values: `pending`, `in_progress`, `done`, `blocked`, `skipped`. The first `pending` row is the current phase; the next row is the next phase.

## Acceptance Gates

- [ ] P1: Phase 1 gate observable
- [ ] P2: Phase 2 gate observable
- [ ] P3: Phase 3 gate observable
- [ ] P4: Phase 4 gate observable

## Issues / Workarounds

| Date | Pin | Issue | Decision |
| ---- | --- | ----- | -------- |
| -    | -   | -     | -        |

## Plan Deltas

Record only real divergence between the plan and current workspace reality.

| Date | Source | Delta | Resolution |
| ---- | ------ | ----- | ---------- |
| -    | -      | -     | -          |

## Stop / Report Log

Use the stop report format from `run.md` when execution halts.

## Restart Checklist

1. Read `README.md`.
2. Read this `journal.md`.
3. Read `run.md`.
4. Open the current `phase-*.md` selected by the first pending progress row.
5. Verify current workspace state with read-only commands before editing.
6. Run the phase preflight checks.
7. Execute only the next pending phase pin.
