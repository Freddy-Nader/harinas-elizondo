# Reporte del proyecto (LaTeX)

*[English version](README.md)*

Esta carpeta tiene el reporte escrito del proyecto, en español. El reporte explica las decisiones de diseño y cómo trabajó el equipo (arquitectura, GitHub, agentes de IA y pruebas). Los documentos completos del curso siguen en `docs/`, y el reporte los cita en lugar de copiarlos.

| Ruta | Qué es |
| --- | --- |
| `main.tex` | Archivo principal, incluye todas las secciones |
| `pkg/preamble.sty` | Paquetes, comandos (`\pend`, `\captura`, `\fref`) y estilos de los diagramas |
| `pkg/portada.sty` | La portada |
| `secc/*.tex` | Un archivo por sección |
| `figs/*.tex` | Diagramas en TikZ, uno por archivo |
| `bib.bib` | Referencias (APA, biber) |
| `build.sh` | Compilación local, con o sin nombres en la portada |

Las capturas no se copian aquí. El reporte las lee de `../docs/img/`.

## Compilar

Necesitas el repositorio y una distribución de TeX con `latexmk` y `biber` (MacTeX en macOS, TeX Live en Linux). No hay instalador. Clona el repositorio y corre el script.

```bash
git clone https://github.com/ValleryR/harinas-elizondo.git
cd harinas-elizondo
./latex/build.sh
```

Así se genera `latex/main.pdf` con la portada sin nombres, donde cada renglón de autor dice `[Nombre] --- [ID]`.

Para la versión final con los nombres reales, pasa un `--name` y un `--id` por persona, en pares.

```bash
./latex/build.sh --name "Nombre Apellido" --id "00000000" --name "Otra Persona" --id "00000001" --professor "Nombre" [--university "..."] [--faculty "..."] [--logo ruta/al/logo.png]
```

El script escribe los datos en `latex/private/portada.tex` (y copia ahí el logo), y después compila. Si lo corres otra vez sin opciones, usa ese mismo archivo. Borra `latex/private/` para volver a la portada sin nombres.

## Los nombres nunca entran a Git

El repositorio es público. Los nombres de los alumnos, sus matrículas, el nombre del profesor y el logo de la universidad solo viven en `latex/private/`, que `latex/.gitignore` ignora. Nunca los escribas en un archivo que Git sigue. El PDF con nombres solo existe en tu computadora.

## El PDF publicado

`.github/workflows/report-release.yml` corre en cada push que toca `latex/`, pero solo en el fork. Compila el PDF sin nombres y crea un release con él, llamado `reporte-<sha corto>`, en https://github.com/Freddy-Nader/harinas-elizondo/releases. El repositorio del equipo se salta ese trabajo.

## Marcas en el texto

- `\pend{...}` imprime texto rojo entre corchetes. Marca algo que el repositorio no puede decir, por ejemplo las conclusiones del equipo o quién hizo cada módulo. Cada una se cambia por texto real antes de entregar.
- `%CHECK` es un comentario (no se imprime). Marca un dato que no se pudo confirmar en el repositorio y que una persona debe revisar.

Para listarlas usa `grep -n "\\\\pend\|%CHECK" latex/secc/*.tex latex/bib.bib`.
