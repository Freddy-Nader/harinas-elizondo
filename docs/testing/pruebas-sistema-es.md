# Guía de pruebas de sistema (PS)

Las pruebas de sistema comprueban la aplicación completa como la usa una persona. Cubren el inicio de sesión, los permisos de cada rol y el flujo de punta a punta del laboratorio, desde el lote hasta el envío del certificado. La guía tiene dos partes.

La primera parte son las pruebas automatizadas con Playwright contra una base local (issue #22, PR #38). La segunda parte es la verificación en vivo en la aplicación desplegada en https://harinas-elizondo.vercel.app con su base Neon (issue #19). La verificación en vivo todavía no se ha hecho porque espera la rotación de credenciales, así que sus filas están en Pendiente (#19).

## Ejecución registrada

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-12 |
| Commit | 856f7e0 (rama `test/e2e`, PR #38) |
| Comando | `TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:e2e` |
| Base | PostgreSQL 16.13 en Docker local, base `harinas_test`, nunca Neon |
| Entorno | macOS arm64, Node 22.22.0, Playwright 1.65.0, Chromium |
| Resultado de la suite | 13 pruebas, 13 pasan, 0 omitidas, 0 fallan, 30.7 s |

En CI el job E2E tests (Playwright) corre la misma suite. La corrida del commit 856f7e0 está en la pestaña Checks de https://github.com/ValleryR/harinas-elizondo/pull/38. Los pasos para repetirla están en la guía de pruebas integrales.

## Pruebas automatizadas con base local

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-01 | RF-01 | Sin sesión | Abrir /clientes, entrar con el usuario de transacción | Usuario de prueba `@prueba.test` | Manda a /login con la ruta de regreso y después de entrar vuelve a /clientes | Pasa (0.5 s) | Pass |
| PS-02 | RF-01 | Sin sesión | Entrar con una contraseña incorrecta | Contraseña equivocada | Muestra "No pudimos iniciar sesión. Revisa tu correo y contraseña." y sigue en /login | Pasa (0.4 s) | Pass |
| PS-03 | RF-01 | Un usuario por rol | Entrar y salir con transacción, consulta y administrador | Usuarios de prueba de cada rol | La barra lateral muestra el nombre, el rol y el número de empleado, y al salir /panel manda a /login | Pasa (3.3 s) | Pass |
| PS-04 | RF-04, RF-05, RF-06 | Equipos listos y cliente activo | Crear un lote, completar su inspección, crear y emitir el certificado, enviarlo | Lote sintético, resultados dentro de rango, factura y transportista ficticios | El certificado dice que todos los parámetros están dentro de referencia, queda enviado al contacto, aparece como Enviado en la lista y el lote avisa que ya tiene un certificado emitido | Pasa (5.0 s) | Pass |
| PS-05 | RF-01 | Sesión de consulta | Revisar el menú y escribir a mano las rutas de emisión y captura | /certificados, /certificados/nuevo y /lotes/nuevo | El menú ofrece Reportes y Bitácora y oculta Certificados, Clientes, Equipos, Lotes, Inspecciones y Usuarios. Cada ruta muestra "Acceso restringido" sin los botones de crear o emitir | Pasa (1.2 s) | Pass |
| PS-06 | RF-01, D-14 | Sesión de transacción y de administrador | Abrir /usuarios con cada uno | Usuarios de prueba | Transacción ve "Acceso restringido" y el administrador ve Usuarios en el menú y abre la pantalla | Pasa (1.4 s) | Pass |
| PS-07 | RF-07, UC-08, Q-09 | Un certificado emitido para un cliente propio de la prueba | Entrar como consulta, abrir /reportes, filtrar por el cliente, exportar a Excel y a CSV | Certificados sintéticos | La tabla muestra solo el certificado del cliente. El `.xlsx` tiene la hoja Certificados con ese certificado y el CSV también lo trae | La tabla muestra una fila, el `.xlsx` leído con exceljs tiene 2 filas (encabezado y certificado) y el CSV lo contiene | Pass |

## Verificación en vivo contra Neon (#19)

Estas filas repiten los flujos en la aplicación desplegada y en su base Neon. Ninguna se ha ejecutado. Se deben correr con usuarios de demostración y datos de prueba, nunca con datos reales, y las capturas no deben mostrar datos personales.

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-08 | Instalación | Credenciales nuevas de #11 | Confirmar con `pnpm db:migrate` que las migraciones están aplicadas en Neon | Ninguno | No queda ninguna migración por aplicar | Sin ejecutar | Pendiente (#19) |
| PS-09 | RF-01 | Usuarios de demostración por rol | Entrar y salir en el deploy con transacción y con consulta | Usuarios de demostración | Cada rol entra, ve su menú y sale | Sin ejecutar | Pendiente (#19) |
| PS-10 | RF-03, UC-02, D-22, D-23 | Sesión de transacción en el deploy | Crear un cliente con dirección fiscal y dos destinos, editarlo, quitar un destino, probar RFC y clave SAP repetidos, poner límites que intenten ampliar los internacionales, desactivar y reactivar | Cliente de prueba | Cada paso se guarda o se rechaza con su aviso, y los límites más amplios se rechazan | Sin ejecutar | Pendiente (#19) |
| PS-11 | RF-02, UC-01, D-16, BR-EQP-03 | Sesión de transacción en el deploy | Crear un alveógrafo y un farinógrafo con límites, inactivar con motivo, reactivar, dar de baja | Equipos de prueba | Los cambios de estado exigen motivo, la baja es final y el equipo inactivo no aparece en la captura | Sin ejecutar | Pendiente (#19) |
| PS-12 | RF-04, UC-03, UC-04, BR-INS-02, BR-INS-04, D-15 | Equipos listos en el deploy | Crear un lote, iniciar A, captura parcial, captura completa, re-inspección con motivo | Lote de prueba | Secuencia A, luego B solo con motivo, y A se conserva | Sin ejecutar | Pendiente (#19) |
| PS-13 | RF-01 | Sesión de consulta en el deploy | Intentar crear o modificar en cada módulo | Usuario de consulta de demostración | Ninguna modificación es posible | Sin ejecutar | Pendiente (#19) |
| PS-14 | RF-05, RF-06, UC-05 | Lote completo en el deploy | Emitir, enviar y abrir el PDF de un certificado | Cliente y lote de prueba | Igual que PS-04 pero con Neon | Sin ejecutar | Pendiente (#19). `docs/llm/status.md` menciona una revisión manual de Certificados contra Neon el 2026-11-11, pero no dejó tabla de evidencia, así que no se cuenta aquí |

## Guía manual de Inspecciones

Esta sección integra la antigua guía `docs/testing-inspections-es.md`. Cada paso de esa guía ya está cubierto por una prueba automatizada que se ejecutó con base local en el commit 331ef38. La repetición manual en el deploy con Neon forma parte de PS-12 y PS-13.

| Paso | Qué comprueba | Cubierto con base local por | Resultado local | En vivo con Neon |
| --- | --- | --- | --- | --- |
| Registrar un lote e iniciar la primera inspección | Recibe A sin capturar la secuencia (BR-INS-02) | PI-05, PC-04, PU-01 | Pass | Pendiente (#19) |
| Iniciar otra sin terminar A | Pide completar A | PU-02, PU-42 | Pass | Pendiente (#19) |
| Captura parcial, guardar y volver a abrir | Conserva los resultados y la muestra incompleta | PI-05 | Pass | Pendiente (#19) |
| Completar los diez parámetros con uno fuera de límites | La muestra completa, con desviación, y deja guardar (BR-CER-04) | PI-05, PU-07 | Pass | Pendiente (#19) |
| Re-inspección sin motivo y con motivo de falla | Sin motivo se rechaza, con motivo crea B y conserva A (BR-INS-04, D-15) | PC-04, PU-02 | Pass | Pendiente (#19) |
| Usar un equipo inactivo, de baja, de otro tipo o sin límites | Se rechaza (BR-EQP-03) | PU-18 | Pass | Pendiente (#19) |
| Capturar con una cuenta de consulta o sin sesión | Niega el acceso o pide iniciar sesión (RF-01) | PC-07, PU-41, PS-05 | Pass | Pendiente (#19) |
| Guardar en una inspección certificada | Rechaza los cambios (BR-AUD-03) | PC-08, PI-06, PU-41 | Pass | Pendiente (#19) |
| Iniciar la misma inspección desde dos sesiones | Una se crea y la otra pide actualizar, nunca dos nuevas | PC-05, PU-42 | Pass | Pendiente (#19) |
| Revisar la auditoría de la inspección | Guarda usuario, inspección, secuencia y cambios (BR-AUD-01) | PC-06, PU-32 | Pass | Pendiente (#19) |

## Módulos sin prueba de sistema todavía

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-15 | RF-08, D-20 | Pantalla de Bitácora integrada | Abrir Bitácora con transacción y con consulta y filtrar | Filas de auditoría de prueba | Ambos roles la leen y nadie la modifica | Sin ejecutar | Pendiente, Bitácora está en #31 sin merge |
| PS-16 | RF-01 | Navegación móvil integrada | Abrir la aplicación con un ancho menor a `md` y navegar con el menú | Ventana de teléfono | El menú móvil abre todos los módulos permitidos para el rol | Sin ejecutar | Pendiente, la navegación móvil está en #35 sin merge |

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 7 (PS-01 a PS-07) |
| Pendiente | 9 (PS-08 a PS-14 por #19, PS-15 y PS-16 por PRs sin merge) |
