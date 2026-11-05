# Revisión de requisitos y correcciones del profesor

Revisión del 4 de noviembre de 2026. Fuente: documento de arquitectura local, páginas físicas 3-7, 18-25, y correcciones directas del usuario. El documento privado y los datos personales no se incluyen en el repositorio. Esta revisión distingue código existente, cambios preparados y pendientes; no certifica que todo el sistema esté terminado.

| Tema | Condición | Estado y acción |
| --- | --- | --- |
| Acceso | Dos perfiles; mutaciones solo para transacción; registrar empleado y responsable | Controles existentes. Continuar pruebas por acción y por rol. |
| Factores | Alveógrafo: P, L, W, P/L, I.E. Farinógrafo: absorción, desarrollo, estabilidad, ablandamiento y llegada | Coinciden con el catálogo actual. El PDF no fija cifras ni unidades confirmadas. |
| Referencias | Internacionales separadas de particulares; evitar duplicación | Tabla compartida por parámetro ya existente. Otro equipo del mismo tipo reutiliza las referencias. |
| Clientes | Clave SAP, RFC único, contacto y correo obligatorios según diccionario de página 22 | Validaciones incorporadas. El usuario corrigió los RFC repetidos; se verificó y aplicó la restricción única de la migración 0002. |
| Direcciones | Una fiscal obligatoria y una o varias de entrega | Corrección oral incorporada: campos individuales con botón para agregar direcciones y tabla de destinos. Migración 0001 aplicada; destinos anteriores preservados. Fiscal antigua pendiente de completar, sin inventarla. |
| Límites particulares | Cliente más exigente | Se rechazan rangos que amplíen los internacionales. Sigue pendiente validar la fuente normativa de los valores actuales. |
| Equipos | Clave generada, historial, tipo y disponibilidad | Implementados. El formulario ya tiene descripción corta/larga, adquisición, fin de garantía, marca/modelo/serie, proveedor, ubicación y responsable. |
| Datos de equipos | Responsable vinculado a usuario en diccionario de página 23; compra/garantía según revisión oral | Responsable actual es texto: falta relación a usuario. Falta cotejar lista ampliada del caso de estudio (incluido mantenimiento); no se debe afirmar cumplimiento total. |
| Lote e inspección | Elegir lote y capturar resultados de su muestra | Flujo existente: Lotes → detalle del lote → iniciar inspección → captura de ambos equipos. La cabecera identifica lote, producto y secuencia. |
| Secuencia | A-Z, después AA; sistema asigna | Implementado. Se corrigió conflicto simultáneo para no crear una segunda inspección sin volver a autorizar. |
| Reinspección | Falla y autorización | Motivo obligatorio y usuario en auditoría según D-15. Campo específico de autorizador del diccionario sigue pendiente. |
| Certificado | Última inspección del lote, completa y con ambos equipos | Emisión pendiente. Debe bloquear si la última está incompleta; no escoger una anterior sin avisar. |
| Desviación | Mostrar valores inferiores/superiores al rango, sin impedir emisión por ese motivo | Lógica preparada para conservar comparación internacional y particular y origen de referencia. Integración visual/PDF pendiente. |
| Humedad | Profesor la menciona; no figura entre los diez factores del PDF | Aclarar método, equipo y si será factor adicional. No confundir humedad con absorción de agua ni asignarla arbitrariamente a un equipo. |
| Inmutabilidad | Una inspección usada en certificado no cambia | Guardado rechaza `lockedAt`. Falta emisión y prueba de concurrencia con certificación. |
| Certificado y entrega | Pedido/factura, fechas, responsable, firma opcional, PDF y correo a cliente/almacén, evidencia | Módulos pendientes. Diccionario incluye transportista, cancelación y hash de firma, divergentes de esquema/D-18: resolver antes de implementar. |
| Reportes | Historial, filtros, gráficas, exportación Excel/Power BI | Pendiente. |
| Bitácora | Historial visible de cliente/equipo/inspección/certificado | Hay escrituras por módulo; pantalla general pendiente. |
| Calidad | Seguridad, confiabilidad, integridad, disponibilidad, usabilidad, mantenibilidad, trazabilidad | Requiere guías y evidencias además de pruebas unitarias. |

## Referencia normativa localizada

Codex CXS 152-1985, sección 3.2.1, establece humedad máxima de 15,5 % m/m dentro de su ámbito de aplicación; no equivale a una tabla universal de rangos P/L/W para toda harina. Se debe confirmar el método de captura y la especificación del producto antes de incorporar humedad al catálogo. Fuente oficial: https://www.fao.org/fao-who-codexalimentarius/sh-proxy/en/?lnk=1&url=https%3A%2F%2Fworkspace.fao.org%2Fsites%2Fcodex%2FStandards%2FCXS+152-1985%2FCXS_152e.pdf

Los límites actuales del script de datos iniciales son demostrativos y no deben presentarse como cifras oficiales.
