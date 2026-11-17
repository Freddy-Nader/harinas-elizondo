# Documentación

*[English version](README.md)*

Todo lo escrito sobre Harinas Elizondo vive en esta carpeta. Los documentos del curso están en español. Los documentos para agentes de IA están en inglés dentro de `llm/`.

| Documento | Qué tiene | Entrega del curso |
| --- | --- | --- |
| [Diseño arquitectónico](diseno-arquitectonico-es.md) | Vistas 4+1 (casos de uso, lógica, de proceso, de desarrollo y física), características de calidad, ficha técnica y patrones arquitectónicos | 1 |
| [Diseño de la base de datos](diseno-base-datos-es.md) | Modelo conceptual, diagrama entidad relación completo, decisiones de diseño, llaves, normalización y concurrencia | 2 |
| [Especificación técnica](especificacion-tecnica-es.md) | Especificación con la plantilla del caso de estudio. Pantallas, reportes, diccionario de datos, SQL, casos de uso detallados, interfaces, calidad de servicio, instalación y asuntos abiertos | 2 y 3 |
| [Proceso de desarrollo](proceso-desarrollo-es.md) | Cómo lo construimos. Metodología, cronología, flujo con Git, herramientas, convenciones, pruebas y retroalimentación del profesor | 3 |
| [Guías de pruebas](testing/README.md) | Un guion escrito por tipo de prueba (unitarias, componentes, integrales, sistema, regresión y aceptación) con sus resultados | 3 |
| [llm/](llm/README.md) | Contexto, requisitos, decisiones, estado y runbook para agentes de IA | Interno |

La carpeta `private/` está en `.gitignore` y solo existe en las computadoras del equipo (el PDF original de la entrega 1).

Para subir los documentos a Teams corre `pnpm docs:pdf`. Genera un PDF por documento y `entrega-3-completa.pdf` en `docs/pdf/` (ignorada por Git), con los diagramas Mermaid dibujados. Los documentos nuevos se agregan a la lista al inicio de `scripts/docs-to-pdf.ts`.

El reporte del proyecto en LaTeX (decisiones de diseño y cómo trabajamos) está en [`latex/`](../latex/README-es.md), y su PDF se publica en la página de Releases del fork, https://github.com/Freddy-Nader/harinas-elizondo/releases.

Cómo correr la aplicación está en el [README](../README-es.md) de la raíz.
