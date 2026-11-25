# Guía de pruebas de aceptación (PA, UAT)

Las pruebas de aceptación las hacen personas reales que no forman parte del equipo. Cada participante sigue un guion de seis tareas y el equipo mide si la terminó, cuánto tardó y cuántos errores cometió. La meta sale de la ficha de calidad, que pide que los usuarios terminen sus tareas sin errores frecuentes.

> **Importante.** Esta guía todavía no se ha ejecutado. Las tablas de resultados están vacías a propósito y deben llenarse solo con lo que pase en sesiones reales, con al menos dos personas externas al equipo. No se inventan participantes, tiempos, resultados ni firmas. Los participantes se identifican como P1, P2 y así en adelante, nunca con su nombre real.

## Preparación

- Usar la aplicación desplegada en https://harinas-elizondo.vercel.app con las cuentas de demostración. Si el equipo acuerda usar una copia local con una base de prueba, anotar ese entorno en la tabla de sesiones.
- Cargar solo datos de prueba. Nunca usar clientes, lotes ni correos reales.
- Tener una cuenta de transacción y una de consulta de demostración. El moderador entrega las credenciales en persona y no las escribe en este documento.
- Preparar un conjunto distinto de datos ficticios para P1 y P2. Usar identificadores de prueba distintos para que la primera sesión no afecte a la segunda. Antes de PA-04 debe existir un cliente activo de prueba y un lote con inspección completa. Antes de PA-05 debe haber al menos un certificado emitido para ese cliente.
- La tarea PA-05 usa el módulo de Reportes, que ya está en `main` desde #33 y #37.
- El moderador lee la tarea en voz alta, no ayuda durante la tarea y toma el tiempo desde que la persona toca la pantalla hasta que dice que terminó. Un error es cualquier acción que la persona tiene que deshacer o un mensaje de validación que aparece por un dato mal puesto.

## Guion de tareas

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PA-01 | RF-03, UC-02 | Sesión de transacción | Registrar un cliente con sus datos y poner valores de referencia propios en un parámetro | Cliente de prueba que da el moderador, con un rango más estrecho que el internacional | El cliente aparece en la lista y conserva sus límites propios | | Pendiente (UAT con usuarios reales) |
| PA-02 | RF-02, UC-01 | Sesión de transacción | Dar de alta un alveógrafo y un farinógrafo y capturar sus límites | Datos de equipo de prueba que da el moderador | Ambos equipos quedan listos para certificar | | Pendiente (UAT con usuarios reales) |
| PA-03 | RF-04, UC-03, UC-04 | Equipos listos | Dar de alta un lote y capturar su inspección completa | Lote y resultados de prueba que da el moderador, con un valor fuera de rango | La inspección queda completa y muestra la desviación | | Pendiente (UAT con usuarios reales) |
| PA-04 | RF-05, RF-06, UC-05, UC-06 | Lote con inspección completa y cliente activo | Emitir el certificado de un pedido y confirmar el envío | Orden de compra, factura y transportista de prueba | El certificado queda emitido y enviado, y su PDF se puede abrir | | Pendiente (UAT con usuarios reales) |
| PA-05 | RF-07, UC-08 | Sesión de consulta, Reportes integrado, al menos un certificado emitido | Consultar el histórico filtrado por cliente y exportarlo a Excel | Cliente de prueba | La tabla muestra solo ese cliente y se descarga el archivo | | Pendiente (UAT con usuarios reales) |
| PA-06 | RF-01 | Sesión de consulta | Entrar como usuario de consulta y comprobar que no puede emitir certificados | Cuenta de consulta de demostración | La persona no encuentra cómo emitir y la ruta directa muestra "Acceso restringido" | | Pendiente (UAT con usuarios reales) |

## Instrucciones para el moderador

Presentar el ejercicio con este texto: «Vamos a probar la aplicación. Te daré seis tareas con datos ficticios. Dime cuando consideres que terminaste y avísame si algo te impide continuar. Registraremos los tiempos y lo que ocurra con un identificador anónimo».

1. Abrir la sesión con Laboratorio Demo para PA-01 a PA-04. Antes de PA-05, cerrar esa sesión y abrir Consulta Demo. Mantener la misma cuenta de Consulta para PA-06.
2. Dar solo la tarea y los datos de entrada. Usar los pasos y el resultado esperado de la tabla como referencia para observar.
3. Si una tarea queda bloqueada, registrar el motivo y el tiempo. Para continuar con la siguiente, usar un registro de prueba preparado de antemano que cumpla la precondición. Anotar la sustitución en comentarios.
4. Para PA-04, verificar el estado en la aplicación y abrir el PDF. En el entorno publicado, el correo se dirige al buzón de prueba configurado. Para PA-05, confirmar que se descargó el archivo.
5. Al terminar, pedir el visto bueno y registrar los comentarios sin datos personales. Repetir el guion con P2.

## Sesiones

| Participante | Fecha | Perfil (sin datos personales) | Entorno usado | Moderador |
| --- | --- | --- | --- | --- |
| P1 | | | | |
| P2 | | | | |

## Resultados por tarea

Completado se llena con Sí, Parcial o No. El tiempo va en minutos y segundos. Los comentarios son lo que dijo la persona, sin datos que la identifiquen.

| Participante | Tarea | Completado | Tiempo | Errores | Comentarios |
| --- | --- | --- | --- | --- | --- |
| P1 | PA-01 | | | | |
| P1 | PA-02 | | | | |
| P1 | PA-03 | | | | |
| P1 | PA-04 | | | | |
| P1 | PA-05 | | | | |
| P1 | PA-06 | | | | |
| P2 | PA-01 | | | | |
| P2 | PA-02 | | | | |
| P2 | PA-03 | | | | |
| P2 | PA-04 | | | | |
| P2 | PA-05 | | | | |
| P2 | PA-06 | | | | |

## Visto bueno

Cada participante da su visto bueno al final de su sesión. Se anota solo el identificador anónimo y la fecha.

| Participante | Visto bueno (Sí o No) | Fecha | Observaciones |
| --- | --- | --- | --- |
| P1 | | | |
| P2 | | | |

## Resumen

| Estado | Tareas |
| --- | --- |
| Pass | 0 |
| Fail | 0 |
| Pendiente | 6 |

Las seis tareas siguen pendientes porque la UAT con personas reales no se ha hecho. Cuando se haga, la columna Resultado obtenido del guion resume los resultados de P1 y P2 y la columna Estado pasa a Pass o Fail.
