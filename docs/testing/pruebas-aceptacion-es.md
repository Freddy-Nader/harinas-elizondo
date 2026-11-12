# Guía de pruebas de aceptación (PA, UAT)

Las pruebas de aceptación las hacen personas reales que no forman parte del equipo. Cada participante sigue un guion de seis tareas y el equipo mide si la terminó, cuánto tardó y cuántos errores cometió. La meta sale de la ficha de calidad, que pide que los usuarios terminen sus tareas sin errores frecuentes.

> **Importante.** Esta guía todavía no se ha ejecutado. Las tablas de resultados están vacías a propósito y deben llenarse solo con lo que pase en sesiones reales, con al menos dos personas externas al equipo. No se inventan participantes, tiempos, resultados ni firmas. Los participantes se identifican como P1, P2 y así en adelante, nunca con su nombre real.

## Preparación

- Usar la aplicación desplegada en https://harinas-elizondo.vercel.app cuando #19 confirme que funciona con Neon. Si todavía no está lista, usar una copia local con base de prueba y anotarlo en la tabla de sesiones.
- Cargar solo datos de prueba. Nunca usar clientes, lotes ni correos reales.
- Tener una cuenta de transacción y una de consulta de demostración. El moderador entrega las credenciales en persona y no las escribe en este documento.
- Antes de PA-04 debe existir un cliente activo, y antes de PA-05 debe haber al menos un certificado emitido para ese cliente.
- La tarea PA-05 necesita el módulo de Reportes, que está en #33 y #37 sin merge. Si no está integrado el día de la sesión, se marca como no ejecutada con ese motivo.
- El moderador lee la tarea en voz alta, no ayuda durante la tarea y toma el tiempo desde que la persona toca la pantalla hasta que dice que terminó. Un error es cualquier acción que la persona tiene que deshacer o un mensaje de validación que aparece por un dato mal puesto.

## Guion de tareas

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PA-01 | RF-03, UC-02 | Sesión de transacción | Registrar un cliente con sus datos y poner valores de referencia propios en un parámetro | Cliente de prueba que da el moderador, con un rango más estrecho que el internacional | El cliente aparece en la lista y conserva sus límites propios | | Pendiente (UAT con usuarios reales) |
| PA-02 | RF-02, UC-01 | Sesión de transacción | Dar de alta un alveógrafo y un farinógrafo y capturar sus límites | Datos de equipo de prueba que da el moderador | Ambos equipos quedan listos para certificar | | Pendiente (UAT con usuarios reales) |
| PA-03 | RF-04, UC-03, UC-04 | Equipos listos | Dar de alta un lote y capturar su inspección completa | Lote y resultados de prueba que da el moderador, con un valor fuera de rango | La inspección queda completa y muestra la desviación | | Pendiente (UAT con usuarios reales) |
| PA-04 | RF-05, RF-06, UC-05, UC-06 | Lote con inspección completa y cliente activo | Emitir el certificado de un pedido y confirmar el envío | Orden de compra, factura y transportista de prueba | El certificado queda emitido y enviado, y su PDF se puede abrir | | Pendiente (UAT con usuarios reales) |
| PA-05 | RF-07, UC-08 | Sesión de consulta, Reportes integrado, al menos un certificado emitido | Consultar el histórico filtrado por cliente y exportarlo a Excel | Cliente de prueba | La tabla muestra solo ese cliente y se descarga el archivo | | Pendiente (UAT con usuarios reales y Reportes sin merge) |
| PA-06 | RF-01 | Sesión de consulta | Entrar como usuario de consulta y comprobar que no puede emitir certificados | Cuenta de consulta de demostración | La persona no encuentra cómo emitir y la ruta directa muestra "Acceso restringido" | | Pendiente (UAT con usuarios reales) |

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
| Pendiente | 6 |

Las seis tareas siguen pendientes porque la UAT con personas reales no se ha hecho. Cuando se haga, la columna Resultado obtenido del guion resume los resultados de P1 y P2 y la columna Estado pasa a Pass o Fail.
