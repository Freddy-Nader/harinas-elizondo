# Plan 009: Component tests for Reportes and Bitácora, and close the pending test rows

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 59b6b24..HEAD -- "src/app/(app)/reportes" "src/app/(app)/bitacora" src/test/int docs/testing`
> On a change, re-read those files and compare with "Current state". STOP on a mismatch you cannot reconcile.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (tests and docs only)
- **Depends on**: none
- **Category**: tests, docs
- **Planned at**: commit `59b6b24`, 2026-11-16

## Why this matters

The course grades one written guide per test type with real results. After plan 006 four rows are still "Pendiente". Two of them, PC-13 and PC-14, are pending only because nobody wrote a component test (a test against a real Postgres) for Reportes and Bitácora. One more, PR-06, was pending because no CI run from a fork had finished, and that is no longer true. This plan writes the two tests and records what can now be recorded. PR-05 needs the repo owner and stays pending.

## Current state

- Component tests are files named `*.int.test.ts`, run with `pnpm test:int` against the database in `TEST_DATABASE_URL`. Five exist: `src/app/(app)/clientes/actions.int.test.ts`, `lotes/actions.int.test.ts`, `usuarios/actions.int.test.ts`, `certificados/actions.int.test.ts` and `src/app/api/v1/clients.int.test.ts` (21 tests).
- Helpers in `src/test/int/`:
  - `db.ts` exports `testDb` (Drizzle over node-postgres), `TEST_USERS` (seeded users per role), `TEST_LIMITS`, `resetDatabase`.
  - `session.ts` exports `signInAs("transaction" | "query" | "admin")` and `signOut()`. This is the only mock, the real `requireRole` runs on top of it.
  - `fixtures.ts` exports `formData`, `clientForm`, `insertLot`, `insertEquipment`, `COMPLETE_VALUES`, `resultsForm`, `redirectOf`, `initialState`.
- Exemplar to copy the style from, `src/app/(app)/clientes/actions.int.test.ts`:

```ts
describe("Clientes server actions against Postgres (UC-02)", () => {
  beforeEach(() => signInAs("transaction"));

  it("PC-01 RF-03 / BR-AUD-01 stores the client, its destinations and the audit row together", async () => {
    const target = await redirectOf(saveClient(clientForm({ deliveryAddresses: ["Bodega Ficticia 1", "Bodega Ficticia 2"] })));
    expect(target).toBe("/clientes");
    const [client] = await testDb.select().from(clients).where(eq(clients.sapKey, "PC0001"));
    ...
```

- `src/app/(app)/certificados/actions.int.test.ts` shows how to build an issued certificate from scratch (client, equipment, lot, complete inspection, create, issue). Read it before writing the Reportes test, because Reportes needs issued certificates to read.
- Reportes, `src/app/(app)/reportes/data.ts`: `getReportData(filters)`, `getExportableCertificateData(filters)`, `getProductionQualityData(filters)`, `getClientOptions()`. Each one starts with `await requireRole("transaction", "query")`. `src/app/(app)/reportes/actions.ts` exports `exportCertificatesAction(rawFilters, format)`, which returns a result object (`{ success: false, error: "Acceso denegado: no cuenta con permisos para exportar reportes." }` on a wrong role) and writes an `export` row in `audit_log` (BR-AUD-01).
- Bitácora, `src/app/(app)/bitacora/data.ts`: `listAuditLog(filters)` starts with `await requireRole("transaction", "query")` and returns `{ rows, total }`, newest first, paged. Filters are parsed in `bitacora/filters.ts`. The module has no write action at all.
- Guide rows today in `docs/testing/pruebas-componentes-es.md` (columns Id, Requisito, Precondición, Pasos, Datos de entrada, Resultado esperado, Resultado obtenido, Estado):
  - PC-13, RF-07 and UC-08, "Consultar y exportar el histórico contra Postgres", expected "Filtros y exportación correctos según el rol", Estado Pendiente.
  - PC-14, RF-08 and D-20, "Leer la bitácora con cada rol", expected "Ambos roles leen y nadie modifica", Estado Pendiente.
  - PC-15 to PC-23 already exist (the API tests). Do not renumber anything.
- `docs/testing/pruebas-regresion-es.md` row PR-06 is Pendiente and says the CI run of PR #47 had no conclusion. Row PR-05 (branch rule) is Pendiente.
- Docker is not running on the operator machine. A Homebrew Postgres runs at localhost:5432 for the current OS user.
- Spanish writing rules for the guides: no `:`, `;` or dashes in running prose, tables are exempt. Never invent a result.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Install | `pnpm install` | exit 0 |
| Test database | `createdb harinas_plan009_test` | exit 0 |
| Component suite | `TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan009_test pnpm test:int` | all pass |
| One file | `TEST_DATABASE_URL=... pnpm exec vitest run --config vitest.int.config.mts "src/app/(app)/reportes"` | all pass |
| Checks | `pnpm typecheck && pnpm lint && pnpm test` | exit 0 |
| Fork CI | `gh pr checks 47 --repo ValleryR/harinas-elizondo` | three jobs with their state |
| Clean up | `dropdb harinas_plan009_test` | exit 0 |

## Scope

**In scope**: new `src/app/(app)/reportes/reports.int.test.ts`, new `src/app/(app)/bitacora/audit-log.int.test.ts`, `src/test/int/fixtures.ts` (only if a small shared helper avoids copying the certificate setup, keep it minimal), `docs/testing/pruebas-componentes-es.md`, `docs/testing/pruebas-regresion-es.md`, `docs/testing/README.md`, the results table of the Calidad de servicio section in `docs/especificacion-tecnica-es.md`, `docs/llm/status.md`.

**Out of scope**: any application code. If a new test fails because of a real bug, record it and STOP. The acceptance guide. PR-05.

## Git workflow

Branch `test/component-reportes-bitacora` from the tip of `chore/improve-plans`. Commit `test(int): component tests for Reportes and Bitácora (RF-07, RF-08)`. Do not push unless told.

## Steps

### Step 1: Reportes component test (PC-13)

Write `reports.int.test.ts`. Build the data through the real server actions the way `certificados/actions.int.test.ts` does, so at least two issued certificates exist for two different clients. Then test, with ids in the names (`PC-13 RF-07 ...`):

- A transaction user and a query user both get the history from `getReportData({})`, with both certificates.
- A client filter returns only that client's certificate.
- `exportCertificatesAction` as a query user returns a successful result for `csv` and for `xlsx`, and each call leaves one `export` row in `audit_log` with that user.
- Without a session the call redirects to `/login` (use `signOut()` and `redirectOf`).

**Verify**: the one-file command passes. Each test asserts real values (certificate ids, row counts, the audit row), not just "does not throw".

### Step 2: Bitácora component test (PC-14)

Write `audit-log.int.test.ts`. Create audit rows through real actions (for example save a client and create a lot), then test, with ids in the names (`PC-14 RF-08 D-20 ...`):

- A transaction user and a query user both read the rows with `listAuditLog`, newest first, and `total` matches.
- An entity filter and an employee filter each return only the matching rows.
- Without a session the call redirects to `/login`.
- The module exports no function that writes. Assert it by importing `* as data` from `./data` and checking that `listAuditLog` is its only exported function.

**Verify**: the one-file command for `src/app/(app)/bitacora` passes.

### Step 3: Whole suite

**Verify**: `pnpm test:int` passes with more than 21 tests and 7 files. `pnpm typecheck && pnpm lint && pnpm test` exit 0.

### Step 4: Component guide

Fill PC-13 and PC-14 with what ran (date, commit from `git rev-parse --short HEAD`, real timings from a verbose run) and set Estado to Pass. Update the run header and the Resumen.

**Verify**: the Resumen counts match the table. `grep -c "Pendiente" docs/testing/pruebas-componentes-es.md` shows no pending case row.

### Step 5: Regression guide

Run `gh pr checks 47 --repo ValleryR/harinas-elizondo`. If the three jobs of the latest run are `pass`, set PR-06 to Pass with the run URL, the date and the fact that the PR comes from the fork Freddy-Nader/harinas-elizondo. If any job is not `pass`, keep PR-06 Pendiente and write what the command showed. Leave PR-05 Pendiente and make its text say that the repo owner must add the rule (Settings, Branches, require the CI checks on `main`).

**Verify**: the Resumen of the regression guide matches its rows.

### Step 6: Index, spec and status

Update `docs/testing/README.md` (Pass and Pendiente per guide and its "Qué falta" list), the results table in the spec, and `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test` exit 0. Drop the test database.

## Test plan

The two new files are the test plan. Follow the exemplar's structure, one `describe` per module, ids in every test name.

## Done criteria

- [ ] `pnpm test:int` passes and includes the two new files
- [ ] PC-13 and PC-14 are Pass with a real run recorded
- [ ] PR-06 reflects what `gh pr checks 47` really shows
- [ ] Index, spec table and status match the guides
- [ ] Only in-scope files changed
- [ ] `plans/README.md` row 009 updated

## STOP conditions

- A new test fails because the application behaves differently from the guide's expected result.
- The local Postgres is not reachable.
- Building issued certificates for the Reportes test needs more than the existing fixtures plus one small helper.

## Maintenance notes

Whoever adds a module adds its `*.int.test.ts` and its PC row in the same PR. PR-05 closes only when the repo owner adds the branch rule, and then the row needs a PR with a red check as evidence.
