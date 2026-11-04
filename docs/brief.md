# Project brief

*[Versión en español](brief-es.md)*

A short explanation of what this project is, what the course asks for, and where it stands. Last updated October 22, 2026.

## The assignment

This is the team project for *Desarrollo de Software* (Universidad Anáhuac, fall 2026) and it is worth 30% of the final grade. The professor wrote a case study about a flour mill called Harinas Elizondo (FHESA), and the team has to design, build, test and document the software that issues its **quality certificates for wheat flour**.

There are three deliveries, and each one is presented in class.

| # | Due | What it asks for | Status |
| --- | --- | --- | --- |
| 1 | March 1 | Architecture with the logical, process, development and physical views, UML use cases, quality characteristics and their technical sheet ("ficha técnica") | Done, in the team's architecture document (kept private) |
| 2 | September 17 | Technical design with detailed use cases, database, interfaces and a technical design document | Partial. [01_AVANCE_B1_B4.md](01_AVANCE_B1_B4.md) details only the Clientes use case, and [02_modelo_bd.sql](02_modelo_bd.sql) has the relational model |
| 3 | **November 13, 23:59** | A working program, a written test guide for every test type, unit tests, other tests (component, integration, system, regression), user acceptance tests and a technical specification. Then team conclusions and each member's lessons learned | In progress, in this repo |

## What the system does

At the mill, every finished production lot is tested in the lab with two machines. The alveograph measures five properties of the dough, such as strength (W) and tenacity (P), and the farinograph measures five more, such as water absorption and stability. When a client orders flour and wants a certificate, the lab takes that lot's latest test results and compares them with the client's own limits, or with the international limits when the client has none. Then it issues a PDF certificate that marks any deviation. The PDF goes by email to the client and to the warehouse, which prints it and attaches it to the invoice.

Today this is done by hand with spreadsheets and a PDF editor. Under pressure, staff sometimes edit old inspections so they fit a client, and removing that risk is the main reason the new system exists.

## How it should work

These are the requirements from the team's architecture document.

1. **Two kinds of users.** Lab and quality staff can do everything. Managers and the Operations Director can only see reports. Every action records the employee id and name.
2. **Lab equipment.** The app generates each machine's key. Each machine has its five parameters with limits, and a machine without limits can't be used for certificates. Changes are kept in a history.
3. **Clients.** They're identified by their SAP ByD key, keep their own limits, and are deactivated, never deleted.
4. **Inspections.** Results are captured per lot. The sequence (A to Z, then AA) is assigned by the app and never typed. A new inspection needs an equipment-failure reason and an authorization.
5. **Certificates.** They use the lot's latest complete inspection, and results from **both** machines are required. Values out of range don't block the certificate, they show in a deviation column. Invoice and shipping data are required before closing it, and each certificate has a unique id.
6. **Sending.** Emails go out automatically to the client and the warehouse, with a record of who sent what, when and to whom.
7. **Reports.** History with filters, charts by period, and an Excel export for Power BI.
8. **Audit log.** It covers everything, and inspection results can't change once a certificate uses them.

The quality characteristics the final delivery has to show evidence for are security, reliability, data integrity, availability, usability, maintainability and traceability.

## What exists today

- The team's architecture document, a draft of the technical design with its SQL model, and a first prototype (a simple clients screen saved to a JSON file), now kept in [legacy/](../legacy/prototipo-v0.1/).
- A Next.js app with the database tables, the login setup, a Spanish menu with a placeholder page for each module, the core business rules coded and tested, and documentation for people and for AI agents.
- A live demo at https://harinas-elizondo.vercel.app with a Postgres database, two demo users and working sign-in.
- An earlier design of this same case from a previous course (Ingeniería de Software, summer 2025). It answers questions the team document leaves open, like limits per product, marking adjusted inspections, a queue for failed emails and putting a lot on hold, so it can feed the team's own quality details.

## What comes next

The step-by-step plan is in [llm/status.md](llm/status.md) and the questions that still need an answer are in [llm/decisions.md](llm/decisions.md).
