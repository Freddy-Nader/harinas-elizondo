# Plan 006: Re-run every suite and bring the written test guides up to date

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- docs/testing/ src e2e`
> Code changes after the planned SHA are fine (you will run the suites on HEAD), but re-read the guides before editing.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (docs only, plus running tests)
- **Depends on**: best after plan 005, so the system guide already has the live rows
- **Category**: tests, docs
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

The course asks for a written guide per test type with real results. The guides in `docs/testing/` were recorded on 2026-11-11 and 2026-11-12, at commits 331ef38 and 856f7e0, when Reportes, Bitácora, the mobile menu and Usuarios were not all merged. The unit guide lists 133 tests, while `main` now runs 197 or more. PC-13 and PC-14 (component tests for modules merged later) are still Pendiente. A reviewer comparing the guide with `pnpm test` today would see the gap.

## Current state

- `docs/testing/README.md` is the index with a table Guía, Ids, Herramienta, Pass, Pendiente.
- `docs/testing/pruebas-unitarias-es.md` has an "Ejecución registrada" table (date, commit, command, environment, result), the case table PU-01 to PU-44, a section "Casos agregados después de la corrida registrada" with PU-45 to PU-47 (production quality, added 2026-11-16), a Resumen, and an "Anexo de pruebas por nombre" generated from `vitest run --reporter=verbose` (one row per `it()`, columns Fila, Archivo, Bloque, Prueba).
- `docs/testing/pruebas-componentes-es.md` (PC-01 to PC-14, Vitest against local Postgres), `pruebas-integrales-es.md` (PI), `pruebas-sistema-es.md` (PS), `pruebas-regresion-es.md` (PR, GitHub Actions), `pruebas-aceptacion-es.md` (PA, real users only, never fill it).
- Suites that need a database only accept a local database whose name ends in `_test` (`src/test/int/guard.ts`).
- Spanish writing rules: no `:`, `;` or dashes in running prose. Never invent results. A case not run stays Pendiente with the reason.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Unit, verbose | `pnpm exec vitest run --reporter=verbose > /tmp/unit.txt` | all pass |
| Start test DB | `docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16` (or `docker start harinas-test-db`) | container running |
| Component | `TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int` | all pass |
| E2E | `pnpm exec playwright install chromium` then `TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:e2e` | all pass |
| CI run | `gh run list -R ValleryR/harinas-elizondo --branch main --limit 1` | latest run URL |

## Scope

**In scope**: every file in `docs/testing/`, the "Resultados de pruebas" part of the Calidad de servicio section in `docs/especificacion-tecnica-es.md`, `docs/llm/status.md`.

**Out of scope**: test code. If a test fails, do not fix it here. Record it and STOP. `pruebas-aceptacion-es.md` results (real users only).

## Git workflow

Branch `docs/refresh-test-guides` from team `main`. Commit `docs(testing): re-run every suite on <short sha> and refresh the guides`. Do not push unless told.

## Steps

### Step 1: Run the unit suite and regenerate the unit guide

Record date, `git rev-parse --short HEAD`, environment (`node -v`, Vitest version from `pnpm exec vitest --version`). Map every test file that is not in the current case table to new PU rows (one row per `describe` block, same columns as the existing rows, requirement ids from the test names). Fold PU-45 to PU-47 into the main table and delete the "Casos agregados" section. Regenerate the Anexo from the verbose output, one row per test, ending with "Total N pruebas."

**Verify**: the Anexo row count equals the "Tests N passed" number in `/tmp/unit.txt`. `grep -c "^| PU-" docs/testing/pruebas-unitarias-es.md` matches the case count in the Resumen.

### Step 2: Component suite

Run it. Fill PC-13 and PC-14 if their tests exist now, otherwise keep them Pendiente with the reason. Update the Ejecución registrada table.

**Verify**: Resumen counts match the table.

### Step 3: Integral and system suites

Run `pnpm test:e2e`. Update PI and the automated PS rows with the new timings and the run header. Do not touch the live PS rows from plan 005.

### Step 4: Regression guide

Link the latest green CI run on `main` and update PR-01 to PR-07 statuses that can be checked with `gh`.

### Step 5: Index and spec

Update `docs/testing/README.md` (Ids, test counts, Pass, Pendiente) and the results table in `docs/especificacion-tecnica-es.md` (section Calidad de servicio). Update `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test` → exit 0.

## Test plan

This plan is a recorded test run. Each guide's header names the date, commit and command.

## Done criteria

- [ ] Unit guide Anexo count equals the real test count
- [ ] Every guide header shows a run from this session
- [ ] No "sin merge" or "no tienen merge" wording left in `docs/testing/` (`grep -rn "sin merge" docs/testing` → nothing)
- [ ] Index and spec tables match the guides
- [ ] `plans/README.md` row 006 updated

## STOP conditions

- Any suite fails.
- Docker is not available (record the component and e2e guides as not re-run, finish the unit part, and report).
- A test name has no requirement id you can map.

## Maintenance notes

Whoever adds tests later should add the PU, PC or PS row in the same PR, so the guides do not drift again.
