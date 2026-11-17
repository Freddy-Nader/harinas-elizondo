# Guía de pruebas integrales (PI)

Las pruebas integrales recorren un módulo completo en el navegador, desde el formulario hasta la base, con la aplicación compilada para producción. Corren con Playwright en Chromium (issue #22, PR #38). Los flujos que cruzan varios módulos y los permisos por rol están en la guía de pruebas de sistema.

Playwright compila la aplicación, la inicia con `next start` y la conecta a una base Postgres local y desechable. La preparación aplica las migraciones y carga el catálogo, los límites de demostración y un usuario por rol con una contraseña ficticia. Cada prueba entra por el formulario real de login.

## Ejecución registrada

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-16 |
| Commit | 23d9967 (rama `chore/improve-plans`, que ya incluye las API y la CLI de Clientes, D-28 y D-29) |
| Comando | `E2E_PORT=3106 TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan006_test pnpm test:e2e` |
| Base | PostgreSQL 14.24 (Homebrew) local, base `harinas_plan006_test` creada para esta corrida, nunca Neon |
| Entorno | macOS arm64, Node 22.22.0, Playwright 1.65.0, Chromium, sin Docker |
| Resultado de la suite | 13 pruebas, 13 pasan, 0 omitidas, 0 fallan, 34.2 s |

En CI el job E2E tests (Playwright) corre la misma suite. La última corrida verde en `main`, del commit f767e75, es https://github.com/ValleryR/harinas-elizondo/actions/runs/43849955128 y su job E2E tests (Playwright) terminó en verde.

En esta corrida el límite de intentos de inicio de sesión se guarda en Postgres (D-28, tabla `rate_limit`). Cada prueba usa su propia dirección de cliente, así que las entradas repetidas de la suite no chocan con el límite de 5 intentos por minuto.

## Cómo repetirla

Con Docker.

```bash
pnpm exec playwright install chromium
docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:e2e
```

Sin Docker, con un Postgres local de Homebrew, como en la corrida registrada. `E2E_PORT` cambia el puerto de la aplicación cuando el 3100 está ocupado.

```bash
createdb harinas_plan006_test
E2E_PORT=3106 TEST_DATABASE_URL=postgresql://localhost:5432/harinas_plan006_test pnpm test:e2e
dropdb harinas_plan006_test
```

La misma protección de la guía de componentes impide usar una base que no sea local o cuyo nombre no termine en `_test`. Si una prueba falla, Playwright guarda capturas, video y traza en `test-results/`.

## Casos

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PI-01 | RF-03, UC-02, BR-CLI-04 | Sesión de transacción | Abrir Clientes, registrar un cliente con dos direcciones de entrega, volver a abrirlo y poner límites propios de Tenacidad (P) | Clave SAP y RFC ficticios, correo `@prueba.test`, direcciones ficticias, límites 65 a 85 | Las dos direcciones y los límites propios se conservan al volver a abrir | Pasa (0.9 s) | Pass |
| PI-02 | RF-03, BR-CLI-01 | Cliente registrado con un RFC | Registrar otro cliente con el mismo RFC | RFC repetido | Aparece el aviso "El RFC ya pertenece a otro cliente" y no se crea | Pasa (0.8 s) | Pass |
| PI-03 | RF-02, UC-01, BR-EQP-01 | Sesión de transacción | Dar de alta un alveógrafo y un farinógrafo y capturar sus límites | Marca ficticia, límites de cada parámetro, por ejemplo W de 240 | Cada equipo recibe una clave de 8 caracteres, queda listo para certificar y aparece en la lista | Pasa (2.7 s) | Pass |
| PI-04 | RF-02, BR-EQP-02 | Equipo existente | Capturar un límite inferior mayor que el superior | Extensibilidad (L) con inferior 130 y superior 90 | Se rechaza con "El límite inferior no puede ser mayor que el superior." y al recargar siguen los límites cargados de 80 a 120 | Pasa (2.0 s) | Pass |
| PI-05 | RF-04, UC-03, UC-04, BR-INS-02, BR-CER-04 | Equipos listos | Crear un lote, iniciar la inspección, guardar cinco parámetros, completar los diez con uno fuera de rango | Lote sintético, Tenacidad (P) de 95 con límite de 60 a 90, resto dentro de rango | Recibe la secuencia A, muestra "Incompleta · 5/10" con la desviación "Arriba +5", luego "Completa" con 1 desviación, y una nueva inspección pide el motivo de la re-inspección B | Pasa (2.3 s) | Pass |
| PI-06 | UC-05, UC-06, UC-07, BR-CER-05, BR-AUD-03 | Lote con inspección completa y cliente activo | Crear el borrador, intentar emitir sin factura ni transportista, completar los datos, emitir, enviar y abrir el PDF | Factura y transportista ficticios | El borrador se bloquea con sus faltantes, después se emite y se envía al contacto, muestra la huella SHA-256 y el enlace al PDF, y la inspección queda certificada y bloqueada | Pasa (2.5 s) | Pass |

## Resumen

| Estado | Casos |
| --- | --- |
| Pass | 6 |
| Pendiente | 0 |

Estas pruebas usan una base local. La misma verificación en la aplicación desplegada con Neon es parte de #19 y se registra en la guía de pruebas de sistema.
