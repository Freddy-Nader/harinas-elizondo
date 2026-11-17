# Plan 012: The project report in LaTeX, a build script that adds the names locally, and a PDF release on the fork

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If anything in "STOP conditions" occurs, stop and report. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Executor model**: run this plan with Opus. It is a writing task where tone matters.
>
> **Drift check (run first)**: `git diff --stat 59b6b24..HEAD -- docs/ .github/ .gitignore`
> Docs may have changed (plans 009 and 011 edit them). That is expected, write from what is on HEAD.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW for the app (no application code), MED for privacy (the repo is public)
- **Depends on**: best after 009, 010 and 011, so the report describes the final state
- **Category**: docs, dx
- **Planned at**: commit `59b6b24`, 2026-11-16

## Why this matters

The team has to hand in a written report. The course documents in `docs/` are complete but long (the PDF export is 103 pages) and read like reference material. The operator wants one report that a high-school student could follow, which explains the design choices and how the team worked (architecture, agents, GitHub, teamwork), written in LaTeX with the same structure as an earlier report of his, and rebuilt and published as a PDF every time `latex/` changes.

This first version is a **draft** for the operator to read. He decides the final size after he sees the PDF.

## Decisions already made by the operator (do not reopen)

1. **Size.** Neither "include everything" nor "just a summary". Include what is needed to explain the design choices and how the work was done. No redundant text, nothing longer than it has to be.
2. **Voice.** It must sound normal, with everyday vocabulary. A high-school student should understand it. Use the `asd-ste100` skill as the guide for simple wording (short sentences, active voice, one idea per sentence, the same word for the same thing), applied to Spanish.
3. **Names stay out of Git.** The repo and the fork are both public. Student names, student ids, the professor's name and the university logo never enter Git. They live in an ignored folder `latex/private/`, and a script with `--name` and `--id` flags writes them there and builds the PDF locally. A build without that folder still works and shows a neutral cover.
4. **Location.** `latex/` lives in this repo and goes to the team repo in the same PR as everything else. The release workflow publishes only on the fork `Freddy-Nader/harinas-elizondo`.
5. **Diagrams are TikZ.** No Mermaid, no exported images of diagrams. Screenshots of the app are PNG files, which is fine.
6. **Missing things use `\pend{...}`.** Anything the repo cannot tell you (team conclusions, personal lessons, who did what, meeting dates, the grade rubric) is a red `\pend{what is missing}` in place, never invented text.

## Current state

- The model for structure is on the operator's machine at `~/kb/latex/medio-termino-chumacero-canseco-nader/` (not in this repo). Its `main.tex`:

```latex
\documentclass[11pt,letterpaper]{article}
\usepackage{pkg/preamble}
\begin{document}
\portada
\thispagestyle{empty}
\tableofcontents
\listoftables
\listoffigures
\newpage
\input{secc/intro}
\input{secc/etapas}
\input{secc/conclusiones}
\FloatBarrier
\printbibliography[title={Referencias}]
\appendix
\input{secc/anexo}
\end{document}
```

  Layout: `pkg/preamble.sty` (packages, the `codigo` listing environment, helpers such as `\fref`, `\tref`, `\sref`, `\aref`, TikZ with `arrows.meta, positioning, calc, fit, shapes.geometric, shapes.multipart`, biblatex with `style=apa, backend=biber`, babel `spanish, mexico, es-noshorthands, es-tabla`), `pkg/portada.sty` (the `\portada` command, which hardcodes logo, university, course, title, authors with ids, professor and date), `secc/*.tex` (one file per section, body sections included from `secc/etapas.tex`, figures collected in `secc/anexo*.tex`), `figs/`, `bib.bib`. One line per paragraph in the `.tex` files, no hard wrapping.
- That preamble has no `\pend`. The sibling template at `~/kb/.agents/skills/bi-report/template/pkg/preamble.sty` defines it, plus a screenshot helper that draws a red box when the image is missing:

```latex
\newcommand{\pend}[1]{\textcolor{red}{\textbf{[#1]}}}
\newcommand{\captura}[3][0.95]{%
  \begin{figure}[H]
    \centering
    \IfFileExists{figs/#2.png}%
      {\includegraphics[width=#1\linewidth,height=0.45\textheight,keepaspectratio]{#2}}%
      {\fbox{\parbox{0.8\linewidth}{\centering\vspace{1.4cm}\textcolor{red}{\textbf{CAPTURA PENDIENTE}}\\[0.4em]\texttt{#2.png}\vspace{1.4cm}}}}%
    \caption{#3}\label{fig:#2}
  \end{figure}}
```

- House skills to read before writing, on the operator's machine: `~/kb/.agents/skills/bi-report/SKILL.md` (report workflow, `\pend`, `%CHECK`, the build line, the delivery checks) and `~/kb/.agents/skills/ac-report/SKILL.md` with `references/diagrams.md` (how earlier reports drew block diagrams in TikZ). `~/kb/.agents/skills/bi-report/scripts/prose_check.py` flags `:` and `;` in prose and hard-wrapped paragraphs. `~/kb/latex/README.md` is the LaTeX runbook, and `~/kb/latex/_shared/gitignore` lists the build files to ignore. Treat all of these as style and method guides. They contain private material about other courses, so copy structure and commands, never names, ids or course data.
- Build tools on the operator's machine: `/Library/TeX/texbin/latexmk` and `/Library/TeX/texbin/biber` (MacTeX). Known problem: `biber` can fail there while the Xcode license is unaccepted. If it does, say so in your report and do not try to fix the machine.
- Sources for the content, all in this repo and all public:
  - `docs/diseno-arquitectonico-es.md` (5 Mermaid diagrams), `docs/diseno-base-datos-es.md` (2 ER diagrams), `docs/especificacion-tecnica-es.md` (use cases, behavior, quality attributes, test results), `docs/proceso-desarrollo-es.md` (method, timeline, Git flow, tools, professor feedback), `docs/testing/` (one guide per test type and the index).
  - `docs/llm/` (agent docs in English): `context.md`, `architecture.md`, `decisions.md` (D-01 to D-29, the design choices with their reasons), `requirements.md`, `status.md`, `runbook.md`, `api-cli.md`.
  - `AGENTS.md`, `plans/README.md` and the plan files (how agents were given work and reviewed), `.github/workflows/ci.yml`.
  - `git log` (129 commits at planning time) and `gh pr list --repo ValleryR/harinas-elizondo --state all` (47 pull requests) for real numbers about the process.
  - Screenshots in `docs/img/` (26 PNG files and one sample certificate PDF). Only demo accounts and test data are visible in them.
- `.github/workflows/ci.yml` is the only workflow. It has `permissions: contents: read` and runs on pull requests and on pushes to `main`.
- The fork (`origin`, Freddy-Nader/harinas-elizondo) is public, runs Actions, and has a `sync-upstream.yml` workflow that only exists there.
- Project rules that apply: human documents are Spanish, code and file names are English, never commit student names or other personal data, never commit anything under `docs/private/`. No `:`, `;` or dashes in running prose. Headings carry no numbers typed by hand (LaTeX numbers sections by itself, that is fine).

## Commands you will need

| Purpose | Command | Expected |
| --- | --- | --- |
| Skill check | `ls ~/.agents/skills ~/.claude/skills 2>/dev/null \| grep -i ste100` | the skill folder. If nothing, run `npx skills add https://github.com/danyuchn/asd-ste100-skill --skill asd-ste100` (the operator asked for this exact command) and read its SKILL.md |
| Build | `cd latex && /Library/TeX/texbin/latexmk -pdf -interaction=nonstopmode -file-line-error main.tex` | `main.pdf`, exit 0, no errors |
| Prose check | `python3 ~/kb/.agents/skills/bi-report/scripts/prose_check.py latex/secc/*.tex` | no output |
| Names check | `git grep -n -i -E "<each surname the operator has>" -- latex` and `git status --short latex` | nothing personal tracked, `latex/private/` not listed |
| Pending list | `grep -n "\\\\pend" latex/secc/*.tex` | the list you report to the operator |
| Workflow lint | `gh workflow list` after a push, or `actionlint` if installed | the new workflow is listed |
| Repo checks | `pnpm lint && pnpm test` | exit 0 (nothing in `latex/` may break them) |

## Scope

**In scope**: new folder `latex/` (`main.tex`, `pkg/`, `secc/`, `figs/` for TikZ sources, `bib.bib`, `build.sh`, `README.md` in English and `README-es.md` in Spanish, `.gitignore`), new `.github/workflows/report-release.yml`, root `.gitignore` only if `latex/.gitignore` is not enough, `docs/README.md` and `docs/README-es.md` (one line that points to the report), `docs/llm/runbook.md` (how to build it), `docs/llm/status.md`.

**Out of scope**: any application code, editing the course documents in `docs/`, committing a PDF, committing any name, id, logo or professor name, the existing `ci.yml`, pushing or creating a release yourself.

## Git workflow

Branch `docs/latex-report` from the tip of `chore/improve-plans`. Two commits: `docs(report): LaTeX project report with TikZ diagrams and a local build script` and `ci(report): release the report PDF on the fork when latex/ changes`. Do not push unless told.

## Steps

### Step 1: Skeleton that compiles

Create `latex/` with the same layout as the model. Copy the model's `pkg/preamble.sty` and adapt it (keep the packages, the listing style, the reference helpers and TikZ, add `\pend` and `\captura` from the excerpt above, drop helpers that only made sense for digital circuits). Point screenshots at the existing files with `\graphicspath{{../docs/img/}{figs/}}` so no PNG is copied, and make `\captura` look in `../docs/img/`.

Write a new `pkg/portada.sty`. The cover reads everything personal from `private/portada.tex` when that file exists (`\IfFileExists`), and otherwise prints a neutral cover with the project title, the course name "Desarrollo de Software", the words "Equipo del proyecto" and the date. The private file defines the logo path, university and faculty lines, the list of authors with ids, and the professor.

`latex/.gitignore` ignores `private/`, `main.pdf` and the LaTeX build files (use the list in `~/kb/latex/_shared/gitignore`).

**Verify**: the build command produces `main.pdf` with the neutral cover and an empty table of contents. `git status --short` shows no PDF and no `private/`.

### Step 2: The build script

`latex/build.sh`, plain bash, about 30 lines. Usage:

```bash
./latex/build.sh --name "Nombre Apellido" --id "00000000" --name "Otra Persona" --id "00000001" --professor "Nombre" [--logo path/to/logo.png]
```

It pairs each `--name` with the next `--id`, writes `latex/private/portada.tex` (and copies the logo into `latex/private/` when `--logo` is given), then runs latexmk and prints the path of the PDF. Run with no flags it only builds, reusing an existing `private/portada.tex` if there is one. It must fail with a clear Spanish message if `latexmk` is not installed or if a `--name` has no `--id`. It must escape LaTeX special characters in the values.

Do not build a `curl | bash` installer. The script needs the repo next to it anyway, so "clone, then run `./latex/build.sh`" is the whole install. Say so in the README.

**Verify**: run it with two made-up names and ids (for example "Persona Uno" and "00000001"). The PDF cover shows them. `git status --short` still shows nothing under `latex/private/`. Delete `latex/private/` after the check.

### Step 3: Outline, then stop thinking about length

Write the outline as section files before writing prose. Suggested shape, adapt it if the material asks for it:

| File | Section | What it must answer |
| --- | --- | --- |
| `secc/intro.tex` | Introducción | What the mill needed, what we built, how the report is organized |
| `secc/producto.tex` | Qué hace el sistema | The flow from lot to inspection to certificate to email, the three roles, with two or three screenshots |
| `secc/diseno.tex` | Decisiones de diseño | The choices that shaped the system and why (stack, layers, data model, roles and permissions, certificate rules, audit log, what we chose not to build). Each one as problem, options, choice, reason, taken from `docs/llm/decisions.md` |
| `secc/proceso.tex` | Cómo trabajamos | GitHub flow (branches, pull requests, reviews, CI), how work was split, the timeline, professor feedback and what changed because of it |
| `secc/agentes.tex` | Cómo usamos agentes de IA | What `AGENTS.md` and `docs/llm/` are for, how plans in `plans/` were written by one model and executed by another in separate worktrees with a review step, what went wrong and was caught in review, what stayed a human job |
| `secc/calidad.tex` | Cómo comprobamos que funciona | The test pyramid in one table with the real counts, the live checks on production, what is still pending and why |
| `secc/conclusiones.tex` | Conclusiones | Team conclusions and one lesson per person, all `\pend` |
| `secc/ia.tex` | Declaración de uso de IA | Tool, purpose, scope and human review. The course asks for this |
| `secc/anexo.tex` | Anexo | The remaining screenshots, and a pointer to the repo documents for full detail |

Rules for choosing content: if a sentence does not help explain a choice or how the work was done, leave it out. Never copy a table from `docs/` whole. Point to the document instead (`docs/especificacion-tecnica-es.md` has the 16 system cases, the report needs the count and one example).

**Verify**: the build still compiles with the empty sections in the table of contents.

### Step 4: Diagrams in TikZ

Draw each diagram as its own file under `latex/figs/` (`\input` from the section), using only the TikZ libraries the preamble loads. Keep them few and readable on a letter page. Expected set: the system context (who uses it and what goes in and out), the layers of the app (screen, server action or API route, use case, database), the data model reduced to the main tables and their relations, the certificate life cycle (draft, issued, sent, cancelled), the path of a change (branch, pull request, CI, review, merge, deploy), and the agent workflow (advisor writes a plan, executor works in a worktree, reviewer checks, one PR). Redraw from the Mermaid sources in `docs/`, simplified. Do not paste Mermaid.

**Verify**: every figure compiles, has a caption and a label, and is referenced from the text with `\fref`. `grep -rn "mermaid" latex` returns nothing.

### Step 5: Write the sections

Write in Spanish, in first person plural, one line per paragraph. Apply the `asd-ste100` guidance: short sentences, active voice, one idea per sentence, common words, the same term for the same thing every time. Explain a technical word the first time it appears, in one short clause. Use real numbers from the repo (commits, pull requests, tests, decisions) and check each one with a command before writing it. Mark every fact you could not verify in the repo with a `%CHECK` comment, and every missing fact with `\pend{...}`.

Things that are always `\pend`: team conclusions, each person's lesson, who did which part, meeting dates, anything about grades. Things you must not write: student names, ids, the professor's name (the cover gets them from the private file), any real client or personal data.

Cite the outside sources the docs already cite (frameworks, the course material) in `bib.bib` with `\parencite`. Do not invent a reference. If a source has no clear author or date, use `\pend`.

**Verify**: the build command exits 0 with no errors and no undefined references (`grep -c "undefined" latex/main.log` is 0, apart from citations if biber fails for the license reason above, which you report). The prose check prints nothing. The names check finds nothing.

### Step 6: Read it as the reader

Open the PDF pages (render them to PNG with `pdftoppm` and look) and read the whole thing once as a high-school student. Cut every paragraph that repeats another one. Replace every word a student would not know, or explain it. Check that no diagram is unreadably small and no table runs off the page. Write down the page count.

**Verify**: you can state in your report, per section, what question it answers in one line.

### Step 7: Release workflow

`.github/workflows/report-release.yml`:

- Trigger: `push` on any branch with `paths: ["latex/**", ".github/workflows/report-release.yml"]`, plus `workflow_dispatch`.
- The job has `if: github.repository == 'Freddy-Nader/harinas-elizondo'`, so the team repo skips it. `permissions: contents: write` on this job only.
- Steps: checkout, build `latex/main.tex` with latexmk and biber in a TeX Live container or a maintained LaTeX action pinned to a version (pdfLaTeX, working directory `latex`), then create a release with the GitHub CLI: tag `reporte-<short sha>`, title with the date and the short sha, the PDF attached as `reporte-harinas-elizondo.pdf`, marked as the latest release. The cover is the neutral one, because `latex/private/` does not exist in CI. Use no secrets other than the built-in `GITHUB_TOKEN`.
- Add a `concurrency` group per ref so two quick pushes do not race.

Read the current docs of whatever action you pick before using it, and pin it.

**Verify**: the YAML parses (`python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/report-release.yml'))"` or `actionlint`). You cannot run it without a push, so say plainly in your report that the first real run happens when the operator pushes, and list what to check then.

### Step 8: Docs

`latex/README.md` (English) and `latex/README-es.md` (Spanish): what the folder is, how to build with and without names, where the released PDF appears (the Releases page of the fork), what `\pend` and `%CHECK` mean, and the rule that names never enter Git. Add one line to `docs/README.md` and `docs/README-es.md`, a short section to `docs/llm/runbook.md`, and a row to `docs/llm/status.md`.

**Verify**: `pnpm lint && pnpm test` exit 0.

## Test plan

There is no unit test. The checks are the build, the prose check, the names check and your read-through in Step 6. Report the page count, the list of `\pend` items with file and line, and the list of `%CHECK` comments.

## Done criteria

- [ ] `latex/main.pdf` builds locally with no errors, with the neutral cover and with a named cover through `build.sh`
- [ ] No name, id, logo or professor name is tracked by Git (`git ls-files latex | grep -i private` is empty, the names check is empty)
- [ ] Every diagram is TikZ, every screenshot comes from `docs/img/`
- [ ] The prose check prints nothing
- [ ] Every missing fact is a `\pend`, and the report lists them for the operator
- [ ] `report-release.yml` parses, is limited to the fork and needs no extra secret
- [ ] READMEs in both languages, runbook and status updated
- [ ] `plans/README.md` row 012 updated

## STOP conditions

- The model folder or the house skills are not on this machine (the plan cannot be followed without the structure).
- A step would put a name, an id or the logo into a tracked file.
- LaTeX is not installed, or the build fails for a reason that is not the known biber license problem.
- Explaining something would need facts that are only in private material (for example the private `dsw` skill in `~/kb`). Use `\pend` instead, and never copy private text into the repo.

## Maintenance notes

- The report describes the state at one commit. When the app changes, update the numbers in `secc/calidad.tex` first, they go stale fastest.
- The release job publishes a PDF without names on purpose. The named PDF only ever exists on a team member's machine.
- If the operator later wants a longer or shorter version, keep one source and add or remove section files from `main.tex`. Do not fork the folder.
