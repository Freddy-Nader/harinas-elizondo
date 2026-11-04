# Testing

Delivery 3 asks for **test guides (scripts) for every test type**, not only test code. Each guide is a document the team can hand in. Code tests prove the guide was executed.

## Layers

| Type (course name) | What | Tool | Where |
| --- | --- | --- | --- |
| Pruebas unitarias | Pure business rules (BR-*) | Vitest | `src/**/*.test.ts` next to the code |
| Pruebas de componentes | Server actions and data functions against a test database | Vitest + Neon branch | `src/**/*.int.test.ts` (to set up) |
| Pruebas integrales / de sistema | Full flows in the browser, for example lot → inspection → certificate → delivery | Playwright (to install) | `e2e/` |
| Pruebas de regresión | Whole suite in CI on every PR | GitHub Actions (to add) | `.github/workflows/` |
| Pruebas de aceptación (UAT) | Real users follow scripted tasks and sign off | Written script + results table | `docs/testing/` (to create) |

## Naming

Test names cite the rule so the spec can trace them, for example `it("BR-INS-02 continues after Z with AA")`. The existing tests in `src/lib/domain/` are the model.

## Guide template

Each guide (one per type, Spanish, because it is handed in and read by the professor) has these columns.

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PU-01 | BR-INS-02 | Lote sin inspecciones | Registrar inspección | Lote L-001 | Secuencia "A" | | |

Ids are `PU-` (unitarias), `PC-` (componentes), `PI-` (integrales), `PS-` (sistema), `PR-` (regresión) and `PA-` (aceptación).

## UAT tasks to script

Based on the quality sheet (usability: users finish tasks without frequent errors).

1. Registrar un cliente con valores de referencia propios.
2. Dar de alta un alveógrafo y un farinógrafo con sus límites.
3. Dar de alta un lote y capturar su inspección completa.
4. Emitir el certificado de un pedido y confirmar el envío.
5. Consultar el histórico filtrado por cliente y exportarlo a Excel.
6. Entrar como usuario de consulta y comprobar que no puede emitir certificados.

Measure for each task whether it was completed, the time it took and the errors made.
