# Guía de pruebas de componentes (PC)

Las pruebas de componentes ejecutan las acciones del servidor de cada módulo contra una base Postgres real y desechable. Así se prueban juntos el SQL, las restricciones de la base, las transacciones y la fila de auditoría. Solo la sesión es simulada. Viven en `src/**/*.int.test.ts` y corren con `pnpm test:int` (issue #21, PR #36).

La aplicación usa el controlador HTTP de Neon, que no puede hablar con un Postgres normal. Por eso la suite cambia `@/lib/db` por el mismo esquema de Drizzle sobre node-postgres, y su `batch` corre en una sola transacción real, igual que en Neon. El esquema se crea desde cero con todas las migraciones de `drizzle/` y cada archivo empieza con tablas vacías más datos sintéticos (los diez parámetros, límites de demostración y un usuario por rol).

## Ejecución registrada

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-11 |
| Commit | 331ef38 (rama `test/e2e`, que incluye `test/integration` de PR #36) |
| Comando | `TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int` |
| Base | PostgreSQL 16.13 en Docker local, base `harinas_test`, nunca Neon |
| Entorno | macOS arm64, Node 22.22.0, Vitest 5.0.5 |
| Resultado | 4 archivos, 12 pruebas, 12 pasan, 0 fallan |

En CI el job Integration tests (Postgres) corre la misma suite contra un servicio `postgres:16`. La corrida verde del commit 331ef38 es https://github.com/ValleryR/harinas-elizondo/actions/runs/43161348610 y la del commit 8f600d1 de PR #36 es https://github.com/ValleryR/harinas-elizondo/actions/runs/43159071569.

## Cómo repetirla

```bash
docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int
```

`src/test/int/guard.ts` se niega a correr si la URL no es local o si el nombre de la base no termina en `_test`, así que la suite no puede borrar una base real. Las credenciales de arriba solo existen dentro del contenedor y no son secretas.

## Casos

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PC-01 | RF-03, BR-AUD-01 | Sesión de transacción, base vacía con catálogo | Registrar un cliente con dos destinos | Cliente sintético con RFC ficticio y correo `@prueba.test` | Cliente, destinos y fila de auditoría quedan guardados juntos | Pasa (19 ms) | Pass |
| PC-02 | RF-03 | Cliente existente con un RFC | Registrar otro cliente con el mismo RFC | RFC repetido | Se rechaza con aviso y no se escribe nada | Pasa (2 ms) | Pass |
| PC-03 | RF-03 | Dos sesiones de transacción | Guardar dos clientes con el mismo RFC al mismo tiempo | RFC repetido en paralelo | Solo uno se guarda por la restricción única de la migración 0002 y el perdedor no deja filas | Pasa (13 ms) | Pass |
| PC-04 | BR-INS-02, BR-INS-04 | Lote sin inspecciones y equipos listos | Iniciar A, completarla e iniciar B con motivo | Resultados de los diez parámetros, motivo de falla de equipo | A primero, B solo después de completar A y con el motivo | Pasa (35 ms) | Pass |
| PC-05 | BR-INS-02, BR-INS-04 | Lote sin inspecciones | Iniciar dos inspecciones al mismo tiempo | Dos llamadas simultáneas | Una recibe A y la otra el aviso de colisión, sin crear una B sin autorización | Pasa (4 ms) | Pass |
| PC-06 | BR-AUD-01 | Lote existente | Modificar el lote con un usuario inválido para la auditoría y luego con uno válido | Usuario que rompe la fila de auditoría | Si la auditoría falla el cambio se revierte, con usuario válido ambos se guardan | Pasa (9 ms) | Pass |
| PC-07 | RF-01 | Sesión de consulta | Intentar iniciar una inspección | Lote existente | Se rechaza y no se escribe nada | Pasa (2 ms) | Pass |
| PC-08 | BR-AUD-03, BR-AUD-01 | Lote con inspección completa y borrador de certificado listo | Emitir el certificado e intentar editar resultados y lote | Borrador completo | Copia diez líneas, guarda la huella, bloquea la inspección y rechaza las ediciones posteriores | Pasa (43 ms) | Pass |
| PC-09 | BR-AUD-03 | Borrador listo y dos sesiones | Emitir el mismo certificado al mismo tiempo | Dos llamadas simultáneas | Se emite una sola vez y hay una sola fila de auditoría de emisión | Pasa (26 ms) | Pass |
| PC-10 | BR-CER-01, BR-CER-02 | Lote cuya última inspección está incompleta | Intentar crear el certificado | Inspección con parámetros faltantes | No se genera el certificado | Pasa (9 ms) | Pass |
| PC-11 | RF-01 | Usuario de transacción y administrador desactivado | Intentar crear una cuenta | Datos de cuenta sintéticos | Solo un administrador activo crea cuentas | Pasa (11 ms) | Pass |
| PC-12 | RF-01, BR-AUD-01 | Administrador activo | Crear una cuenta y luego otra con el mismo correo | Correo `@prueba.test`, contraseña ficticia | Cuenta, credencial y auditoría se guardan juntas, y el correo repetido revierte todo | Pasa (96 ms) | Pass |
| PC-13 | RF-07, UC-08 | Módulo de Reportes integrado | Consultar y exportar el histórico contra Postgres | Certificados sintéticos | Filtros y exportación correctos según el rol | Sin ejecutar | Pendiente, Reportes vive en #33 y #37 sin merge y no tiene prueba de componente en esta rama |
| PC-14 | RF-08, D-20 | Pantalla de Bitácora integrada | Leer la bitácora con cada rol | Filas de auditoría sintéticas | Ambos roles leen y nadie modifica | Sin ejecutar | Pendiente, Bitácora vive en #31 sin merge y no tiene prueba de componente en esta rama |

La prueba `renderCertificatePdf (component)` genera el PDF sin base de datos, por eso se documenta como PU-31 en la guía de pruebas unitarias.

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 12 |
| Pendiente | 2 |

La concurrencia es determinista porque `holdUntilConcurrent` detiene la escritura hasta que llegan las dos llamadas, así que ambas pasan sus revisiones y la base decide.
