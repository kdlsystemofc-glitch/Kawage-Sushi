// Testes do motion do topo + hero (DESIGN.md §9, D30–D35). Servido por http (a comparação com o estático
// usa o site sem JS, e por file:// sem JS as fontes não carregam). Saída: screenshots/motion/.
// Uso: npm run test:motion
import { createServer } from "node:http";
import { readFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";
import pngjs from "pngjs";

const { PNG } = pngjs;
const ROOT = resolve("site");
const OUT = resolve("screenshots/motion");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2" };
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
await mkdir(OUT, { recursive: true });
const VERIFICAR = await readFile(resolve("tests/fita/verificar.js"), "utf8");

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) falhas++; };
const browser = await chromium.launch();

async function abrir({ w = 1440, h = 900, js = true, reduzido = false, quality = null, video = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, javaScriptEnabled: js, reducedMotion: reduzido ? "reduce" : "no-preference",
    ...(video && { recordVideo: { dir: OUT, size: { width: w, height: h } } }),
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("request", (r) => /\/design\//.test(r.url()) && erros.push(`pedido a /design: ${r.url()}`));
  await page.goto(URL_SITE + (quality ? `?quality=${quality}` : ""), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, erros };
}
const subirMotion = async (page) => {
  await page.keyboard.press("Shift");
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 12000 });
};

// congela TODAS as animações CSS no instante t (ms desde o início delas)
const congelar = (page, t) => page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);

// diferença entre dois PNG: fração de pixels com algum canal diferente em mais de 24/255
function diferenca(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 1;
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    if (Math.abs(A.data[i] - B.data[i]) > 24 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 24 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 24) n++;
  }
  return n / (A.width * A.height);
}

// ordem visual real: com a fita "clicável" por um instante, quem está por cima num ponto?
const ORDEM = () => {
  const s = document.createElement("style");
  s.textContent = ".fita, .fita * { pointer-events: auto !important }";
  document.head.appendChild(s);
  const fita = document.querySelector("[data-fita]");
  const acharPonto = (el, passo = 6) => {
    const r = el.getBoundingClientRect();
    for (let y = r.top + 2; y < Math.min(r.bottom, innerHeight); y += passo)
      for (let x = r.left + 2; x < r.right; x += passo) {
        const pilha = document.elementsFromPoint(x, y);
        const iF = pilha.findIndex((e) => fita.contains(e)), iE = pilha.findIndex((e) => el.contains(e) || e === el);
        if (iF >= 0 && iE >= 0) return { iF, iE };
      }
    return null;
  };
  // "W" do wordmark do topo (3º caractere): a fita tem que estar por cima
  const n = document.querySelector(".topo__wordmark").firstChild;
  const iW = n.data.toLowerCase().indexOf("w"); // o texto começa com quebra de linha e espaços
  const rg = document.createRange(); rg.setStart(n, iW); rg.setEnd(n, iW + 1);
  const W = rg.getBoundingClientRect();
  let w = null;
  for (let y = W.top + 4; y < W.bottom && !w; y += 4) for (let x = W.left; x < W.right && !w; x += 3) {
    const pilha = document.elementsFromPoint(x, y);
    const iF = pilha.findIndex((e) => fita.contains(e)), iE = pilha.findIndex((e) => e.classList?.contains("topo__wordmark"));
    if (iF >= 0 && iE >= 0) w = { iF, iE };
  }
  const a = acharPonto(document.querySelector(".hero__foto--a"));
  s.remove();
  return { w, a };
};

// ── 1. quadros da entrada, empilhamento e quadro final × estático ──
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const est = await abrir({ w, h, js: false });
  const estatico = await est.page.screenshot();
  await est.ctx.close();

  const { ctx, page, erros } = await abrir({ w, h });
  const nAnim = await page.evaluate(() => document.getAnimations().length);
  ok(nAnim >= 5, `${w}: entradas em CSS rodando ao carregar, sem esperar o motion (${nAnim} animações)`);
  for (const t of [0, 300, 900, 1500, 2600]) {
    await congelar(page, t);
    await page.waitForTimeout(60);
    const png = await page.screenshot({ path: join(OUT, `entrada-${w}-${String(t).padStart(4, "0")}ms.png`) });
    const v = await page.evaluate(`(${VERIFICAR})()`);
    ok(!v.erros.length, `${w} @${t} ms: empilhamento da fita ok${v.erros.length ? " — " + v.erros.join("; ") : ""}`);
    if (t >= 900) {
      // antes disso a fita ainda está sendo revelada (clip-path) e pode não cobrir o W nem a foto
      const o = await page.evaluate(ORDEM);
      ok(o.w && o.w.iF < o.w.iE, `${w} @${t} ms: a fita passa por cima do "W" do wordmark`);
      ok(o.a && o.a.iE < o.a.iF, `${w} @${t} ms: a foto A fica por cima da fita`);
    }
    if (t === 2600) {
      const d = diferenca(png, estatico);
      ok(d <= 0.005, `${w}: quadro final (2600 ms) igual ao estático aprovado (${(d * 100).toFixed(2)}% dos pixels diferem > 24/255)`);
    }
  }
  // contraste do texto do hero no estado final (texto sobre a ilha creme), depois de revelado
  await congelar(page, 2600);
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#hero", { imediato: true }));
  await page.waitForTimeout(1500);
  const c = await page.evaluate(() => {
    const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const fundo = lum(getComputedStyle(document.querySelector(".hero__ilha")).backgroundColor);
    return [...document.querySelectorAll(".hero__texto .sobre, .hero__titulo, .hero__corpo")].map((el) => {
      const f = lum(getComputedStyle(el).color); const op = parseFloat(getComputedStyle(el).opacity);
      return { el: el.className, razao: +((Math.max(f, fundo) + 0.05) / (Math.min(f, fundo) + 0.05)).toFixed(1), op };
    });
  });
  ok(c.every((x) => x.razao >= 4.5 && x.op === 1), `${w}: contraste do texto do hero no final ≥ 4,5:1 (${c.map((x) => x.razao).join(", ")})`);
  ok(!erros.length, `${w}: sem erros de console (${erros.join(" | ") || "nenhum"})`);
  await ctx.close();
}

// ── 2. navegação: pular pelo menu até a seção 04 e voltar rolando (tela onde o texto do hero começa abaixo da dobra) ──
{
  const { ctx, page, erros } = await abrir({ w: 1366, h: 768 });
  const pendentes = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(document.querySelectorAll(".hero .reveal-pendente").length)))));
  ok(pendentes > 0, `1366×768: texto do hero começa abaixo da dobra e fica pendente de revelação (${pendentes})`);
  await subirMotion(page);
  await page.click(".cabecalho__menu");
  await page.click('.menu a[href="#rodizio"]');
  await page.waitForTimeout(1800);
  ok(await page.evaluate(() => Math.abs(document.getElementById("rodizio").getBoundingClientRect().top) <= 2), "menu → seção 04 (rodízio)");
  await page.mouse.move(683, 400);
  for (let i = 0; i < 80 && (await page.evaluate(() => scrollY)) > 0; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(20); }
  await page.waitForTimeout(1600);
  const hero = await page.evaluate(() => ({
    topo: scrollY,
    pendentes: document.querySelectorAll(".hero [data-reveal]:not([data-revealed])").length,
    invisiveis: [...document.querySelectorAll(".hero [data-reveal], .hero__foto-img")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 1).length,
  }));
  ok(hero.topo === 0 && hero.pendentes === 0 && hero.invisiveis === 0, `volta rolando ao topo: hero completo, nada preso escondido (${JSON.stringify(hero)})`);
  ok(!erros.length, "navegação: sem erros de console");
  await ctx.close();
}

// ── 3. modos e qualidade ──
{
  // reduced: sem pouso, sem flutuação, entradas só com fade de 200 ms, sem parallax
  const { ctx, page, erros } = await abrir({ reduzido: true });
  const r = await page.evaluate(() => document.getAnimations().map((a) => `${a.animationName}:${a.effect.getComputedTiming().duration}`));
  ok(r.length && r.every((x) => /^entrada-fade:200$/.test(x)), `reduced: só fades de 200 ms (${r.join(", ")})`);
  const outros = await page.evaluate(() => document.getAnimations().filter((a) => /pouso|flutua|fita/.test(a.animationName)).length);
  ok(outros === 0, "reduced: sem pouso, sem flutuação e sem entrada da fita");
  await subirMotion(page);
  await page.evaluate(() => scrollTo(0, 300));
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".hero__foto--a")).transform === "none"), "reduced: sem parallax");
  ok(!erros.length, "reduced: sem erros de console");
  await ctx.close();
}
{
  // high: flutuação roda; pausa congela e retoma de onde parou; fora da tela, pausa
  const { ctx, page, erros } = await abrir();
  await subirMotion(page);
  await page.waitForTimeout(3500);
  const flutua = () => page.evaluate(() => document.querySelector(".flutua--a").getAnimations().filter((a) => a.animationName === "flutua-a").map((a) => ({ estado: a.playState, t: Math.round(a.currentTime) }))[0]);
  const f0 = await flutua();
  ok(f0?.estado === "running", `high: flutuação da foto A rodando (${JSON.stringify(f0)})`);
  ok(await page.evaluate(() => document.querySelector(".flutua--b").getAnimations().some((a) => a.animationName === "flutua-b")), "high: flutuação da foto B, com período e início diferentes (9 s, 3,6 s)");
  await page.click("[data-pause]");
  await page.waitForTimeout(50);
  const p1 = await flutua();
  await page.waitForTimeout(600);
  const p2 = await flutua();
  ok(p1.estado === "paused" && Math.abs(p2.t - p1.t) < 20, `pausa: a flutuação congela (${p1.t} → ${p2.t} ms)`);
  await page.click("[data-pause]");
  await page.waitForTimeout(300);
  const p3 = await flutua();
  ok(p3.estado === "running" && p3.t >= p2.t && p3.t - p2.t < 600, `retomar: continua de onde parou (${p2.t} → ${p3.t} ms)`);
  // parallax: repouso no topo; limitado a 24 px
  const y = () => page.evaluate(() => [".hero__foto--a", ".hero__foto--b"].map((s) => Math.round(new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m42 * 10) / 10));
  const y0 = await y();
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(400);
  const y1 = await y();
  ok(y0.every((v) => v === 0) && y1.every((v) => Math.abs(v) > 0 && Math.abs(v) <= 24), `parallax: 0 no topo (${y0}) e no máximo 24 px (${y1})`);
  // fora da tela: flutuação pausada (data-loop + IntersectionObserver)
  await page.evaluate(() => motion.scrollTo("#visite", { imediato: true }));
  await page.waitForTimeout(500);
  ok((await flutua()).estado === "paused", "foto A fora da tela: flutuação pausada");
  // botões: transição de 180 ms em cor/opacidade; o contorno de foco não entra na transição
  const tr = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".cabecalho__menu .pilula")); return { p: s.transitionProperty, d: s.transitionDuration }; });
  ok(/background-color/.test(tr.p) && !/outline|all/.test(tr.p) && tr.d.split(",").every((d) => d.trim() === "0.18s"), `botões: transição de 180 ms sem o contorno de foco (${tr.p} · ${tr.d})`);
  ok(!erros.length, `high: sem erros de console (${erros.join(" | ") || "nenhum"})`);
  await ctx.close();
}
{
  // low: pouso sim, flutuação não, parallax não
  const { ctx, page, erros } = await abrir({ quality: "low" });
  const nomes = await page.evaluate(() => document.getAnimations().map((a) => a.animationName));
  ok(nomes.includes("pouso") && !nomes.some((n) => /^flutua/.test(n)) && nomes.includes("fita-fade"), `low: pouso e fade da fita, sem flutuação (${[...new Set(nomes)].join(", ")})`);
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".hero__foto--a")).transform === "none"), "low: sem parallax");
  ok(!erros.length, "low: sem erros de console");
  await ctx.close();
}

// ── 4. vídeos do topo + hero (entrada e rolagem até o fim do hero) ──
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await abrir({ w, h, video: true });
  await page.waitForTimeout(3200);
  await subirMotion(page);
  await page.mouse.move(w / 2, h / 2);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 40); await page.waitForTimeout(30); }
  await page.waitForTimeout(2500);
  const v = page.video();
  await ctx.close();
  const destino = join(OUT, `topo-hero-${w}.webm`);
  await rm(destino, { force: true });
  await rename(await v.path(), destino);
  console.log(`  vídeo: ${destino}`);
}

await browser.close();
server.close();
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ todos os testes do topo + hero passaram");
process.exit(falhas ? 1 : 0);
