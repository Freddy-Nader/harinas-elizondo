// Exports the course documents to PDF (docs/pdf/). Run with `pnpm docs:pdf`.
// Markdown -> HTML with marked, Mermaid drawn by the npm package inside
// Chromium (works offline), then printed with Playwright.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { Marked } from "marked";

// Add new documents here, in the order of the combined file.
const DOCS = [
  "docs/diseno-arquitectonico-es.md",
  "docs/diseno-base-datos-es.md",
  "docs/especificacion-tecnica-es.md",
  "docs/proceso-desarrollo-es.md",
  "docs/testing/README.md",
  "docs/testing/pruebas-unitarias-es.md",
  "docs/testing/pruebas-componentes-es.md",
  "docs/testing/pruebas-integrales-es.md",
  "docs/testing/pruebas-sistema-es.md",
  "docs/testing/pruebas-regresion-es.md",
  "docs/testing/pruebas-aceptacion-es.md",
];
const COMBINED = "entrega-3-completa";
const OUT = resolve("docs/pdf");

const CSS = `
@page { size: A4; margin: 2cm; }
body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111; }
h1 { font-size: 20pt; } h2 { font-size: 15pt; } h3 { font-size: 12pt; }
h1, h2, h3, h4 { break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 8.5pt; break-inside: avoid; }
table.long { break-inside: auto; } tr { break-inside: avoid; }
th, td { border: 1px solid #888; padding: 3px 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
th { background: #eee; }
code { font: 9pt ui-monospace, Menlo, monospace; background: #f3f3f3; padding: 0 2px; }
pre { background: #f6f6f6; padding: 8px; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { background: none; padding: 0; }
img { max-width: 100%; max-height: 22cm; break-inside: avoid; }
pre.mermaid { background: none; padding: 0; text-align: center; break-inside: avoid; }
pre.mermaid svg { max-width: 100%; max-height: 23cm; height: auto; }
section.doc { break-before: page; }
section.doc:first-child { break-before: auto; }
`;

function render(file: string): string {
  const dir = dirname(resolve(file));
  const marked = new Marked({
    walkTokens(token) {
      if (token.type === "image" && !/^(https?:|data:|file:)/.test(token.href)) {
        token.href = pathToFileURL(resolve(dir, token.href)).href;
      }
    },
    renderer: {
      code({ text, lang }) {
        const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return lang === "mermaid"
          ? `<pre class="mermaid">${esc}</pre>`
          : `<pre><code>${esc}</code></pre>`;
      },
    },
  });
  return `<section class="doc">${marked.parse(readFileSync(file, "utf8"), { async: false })}</section>`;
}

async function print(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  sections: string[],
  name: string,
) {
  const htmlPath = resolve(OUT, `.${name}.html`);
  writeFileSync(
    htmlPath,
    `<!doctype html><html lang="es"><meta charset="utf-8"><style>${CSS}</style><body>${sections.join("")}</body></html>`,
  );
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.addScriptTag({ path: resolve("node_modules/mermaid/dist/mermaid.min.js") });
  await page.evaluate(async () => {
    // @ts-expect-error mermaid is a browser global injected above
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    // @ts-expect-error same global
    await mermaid.run({ querySelector: "pre.mermaid" });
  });
  const raw = await page.locator("pre.mermaid:not(:has(svg))").count();
  if (raw > 0) throw new Error(`${name}: ${raw} Mermaid diagram(s) were not drawn`);
  await page.evaluate(() => {
    // Let long tables split across pages instead of being cut.
    document.querySelectorAll("table").forEach((t) => {
      if (t.rows.length > 12) t.classList.add("long");
    });
  });
  await page.pdf({ path: resolve(OUT, `${name}.pdf`), format: "A4", printBackground: true, margin: { top: "2cm", bottom: "2cm", left: "2cm", right: "2cm" } });
  await page.close();
  rmSync(htmlPath);
  console.log(`docs/pdf/${name}.pdf`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const sections = DOCS.map(render);
    for (const [i, file] of DOCS.entries()) {
      await print(browser, [sections[i]], basename(file, ".md") === "README" ? "pruebas-indice" : basename(file, ".md"));
    }
    await print(browser, sections, COMBINED);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
