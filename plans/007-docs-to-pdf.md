# Plan 007: Export the course documents to PDF for Teams

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 89aa184..HEAD -- docs/ package.json`
> Docs may have changed (plans 005 and 006 edit them). That is expected, export what is on HEAD.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans 005 and 006, so the PDFs carry screenshots and fresh test results
- **Category**: docs
- **Planned at**: commit `89aa184`, 2026-11-16

## Why this matters

The team uploads deliveries to Microsoft Teams, which wants files, not repo links. The documents are Markdown with Mermaid diagrams, which GitHub renders but a plain Markdown to PDF tool does not. A repeatable script turns them into clean PDFs with the diagrams drawn, so the team can re-export after any edit.

## Current state

- Documents (Spanish) listed in `docs/README-es.md`: `docs/diseno-arquitectonico-es.md` (5 Mermaid diagrams), `docs/diseno-base-datos-es.md` (2 erDiagram), `docs/especificacion-tecnica-es.md` (several flowchart, sequenceDiagram and stateDiagram blocks), `docs/proceso-desarrollo-es.md` (1 flowchart), and the guides in `docs/testing/` (tables only).
- `docs/testing/README.md` says the PDF export "todavía no se ha probado".
- Package manager is pnpm, Node 22. The repo already has Playwright (`@playwright/test`) and Chromium for e2e, which can print HTML to PDF.

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Install | `pnpm install` | exit 0 |
| Export | `pnpm docs:pdf` (you create it) | PDFs in `docs/pdf/` |
| Check | `pnpm lint && pnpm typecheck` | exit 0 |

## Suggested executor toolkit

`pick-ui-library`-style caution for new dependencies. Prefer what the repo already has. Candidate approach: `marked` (Markdown to HTML) plus Mermaid rendered in the page through `mermaid` from a pinned CDN URL or the npm package, then Playwright `page.pdf()`. If the operator prefers, `@mermaid-js/mermaid-cli` (`mmdc`) can render each block to SVG first.

## Scope

**In scope**: new `scripts/docs-to-pdf.ts`, one `docs:pdf` script in `package.json`, at most two new devDependencies, `.gitignore` (ignore `docs/pdf/`), `docs/testing/README.md` and `docs/README.md` / `docs/README-es.md` (how to export), `docs/llm/runbook.md`.

**Out of scope**: editing document content, committing the generated PDFs (they go to Teams, not git), any runtime dependency.

## Git workflow

Branch `chore/docs-pdf` from team `main`. Commit `chore(docs): add a script that exports the course documents to PDF`. Do not push unless told.

## Steps

### Step 1: Script skeleton

`scripts/docs-to-pdf.ts` (run with `tsx`, already used by `db:seed`) reads a fixed list of files, converts each to HTML with a simple print stylesheet (A4, 2 cm margins, system sans font, tables with borders, `page-break-inside: avoid` on tables and diagrams), and writes `docs/pdf/<name>.pdf`. Relative links to other docs can stay as text. Images under `docs/img/` must load (use `file://` base URL).

**Verify**: `pnpm docs:pdf` creates one PDF per document, exit 0.

### Step 2: Mermaid

Every ```` ```mermaid ```` block must render as a diagram, not as code. Wait for Mermaid to finish before printing (for example wait until no `pre.mermaid` without an `svg` child remains).

**Verify**: open `docs/pdf/diseno-base-datos-es.pdf` and `docs/pdf/diseno-arquitectonico-es.pdf`, every diagram is drawn. `pdftotext docs/pdf/diseno-base-datos-es.pdf - | grep -c "erDiagram"` → 0 (no raw code left).

### Step 3: Combined file

Also write `docs/pdf/entrega-3-completa.pdf` with all documents in this order: architecture, database, technical spec, process, test guides index, each test guide.

**Verify**: page count is the sum of the parts (`pdfinfo`).

### Step 4: Docs

Explain `pnpm docs:pdf` in the runbook and replace the "todavía no se ha probado" line in `docs/testing/README.md`. Spanish prose rules apply there (no `:`, `;` or dashes in running prose).

**Verify**: `pnpm lint && pnpm typecheck && pnpm test` → exit 0.

## Test plan

Manual visual check of every PDF (diagrams drawn, tables not cut, accents correct). Record the check in your report.

## Done criteria

- [ ] `pnpm docs:pdf` writes one PDF per document plus the combined one
- [ ] No raw Mermaid code in any PDF
- [ ] `docs/pdf/` is gitignored
- [ ] Runbook explains the command
- [ ] `plans/README.md` row 007 updated

## STOP conditions

- A new dependency would be a runtime dependency.
- Mermaid diagrams cannot render offline and no pinned CDN is acceptable to the operator.
- A document contains personal data (names of students) that would end up in the PDF.

## Maintenance notes

Add new documents to the list at the top of the script. Teams uploads are manual and belong to the team.
