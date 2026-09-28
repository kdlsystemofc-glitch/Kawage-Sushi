// Regressão visual antes/depois de mudanças que não deveriam mudar nada na tela (ex.: otimização).
//   node scripts/regressao-visual.mjs gravar <pasta>     → grava as referências
//   node scripts/regressao-visual.mjs comparar <pasta>   → compara com elas (até 0,5 % dos pixels com diferença > 24/255)
// Em cada uma das 12 telas: (1) estático aprovado (sem JS) e (2) estado final do motion (todas as revelações
// concluídas, loops parados no início, rolagem no topo), sempre a página inteira.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";
import pngjs from "pngjs";

const { PNG } = pngjs;
const [modo = "comparar", pastaArg = "screenshots/regressao/antes"] = process.argv.slice(2);
const PASTA = resolve(pastaArg);
const ROOT = resolve("site");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png" };
const TELAS = [[2560, 1440], [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [430, 932], [390, 844], [360, 740], [320, 568], [844, 390]];

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try { res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_SITE = `http://127.0.0.1:${server.address().port}/`;
await mkdir(PASTA, { recursive: true });
const browser = await chromium.launch();

async function capturar(w, h, comMotion) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: comMotion });
  const page = await ctx.newPage();
  await page.goto(URL_SITE, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  if (comMotion) {
    await page.keyboard.press("Shift");
    await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 15000 });
    // percorre a página (dispara todas as revelações) e volta ao topo
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= max; y += Math.round(h * 0.5)) {
      await page.evaluate((y) => motion.lenis ? motion.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => motion.lenis ? motion.lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0));
    await page.waitForTimeout(2600);
    await page.evaluate(() => gsap.globalTimeline.progress(1));
    await page.evaluate(() => document.getAnimations().forEach((a) => {
      if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
    }));
    await page.waitForTimeout(600);
  }
  const buf = await page.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}

function diferenca(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { d: 1, motivo: `tamanho ${A.width}×${A.height} ≠ ${B.width}×${B.height}` };
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) if ([0, 1, 2].some((k) => Math.abs(A.data[i + k] - B.data[i + k]) > 24)) n++;
  return { d: n / (A.width * A.height) };
}

let falhas = 0;
for (const [w, h] of TELAS) {
  for (const comMotion of [false, true]) {
    const nome = `${w}x${h}-${comMotion ? "motion" : "estatico"}.png`;
    const buf = await capturar(w, h, comMotion);
    if (modo === "gravar") { await writeFile(join(PASTA, nome), buf); console.log(`gravado ${nome}`); continue; }
    const ref = await readFile(join(PASTA, nome));
    const { d, motivo } = diferenca(ref, buf);
    const ok = d <= 0.005;
    if (!ok) { falhas++; await writeFile(join(PASTA, "..", `DEPOIS-${nome}`), buf); }
    console.log(`${ok ? "✓" : "✗"} ${nome}: ${motivo ?? (d * 100).toFixed(2) + "% dos pixels > 24/255"}`);
  }
}
await browser.close();
server.close();
if (modo === "comparar") console.log(falhas ? `\n✗ ${falhas} tela(s) diferente(s)` : "\n✓ nenhuma diferença visual acima da tolerância");
process.exit(falhas ? 1 : 0);
