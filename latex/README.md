# Project report (LaTeX)

*[Versión en español](README-es.md)*

This folder holds the written report of the project, in Spanish. It explains the design choices and how the team worked (architecture, GitHub, AI agents, tests). The full course documents stay in `docs/`, and the report points to them instead of copying them.

| Path | What it is |
| --- | --- |
| `main.tex` | Main file, it includes every section |
| `pkg/preamble.sty` | Packages, helpers (`\pend`, `\captura`, `\fref`) and diagram styles |
| `pkg/portada.sty` | The cover |
| `secc/*.tex` | One file per section |
| `figs/*.tex` | TikZ diagrams, one per file |
| `bib.bib` | References (APA, biber) |
| `build.sh` | Local build, with or without names on the cover |

Screenshots are not copied here. The report reads them from `../docs/img/`.

## Build

You need the repo and a TeX distribution with `latexmk` and `biber` (MacTeX on macOS, TeX Live on Linux). There is no installer. Clone the repo, then run the script.

```bash
git clone https://github.com/ValleryR/harinas-elizondo.git
cd harinas-elizondo
./latex/build.sh
```

That builds `latex/main.pdf` with a redacted cover, where every author row reads `[Nombre] --- [ID]`.

For the final version with real names, pass one `--name` and one `--id` per person, in pairs.

```bash
./latex/build.sh --name "Nombre Apellido" --id "00000000" --name "Otra Persona" --id "00000001" --professor "Nombre" [--university "..."] [--faculty "..."] [--logo path/to/logo.png]
```

The script writes the values to `latex/private/portada.tex` (and copies the logo there), then builds. Run with no flags again and it reuses that file. Delete `latex/private/` to go back to the redacted cover.

## Names never enter Git

The repo is public. Student names, student ids, the professor's name and the university logo only live in `latex/private/`, which `latex/.gitignore` ignores. Never write them in a tracked file. The named PDF only exists on your machine.

## The published PDF

`.github/workflows/report-release.yml` runs on every push that touches `latex/`, but only on the fork. It builds the redacted PDF and creates a release with it, named `reporte-<short sha>`, on https://github.com/Freddy-Nader/harinas-elizondo/releases. The team repo skips the job.

## Markers in the text

- `\pend{...}` prints red text in brackets. It marks something the repo cannot tell, for example team conclusions or who did which module. Each one must be replaced by real text before delivery.
- `%CHECK` is a comment (it does not print). It marks a fact that could not be confirmed in the repo and needs a human check.

List them with `grep -n "\\\\pend\|%CHECK" latex/secc/*.tex latex/bib.bib`.
