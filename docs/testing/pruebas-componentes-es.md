# Guía de pruebas de componentes (PC)

Las pruebas de componentes ejecutan las acciones del servidor de cada módulo contra una base Postgres real y desechable. Así se prueban juntos el SQL, las restricciones de la base, las transacciones y la fila de auditoría. Solo la sesión es simulada. Viven en `src/**/*.int.test.ts` y corren con `pnpm test:int` (issue #21, PR #36).

La aplicación usa el controlador HTTP de Neon, que no puede hablar con un Postgres normal. Por eso la suite cambia `@/lib/db` por el mismo esquema de Drizzle sobre node-postgres, y su `batch` corre en una sola transacción real, igual que en Neon. El esquema se crea desde cero con todas las migraciones de `drizzle/` y cada archivo empieza con tablas vacías más datos sintéticos (los diez parámetros, límites de demostración y un usuario por rol).

## Ejecución registrada

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-16 |
| Commit | 473324b (rama `test/component-reportes-bitacora`, sobre `chore/improve-plans` con las API y la CLI de Clientes, D-28 y D-29) |
| Comando | `TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan009_test pnpm test:int` |
| Base | PostgreSQL 14.24 (Homebrew) local, base `harinas_plan009_test` creada para esta corrida, nunca Neon |
| Entorno | macOS arm64, Node 22.22.0, Vitest 5.0.5, sin Docker |
| Resultado | 7 archivos, 33 pruebas, 33 pasan, 0 fallan |

En CI el job Integration tests (Postgres) corre la misma suite contra un servicio `postgres:16`. La última corrida verde en `main`, del commit f767e75, es https://github.com/ValleryR/harinas-elizondo/actions/runs/43849955128 y sus tres jobs terminaron en verde. La corrida de esta guía usó Postgres 14 local porque Docker no estaba disponible, mientras que CI usa `postgres:16`.

## Cómo repetirla

Con Docker.

```bash
docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int
```

Sin Docker, con un Postgres local de Homebrew, como en la corrida registrada.

```bash
createdb harinas_plan009_test
TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan009_test pnpm test:int
dropdb harinas_plan009_test
```

`src/test/int/guard.ts` se niega a correr si la URL no es local o si el nombre de la base no termina en `_test`, así que la suite no puede borrar una base real. Las credenciales de arriba solo existen dentro del contenedor y no son secretas.

## Casos

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PC-01 | RF-03, BR-AUD-01 | Sesión de transacción, base vacía con catálogo | Registrar un cliente con dos destinos | Cliente sintético con RFC ficticio y correo `@prueba.test` | Cliente, destinos y fila de auditoría quedan guardados juntos | Pasa (16 ms) | Pass |
| PC-02 | RF-03 | Cliente existente con un RFC | Registrar otro cliente con el mismo RFC | RFC repetido | Se rechaza con aviso y no se escribe nada | Pasa (1 ms) | Pass |
| PC-03 | RF-03 | Dos sesiones de transacción | Guardar dos clientes con el mismo RFC al mismo tiempo | RFC repetido en paralelo | Solo uno se guarda por la restricción única de la migración 0002 y el perdedor no deja filas | Pasa (9 ms) | Pass |
| PC-04 | BR-INS-02, BR-INS-04 | Lote sin inspecciones y equipos listos | Iniciar A, completarla e iniciar B con motivo | Resultados de los diez parámetros, motivo de falla de equipo | A primero, B solo después de completar A y con el motivo | Pasa (29 ms) | Pass |
| PC-05 | BR-INS-02, BR-INS-04 | Lote sin inspecciones | Iniciar dos inspecciones al mismo tiempo | Dos llamadas simultáneas | Una recibe A y la otra el aviso de colisión, sin crear una B sin autorización | Pasa (3 ms) | Pass |
| PC-06 | BR-AUD-01 | Lote existente | Modificar el lote con un usuario inválido para la auditoría y luego con uno válido | Usuario que rompe la fila de auditoría | Si la auditoría falla el cambio se revierte, con usuario válido ambos se guardan | Pasa (6 ms) | Pass |
| PC-07 | RF-01 | Sesión de consulta | Intentar iniciar una inspección | Lote existente | Se rechaza y no se escribe nada | Pasa (1 ms) | Pass |
| PC-08 | BR-AUD-03, BR-AUD-01 | Lote con inspección completa y borrador de certificado listo | Emitir el certificado e intentar editar resultados y lote | Borrador completo | Copia diez líneas, guarda la huella, bloquea la inspección y rechaza las ediciones posteriores | Pasa (37 ms) | Pass |
| PC-09 | BR-AUD-03 | Borrador listo y dos sesiones | Emitir el mismo certificado al mismo tiempo | Dos llamadas simultáneas | Se emite una sola vez y hay una sola fila de auditoría de emisión | Pasa (22 ms) | Pass |
| PC-10 | BR-CER-01, BR-CER-02 | Lote cuya última inspección está incompleta | Intentar crear el certificado | Inspección con parámetros faltantes | No se genera el certificado | Pasa (8 ms) | Pass |
| PC-11 | RF-01 | Usuario de transacción y administrador desactivado | Intentar crear una cuenta | Datos de cuenta sintéticos | Solo un administrador activo crea cuentas | Pasa (11 ms) | Pass |
| PC-12 | RF-01, BR-AUD-01 | Administrador activo | Crear una cuenta y luego otra con el mismo correo | Correo `@prueba.test`, contraseña ficticia | Cuenta, credencial y auditoría se guardan juntas, y el correo repetido revierte todo | Pasa (97 ms) | Pass |
| PC-13 | RF-07, UC-08 | Dos certificados emitidos de dos clientes, creados con las acciones reales | Consultar el histórico con cada rol, filtrar por cliente, exportar en CSV y en xlsx con consulta y llamar sin sesión | Certificados sintéticos de dos clientes ficticios | Filtros y exportación correctos según el rol | Pasa (6 pruebas, 24 ms en total). Ambos roles leen los dos certificados, el filtro por cliente devuelve solo el suyo, cada exportación deja una fila `export` de auditoría con el usuario de consulta y sin sesión redirige a /login | Pass |
| PC-14 | RF-08, D-20 | Filas de auditoría creadas con las acciones reales de Clientes y Lotes más una de exportación | Leer la bitácora con cada rol, filtrar por entidad y por empleado, llamar sin sesión y revisar lo que exporta el módulo | Filas de auditoría sintéticas | Ambos roles leen y nadie modifica | Pasa (6 pruebas, 9 ms en total). Ambos roles leen 3 filas con el total correcto y la más nueva primero, los filtros devuelven solo sus filas, sin sesión redirige a /login y `listAuditLog` es la única función que exporta el módulo | Pass |
| PC-15 | RF-01 | Sin sesión | Llamar a la lista y al alta de `/api/v1/clients` | Lista y alta sin sesión | Ambas responden 401 con "Inicia sesión para continuar." | Pasa (10 ms) | Pass |
| PC-16 | RF-01 | Sesión de consulta | Llamar a la lista y al alta de `/api/v1/clients` | Cliente sintético | Ambas responden 403 con el mensaje de permiso y no se escribe nada | Pasa (2 ms) | Pass |
| PC-17 | RF-03, BR-AUD-01 | Sesión de transacción | Crear un cliente por `/api/v1/clients/create` | Cliente sintético con RFC ficticio y correo `@prueba.test` | Responde 200 y quedan el cliente y su fila de auditoría | Pasa (6 ms) | Pass |
| PC-18 | RF-03, BR-CLI-01 | Cliente existente con la misma clave SAP | Crear otro cliente con la clave SAP repetida | Clave SAP repetida | Responde 409 con el mensaje de la clave SAP | Pasa (1 ms) | Pass |
| PC-19 | RF-03, BR-CLI-02 | Cliente existente con un RFC | Crear otro cliente con el RFC repetido | RFC repetido | Responde 409 con el mensaje del RFC | Pasa (1 ms) | Pass |
| PC-20 | RF-03 | Sesión de transacción | Crear un cliente con datos inválidos | Datos incompletos | Responde 400 con el mensaje en español y el campo con error | Pasa (1 ms) | Pass |
| PC-21 | RF-03, BR-AUD-01 | Cliente existente | Actualizar el cliente y luego un id que no existe | Cambios válidos e id desconocido | El cambio se guarda con una fila de auditoría de modificación y el id desconocido responde 404 | Pasa (6 ms) | Pass |
| PC-22 | RF-03 | Cliente existente | Pedir la lista de clientes | Directorio con un cliente | Responde 200 con el cliente en el directorio | Pasa (1 ms) | Pass |
| PC-23 | RF-01 | Sesión de transacción | Llamar a una operación desconocida y usar un método equivocado | Operación y método inválidos | Responde 404 en ambos casos | Pasa (1 ms) | Pass |

La prueba `renderCertificatePdf (component)` genera el PDF sin base de datos, por eso se documenta como PU-31 en la guía de pruebas unitarias.

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 23 |
| Pendiente | 0 |

La concurrencia es determinista porque `holdUntilConcurrent` detiene la escritura hasta que llegan las dos llamadas, así que ambas pasan sus revisiones y la base decide.
