# Guías de pruebas

Esta carpeta tiene una guía por tipo de prueba de la entrega 3 de Harinas Elizondo. Todas usan la misma plantilla de `docs/llm/testing.md`, con las columnas Id, Requisito, Precondición, Pasos, Datos de entrada, Resultado esperado, Resultado obtenido y Estado.

Cada Resultado obtenido sale de una corrida real, con su fecha y su commit. Si un caso no se pudo ejecutar, su Estado es Pendiente y dice por qué.

## Guías

| Guía | Ids | Herramienta | Pass | Pendiente |
| --- | --- | --- | --- | --- |
| [Pruebas unitarias](pruebas-unitarias-es.md) | PU-01 a PU-64 (220 pruebas en la corrida del 16 de noviembre) | Vitest | 64 | 0 |
| [Pruebas de componentes](pruebas-componentes-es.md) | PC-01 a PC-23 | Vitest con Postgres local | 21 | 2 |
| [Pruebas integrales](pruebas-integrales-es.md) | PI-01 a PI-06 | Playwright con Postgres local | 6 | 0 |
| [Pruebas de sistema](pruebas-sistema-es.md) | PS-01 a PS-16 | Playwright y verificación manual en el deploy | 16 | 0 |
| [Pruebas de regresión](pruebas-regresion-es.md) | PR-01 a PR-07 | GitHub Actions | 5 | 2 |
| [Pruebas de aceptación](pruebas-aceptacion-es.md) | PA-01 a PA-06 | Guion con usuarios reales | 0 | 6 |

La guía de sistema también integra la antigua guía manual de Inspecciones, que antes estaba en `docs/testing-inspections-es.md`.

## Qué falta

- La verificación en vivo en https://harinas-elizondo.vercel.app con Neon se corrió el 2026-11-16 y cubre PS-08 a PS-16. Quedan sin probar en vivo algunos pasos de la guía manual de Inspecciones, como el bloqueo de una inspección certificada y las dos sesiones a la vez.
- Reportes y Bitácora ya están en `main` y PS-07, PS-15 y PS-16 pasaron, pero PC-13 y PC-14 siguen Pendiente porque todavía no existe una prueba de componente contra Postgres para ellos, y PA-05 espera la UAT con personas reales.
- La UAT con al menos dos personas externas al equipo no se ha hecho. Sus tablas están vacías y solo se llenan con sesiones reales.
- La regla de rama que exige CI en `main` y una corrida de fork terminada en verde siguen pendientes (PR-05 y PR-06). PR-07 ya pasó porque CI corre en verde sobre `main`.

## Cómo correr las suites

```bash
pnpm install
pnpm test                       # unitarias
docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int   # componentes
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:e2e   # integrales y sistema
```

Las suites con base de datos solo aceptan una base local cuyo nombre termina en `_test`. Nunca se apuntan a Neon.

Las corridas registradas el 16 de noviembre de 2026 en el commit 23d9967 usaron un PostgreSQL 14.24 de Homebrew en lugar de Docker, con `createdb harinas_plan006_test` y `TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan006_test`. Los pasos con Docker de arriba siguen siendo válidos y CI usa `postgres:16`.

## Exportar a PDF

Para subir las guías a Teams corre `pnpm docs:pdf`, que genera un PDF por documento y `entrega-3-completa.pdf` en `docs/pdf/`. Los diagramas Mermaid salen dibujados y la carpeta no se sube a Git.
