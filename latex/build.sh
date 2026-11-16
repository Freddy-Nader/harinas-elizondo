#!/usr/bin/env bash
# Builds latex/main.pdf. With --name/--id pairs it first writes the cover data to
# latex/private/portada.tex (ignored by Git), so names and ids never reach the repo.
# Usage: ./latex/build.sh --name "Nombre Apellido" --id "00000000" [--name ... --id ...]
#          [--professor "Nombre"] [--university "..."] [--faculty "..."] [--logo path/to/logo.png]
# With no flags it only builds, reusing private/portada.tex if it exists.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
# Escape the LaTeX special characters of one value in a single pass.
esc() { printf '%s' "$1" | perl -pe 'BEGIN{%m=("\\"=>"\\textbackslash{}","{"=>"\\{","}"=>"\\}","\$"=>"\\\$","&"=>"\\&","#"=>"\\#","_"=>"\\_","%"=>"\\%","^"=>"\\textasciicircum{}","~"=>"\\textasciitilde{}")} s/([\\{}\$&#_%^~])/$m{$1}/g'; }
die() { echo "Error. $1" >&2; exit 1; }
rows="" name="" extra="" logo="" given=0
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || die "A la opción $1 le falta su valor."
  case "$1" in
    --name) [ -z "$name" ] || die "El nombre \"$name\" no tiene --id."; name="$2" ;;
    --id) [ -n "$name" ] || die "El id \"$2\" no tiene un --name antes."
          rows+="{$(esc "$name")} & --- & {$(esc "$2")} \\\\"$'\n'; name="" ;;
    --professor) extra+="\\def\\portadaProfesor{$(esc "$2")}"$'\n' ;;
    --university) extra+="\\def\\portadaUniversidad{$(esc "$2")}"$'\n' ;;
    --faculty) extra+="\\def\\portadaFacultad{$(esc "$2")}"$'\n' ;;
    --logo) [ -f "$2" ] || die "No existe el logo $2."; logo="$2" ;;
    *) die "Opción desconocida $1. Usa --name, --id, --professor, --university, --faculty o --logo." ;;
  esac
  given=1; shift 2
done
[ -z "$name" ] || die "El nombre \"$name\" no tiene --id."
latexmk="$(command -v latexmk || echo /Library/TeX/texbin/latexmk)"
[ -x "$latexmk" ] || die "No encontré latexmk. Instala MacTeX (https://tug.org/mactex/) o TeX Live (https://tug.org/texlive/)."
if [ "$given" = 1 ]; then
  mkdir -p "$dir/private"
  if [ -n "$logo" ]; then cp "$logo" "$dir/private/logo.${logo##*.}"; extra+="\\def\\portadaLogo{private/logo.${logo##*.}}"$'\n'; fi
  { echo "% Written by build.sh. Ignored by Git. Never commit this file."
    printf '%s' "$extra"; [ -z "$rows" ] || printf '\\def\\portadaAutores{%%\n%s}\n' "$rows"; } > "$dir/private/portada.tex"
fi
# -g forces a full build, because latexmk misses a private/portada.tex that appears or goes away.
cd "$dir" && "$latexmk" -g -pdf -interaction=nonstopmode -file-line-error main.tex
echo "PDF listo en $dir/main.pdf"
