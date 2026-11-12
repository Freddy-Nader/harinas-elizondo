# Testing

Delivery 3 asks for **test guides (scripts) for every test type**, not only test code. Each guide is a document the team can hand in. Code tests prove the guide was executed.

## Layers

| Type (course name) | What | Tool | Where |
| --- | --- | --- | --- |
| Pruebas unitarias | Pure business rules (BR-*) | Vitest | `src/**/*.test.ts` next to the code |
| Pruebas de componentes | Server actions and data functions against a test database | Vitest + local or CI Postgres | `src/**/*.int.test.ts` |
| Pruebas integrales / de sistema | Full flows in the browser, for example lot → inspection → certificate → delivery | Playwright (to install) | `e2e/` |
| Pruebas de regresión | Whole suite in CI on every PR and on every push to `main` | GitHub Actions | `.github/workflows/ci.yml` |
| Pruebas de aceptación (UAT) | Real users follow scripted tasks and sign off | Written script + results table | `docs/testing/` (to create) |

## Naming

Test names cite the rule so the spec can trace them, for example `it("BR-INS-02 continues after Z with AA")`. The existing tests in `src/lib/domain/` are the model.

## Guide template

Each guide (one per type, Spanish, because it is handed in and read by the professor) has these columns.

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PU-01 | BR-INS-02 | Lote sin inspecciones | Registrar inspección | Lote L-001 | Secuencia "A" | | |

Ids are `PU-` (unitarias), `PC-` (componentes), `PI-` (integrales), `PS-` (sistema), `PR-` (regresión) and `PA-` (aceptación).

## Regression (CI)

The workflow `.github/workflows/ci.yml` (named `CI`) is the regression suite. It runs on every pull request, including the ones opened from forks, and on every push to `main`. The job `Typecheck, lint, test, build` installs with `pnpm install --frozen-lockfile` on Node 22 and then runs `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`. It uses dummy environment values and no GitHub secrets.

Each green run is the evidence for the regression guide. A `PR-xx` row cites the pull request and the URL of its run (https://github.com/ValleryR/harinas-elizondo/actions/workflows/ci.yml) as the obtained result. A change that breaks an earlier rule fails the check before it can be merged, once the repo owner makes the check required on `main`.

The job Integration tests (Postgres) runs `pnpm test:int` against a `postgres:16` service with non-secret credentials (issue #21). The e2e suite (issue #22) will get its own job.

## Component tests (PC-xx)

`pnpm test:int` runs `src/**/*.int.test.ts` (config `vitest.int.config.mts`) against the database in `TEST_DATABASE_URL`. The global setup drops the schema and applies every migration in `drizzle/`, each file starts from truncated tables plus synthetic seed data, and only the session is mocked (`signInAs` in `src/test/int/session.ts`). The app's Neon HTTP driver cannot reach plain Postgres, so the suite swaps `@/lib/db` for the same schema over node-postgres, and `batch` runs in one real transaction. `src/test/int/guard.ts` refuses any URL whose host is not localhost, 127.0.0.1, [::1] or `postgres`, or whose database name does not end in `_test`. Never point it at Neon.

Start a local database with Docker, then run the suite.

```bash
docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int
```

Cases: PC-01 RF-03/BR-AUD-01 client and audit together, PC-02 RF-03 duplicate RFC, PC-03 RF-03 concurrent RFC, PC-04 BR-INS-02/04 sequence A then B, PC-05 BR-INS-02/04 concurrent start, PC-06 BR-AUD-01 rollback when the audit row fails, PC-07 RF-01 query user, PC-08 BR-AUD-03 issue locks the inspection, PC-09 BR-AUD-03 concurrent issue, PC-10 BR-CER-01/02 incomplete inspection, PC-11 RF-01 only an active admin creates users, PC-12 RF-01/BR-AUD-01 user, credential and audit together.

## UAT tasks to script

Based on the quality sheet (usability: users finish tasks without frequent errors).

1. Registrar un cliente con valores de referencia propios.
2. Dar de alta un alveógrafo y un farinógrafo con sus límites.
3. Dar de alta un lote y capturar su inspección completa.
4. Emitir el certificado de un pedido y confirmar el envío.
5. Consultar el histórico filtrado por cliente y exportarlo a Excel.
6. Entrar como usuario de consulta y comprobar que no puede emitir certificados.

Measure for each task whether it was completed, the time it took and the errors made.
