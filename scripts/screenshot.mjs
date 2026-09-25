// Sobe um servidor estático de site/ e tira, em cada largura:
//   - a PÁGINA INTEIRA                      -> screenshots/<w>-pagina.png
//   - cada SEÇÃO isolada ([data-secao])     -> screenshots/<w>-secao-<nome>.png
//   - cada COSTURA entre seções vizinhas    -> screenshots/<w>-costura-<a>-<b>.png
// A página inteira e as costuras são obrigatórias: foi numa costura que o bug do projeto
// anterior apareceu (a seção isolada parecia certa e a emenda com a vizinha, não).
//
// Uso:
//   npm run shots                    -> 1440, 768 e 390
//   npm run shots -- 1440 390        -> larguras escolhidas
//   npm run shots -- --secao hero    -> só essa seção (a página inteira e as costuras dela saem sempre)
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve("site");
const OUT = resolve("screenshots");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".json": "application/json",
};

const args = process.argv.slice(2);
const iSecao = args.indexOf("--secao");
const soSecao = iSecao >= 0 ? args.splice(iSecao, 2)[1] : null;
const widths = args.map(Number).filter(Boolean);
if (!widths.length) widths.push(1440, 768, 390);

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("404");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let falhas = 0;

try {
  for (const w of widths) {
    const height = w < 768 ? 844 : Math.round(w * 0.5625);
    const page = await browser.newPage({ viewport: { width: w, height } });
    const erros = [];
    page.on("pageerror", (e) => erros.push(e.message));
    page.on("requestfailed", (r) => erros.push(`falhou: ${r.url()}`));
    page.on("response", (r) => r.status() >= 400 && erros.push(`${r.status()}: ${r.url()}`));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const pagina = join(OUT, `${w}-pagina.png`);
    await page.screenshot({ path: pagina, fullPage: true });
    console.log(`${w}px  página inteira -> ${pagina}`);

    const secoes = await page.$$eval("[data-secao]", (els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { nome: el.dataset.secao, y: r.top + scrollY, h: r.height };
      }),
    );
    for (const [i, s] of secoes.entries()) {
      const vizinha = secoes[i + 1];
      if (!soSecao || s.nome === soSecao) {
        const path = join(OUT, `${w}-secao-${s.nome}.png`);
        await page.screenshot({ path, fullPage: true, clip: { x: 0, y: s.y, width: w, height: s.h } });
        console.log(`${w}px  seção ${s.nome} -> ${path}`);
      }
      if (vizinha && (!soSecao || soSecao === s.nome || soSecao === vizinha.nome)) {
        const faixa = Math.min(240, s.h / 2, vizinha.h / 2);
        const path = join(OUT, `${w}-costura-${s.nome}-${vizinha.nome}.png`);
        await page.screenshot({ path, fullPage: true, clip: { x: 0, y: vizinha.y - faixa, width: w, height: faixa * 2 } });
        console.log(`${w}px  costura ${s.nome}|${vizinha.nome} -> ${path}`);
      }
    }
    for (const e of erros) console.warn(`  ! ${e}`);
    falhas += erros.length;
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(falhas ? 1 : 0);
