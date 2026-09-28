// Mede quanto custa desenhar a pedra (filtro SVG em data-URI) — laboratório, não aparelho real.
// Percorre a página inteira (para rasterizar todos os blocos) com trace do Chromium e soma o
// tempo das tarefas de pintura/rasterização, com a pedra como está e com variantes.
// Uso: node scripts/medir-pedra.mjs
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const url = pathToFileURL(resolve("site/index.html")).href;
const CENARIOS = [
  { nome: "2560×1440 @1×", w: 2560, h: 1440, dpr: 1, cpu: 1 },
  { nome: "390×844 @3×, CPU 4× mais lenta", w: 390, h: 844, dpr: 3, cpu: 4 },
];
const VARIANTES = {
  "pedra atual (7 oitavas)": "",
  "pedra com 4 oitavas": "OITAVAS4",
  "pedra com 3 oitavas": "OITAVAS3",
  "sem textura (só cor)": ".pedra::before{background-image:none!important}",
};
const TAREFAS = new Set(["Paint", "PaintImage", "RasterTask", "Rasterize", "ImageDecodeTask", "Decode Image", "GPUTask"]);

async function medir(c, css) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (c.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: c.cpu });
  const eventos = [];
  cdp.on("Tracing.dataCollected", (e) => eventos.push(...e.value));
  const fim = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,cc,gpu", transferMode: "ReportEvents" });
  // a variante precisa valer antes da 1ª pintura: injeta o CSS no documento antes do load
  await page.addInitScript((regra) => {
    if (!regra) return;
    document.addEventListener("DOMContentLoaded", () => {
      if (/^OITAVAS\d$/.test(regra)) {
        const raiz = document.documentElement;
        const v = getComputedStyle(document.querySelector(".pedra")).getPropertyValue("--pedra-textura");
        document.querySelector(".pedra").style.setProperty("--pedra-textura", v.replace("numOctaves='7'", `numOctaves='${regra.at(-1)}'`));
        return;
      }
      const s = document.createElement("style"); s.textContent = regra; document.head.appendChild(s);
    });
  }, css);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load" });
  // percorre a página inteira, uma tela por vez, esperando cada quadro pintar
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < altura; y += c.h * 0.8) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  const total = Date.now() - t0;
  await cdp.send("Tracing.end");
  await fim;
  let pintura = 0, maior = 0;
  for (const e of eventos) if (TAREFAS.has(e.name) && e.dur) { pintura += e.dur / 1000; maior = Math.max(maior, e.dur / 1000); }
  await browser.close();
  return { pintura, maior, total };
}

for (const c of CENARIOS) {
  console.log(`\n${c.nome}`);
  for (const [nome, css] of Object.entries(VARIANTES)) {
    const r = await medir(c, css);
    console.log(`  ${nome.padEnd(26)} pintura+raster ${r.pintura.toFixed(0).padStart(5)} ms · maior tarefa ${r.maior.toFixed(0).padStart(4)} ms · percurso ${r.total} ms`);
  }
}
