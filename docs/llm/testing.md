# Testing

Delivery 3 asks for **test guides (scripts) for every test type**, not only test code. Each guide is a document the team can hand in. Code tests prove the guide was executed.

## Layers

| Type (course name) | What | Tool | Where |
| --- | --- | --- | --- |
| Pruebas unitarias | Pure business rules (BR-*) | Vitest | `src/**/*.test.ts` next to the code |
| Pruebas de componentes | Server actions and data functions against a test database | Vitest + Neon branch | `src/**/*.int.test.ts` (to set up) |
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

The integration and e2e suites (issues #21 and #22) will be added as a separate job. A commented placeholder for it is already in the workflow.

## UAT tasks to script

Based on the quality sheet (usability: users finish tasks without frequent errors).

1. Registrar un cliente con valores de referencia propios.
2. Dar de alta un alveógrafo y un farinógrafo con sus límites.
3. Dar de alta un lote y capturar su inspección completa.
4. Emitir el certificado de un pedido y confirmar el envío.
5. Consultar el histórico filtrado por cliente y exportarlo a Excel.
6. Entrar como usuario de consulta y comprobar que no puede emitir certificados.

Measure for each task whether it was completed, the time it took and the errors made.
