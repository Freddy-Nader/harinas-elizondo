# Guía de pruebas unitarias (PU)

Las pruebas unitarias comprueban las reglas de negocio puras (BR-*) y las validaciones del servidor sin una base de datos real. Viven junto al código en `src/**/*.test.ts` y corren con Vitest. Cada nombre de prueba cita el requisito o la regla que cubre, así que la tabla se puede rastrear hasta la especificación.

Cada fila de la tabla agrupa las pruebas de un mismo bloque `describe`. El anexo al final lista cada prueba `it()` por su nombre y la fila PU que le corresponde.

## Ejecución registrada

| Dato | Valor |
| --- | --- |
| Fecha | 2026-11-11 |
| Commit | 331ef38 (rama `test/e2e`, PR #38) |
| Comando | `pnpm test` (equivale a `vitest run`) |
| Entorno | macOS arm64, Node 22.22.0, Vitest 5.0.5 |
| Resultado | 16 archivos, 133 pruebas, 133 pasan, 0 fallan |

La misma suite corre en CI en cada PR. La corrida verde del commit 331ef38 es https://github.com/ValleryR/harinas-elizondo/actions/runs/43161348610 y se describe en la guía de regresión.

## Cómo repetirla

```bash
pnpm install
pnpm test
```

No necesita base de datos ni variables de entorno. Las pruebas de acciones del servidor simulan la sesión y la base con mocks, por eso aparecen aquí y no en la guía de componentes.

## Casos

| Id | Requisito | Precondición | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PU-01 | BR-INS-02 | Ninguna, función pura | Calcular la secuencia de la inspección número n | n = 1, 2 a 26, 27, valores inválidos y desbordados | A en la primera, recorre el abecedario, AA en la 27, rechaza entradas inválidas y la conversión es reversible | 5 de 5 pasan | Pass |
| PU-02 | BR-INS-02, BR-INS-04, D-15 | Lote sin inspecciones, con una incompleta o con una completa | Pedir iniciar una inspección | Sin motivo y con motivo de falla de equipo | La primera inicia sin motivo, pide terminar la incompleta y después de una completa exige el motivo | 3 de 3 pasan | Pass |
| PU-03 | UC-03 | Ninguna | Validar el código de lote | Código con espacios y minúsculas, vacío, largo, con caracteres raros | Se guarda recortado y en mayúsculas, los inválidos se rechazan | 2 de 2 pasan | Pass |
| PU-04 | UC-03 | Ninguna | Validar los datos del lote | Lote válido, sin fechas, sin producto, caducidad antes de producción | Acepta el válido y rechaza los demás | 3 de 3 pasan | Pass |
| PU-05 | RF-04 | Ninguna | Leer los resultados capturados del formulario | Nada capturado, decimales con coma, texto, negativos, valores sin equipo | Permite guardar vacío, acepta coma decimal, exige el equipo de la máquina usada y rechaza texto y negativos | 4 de 4 pasan | Pass |
| PU-06 | BR-REF-01 | Catálogo de límites internacionales | Resolver los valores de referencia de un cliente | Cliente sin límites y cliente con límites en algunos parámetros | Usa los internacionales si no tiene, y el cliente solo sustituye los que define | 2 de 2 pasan | Pass |
| PU-07 | BR-CER-04 | Ninguna | Evaluar un valor contra su rango | Valores en el límite y fuera del rango | Dentro en ambos límites, fuera con desviación con signo | 2 de 2 pasan | Pass |
| PU-08 | BR-INS-03, BR-CER-02 | Ninguna | Buscar parámetros faltantes | Resultados incompletos, null y NaN | Exige los diez parámetros de ambos equipos y trata null y NaN como faltantes | 2 de 2 pasan | Pass |
| PU-09 | BR-EQP-03 | Ninguna | Buscar parámetros sin límites | Catálogo con huecos | Lista los parámetros sin límites | 1 de 1 pasa | Pass |
| PU-10 | UC-04, UC-05, BR-REF-01 | Límites internacionales y de cliente | Evaluar la calidad con su origen de referencia | Valor que cumple el internacional pero no el del cliente, parámetros sin referencia | Distingue ambos cumplimientos, cae al internacional por parámetro y marca las referencias faltantes | 2 de 2 pasan | Pass |
| PU-11 | RF-03, UC-02, BR-CLI-01, BR-CLI-02 | Ninguna | Validar el formulario de cliente | Cliente válido, clave SAP faltante o larga, RFC inválido, sin RFC o sin correo | Acepta el válido y rechaza los demás con su mensaje | 4 de 4 pasan | Pass |
| PU-12 | RF-03, BR-REF-01 | Ninguna | Validar límites del cliente | Límites iguales en ambos extremos y límites invertidos | Acepta los inclusivos y rechaza los invertidos | 2 de 2 pasan | Pass |
| PU-13 | BR-REF-01, D-23 | Límites internacionales | Validar límites particulares | Límites más estrechos, iguales y más amplios | Acepta los más estrechos o iguales y rechaza cualquier extremo que amplíe el rango | 2 de 2 pasan | Pass |
| PU-14 | RF-03, D-22 | Ninguna | Validar direcciones del cliente | Sin dirección fiscal, sin destinos, varios destinos, direcciones demasiado largas | Exige la fiscal y al menos un destino, acepta varios destinos y rechaza las largas | 3 de 3 pasan | Pass |
| PU-15 | BR-EQP-01 | Ninguna | Generar la clave de equipo | Bytes aleatorios y bytes fijos | Clave de 8 caracteres de un alfabeto sin ambigüedades, distinta cada vez, sin sesgo y determinista para los mismos bytes | 4 de 4 pasan | Pass |
| PU-16 | RF-02 | Ninguna | Validar el formulario de equipo | Solo descripción corta, sin descripción, garantía antes de la compra, fecha inválida | Basta la descripción corta, los vacíos pasan a null y los demás se rechazan | 4 de 4 pasan | Pass |
| PU-17 | RF-02, BR-EQP-02 | Ninguna | Validar un límite del equipo | Rango inclusivo, texto, límites invertidos | Acepta el rango y rechaza texto e invertidos | 3 de 3 pasan | Pass |
| PU-18 | BR-EQP-03 | Equipo con o sin límites | Calcular si el equipo sirve para certificar | Equipo activo completo, con límites faltantes, inactivo o de baja | Solo el activo con todos los límites de su tipo es usable, y se listan los códigos que faltan | 4 de 4 pasan | Pass |
| PU-19 | D-16 | Equipo en cada estado | Cambiar el estado del equipo | Inactivar, reactivar, dar de baja, con y sin motivo | Inactivar y dar de baja exigen motivo, reactivar no, la baja es final y se rechazan los cambios que no aplican | 5 de 5 pasan | Pass |
| PU-20 | RF-02 | Equipo antes y después de editar | Calcular los campos cambiados para el historial | Campos vacíos, null y modificados | Solo quedan los cambios reales y vacío equivale a null | 1 de 1 pasa | Pass |
| PU-21 | D-17 | Ninguna | Formar el id del certificado | Contador 1, contador continuo, año nuevo, contador de siete dígitos | Formato CER-YYYY-NNNNNN, reinicia cada año y rechaza el desbordamiento | 4 de 4 pasan | Pass |
| PU-22 | UC-05 | Ninguna | Validar el borrador del certificado | Solo datos del pedido, sin orden de compra, cantidades en texto, cero o negativas | Acepta el borrador mínimo y rechaza los demás | 3 de 3 pasan | Pass |
| PU-23 | BR-CER-01 | Lote con inspecciones | Elegir la inspección certificable | Última completa, última incompleta, secuencias Z y AA, lote sin inspecciones | Toma la última completa, bloquea si la última está incompleta sin volver a una anterior, ordena AA después de Z | 4 de 4 pasan | Pass |
| PU-24 | BR-CER-02, BR-CER-04, BR-REF-01 | Inspección y referencias | Construir las líneas del certificado | Todo presente, una máquina sin resultados, valores fuera de rango, parámetro sin referencia | Diez líneas en orden de catálogo, bloquea si falta una máquina o una referencia, y muestra la desviación sin bloquear | 5 de 5 pasan | Pass |
| PU-25 | BR-CER-01, BR-CER-02, BR-CER-05, D-24 | Borrador de certificado | Calcular los bloqueos de emisión | Inspección incompleta, sin factura ni embarque, cliente inactivo, embarque fuera de la vida del lote, ya emitido, borrador completo | Bloquea cada caso con su motivo y deja emitir el borrador completo | 5 de 5 pasan | Pass |
| PU-26 | D-26 | Ninguna | Calcular la huella del certificado | Mismos datos en otro orden y un valor cambiado | SHA-256 de 64 caracteres, igual sin importar el orden y distinta si cambia un valor | 2 de 2 pasan | Pass |
| PU-27 | D-10 | Certificado emitido | Reconstruir las líneas desde la copia guardada | Números guardados | Las líneas y su estado salen de la copia, no de datos vivos | 1 de 1 pasa | Pass |
| PU-28 | D-25 | Certificado en cada estado | Cancelar el certificado | Emitido o enviado con motivo, borrador, ya cancelado, sin motivo | Cancela emitidos o enviados con motivo y rechaza los demás | 2 de 2 pasan | Pass |
| PU-29 | RF-06 | Ninguna | Calcular los destinatarios del envío | Cliente con contacto, sin contacto, correos repetidos | Envía al contacto y al almacén, cae solo al almacén y quita duplicados | 2 de 2 pasan | Pass |
| PU-30 | UC-07 | Ninguna | Preparar texto para el PDF | Unidades con símbolos que la fuente base no dibuja | Los símbolos se escriben con letras | 1 de 1 pasa | Pass |
| PU-31 | UC-05, D-25 | Datos de certificado sintéticos | Generar el PDF del certificado | Borrador, emitido con firma, cancelado con motivo | Se genera un archivo PDF válido en cada caso | 3 de 3 pasan | Pass |
| PU-32 | BR-AUD-01 | Ninguna | Formar la fila de auditoría | Usuario, entidad y detalle | Guarda el número de empleado y el nombre, el id como texto y el detalle o null | 3 de 3 pasan | Pass |
| PU-33 | RF-01, D-20 | Cada rol | Decidir si un rol abre una ruta | Rutas de captura, reportes, bitácora, panel, usuarios y prefijos parecidos | Consulta solo ve reportes, bitácora y panel, transacción abre todos los módulos y Usuarios es solo del administrador | 6 de 6 pasan | Pass |
| PU-34 | RF-01 | Cada rol | Decidir si un rol puede modificar datos | Transacción y consulta | Solo el usuario de transacción modifica | 1 de 1 pasa | Pass |
| PU-35 | RF-01 | Ninguna | Reconocer un rol | Roles conocidos y desconocidos | Solo acepta los conocidos | 1 de 1 pasa | Pass |
| PU-36 | RF-01 | Ninguna | Validar la ruta de regreso después del login | Vacía, externa, relativa al protocolo, del mismo sitio, login o API de auth | Conserva las del mismo sitio y manda al panel en los demás casos | 3 de 3 pasan | Pass |
| PU-37 | RF-03 | Ninguna | Reunir los errores de un formulario | Varios mensajes por campo | Conserva el primer mensaje de cada campo | 1 de 1 pasa | Pass |
| PU-38 | RF-03 | Ninguna | Leer el código de error de Postgres | Error con código, con causa y sin relación | Lee el código del error o de su causa y no devuelve nada en otros errores | 2 de 2 pasan | Pass |
| PU-39 | RF-01, UC-02 | Sesión y base simuladas | Llamar cada acción de Clientes sin sesión y como consulta | Registrar o editar, activar o desactivar, poner y quitar límites | Todas se bloquean antes de escribir | 8 de 8 pasan | Pass |
| PU-40 | RF-03, UC-02 | Sesión y base simuladas | Guardar un cliente con RFC o clave SAP repetidos | Repetido en la revisión previa y en conflicto simultáneo | Muestra un aviso específico sin escribir datos en ambos casos | 4 de 4 pasan | Pass |
| PU-41 | RF-01, BR-AUD-03 | Sesión y base simuladas | Guardar resultados de inspección | Sin sesión, como consulta, inspección inexistente o certificada | Redirige al login, rechaza a consulta antes de leer la base y bloquea sin cambios | 4 de 4 pasan | Pass |
| PU-42 | BR-INS-02, BR-INS-04 | Sesión y base simuladas | Iniciar una inspección en paralelo | Conflicto de secuencia e inspección incompleta existente | No salta a una segunda inspección y pide terminar la incompleta | 2 de 2 pasan | Pass |
| PU-43 | RF-01, D-14 | Sesión y base simuladas | Crear una cuenta | Sin rol de administrador, rol administrador como asignable | Exige administrador antes de tocar la base y no permite asignar el rol administrador | 4 de 4 pasan | Pass |
| PU-44 | Seguridad de las pruebas | Ninguna | Validar la URL de la base de pruebas | URL faltante, mal formada, remota, que solo parece local, local sin `_test`, local con `_test` | Solo acepta una base local cuyo nombre termina en `_test` | 4 de 4 pasan | Pass |

## Resumen

| Estado | Filas | Pruebas |
| --- | --- | --- |
| Pass | 44 | 133 |
| Pendiente | 0 | 0 |

Ningún caso unitario queda pendiente. Los módulos de Reportes (#33 y #37) y Bitácora (#31) todavía no están integrados en esta rama, así que sus pruebas no forman parte de esta corrida.

## Anexo de pruebas por nombre

Lista generada desde la salida de `vitest run --reporter=verbose` del commit 331ef38. Los nombres están en inglés porque son identificadores del código.

| Fila | Archivo | Bloque | Prueba |
| --- | --- | --- | --- |
| PU-01 | `src/lib/domain/inspection-sequence.test.ts` | inspection sequence | starts at A |
| PU-01 | `src/lib/domain/inspection-sequence.test.ts` | inspection sequence | walks the alphabet |
| PU-01 | `src/lib/domain/inspection-sequence.test.ts` | inspection sequence | continues after Z with two letters (inspection 27) |
| PU-01 | `src/lib/domain/inspection-sequence.test.ts` | inspection sequence | round-trips |
| PU-01 | `src/lib/domain/inspection-sequence.test.ts` | inspection sequence | rejects bad input and overflow |
| PU-02 | `src/lib/domain/lot.test.ts` | startInspection | BR-INS-02 lets the first inspection start without a reason |
| PU-02 | `src/lib/domain/lot.test.ts` | startInspection | asks to finish an incomplete inspection first |
| PU-02 | `src/lib/domain/lot.test.ts` | startInspection | BR-INS-04 · D-15 needs the equipment-failure reason after a complete one |
| PU-03 | `src/lib/domain/lot.test.ts` | lotCodeSchema | UC-03 stores the code trimmed and uppercase |
| PU-03 | `src/lib/domain/lot.test.ts` | lotCodeSchema | rejects blank, long or odd characters |
| PU-04 | `src/lib/domain/lot.test.ts` | lotDataSchema | accepts a valid lot |
| PU-04 | `src/lib/domain/lot.test.ts` | lotDataSchema | requires expiry after production |
| PU-04 | `src/lib/domain/lot.test.ts` | lotDataSchema | requires both dates and the product |
| PU-05 | `src/lib/domain/lot.test.ts` | parseResults | RF-04 allows saving with nothing captured yet |
| PU-05 | `src/lib/domain/lot.test.ts` | parseResults | parses decimals with comma and keeps only the machines in use |
| PU-05 | `src/lib/domain/lot.test.ts` | parseResults | needs the equipment of a machine that has values |
| PU-05 | `src/lib/domain/lot.test.ts` | parseResults | rejects text and negative values per parameter |
| PU-06 | `src/lib/domain/quality.test.ts` | resolveReferenceValues | uses international values when the client has none |
| PU-06 | `src/lib/domain/quality.test.ts` | resolveReferenceValues | lets client values override only the parameters they define |
| PU-07 | `src/lib/domain/quality.test.ts` | evaluate | is within range at both limits |
| PU-07 | `src/lib/domain/quality.test.ts` | evaluate | reports signed deviation outside the range |
| PU-08 | `src/lib/domain/quality.test.ts` | missingParameters | requires all ten parameters from both equipment types |
| PU-08 | `src/lib/domain/quality.test.ts` | missingParameters | treats null and NaN as missing |
| PU-09 | `src/lib/domain/quality.test.ts` | missingReferenceValues | lists parameters with no limits |
| PU-10 | `src/lib/domain/quality-reference.test.ts` | UC-04 / UC-05 reference provenance | distinguishes international compliance from stricter client noncompliance |
| PU-10 | `src/lib/domain/quality-reference.test.ts` | UC-04 / UC-05 reference provenance | falls back per parameter and flags missing references |
| PU-11 | `src/lib/domain/client-validation.test.ts` | RF-03 · UC-02 · BR-CLI-01/02 | accepts a valid client |
| PU-11 | `src/lib/domain/client-validation.test.ts` | RF-03 · UC-02 · BR-CLI-01/02 | rejects a missing or oversized SAP key |
| PU-11 | `src/lib/domain/client-validation.test.ts` | RF-03 · UC-02 · BR-CLI-01/02 | rejects an invalid RFC |
| PU-11 | `src/lib/domain/client-validation.test.ts` | RF-03 · UC-02 · BR-CLI-01/02 | requires RFC and contact email according to the client data dictionary |
| PU-12 | `src/lib/domain/client-validation.test.ts` | RF-03 · BR-REF-01 | accepts inclusive client limits |
| PU-12 | `src/lib/domain/client-validation.test.ts` | RF-03 · BR-REF-01 | rejects reversed limits |
| PU-13 | `src/lib/domain/client-validation.test.ts` | BR-REF-01 stricter client limits | accepts narrower or equal bounds |
| PU-13 | `src/lib/domain/client-validation.test.ts` | BR-REF-01 stricter client limits | rejects either bound widening the accepted range |
| PU-14 | `src/lib/domain/client-validation.test.ts` | RF-03 professor review: fiscal and delivery addresses | requires a fiscal address independently of delivery destinations |
| PU-14 | `src/lib/domain/client-validation.test.ts` | RF-03 professor review: fiscal and delivery addresses | supports multiple delivery destinations |
| PU-14 | `src/lib/domain/client-validation.test.ts` | RF-03 professor review: fiscal and delivery addresses | rejects no delivery destinations and oversized addresses |
| PU-15 | `src/lib/domain/equipment.test.ts` | generateEquipmentKey | BR-EQP-01 makes an 8-character key from the unambiguous alphabet |
| PU-15 | `src/lib/domain/equipment.test.ts` | generateEquipmentKey | BR-EQP-01 is random, so two keys in a row differ |
| PU-15 | `src/lib/domain/equipment.test.ts` | generateEquipmentKey | maps bytes to symbols deterministically |
| PU-15 | `src/lib/domain/equipment.test.ts` | generateEquipmentKey | drops biased bytes instead of folding them |
| PU-16 | `src/lib/domain/equipment.test.ts` | equipmentInputSchema | RF-02 needs only the short description and turns blanks into null |
| PU-16 | `src/lib/domain/equipment.test.ts` | equipmentInputSchema | rejects a missing short description |
| PU-16 | `src/lib/domain/equipment.test.ts` | equipmentInputSchema | rejects a warranty that ends before the purchase date |
| PU-16 | `src/lib/domain/equipment.test.ts` | equipmentInputSchema | rejects an invalid date |
| PU-17 | `src/lib/domain/equipment.test.ts` | limitSchema | accepts an inclusive range |
| PU-17 | `src/lib/domain/equipment.test.ts` | limitSchema | rejects reversed limits |
| PU-17 | `src/lib/domain/equipment.test.ts` | limitSchema | rejects a non-number |
| PU-18 | `src/lib/domain/equipment.test.ts` | equipmentReadiness | BR-EQP-03 is usable when active and every parameter has limits |
| PU-18 | `src/lib/domain/equipment.test.ts` | equipmentReadiness | BR-EQP-03 blocks equipment missing limits and lists the codes |
| PU-18 | `src/lib/domain/equipment.test.ts` | equipmentReadiness | BR-EQP-03 only looks at the parameters of its own type |
| PU-18 | `src/lib/domain/equipment.test.ts` | equipmentReadiness | blocks inactive or retired equipment even with full limits |
| PU-19 | `src/lib/domain/equipment.test.ts` | applyStatusChange | D-16 inactivates active equipment with a reason |
| PU-19 | `src/lib/domain/equipment.test.ts` | applyStatusChange | D-16 requires a reason to inactivate or retire |
| PU-19 | `src/lib/domain/equipment.test.ts` | applyStatusChange | D-16 reactivates inactive equipment without a reason |
| PU-19 | `src/lib/domain/equipment.test.ts` | applyStatusChange | D-16 makes retired final |
| PU-19 | `src/lib/domain/equipment.test.ts` | applyStatusChange | rejects changes that do not apply to the current status |
| PU-20 | `src/lib/domain/equipment.test.ts` | changedFields | keeps only what changed, treating blank and null alike |
| PU-21 | `src/lib/domain/certificate.test.ts` | certificate id (D-17) | D-17 formats CER-YYYY-NNNNNN |
| PU-21 | `src/lib/domain/certificate.test.ts` | certificate id (D-17) | D-17 starts at 1 and continues the counter within the year |
| PU-21 | `src/lib/domain/certificate.test.ts` | certificate id (D-17) | D-17 restarts the counter in a new year |
| PU-21 | `src/lib/domain/certificate.test.ts` | certificate id (D-17) | refuses a counter past six digits |
| PU-22 | `src/lib/domain/certificate.test.ts` | certificateInputSchema | UC-05 accepts a draft with only the order data |
| PU-22 | `src/lib/domain/certificate.test.ts` | certificateInputSchema | requires the purchase order and a client |
| PU-22 | `src/lib/domain/certificate.test.ts` | certificateInputSchema | rejects text, zero and negative quantities |
| PU-23 | `src/lib/domain/certificate.test.ts` | pickCertifiableInspection (BR-CER-01) | BR-CER-01 takes the latest inspection when it is complete |
| PU-23 | `src/lib/domain/certificate.test.ts` | pickCertifiableInspection (BR-CER-01) | BR-CER-01 blocks when the latest is incomplete instead of falling back to an older one |
| PU-23 | `src/lib/domain/certificate.test.ts` | pickCertifiableInspection (BR-CER-01) | BR-CER-01 orders AA after Z |
| PU-23 | `src/lib/domain/certificate.test.ts` | pickCertifiableInspection (BR-CER-01) | reports a lot without inspections |
| PU-24 | `src/lib/domain/certificate.test.ts` | buildCertificateLines | builds ten lines in catalog order when everything is present |
| PU-24 | `src/lib/domain/certificate.test.ts` | buildCertificateLines | BR-CER-04 shows out-of-range values as signed deviation without blocking |
| PU-24 | `src/lib/domain/certificate.test.ts` | buildCertificateLines | BR-REF-01 uses the client's limits where it has them and international for the rest |
| PU-24 | `src/lib/domain/certificate.test.ts` | buildCertificateLines | BR-CER-02 blocks when a machine's results are missing |
| PU-24 | `src/lib/domain/certificate.test.ts` | buildCertificateLines | blocks when a parameter has no reference values at all |
| PU-25 | `src/lib/domain/certificate.test.ts` | issueBlockers | lets a complete draft be issued |
| PU-25 | `src/lib/domain/certificate.test.ts` | issueBlockers | BR-CER-05 · D-24 requires invoice and shipping data before closing |
| PU-25 | `src/lib/domain/certificate.test.ts` | issueBlockers | BR-CER-01 · BR-CER-02 blocks while the latest inspection is incomplete |
| PU-25 | `src/lib/domain/certificate.test.ts` | issueBlockers | blocks inactive clients and shipping outside the lot's life |
| PU-25 | `src/lib/domain/certificate.test.ts` | issueBlockers | cannot issue twice |
| PU-26 | `src/lib/domain/certificate.test.ts` | certificateHash (D-26) | D-26 is a 64-char hex SHA-256 and does not depend on line order |
| PU-26 | `src/lib/domain/certificate.test.ts` | certificateHash (D-26) | D-26 changes when any stated value changes |
| PU-27 | `src/lib/domain/certificate.test.ts` | linesFromSnapshot (D-10) | D-10 rebuilds lines from stored numbers and derives the status from the deviation |
| PU-28 | `src/lib/domain/certificate.test.ts` | cancelCheck (D-25) | D-25 cancels issued or sent certificates with a reason |
| PU-28 | `src/lib/domain/certificate.test.ts` | cancelCheck (D-25) | refuses drafts, already cancelled certificates and a missing reason |
| PU-29 | `src/lib/domain/certificate.test.ts` | deliveryRecipients (RF-06) | RF-06 sends to the client contact and the warehouse |
| PU-29 | `src/lib/domain/certificate.test.ts` | deliveryRecipients (RF-06) | falls back to the warehouse only and removes duplicates |
| PU-30 | `src/lib/domain/certificate.test.ts` | pdfSafeText | spells out unit glyphs the PDF base font cannot draw |
| PU-31 | `src/lib/services/certificate-pdf.test.ts` | renderCertificatePdf (component) | UC-05 renders an issued certificate with signature to a PDF file |
| PU-31 | `src/lib/services/certificate-pdf.test.ts` | renderCertificatePdf (component) | renders a draft without issuer data |
| PU-31 | `src/lib/services/certificate-pdf.test.ts` | renderCertificatePdf (component) | D-25 renders a cancelled certificate with its reason |
| PU-32 | `src/lib/audit.test.ts` | auditRow | BR-AUD-01 stores the employee id and name of who acted |
| PU-32 | `src/lib/audit.test.ts` | auditRow | BR-AUD-01 stores the entity id as text and keeps the detail |
| PU-32 | `src/lib/audit.test.ts` | auditRow | stores null detail when none is given |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | RF-01 lets both roles open the panel |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | RF-01 lets transaction users open every module |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | RF-01 keeps query users out of capture modules, nested routes included |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | RF-01 and D-20 let query users read reports and the audit log |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | RF-01 reserves Usuarios for administrators |
| PU-33 | `src/lib/permissions.test.ts` | canAccess | does not treat a shared prefix as the same module |
| PU-34 | `src/lib/permissions.test.ts` | canMutate | RF-01 allows mutations only for transaction users |
| PU-35 | `src/lib/permissions.test.ts` | isRole | accepts only the known roles |
| PU-36 | `src/lib/permissions.test.ts` | safeNextPath | keeps same-site paths |
| PU-36 | `src/lib/permissions.test.ts` | safeNextPath | falls back to the panel for empty, external or protocol-relative values |
| PU-36 | `src/lib/permissions.test.ts` | safeNextPath | never sends the user back to login or the auth API |
| PU-37 | `src/lib/action-state.test.ts` | fieldErrorsFrom | keeps the first message per field |
| PU-38 | `src/lib/action-state.test.ts` | pgError | reads the code from the error or its cause |
| PU-38 | `src/lib/action-state.test.ts` | pgError | returns nothing for unrelated errors |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks unauthenticated users from register or edit a client |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks query-only users from register or edit a client |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks unauthenticated users from activate or deactivate a client |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks query-only users from activate or deactivate a client |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks unauthenticated users from set client reference limits |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks query-only users from set client reference limits |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks unauthenticated users from remove a client reference override |
| PU-39 | `src/app/(app)/clientes/actions.test.ts` | RF-01 / UC-02: clients server-side role authorization | blocks query-only users from remove a client reference override |
| PU-40 | `src/app/(app)/clientes/actions.test.ts` | RF-03 / UC-02 duplicate client alerts | shows a specific RFC alert without writing data |
| PU-40 | `src/app/(app)/clientes/actions.test.ts` | RF-03 / UC-02 duplicate client alerts | shows a specific SAP alert without writing data |
| PU-40 | `src/app/(app)/clientes/actions.test.ts` | RF-03 / UC-02 duplicate client alerts | handles concurrent clients_rfc_unique conflicts with the same friendly alert |
| PU-40 | `src/app/(app)/clientes/actions.test.ts` | RF-03 / UC-02 duplicate client alerts | handles concurrent clients_sap_key_unique conflicts with the same friendly alert |
| PU-41 | `src/app/(app)/inspecciones/actions.test.ts` | RF-01 / BR-AUD-03 inspection server authorization | rejects query users before reading or writing the database |
| PU-41 | `src/app/(app)/inspecciones/actions.test.ts` | RF-01 / BR-AUD-03 inspection server authorization | preserves the login redirect for unauthenticated requests |
| PU-41 | `src/app/(app)/inspecciones/actions.test.ts` | RF-01 / BR-AUD-03 inspection server authorization | blocks missing or certified inspections without mutations |
| PU-41 | `src/app/(app)/inspecciones/actions.test.ts` | RF-01 / BR-AUD-03 inspection server authorization | blocks missing or certified inspections without mutations |
| PU-42 | `src/app/(app)/lotes/actions.test.ts` | BR-INS-02 / BR-INS-04 concurrent inspection creation | does not skip to a second inspection after losing a sequence conflict |
| PU-42 | `src/app/(app)/lotes/actions.test.ts` | BR-INS-02 / BR-INS-04 concurrent inspection creation | requires finishing an existing incomplete inspection before creating another |
| PU-43 | `src/app/(app)/usuarios/actions.test.ts` | RF-01 / D-14 account administration | requires admin before any database access |
| PU-43 | `src/app/(app)/usuarios/actions.test.ts` | RF-01 / D-14 account administration | requires admin before any database access |
| PU-43 | `src/app/(app)/usuarios/actions.test.ts` | RF-01 / D-14 account administration | rejects administrator as an assignable role |
| PU-43 | `src/app/(app)/usuarios/actions.test.ts` | RF-01 / D-14 account administration | rejects administrator as an assignable role |
| PU-44 | `src/test/int/guard.test.ts` | assertSafeTestDatabaseUrl (integration suite safety guard) | accepts a local database whose name ends in _test |
| PU-44 | `src/test/int/guard.test.ts` | assertSafeTestDatabaseUrl (integration suite safety guard) | throws when the URL is missing or malformed |
| PU-44 | `src/test/int/guard.test.ts` | assertSafeTestDatabaseUrl (integration suite safety guard) | refuses any remote host, including hosts that only look local |
| PU-44 | `src/test/int/guard.test.ts` | assertSafeTestDatabaseUrl (integration suite safety guard) | refuses a local database that is not named *_test |

Total 133 pruebas.
