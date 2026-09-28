// Testes da base de motion (DESIGN.md §9). Roda por file://, como o site abre com duplo clique.
// Uso: npm run test:motion
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const URL_SITE = pathToFileURL(resolve("site/index.html")).href;
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) falhas++; };

const browser = await chromium.launch();

async function abrir({ reduzido = false, quality = null, largura = 1440, injetar = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: reduzido ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const log = { erros: [], pedidos: [], design: [] };
  page.on("console", (m) => m.type() === "error" && log.erros.push(m.text()));
  page.on("pageerror", (e) => log.erros.push(e.message));
  page.on("request", (r) => { log.pedidos.push({ url: r.url(), t: Date.now() }); if (/\/design\//.test(r.url())) log.design.push(r.url()); });
  if (injetar) {
    // os utilitários ainda não são usados por nenhuma seção: o teste marca elementos abaixo da 1ª tela
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
      // como o script do fim do <body> faria: pendente só o que está abaixo da dobra
      document.querySelectorAll(".visite__bloco").forEach((el) => {
        el.setAttribute("data-reveal", "up");
        if (document.documentElement.classList.contains("js-motion") && el.getBoundingClientRect().top >= innerHeight) el.classList.add("reveal-pendente");
      });
      document.querySelector(".rodizio__foto").setAttribute("data-parallax", "0.1");
    }));
  }
  let tLoad = 0;
  page.on("load", () => { tLoad = Date.now(); });
  await page.goto(URL_SITE + (quality ? `?quality=${quality}` : ""), { waitUntil: "load" });
  return { ctx, page, log, tLoad: () => tLoad };
}
// um gesto que não clica em nada (dispara o carregador do <head>) e espera o núcleo subir
async function subirMotion(page) {
  await page.keyboard.press("Shift");
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 12000 });
}
const estado = (page) => page.evaluate(() => ({
  modo: motion.mode, base: motion.base, quality: motion.quality, lenis: !!motion.lenis,
  jsMotion: document.documentElement.classList.contains("js-motion"),
  pausaVisivel: !document.querySelector("[data-pause]").hidden,
  timelinePausada: gsap.globalTimeline.paused(),
}));

// ── 1. carregamento: nada de motion antes do load; sobe no 1º gesto ──
{
  const { ctx, page, log, tLoad } = await abrir();
  await page.waitForTimeout(300);
  const antes = log.pedidos.filter((p) => /js\/(vendor|motion)\//.test(p.url));
  ok(antes.length === 0, "nenhum script de motion pedido antes do 1º gesto (e antes de 2,5 s)");
  ok(await page.evaluate(() => document.documentElement.classList.contains("js-motion")), "html.js-motion posta antes da pintura (modo full)");
  ok(await page.evaluate(() => document.documentElement.dataset.quality === "high"), "qualidade high em 1440 px (8+ núcleos no teste)");
  await subirMotion(page);
  const motionPedidos = log.pedidos.filter((p) => /js\/(vendor|motion)\//.test(p.url));
  ok(motionPedidos.length === 4 && motionPedidos.every((p) => p.t >= tLoad()), "gsap, ScrollTrigger, Lenis e core.js pedidos só depois do load");
  const e = await estado(page);
  ok(e.modo === "full" && e.base === "full" && e.lenis && e.jsMotion, `modo full: Lenis ligado, js-motion (${JSON.stringify(e)})`);
  ok(e.pausaVisivel, "botão de pausa aparece quando o motion sobe");

  // ── 2. pausa ──
  await page.click("[data-pause]");
  let p = await estado(page);
  const aria = await page.getAttribute("[data-pause]", "aria-pressed");
  const rotulo = await page.getAttribute("[data-pause]", "aria-label");
  ok(p.modo === "paused" && p.timelinePausada && !p.lenis && aria === "true" && rotulo === "Retomar animações",
    `pausa: timeline global congelada, Lenis desligado, aria-pressed=true (${JSON.stringify(p)})`);
  ok(await page.evaluate(() => document.documentElement.dataset.motion === "paused"), "pausa: html[data-motion=paused]");
  await page.click("[data-pause]");
  p = await estado(page);
  ok(p.modo === "full" && !p.timelinePausada && p.lenis, "retomar: volta ao full com Lenis");

  // ── 3. aba oculta ──
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  ok(await page.evaluate(() => document.documentElement.hasAttribute("data-page-hidden") && gsap.globalTimeline.paused()), "aba oculta: data-page-hidden e timeline pausada");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  ok(await page.evaluate(() => !document.documentElement.hasAttribute("data-page-hidden") && !gsap.globalTimeline.paused()), "aba visível de novo: retoma");

  // ── 4. âncoras do menu com Lenis ──
  await page.click(".cabecalho__menu");
  await page.click('.menu a[href="#visite"]');
  await page.waitForFunction(() => !motion.lenis?.isScrolling, null, { timeout: 5000 });
  await page.waitForTimeout(1400);
  // a Visite + rodapé são mais baixos que a tela: o destino é o topo da seção ou o fim da página
  const alvo = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const topoAbs = document.getElementById("visite").getBoundingClientRect().top + scrollY;
    return { scroll: Math.round(scrollY), esperado: Math.round(Math.min(topoAbs, max)), hash: location.hash };
  });
  ok(Math.abs(alvo.scroll - alvo.esperado) <= 2 && alvo.hash === "#visite", `link do menu rola até #visite com Lenis (scroll ${alvo.scroll}, esperado ${alvo.esperado}, ${alvo.hash})`);

  ok(log.erros.length === 0, `sem erros de console (${log.erros.join(" | ") || "nenhum"})`);
  ok(log.design.length === 0, "nenhum pedido a /design");
  await ctx.close();
}

// ── 5. reduced ──
{
  const { ctx, page, log } = await abrir({ reduzido: true, injetar: true });
  ok(await page.evaluate(() => !document.documentElement.classList.contains("js-motion")), "reduced: sem js-motion (nada escondido antes da pintura)");
  await subirMotion(page);
  const e = await estado(page);
  ok(e.modo === "reduced" && !e.lenis, `reduced: sem Lenis (${JSON.stringify(e)})`);
  // revelação em reduced: só fade, sem transform
  await page.evaluate(() => document.getElementById("visite").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => [...document.querySelectorAll(".visite__bloco")].map((el) => ({ rev: el.hasAttribute("data-revealed"), op: getComputedStyle(el).opacity, tr: getComputedStyle(el).transform })));
  ok(r.every((x) => x.rev && x.op === "1" && x.tr === "none"), `reduced: data-reveal termina visível, sem transform (${JSON.stringify(r[0])})`);
  const par = await page.evaluate(() => getComputedStyle(document.querySelector(".rodizio__foto")).transform);
  ok(par === "none", "reduced: parallax desligado");
  ok(log.erros.length === 0, "reduced: sem erros de console");
  await ctx.close();
}

// ── 6. utilitários no modo full: data-reveal e data-parallax ──
{
  const { ctx, page, log } = await abrir({ injetar: true });
  const antes = await page.evaluate(() => getComputedStyle(document.querySelector(".visite__bloco")).opacity);
  ok(antes === "0", "full: data-reveal abaixo da tela começa escondido (sob js-motion)");
  await subirMotion(page);
  // parallax: o transform muda com a rolagem e é zero com a seção alinhada ao topo
  const y = async () => page.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector(".rodizio__foto")).transform); return Math.round(m.m42 * 10) / 10; });
  await page.evaluate(() => motion.scrollTo("#rodizio", { imediato: true }));
  await page.waitForTimeout(400);
  const noRepouso = await y();
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(400);
  const acima = await y();
  ok(Math.abs(noRepouso) <= 1 && Math.abs(acima) > 5, `full: parallax 0 com a seção no topo (${noRepouso}px) e ativo fora dele (${acima}px)`);
  await page.evaluate(() => motion.scrollTo("#visite", { imediato: true }));
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => [...document.querySelectorAll(".visite__bloco")].map((el) => ({ rev: el.hasAttribute("data-revealed"), op: getComputedStyle(el).opacity, style: el.getAttribute("style") })));
  ok(r.every((x) => x.rev && x.op === "1" && !x.style), `full: data-reveal revela e limpa o estilo inline (${JSON.stringify(r[0])})`);
  // pausa: parallax sem transform nenhum
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.click("[data-pause]");
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".rodizio__foto")).transform === "none"), "pausa: parallax volta ao estático (sem transform)");
  ok(log.erros.length === 0, "full + utilitários: sem erros de console");
  await ctx.close();
}

// ── 7. qualidade low: pedra com 4 oitavas, parallax desligado ──
{
  const { ctx, page, log } = await abrir({ quality: "low", injetar: true });
  const pedra = await page.evaluate(() => getComputedStyle(document.querySelector(".pedra")).getPropertyValue("--pedra-textura"));
  ok(/numOctaves='4'/.test(pedra) && !/numOctaves='7'/.test(pedra), "low: a pedra usa 4 oitavas desde a 1ª pintura");
  await subirMotion(page);
  ok((await estado(page)).quality === "low", "low: motion.quality = low");
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector(".rodizio__foto")).transform === "none"), "low: parallax desligado");
  ok(log.erros.length === 0, "low: sem erros de console");
  await ctx.close();
}

// ── 8. celular: qualidade low automática (tela < 768) ──
{
  const { ctx, page } = await abrir({ largura: 390 });
  ok(await page.evaluate(() => document.documentElement.dataset.quality === "low"), "390 px: qualidade low automática");
  await ctx.close();
}

// ── 9. sem JavaScript: tudo aparece, fita incluída ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(URL_SITE);
  const r = await page.evaluate(() => ({
    jsMotion: document.documentElement.classList.contains("js-motion"),
    fita: getComputedStyle(document.querySelector(".fita__largo")).display !== "none",
    pausa: document.querySelector("[data-pause]").hidden,
    invisiveis: [...document.querySelectorAll("h1, h2, p, img, address, li")].filter((el) => getComputedStyle(el).opacity === "0").length,
  }));
  ok(!r.jsMotion && r.fita && r.pausa && r.invisiveis === 0, `sem JS: nada escondido, fita visível, botão de pausa oculto (${JSON.stringify(r)})`);
  await ctx.close();
}

await browser.close();
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ todos os testes de motion passaram");
process.exit(falhas ? 1 : 0);
