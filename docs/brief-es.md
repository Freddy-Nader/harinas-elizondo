# Resumen del proyecto

*[English version](brief.md)*

Una explicación corta de qué es este proyecto, qué pide la materia y en qué punto va. Última actualización el 22 de octubre de 2026.

## La tarea

Es el proyecto en equipo de *Desarrollo de Software* (Universidad Anáhuac, otoño 2026) y vale el 30% de la calificación final. El profesor escribió un caso de estudio sobre un molino llamado Harinas Elizondo (FHESA), y el equipo tiene que diseñar, construir, probar y documentar el software que emite sus **certificados de calidad de harina de trigo**.

Hay tres entregas y cada una se presenta en clase.

| # | Fecha | Qué pide | Estado |
| --- | --- | --- | --- |
| 1 | 1 de marzo | Arquitectura con las vistas lógica, de proceso, de desarrollo y física, casos de uso en UML, características de calidad y su ficha técnica | Lista, en el documento de arquitectura del equipo (se mantiene privado) |
| 2 | 17 de septiembre | Diseño técnico con casos de uso detallados, base de datos, interfaces y el documento de diseño técnico | Parcial. [01_AVANCE_B1_B4.md](01_AVANCE_B1_B4.md) detalla solo el caso de uso de Clientes y [02_modelo_bd.sql](02_modelo_bd.sql) tiene el modelo relacional |
| 3 | **13 de noviembre, 23:59** | El programa funcionando, una guía escrita para cada tipo de prueba, pruebas unitarias, otras pruebas (de componentes, integrales, de sistema, de regresión), pruebas de aceptación de usuario y la especificación técnica. Después, las conclusiones del equipo y las lecciones aprendidas de cada integrante | En curso, en este repositorio |

## Qué hace el sistema

En el molino, cada lote de producción terminado se analiza en el laboratorio con dos equipos. El alveógrafo mide cinco propiedades de la masa, como la fuerza panadera (W) y la tenacidad (P), y el farinógrafo mide otras cinco, como la absorción de agua y la estabilidad. Cuando un cliente pide harina y quiere certificado, el laboratorio toma los resultados más recientes de ese lote y los compara con los límites propios del cliente, o con los internacionales si el cliente no tiene. Luego emite un certificado en PDF que marca cualquier desviación. El PDF se envía por correo al cliente y al almacén, que lo imprime y lo anexa a la factura.

Hoy todo esto se hace a mano con hojas de cálculo y un editor de PDF. Con las prisas, a veces el personal edita inspecciones viejas para que le queden a un cliente, y quitar ese riesgo es la razón principal del nuevo sistema.

## Cómo debe funcionar

Estos son los requerimientos del documento de arquitectura del equipo.

1. **Dos tipos de usuario.** El personal de laboratorio y de calidad puede hacer todo. Los gerentes y el Director de Operaciones solo consultan reportes. Cada acción guarda el número y el nombre del empleado.
2. **Equipos de laboratorio.** La aplicación genera la clave de cada equipo. Cada equipo tiene sus cinco parámetros con límites, y un equipo sin límites no se puede usar para certificar. Los cambios quedan en un historial.
3. **Clientes.** Se identifican con su clave de SAP ByD, guardan sus propios límites y se inactivan, nunca se borran.
4. **Inspecciones.** Los resultados se capturan por lote. La secuencia (de la A a la Z y luego AA) la asigna la aplicación y nunca se teclea. Una inspección nueva necesita un motivo de falla del equipo y una autorización.
5. **Certificados.** Usan la última inspección completa del lote y exigen resultados de **ambos** equipos. Los valores fuera de rango no bloquean el certificado, aparecen en la columna de desviación. Los datos de factura y de envío son obligatorios antes de cerrarlo, y cada certificado tiene un identificador único.
6. **Envío.** Los correos salen solos al cliente y al almacén, con registro de quién envió qué, cuándo y a quién.
7. **Reportes.** Histórico con filtros, gráficas por periodo y exportación a Excel para Power BI.
8. **Bitácora.** Cubre todo, y los resultados de una inspección ya no pueden cambiar cuando un certificado los usa.

Las características de calidad de las que la entrega final debe mostrar evidencia son seguridad, confiabilidad, integridad de la información, disponibilidad, usabilidad, mantenibilidad y trazabilidad.

## Qué existe hoy

- El documento de arquitectura del equipo, un borrador del diseño técnico con su modelo SQL y un primer prototipo (una pantalla sencilla de clientes que guarda en un archivo JSON), que ahora vive en [legacy/](../legacy/prototipo-v0.1/).
- Una aplicación en Next.js con las tablas de la base de datos, la configuración del inicio de sesión, un menú en español con una página provisional por módulo, las reglas de negocio principales programadas y probadas, y documentación para personas y para agentes de IA.
- Una demo en línea en https://harinas-elizondo.vercel.app con base de datos Postgres, dos usuarios de prueba e inicio de sesión funcionando.
- Un diseño anterior de este mismo caso hecho en otra materia (Ingeniería de Software, verano 2025). Responde preguntas que el documento del equipo deja abiertas, como límites por producto, marcar inspecciones ajustadas, una cola de correos fallidos y retener un lote, así que puede alimentar los detalles de calidad propios del equipo.

## Qué sigue

El plan paso a paso está en [llm/status.md](llm/status.md) y las preguntas que faltan por responder están en [llm/decisions.md](llm/decisions.md), ambos en inglés.
