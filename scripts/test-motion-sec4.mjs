// Testes do motion da seção 04 — rodízio, shimeji, nota e CTA (DESIGN.md §9, D46–D47).
// Quadros contados a partir do DISPARO da coreografia (a seção entra quando é rolada até ela): a
// timeline global do GSAP é congelada antes do disparo e avançada até cada instante; as animações
// CSS (brilho, flutuação) ficam paradas. Servido por http (comparação com o site sem JS).
// Uso: npm run test:motion
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";
import pngjs from "pngjs";

const { PNG } = pngjs;
const ROOT = resolve("site");
const OUT = resolve("screenshots/motion");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
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

async function abrir({ w = 1440, h = 900, js = true, reduzido = false, quality = null, video = false } = {}) {
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
const png = (b) => PNG.sync.read(b);
const topoSecao = (page) => page.evaluate(() => Math.round(document.getElementById("rodizio").getBoundingClientRect().top + scrollY));

// pixels do "A" do wordmark escuro que ficam à mostra (compara a cena com e sem a fita)
async function letraAExposta(page, mapaArq = null) {
  const mapa = mapaArq ? [] : null;
  const box = await page.evaluate(() => {
    const n = document.querySelector(".grelhados__wordmark").firstChild;
    const rg = document.createRange(); rg.setStart(n, 1); rg.setEnd(n, 2);
    const r = rg.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, innerHeight - Math.max(0, r.y)) };
  });
  if (box.width < 2 || box.height < 2) return { exposta: 0, letra: 0 };
  // a fita é um <img> SVG com decoding="async" (D52): depois de o teste escondê-la e mostrá-la de novo no quadro
  // anterior, o navegador leva um instante para redesenhá-la. Espera ela estar pintada antes da captura.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(200);
  const cena = png(await page.screenshot({ clip: box }));
  await page.addStyleTag({ content: ".fita{opacity:0!important}" }); // opacity, não visibility: um <img> SVG escondido por visibility não é repintado ao voltar
  const semFita = png(await page.screenshot({ clip: box }));
  // a caixa do "A" também pega a chapa e a pedra: letra = pixels que mudam quando o wordmark aparece
  await page.addStyleTag({ content: ".grelhados__wordmark{visibility:hidden!important}" });
  const semNada = png(await page.screenshot({ clip: box }));
  await page.evaluate(() => { const ss = [...document.querySelectorAll("style")]; ss.at(-1).remove(); ss.at(-2).remove(); });
  // pixel "da letra" = creme do wordmark (#EDE7DB) na cena sem a fita; a caixa do "A" também pega
  // pedaços da chapa e da sombra, que não contam
  const creme = (d, i) => Math.abs(d[i] - 237) < 40 && Math.abs(d[i + 1] - 231) < 40 && Math.abs(d[i + 2] - 219) < 45 && d[i] - d[i + 2] < 45;
  let letra = 0, exposta = 0;
  for (let i = 0; i < cena.data.length; i += 4) {
    const daLetra = [0, 1, 2].some((k) => Math.abs(semFita.data[i + k] - semNada.data[i + k]) > 40);
    if (!daLetra || !creme(semFita.data, i)) continue;
    letra++;
    // com a fita no lugar, o pixel da letra tem que estar vermelho (coberto); se não está, aparece —
    // inclusive quando a sombra da fita o escurece (não é mais creme, mas a letra continua visível)
    // coberto = matiz da fita (vermelho, sombra avermelhada ou o filete rosado do reflexo: R bem acima
    // de G); exposto = neutro e mais claro que a pedra (a letra, mesmo escurecida pela sombra da fita)
    const d = cena.data, daFita = d[i] - d[i + 1] > 35;
    const claro = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] > 60;
    if (!daFita && claro) { exposta++; if (mapa) { mapa.push((i / 4)); } }
  }
  if (mapaArq && mapa.length) {
    const m = new PNG({ width: cena.width, height: cena.height });
    for (let i = 0; i < cena.data.length; i++) m.data[i] = cena.data[i];
    for (const p of mapa) { m.data[p * 4] = 0; m.data[p * 4 + 1] = 255; m.data[p * 4 + 2] = 0; }
    await writeFile(mapaArq, PNG.sync.write(m));
  }
  return { exposta, letra };
}

// ── 1. quadros da entrada (a partir do disparo), empilhamento, "A" coberto, final × estático ──
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const { ctx, page, erros } = await abrir({ w, h });
  await subirMotion(page);
  const y = await topoSecao(page);
  // congela o GSAP, rola até a seção (repouso do parallax: seção no topo) e dispara a coreografia
  const t0 = await page.evaluate(() => { gsap.globalTimeline.pause(); return gsap.globalTimeline.time(); });
  await page.evaluate((y) => motion.lenis ? motion.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y), y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const disparou = await page.evaluate(() => gsap.getTweensOf(document.querySelector(".rodizio__titulo")).length > 0);
  // já visível ao carregar (ex.: 768×1024, a seção começa em y 626): não há coreografia (D34), só o estado final
  const visivelAoCarregar = await page.evaluate(() => !document.querySelector(".rodizio__titulo").classList.contains("reveal-pendente") && document.querySelector(".rodizio__titulo").hasAttribute("data-revealed"));
  ok(disparou || visivelAoCarregar, `${w}: ${visivelAoCarregar ? "seção visível ao carregar: sem coreografia (D34)" : "a coreografia dispara ao chegar na seção"}`);
  for (const t of visivelAoCarregar ? [2600] : [0, 300, 900, 1500, 2600]) {
    await page.evaluate(({ t0, t }) => {
      gsap.globalTimeline.time(t0 + t / 1000);
      // entradas CSS (topo, fita) concluídas; loops (brilho, flutuações) parados no início
      document.getAnimations().forEach((a) => {
        if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
      });
    }, { t0, t });
    await page.waitForTimeout(80);
    if (w !== 768) await page.screenshot({ path: join(OUT, `sec4-${w}-${String(t).padStart(4, "0")}ms.png`) });
    const v = await page.evaluate(`(${VERIFICAR})()`);
    ok(!v.erros.length, `${w} @${t} ms: empilhamento da fita ok${v.erros.length ? " — " + v.erros.join("; ") : ""}`);
    const a = await letraAExposta(page, t === 2600 ? join(OUT, `sec4-${w}-letraA.png`) : null);
    ok(a.exposta <= 3, `${w} @${t} ms: "A" coberto pela fita (${a.exposta} de ${a.letra} pixels da letra à mostra)`);
  }
  if (w !== 768) {
    // contraste do texto sobre a pedra: sem brilho e no pico do brilho (0,22)
    const contraste = async () => page.evaluate(async () => {
      const lumRGB = (r, g, b) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      return [...document.querySelectorAll(".rodizio__titulo, .rodizio__corpo, .nota__total")].map((el) => {
        const [r, g, b] = getComputedStyle(el).color.match(/\d+/g).map(Number);
        const b0 = el.getBoundingClientRect();
        return { el: el.className.split(" ")[0], cor: lumRGB(r, g, b), box: { x: b0.x, y: b0.y, width: b0.width, height: b0.height } };
      });
    });
    const itens = await contraste();
    const medir = async (rotulo) => {
      await page.addStyleTag({ content: ".rodizio__texto *{color:transparent!important;transition:none!important}" });
      const res = [];
      for (const it of itens) {
        const img = png(await page.screenshot({ clip: it.box }));
        let pior = 0; // fundo mais claro atrás do texto (pior caso)
        for (let i = 0; i < img.data.length; i += 4) {
          const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
          pior = Math.max(pior, 0.2126 * r + 0.7152 * g + 0.0722 * b);
        }
        res.push({ el: it.el, razao: +((it.cor + 0.05) / (pior + 0.05)).toFixed(1) });
      }
      await page.evaluate(() => [...document.querySelectorAll("style")].at(-1).remove());
      ok(res.every((x) => x.razao >= 4.5), `${w}: contraste do texto ${rotulo} ≥ 4,5:1 (${res.map((x) => `${x.el} ${x.razao}`).join(", ")})`);
    };
    await medir("sem brilho");


    // estado final (2600 ms) × estático aprovado, na área da seção 03. O brilho de brasa não existe no
    // estático (é só do motion), então fica fora da comparação; a faixa de cima (onde a foto B do hero,
    // com parallax próprio, invade a seção) também.
    const clip = await page.evaluate(() => { const r = document.getElementById("rodizio").getBoundingClientRect(); return { x: 0, y: r.top + 40, width: innerWidth, height: Math.min(r.height, innerHeight - r.top) - 40 }; });
    const final = png(await page.screenshot({ clip }));
    const est = await abrir({ w, h, js: false });
    await est.page.evaluate((y) => scrollTo(0, y), y);
    await est.page.waitForTimeout(150);
    const estatico = png(await est.page.screenshot({ clip }));
    await est.ctx.close();
    // high: com loops no compositor, o Chrome (Windows/Linux) desenha o texto vizinho em tons de cinza em
    // vez de subpixel (D44). A comparação em high usa luminância com desfoque de 1 px — ignora o modo de
    // antialiasing e continua pegando qualquer deslocamento ou objeto fora do lugar. Em low: pixel a pixel.
    const alta = await page.evaluate(() => motion.quality === "high");
    const L = (img) => {
      const { width: W, height: H, data: d } = img, l = new Float32Array(W * H), o = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) l[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let sm = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) { sm += l[yy * W + xx]; n++; } }
        o[y * W + x] = sm / n;
      }
      return o;
    };
    const LF = alta ? L(final) : null, LE = alta ? L(estatico) : null;
    let n = 0;
    const mapa = new PNG({ width: final.width, height: final.height });
    for (let i = 0; i < final.data.length; i += 4) {
      const dif = alta ? Math.abs(LF[i / 4] - LE[i / 4]) > 24 : [0, 1, 2].some((k) => Math.abs(final.data[i + k] - estatico.data[i + k]) > 24);
      if (dif) n++;
      for (let k = 0; k < 3; k++) mapa.data[i + k] = dif ? [255, 0, 255][k] : final.data[i + k] * 0.35;
      mapa.data[i + 3] = 255;
    }
    // evidência para inspeção: estado final, estático e mapa das diferenças
    await writeFile(join(OUT, `sec4-${w}-final.png`), PNG.sync.write(final));
    await writeFile(join(OUT, `sec4-${w}-estatico.png`), PNG.sync.write(estatico));
    await writeFile(join(OUT, `sec4-${w}-diferenca.png`), PNG.sync.write(mapa));
    const rolagens = { motion: await page.evaluate(() => scrollY), estatico: y };
    const d = n / (final.width * final.height);
    ok(d <= 0.005, `${w}: quadro final da seção 04 igual ao estático aprovado (${(d * 100).toFixed(2)}% dos pixels > 24/255, ${alta ? "luminância, sem o modo de antialiasing" : "pixel a pixel"}; rolagem ${JSON.stringify(rolagens)})`);


  }
  ok(!erros.length, `${w}: sem erros de console (${erros.join(" | ") || "nenhum"})`);
  await ctx.close();
}

// ── 2. navegação: menu direto para a seção 04 e volta rolando (normal e rápido) ──
for (const rapido of [false, true]) {
  const { ctx, page, erros } = await abrir({ w: 1440, h: 900 });
  await subirMotion(page);
  await page.click(".cabecalho__menu");
  await page.click('.menu a[href="#visite"]');
  await page.waitForTimeout(1800);
  await page.mouse.move(720, 450);
  const passo = rapido ? -600 : -120, espera = rapido ? 8 : 25;
  const alvo = (await topoSecao(page)) - 200;
  for (let i = 0; i < 100 && (await page.evaluate(() => scrollY)) > alvo; i++) { await page.mouse.wheel(0, passo); await page.waitForTimeout(espera); }
  await page.waitForTimeout(2200);
  const s = await page.evaluate(() => ({
    pendentes: document.querySelectorAll(".rodizio [data-reveal]:not([data-revealed])").length,
    invisiveis: [...document.querySelectorAll(".rodizio [data-reveal], .rodizio__foto-img")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 1).length,
    deslocados: [...document.querySelectorAll(".rodizio [data-reveal]")].filter((e) => e.style.transform || e.style.translate).length,
  }));
  ok(!s.pendentes && !s.invisiveis && !s.deslocados, `menu → Visite e volta rolando ${rapido ? "rápido" : "normal"}: seção 04 completa (${JSON.stringify(s)})`);
  ok(!erros.length, `navegação ${rapido ? "rápida" : "normal"}: sem erros de console`);
  await ctx.close();
}

// ── 3. modos e qualidade ──
{
  const { ctx, page, erros } = await abrir({ reduzido: true });
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#rodizio", { imediato: true }));
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    loops: document.getAnimations().filter((a) => /flutua/.test(a.animationName)).length,
    parallax: getComputedStyle(document.querySelector(".rodizio__foto")).transform,
    completos: [...document.querySelectorAll(".rodizio [data-reveal]")].every((e) => e.hasAttribute("data-revealed") && getComputedStyle(e).transform === "none"),
  }));
  ok(r.loops === 0 && r.parallax === "none" && r.completos, `reduced: sem loops, sem parallax, entrada só com fade (${JSON.stringify(r)})`);
  ok(!erros.length, "reduced: sem erros de console");
  await ctx.close();
}
{
  const { ctx, page, erros } = await abrir();
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#rodizio", { imediato: true }));
  await page.waitForTimeout(3600);
  const loops = () => page.evaluate(() => Object.fromEntries(document.getAnimations().filter((a) => /flutua-d/.test(a.animationName)).map((a) => [a.animationName, { estado: a.playState, t: Math.round(a.currentTime) }])));
  const l0 = await loops();
  ok(l0["flutua-d"]?.estado === "running", `high: flutuação do shimeji ativa depois do pouso (${JSON.stringify(l0)})`);
  await page.evaluate(() => document.querySelector("[data-pause]").click());
  await page.waitForTimeout(50);
  const p1 = await loops(); await page.waitForTimeout(600); const p2 = await loops();
  ok(p1["flutua-d"].estado === "paused" && p1["flutua-d"].t === p2["flutua-d"].t, "pausa: flutuação do shimeji congelada");
  await page.evaluate(() => document.querySelector("[data-pause]").click());
  await page.waitForTimeout(300);
  const p3 = await loops();
  ok(p3["flutua-d"].estado === "running" && p3["flutua-d"].t >= p2["flutua-d"].t && p3["flutua-d"].t - p2["flutua-d"].t < 600, `retomar: continua de onde parou (${p2["flutua-d"].t} → ${p3["flutua-d"].t} ms)`);
  // parallax: 0 com a seção no topo; no máximo 24 px; a chapa não invade a coluna de texto
  const par = async () => page.evaluate(() => {
    const f = document.querySelector(".rodizio__foto"); const t = document.querySelector(".rodizio__texto");
    const img = f.querySelector("img").getBoundingClientRect(), tx = t.getBoundingClientRect();
    return { y: Math.round(new DOMMatrix(getComputedStyle(f).transform).m42 * 10) / 10, sobrepoe: img.left < tx.right - 4 && img.bottom > tx.top && img.top < tx.bottom };
  });
  const a0 = await par();
  await page.evaluate(() => motion.scrollTo("#visite", { imediato: true }));
  await page.waitForTimeout(400);
  const a1 = await par();
  ok(a0.y === 0 && Math.abs(a1.y) > 0 && Math.abs(a1.y) <= 24 && !a0.sobrepoe, `parallax do shimeji: 0 no repouso (${a0.y}), no máximo 24 px (${a1.y}), sem invadir o texto`);
  await page.evaluate(() => motion.scrollTo("#hero", { imediato: true }));
  await page.waitForTimeout(500);
  ok(!(await loops())["flutua-d"], "seção fora da tela: flutuação do shimeji removida (sem camada presa no compositor)");
  ok(!erros.length, "high: sem erros de console");
  await ctx.close();
}
{
  const { ctx, page, erros } = await abrir({ quality: "low" });
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#rodizio", { imediato: true }));
  await page.waitForTimeout(3600);
  const r = await page.evaluate(() => ({
    loops: document.getAnimations().filter((a) => /flutua/.test(a.animationName)).length,
    parallax: getComputedStyle(document.querySelector(".rodizio__foto")).transform,
  }));
  ok(r.loops === 0 && r.parallax === "none", `low: sem flutuação, sem parallax (${JSON.stringify(r)})`);
  ok(!erros.length, "low: sem erros de console");
  await ctx.close();
}

// ── 4. CTA sobre a divisa pedra/creme e ponta da fita ──
{
  const { ctx, page, erros } = await abrir();
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#visite", { imediato: true }));
  await page.waitForTimeout(600);
  const lumRGB = (rgb) => rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const razao = (a, b) => +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(1);
  const hex = (h) => { h = h.trim(); return `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`; };
  const cores = async () => page.evaluate(() => { const c = getComputedStyle(document.querySelector(".visite__cta")); const r = getComputedStyle(document.documentElement); return { texto: c.color, fundo: c.backgroundColor, borda: c.borderTopColor, pedra: r.getPropertyValue("--pedra"), creme: r.getPropertyValue("--creme") }; });
  const c0 = await cores();
  const repouso = { texto: razao(lumRGB(c0.texto), lumRGB(c0.fundo)), pilulaNaPedra: razao(lumRGB(c0.fundo), lumRGB(hex(c0.pedra))), bordaNoCreme: razao(lumRGB(c0.borda), lumRGB(hex(c0.creme))) };
  ok(repouso.texto >= 4.5 && repouso.pilulaNaPedra >= 3 && repouso.bordaNoCreme >= 3, `CTA em repouso: texto ${repouso.texto}:1 sobre a pílula; pílula ${repouso.pilulaNaPedra}:1 contra a pedra; borda ${repouso.bordaNoCreme}:1 contra o creme`);
  await page.hover(".visite__cta");
  await page.waitForTimeout(300);
  const c1 = await cores();
  const hover = { texto: razao(lumRGB(c1.texto), lumRGB(c1.fundo)), pilulaNoCreme: razao(lumRGB(c1.fundo), lumRGB(hex(c1.creme))), pilulaNaPedra: razao(lumRGB(c1.fundo), lumRGB(hex(c1.pedra))) };
  ok(hover.texto >= 4.5 && hover.pilulaNoCreme >= 3 && hover.pilulaNaPedra >= 1.8, `CTA no hover: texto ${hover.texto}:1; pílula ${hover.pilulaNoCreme}:1 contra o creme e ${hover.pilulaNaPedra}:1 contra a pedra (continua visível nos dois)`);
  const tr = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".visite__cta")); return { p: s.transitionProperty, d: s.transitionDuration }; });
  ok(/background-color/.test(tr.p) && !/outline|all/.test(tr.p) && tr.d.split(",").every((d) => d.trim() === "0.18s"), `CTA: transição de 180 ms em cor, sem o contorno de foco (${tr.p} · ${tr.d})`);
  await page.mouse.move(5, 5);
  await page.keyboard.press("Tab");
  await page.focus(".visite__cta");
  const foco = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".visite__cta")); return `${s.outlineStyle} ${s.outlineWidth}`; });
  ok(/solid/.test(foco), `CTA com foco: contorno visível na hora (${foco})`);
  const fita = await page.evaluate(() => document.querySelector("[data-fita]").getAnimations().filter((a) => a.playState === "running").length);
  ok(fita === 0, "ponta da fita: nenhuma animação (a fita não se move)");
  ok(!erros.length, "CTA: sem erros de console");
  await ctx.close();
}

// ── 5. vídeos da seção 04 ──
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await abrir({ w, h, video: true });
  await subirMotion(page);
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(400);
  await page.mouse.move(w / 2, h / 2);
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 50); await page.waitForTimeout(30); }
  await page.waitForTimeout(6000);
  const v = page.video();
  await ctx.close();
  const destino = join(OUT, `secao4-${w}.webm`);
  await rm(destino, { force: true });
  await rename(await v.path(), destino);
  console.log(`  vídeo: ${destino}`);
}

await browser.close();
server.close();
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ todos os testes da seção 04 passaram");
process.exit(falhas ? 1 : 0);
