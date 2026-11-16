# Guía de pruebas de sistema (PS)

Las pruebas de sistema comprueban la aplicación completa como la usa una persona. Cubren el inicio de sesión, los permisos de cada rol y el flujo de punta a punta del laboratorio, desde el lote hasta el envío del certificado. La guía tiene dos partes.

La primera parte son las pruebas automatizadas con Playwright contra una base local (issue #22, PR #38). La segunda parte es la verificación en vivo en la aplicación desplegada en https://harinas-elizondo.vercel.app con su base Neon (issue #19). La verificación en vivo se corrió el 2026-11-16, una vez rotadas las credenciales, y sus filas tienen su resultado.

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

Estas filas repiten los flujos en la aplicación desplegada y en su base Neon. Se corrieron el 2026-11-16 en producción con los usuarios de demostración y datos de prueba, nunca con datos reales, y las capturas no muestran datos personales. Los datos creados quedan en producción con el prefijo PRUEBA (cliente `PRUEBA02`, lote `L-PRUEBA-010`, certificados `CER-2026-000003` y `CER-2026-000004`). La corrida usó el deploy de producción del 15 de noviembre de 2026, y producción se volvió a desplegar desde `main` el 16 de noviembre de 2026 después de la corrida.

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-08 | Instalación | Credenciales nuevas de #11 | Confirmar con `pnpm db:migrate` que las migraciones están aplicadas en Neon | Ninguno | No queda ninguna migración por aplicar | 2026-11-16 en producción. La tabla `drizzle.__drizzle_migrations` tiene 5 filas y el journal de `drizzle/meta/_journal.json` tiene 5 entradas. `pnpm db:migrate` terminó con "migrations applied successfully" y código de salida 0, y la tabla siguió con 5 filas, así que no aplicó nada nuevo | Pass |
| PS-09 | RF-01 | Usuarios de demostración por rol | Entrar y salir en el deploy con transacción y con consulta | Usuarios de demostración | Cada rol entra, ve su menú y sale | 2026-11-16 en producción. Las sesiones de ambos roles llegaron a `/panel` (registro de ingreso del operador con hora 10:41 UTC). Transacción vio Panel, Clientes, Equipos, Lotes, Inspecciones, Certificados, Reportes y Bitácora con el nombre Laboratorio Demo. Consulta vio solo Panel, Reportes y Bitácora con el nombre Gerencia Demo. Al pulsar Cerrar sesión con cada rol el navegador fue a `/login`, y abrir `/panel` de nuevo volvió a `/login` | Pass |
| PS-10 | RF-03, UC-02, D-22, D-23 | Sesión de transacción en el deploy | Crear un cliente con dirección fiscal y dos destinos, editarlo, quitar un destino, probar RFC y clave SAP repetidos, poner límites que intenten ampliar los internacionales, desactivar y reactivar | Cliente de prueba | Cada paso se guarda o se rechaza con su aviso, y los límites más amplios se rechazan | 2026-11-16 en producción con el cliente `PRUEBA02`, RFC ficticio y correo @example.test. Alta con dirección fiscal y dos destinos y aparece Activo en el directorio. Se editó la razón social y se quitó un destino (quedó uno). El RFC repetido mostró "El RFC ya pertenece a otro cliente" y la clave SAP repetida "La clave SAP ya pertenece a otro cliente". Un límite particular más amplio (50 a 100 contra 60 a 90) se rechazó con "Los límites particulares deben estar dentro del rango internacional" y uno más estricto (65 a 85) se guardó. Con motivo de inactivación el cliente quedó Inactivo y Reactivar lo devolvió a Activo. Los avisos de éxito de editar y quitar destino no se alcanzaron a leer, pero los cambios se comprobaron al recargar | Pass |
| PS-11 | RF-02, UC-01, D-16, BR-EQP-03 | Sesión de transacción en el deploy | Crear un alveógrafo y un farinógrafo con límites, inactivar con motivo, reactivar, dar de baja | Equipos de prueba | Los cambios de estado exigen motivo, la baja es final y el equipo inactivo no aparece en la captura | 2026-11-16 en producción. Se crearon un alveógrafo y un farinógrafo de prueba, ambos Activo y Lista para certificar. Inactivar sin motivo no se envía y con motivo el alveógrafo quedó Inactivo y aparece como "no disponible" y deshabilitado en la captura de la inspección. Reactivar lo devolvió a Activo. Un tercer alveógrafo se dio de baja con motivo y quedó en Baja sin botones de reactivar ni inactivar, y también sale como no disponible en la captura. Para probar los límites se cambió la fuerza panadera internacional de 250 a 350 a 240 a 360 y se regresó a 250 a 350, así que ambos cambios quedaron en el historial del equipo y en la Bitácora | Pass |
| PS-12 | RF-04, UC-03, UC-04, BR-INS-02, BR-INS-04, D-15 | Equipos listos en el deploy | Crear un lote, iniciar A, captura parcial, captura completa, re-inspección con motivo | Lote de prueba | Secuencia A, luego B solo con motivo, y A se conserva | 2026-11-16 en producción con el lote `L-PRUEBA-010`. El lote recibió la secuencia A. La captura parcial con solo el alveógrafo mostró "Resultados guardados. Faltan 5 de 10 parámetros", "Incompleta · 5/10" y la tenacidad "Arriba +5". La captura completa mostró "La inspección está completa" y el lote listó A como Completa con 1 desviación. Registrar B sin motivo no se envía. Con motivo "Falla de calibración..." se creó la inspección B y A se conservó. Después se completó B con los mismos valores para poder certificar | Pass |
| PS-13 | RF-01 | Sesión de consulta en el deploy | Intentar crear o modificar en cada módulo | Usuario de consulta de demostración | Ninguna modificación es posible | 2026-11-16 en producción con consulta@demo.test. El menú solo ofrece Panel, Reportes y Bitácora. Al abrir `/clientes`, `/equipos`, `/equipos/nuevo`, `/lotes`, `/lotes/nuevo`, `/inspecciones`, `/certificados`, `/certificados/nuevo` y `/usuarios` salió "Acceso restringido" y ninguna mostró botones de registrar, guardar, crear, emitir ni enviar. `/reportes` y `/bitacora` no tienen botones de escritura | Pass |
| PS-14 | RF-05, RF-06, UC-05 | Lote completo en el deploy | Emitir, enviar y abrir el PDF de un certificado | Cliente y lote de prueba | Igual que PS-04 pero con Neon | 2026-11-16 en producción con `PRUEBA02` y el lote `L-PRUEBA-010` (inspección B). El borrador `CER-2026-000003` mostró los bloqueos "Falta el número de factura", "Falta el transportista" y otros, con Emitir deshabilitado, y su vista previa PDF respondió 200 como borrador. Con los datos de embarque se habilitó Emitir. Como la página del borrador no avisa del correo de prueba, se emitió sin marcar el envío, y el estado Emitido sí muestra "Modo de prueba: el correo sí se envía, pero llega a un buzón de prueba". Solo entonces se pulsó Enviar ahora, y el certificado pasó a Enviado con la entrega a contacto-prueba02@example.test y almacen@demo.test. Se envió un solo correo. El PDF respondió 200 como `application/pdf`, empieza con `%PDF-` y se guardó como `docs/img/certificado-ejemplo.pdf`. No se volvió a abrir la inspección B para ver su bloqueo porque las sesiones ya se habían cerrado | Pass |

## Guía manual de Inspecciones

Esta sección integra la antigua guía `docs/testing-inspections-es.md`. Cada paso de esa guía ya está cubierto por una prueba automatizada que se ejecutó con base local en el commit 331ef38. La repetición manual en el deploy con Neon forma parte de PS-12 y PS-13.

| Paso | Qué comprueba | Cubierto con base local por | Resultado local | En vivo con Neon |
| --- | --- | --- | --- | --- |
| Registrar un lote e iniciar la primera inspección | Recibe A sin capturar la secuencia (BR-INS-02) | PI-05, PC-04, PU-01 | Pass | Pass el 2026-11-16, ver PS-12 |
| Iniciar otra sin terminar A | Pide completar A | PU-02, PU-42 | Pass | Pendiente (#19) |
| Captura parcial, guardar y volver a abrir | Conserva los resultados y la muestra incompleta | PI-05 | Pass | Pass el 2026-11-16, ver PS-12 |
| Completar los diez parámetros con uno fuera de límites | La muestra completa, con desviación, y deja guardar (BR-CER-04) | PI-05, PU-07 | Pass | Pass el 2026-11-16, ver PS-12 |
| Re-inspección sin motivo y con motivo de falla | Sin motivo se rechaza, con motivo crea B y conserva A (BR-INS-04, D-15) | PC-04, PU-02 | Pass | Pass el 2026-11-16, ver PS-12 |
| Usar un equipo inactivo, de baja, de otro tipo o sin límites | Se rechaza (BR-EQP-03) | PU-18 | Pass | Pass el 2026-11-16 solo con equipo inactivo y de baja, ver PS-11 y PS-12. Faltan los otros dos casos |
| Capturar con una cuenta de consulta o sin sesión | Niega el acceso o pide iniciar sesión (RF-01) | PC-07, PU-41, PS-05 | Pass | Pass el 2026-11-16 solo con consulta, ver PS-13. Falta el caso sin sesión |
| Guardar en una inspección certificada | Rechaza los cambios (BR-AUD-03) | PC-08, PI-06, PU-41 | Pass | Pendiente (#19) |
| Iniciar la misma inspección desde dos sesiones | Una se crea y la otra pide actualizar, nunca dos nuevas | PC-05, PU-42 | Pass | Pendiente (#19) |
| Revisar la auditoría de la inspección | Guarda usuario, inspección, secuencia y cambios (BR-AUD-01) | PC-06, PU-32 | Pass | Pass el 2026-11-16 solo en la Bitácora, con ambos roles, que muestra Alta, Modificación y Reinspección de las inspecciones 6 y 7, ver PS-15 |

## Bitácora y navegación móvil

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-15 | RF-08, D-20 | Pantalla de Bitácora en `main` | Abrir Bitácora con transacción y con consulta y filtrar | Filas de auditoría de prueba | Ambos roles la leen y nadie la modifica | 2026-11-16 en producción. Con consulta se abrió `/bitacora`, que lista los movimientos con empleado, acción y entidad, y se filtró por entidad Certificado y acción Emisión. El filtro dejó tres filas de Emisión, una del 16 nov 2026 (CER-2026-000003) y dos del 11 nov 2026 (CER-2026-000002 y CER-2026-000001). Con transacción se abrió la misma pantalla y se aplicó el mismo filtro, que dejó las mismas tres filas de Emisión. En ambos roles el único botón de la pantalla es Filtrar, cada fila solo tiene el enlace Ver detalle y no hay botones para editar ni borrar. Solo aparecen las cuentas de demostración | Pass con consulta y con transacción |
| PS-16 | RF-01 | Navegación móvil en `main` | Abrir la aplicación con un ancho menor a `md` y navegar con el menú | Ventana de teléfono | El menú móvil abre todos los módulos permitidos para el rol | 2026-11-16 en producción a 375 px de ancho. El botón Abrir menú abre un panel lateral. Con transacción el panel lista Panel, Clientes, Equipos, Lotes, Inspecciones, Certificados, Reportes y Bitácora, y con consulta solo Panel, Reportes y Bitácora. Al tocar Reportes con consulta la aplicación abrió `/reportes` | Pass |

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 16 (PS-01 a PS-16) |
| Pendiente | 0 |
