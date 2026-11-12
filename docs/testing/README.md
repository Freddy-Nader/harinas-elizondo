# Guías de pruebas

Esta carpeta tiene una guía por tipo de prueba de la entrega 3 de Harinas Elizondo. Todas usan la misma plantilla de `docs/llm/testing.md`, con las columnas Id, Requisito, Precondición, Pasos, Datos de entrada, Resultado esperado, Resultado obtenido y Estado.

Cada Resultado obtenido sale de una corrida real, con su fecha y su commit. Si un caso no se pudo ejecutar, su Estado es Pendiente y dice por qué.

## Guías

| Guía | Ids | Herramienta | Pass | Pendiente |
| --- | --- | --- | --- | --- |
| [Pruebas unitarias](pruebas-unitarias-es.md) | PU-01 a PU-44 (133 pruebas) | Vitest | 44 | 0 |
| [Pruebas de componentes](pruebas-componentes-es.md) | PC-01 a PC-14 | Vitest con Postgres local | 12 | 2 |
| [Pruebas integrales](pruebas-integrales-es.md) | PI-01 a PI-06 | Playwright con Postgres local | 6 | 0 |
| [Pruebas de sistema](pruebas-sistema-es.md) | PS-01 a PS-16 | Playwright y verificación manual en el deploy | 7 | 9 |
| [Pruebas de regresión](pruebas-regresion-es.md) | PR-01 a PR-07 | GitHub Actions | 4 | 3 |
| [Pruebas de aceptación](pruebas-aceptacion-es.md) | PA-01 a PA-06 | Guion con usuarios reales | 0 | 6 |

La guía de sistema también integra la antigua guía manual de Inspecciones, que antes estaba en `docs/testing-inspections-es.md`.

## Qué falta

- La verificación en vivo en https://harinas-elizondo.vercel.app con Neon (#19) espera la rotación de credenciales. Afecta PS-08 a PS-14.
- Reportes ya tiene merge en `main` (#33 y #37) y PS-07 pasa. Bitácora (#31) y la navegación móvil (#35) no tienen merge. Afecta PS-15, PS-16, PC-13, PC-14 y PA-05.
- La UAT con al menos dos personas externas al equipo no se ha hecho. Sus tablas están vacías y solo se llenan con sesiones reales.
- La regla de rama que exige CI en `main` y una corrida desde un fork siguen pendientes (PR-05 a PR-07).

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

## Exportar a PDF

Las guías son Markdown normal sin extensiones, así que se pueden abrir en GitHub e imprimir a PDF desde el navegador, o convertir con una herramienta como Pandoc. La exportación todavía no se ha probado.
