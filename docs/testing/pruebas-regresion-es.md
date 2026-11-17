# Guía de pruebas de regresión (PR)

Las pruebas de regresión vuelven a correr toda la suite en cada cambio, para que un PR nuevo no rompa una regla que ya funcionaba. El workflow `.github/workflows/ci.yml`, llamado CI, es la suite de regresión (issue #20, PR #29). Corre en cada pull request y en cada push a `main`. Cada corrida verde es la evidencia de esta guía.

## Qué corre el workflow

| Job | Qué hace | Base de datos | Secretos |
| --- | --- | --- | --- |
| Typecheck, lint, test, build | `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en Node 22 | Ninguna, usa valores ficticios | Ninguno |
| Integration tests (Postgres) | `pnpm test:int`, es decir las PC de la guía de componentes | Servicio `postgres:16` dentro del job | Ninguno |
| E2E tests (Playwright) | `pnpm test:e2e`, es decir las PI y PS automatizadas, y sube capturas, video y traza si algo falla | Servicio `postgres:16` dentro del job | Ninguno |

Los jobs de integración y de e2e solo corren si el primero pasa. Ninguno usa secretos de GitHub, por eso el diseño permite correrlo también en PRs que vienen de un fork. La ejecución cancela las corridas anteriores de la misma rama cuando llega un commit nuevo.

## Casos

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR-01 | Regresión, issue #20 | PR #29 abierto | Abrir el PR y esperar el check de CI | Commit d2ee013 de `ci/regression-workflow` | El job Typecheck, lint, test, build termina en verde | Verde el 2026-11-11, https://github.com/ValleryR/harinas-elizondo/actions/runs/43103295253 | Pass |
| PR-02 | Regresión, issue #21 | PR #36 apilado sobre #29 | Abrir el PR y esperar CI | Commit 8f600d1 de `test/integration` | Los jobs Typecheck, lint, test, build e Integration tests terminan en verde | Ambos verdes el 2026-11-12 (UTC), https://github.com/ValleryR/harinas-elizondo/actions/runs/43159071569 | Pass |
| PR-03 | Regresión, issue #22 | PR #38 apilado sobre #36 | Abrir el PR y esperar CI | Commit 331ef38 de `test/e2e` | Los tres jobs terminan en verde | Los tres verdes el 2026-11-12 (UTC), https://github.com/ValleryR/harinas-elizondo/actions/runs/43161348610 | Pass |
| PR-04 | Regresión local | Postgres 14.24 de Homebrew en local con la base `harinas_plan006_test`, sin Docker | Correr `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:int` y `pnpm test:e2e`, que incluye `pnpm build` | Commit 23d9967 de `chore/improve-plans` | Todo pasa | El 2026-11-16 typecheck y lint con código de salida 0, 220 de 220 unitarias, 21 de 21 de componentes, 13 de 13 e2e y build exitoso dentro de la corrida e2e | Pass |
| PR-05 | Regresión, issue #20 | Dueña del repositorio | Activar la regla de rama que exige el check de CI para hacer merge a `main` | Configuración del repositorio | Un PR con el check en rojo no se puede integrar | 2026-11-16 con `gh api`. La consulta de protección de la rama `main` respondió 404 y la lista de reglas del repositorio salió vacía, así que no se pudo comprobar que exista la regla. Puede ser que no exista o que la cuenta no tenga permiso para verla | Pendiente, la dueña del repositorio debe agregar la regla (Settings, Branches, exigir los checks de CI en `main`) |
| PR-06 | Regresión, issue #20 | Un PR abierto desde un fork | Abrir el PR y esperar CI | Cualquier cambio desde un fork | Los tres jobs corren sin secretos y terminan en verde | 2026-11-16. El PR #47 viene del fork Freddy-Nader/harinas-elizondo (commit 13bcc2e). Con `gh pr checks 47` los tres jobs de la corrida https://github.com/ValleryR/harinas-elizondo/actions/runs/43922022585 salieron en pass, Typecheck, lint, test, build en 57 s, Integration tests (Postgres) en 1 min 7 s y E2E tests (Playwright) en 2 min 2 s | Pass |
| PR-07 | Regresión, issue #20 | #29 integrado en `main` | Hacer merge de un PR a `main` | Push a `main` | CI corre sobre `main` y termina en verde | Los PR #29, #36 y #38 tienen merge desde el 2026-11-12. El push del commit f767e75 (merge de PR #46) disparó CI el 2026-11-16 y sus tres jobs terminaron en verde, https://github.com/ValleryR/harinas-elizondo/actions/runs/43849955128 | Pass |

## Observaciones

El workflow anterior, Validate clients module, corrió en las ramas que todavía no tenían el workflow nuevo. En la rama `feat/reportes-uc08` de PR #33 falló el paso de lint en https://github.com/ValleryR/harinas-elizondo/actions/runs/43132249802, y eso frenó a Reportes hasta que quedó en verde. Hoy Reportes está en `main` y PS-07 pasa.

Las filas PR-01 a PR-03 registran las corridas de entonces. Las corridas de los jobs de PR-04 y PR-07 son las más recientes.

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 6 |
| Pendiente | 1 |
