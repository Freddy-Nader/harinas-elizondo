# Documentation

*[Versión en español](README-es.md)*

Everything written about Harinas Elizondo lives in this folder. The course documents are in Spanish because they are graded in Spanish. Agent docs are in English under `llm/`.

| Document | What it covers | Course delivery |
| --- | --- | --- |
| [Diseño arquitectónico](diseno-arquitectonico-es.md) | 4+1 views (use cases, logical, process, development, physical), quality characteristics, technical sheet, architectural patterns | 1 |
| [Diseño de la base de datos](diseno-base-datos-es.md) | Conceptual model, full ER diagram, design decisions, keys, normalization, concurrency | 2 |
| [Especificación técnica](especificacion-tecnica-es.md) | Technical spec on the case study template: screens, reports, data dictionary, SQL, detailed use cases, interfaces, quality of service, installation, open issues | 2 and 3 |
| [Proceso de desarrollo](proceso-desarrollo-es.md) | How the team built it: method, timeline, Git flow, tools, conventions, testing, professor feedback | 3 |
| [Guías de pruebas](testing/README.md) | One written script per test type (unit, component, integration, system, regression, acceptance) with results | 3 |
| [llm/](llm/README.md) | Context, requirements, decisions, status and runbook for AI coding agents | Internal |

`private/` is gitignored and only exists on team machines (the original delivery 1 PDF).

To upload the documents to Teams, run `pnpm docs:pdf`. It writes one PDF per document plus `entrega-3-completa.pdf` to `docs/pdf/` (gitignored), with the Mermaid diagrams drawn. Add new documents to the list at the top of `scripts/docs-to-pdf.ts`.

The project report in LaTeX (design choices and how the team worked) is in [`latex/`](../latex/README.md), and its PDF is published on the Releases page of the fork, https://github.com/Freddy-Nader/harinas-elizondo/releases.

How to run the app is in the root [README](../README.md).
