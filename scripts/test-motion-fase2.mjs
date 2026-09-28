// Testes da fase 2 de motion: Visite, rodapé, menu, pausa global e coerência (DESIGN.md §9, D48–D50).
// Uso: npm run test:motion   ·   node scripts/test-motion-fase2.mjs --loops  (só a contagem de loops)
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

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

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) falhas++; };
const browser = await chromium.launch();
const SO_LOOPS = process.argv.includes("--loops");

async function abrir({ w = 1440, h = 900, js = true, reduzido = false, quality = null, hash = "", video = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, javaScriptEnabled: js, reducedMotion: reduzido ? "reduce" : "no-preference",
    ...(video && { recordVideo: { dir: OUT, size: { width: w, height: h } } }),
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("request", (r) => /\/design\//.test(r.url()) && erros.push(`pedido a /design: ${r.url()}`));
  await page.goto(URL_SITE + (quality ? `?quality=${quality}` : "") + hash, { waitUntil: "load" });
  if (js) await page.evaluate(() => document.fonts.ready);
  return { ctx, page, erros };
}
const subirMotion = async (page) => {
  await page.keyboard.press("Shift");
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 12000 });
};
const rolarAte = async (page, alvoY, passo = 120, espera = 20) => {
  await page.mouse.move(400, 400);
  for (let i = 0; i < 300; i++) {
    const y = await page.evaluate(() => scrollY);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (Math.abs(y - Math.min(alvoY, max)) < 8) break;
    await page.mouse.wheel(0, alvoY > y ? passo : -passo);
    await page.waitForTimeout(espera);
  }
  await page.waitForTimeout(1200);
};

// ── contagem de loops simultâneos por posição de rolagem (passos de 25% da tela) ──
async function contarLoops(w, h, quality) {
  const { ctx, page } = await abrir({ w, h, quality });
  await subirMotion(page);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const linhas = [];
  let pico = 0;
  for (let y = 0; y <= max + 1; y += Math.round(h * 0.25)) {
    await page.evaluate((y) => (window.motion?.lenis ? motion.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y)), Math.min(y, max));
    await page.waitForTimeout(3300); // entradas concluídas; loops com atraso (3 s / 1,5 s) já rodando
    const r = await page.evaluate(() => {
      const css = document.getAnimations().filter((a) => a.playState === "running" && a.effect.getComputedTiming().iterations === Infinity);
      const gs = gsap.globalTimeline.getChildren(true, true, false).filter((t) => t.isActive() && t.repeat() === -1);
      return { n: css.length + gs.length, nomes: [...css.map((a) => a.animationName), ...gs.map(() => "gsap")] };
    });
    pico = Math.max(pico, r.n);
    linhas.push(`${String(Math.min(y, max)).padStart(5)} px: ${r.n} ${r.nomes.length ? "(" + r.nomes.join(", ") + ")" : ""}`);
  }
  await ctx.close();
  return { pico, linhas };
}
const ORCAMENTO = 3; // D50: no máximo 3 loops ao mesmo tempo
for (const [w, h, q] of [[1440, 900, "high"], [390, 844, "high"], [390, 844, null]]) {
  const { pico, linhas } = await contarLoops(w, h, q);
  console.log(`  loops simultâneos em ${w}×${h} (${q ?? "qualidade automática"}):\n    ${linhas.join("\n    ")}`);
  ok(pico <= ORCAMENTO, `${w} (${q ?? "auto"}): no máximo ${ORCAMENTO} loops ao mesmo tempo (pico ${pico})`);
}
if (SO_LOOPS) { await browser.close(); server.close(); process.exit(falhas ? 1 : 0); }

// ── 1. Visite: título + 3 colunas em grupo; links com sublinhado que cresce ──
{
  const { ctx, page, erros } = await abrir();
  const pend = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(document.querySelectorAll(".visite .reveal-pendente").length)))));
  ok(pend === 4, `Visite: título e 3 colunas pendentes ao carregar (abaixo da dobra): ${pend}`);
  await subirMotion(page);
  const t0 = await page.evaluate(() => { gsap.globalTimeline.pause(); return gsap.globalTimeline.time(); });
  const y = await page.evaluate(() => Math.round(document.getElementById("visite").getBoundingClientRect().top + scrollY));
  await page.evaluate((y) => motion.lenis.scrollTo(y, { immediate: true, force: true }), y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const atrasos = await page.evaluate(() => [".visite__titulo", ...[1, 2, 3].map((i) => `.visite__bloco:nth-of-type(${i})`)].map((s) => Math.round((gsap.getTweensOf(document.querySelector(s))[0]?.delay() ?? -1) * 1000)));
  ok(JSON.stringify(atrasos) === "[0,100,200,300]", `Visite: disparam juntos, 100 ms entre as colunas (${atrasos.join(", ")} ms)`);
  await page.evaluate((t0) => gsap.globalTimeline.time(t0 + 2), t0);
  await page.evaluate(() => gsap.globalTimeline.resume());
  await page.waitForTimeout(300);
  const fim = await page.evaluate(() => [...document.querySelectorAll(".visite [data-reveal]")].every((e) => e.hasAttribute("data-revealed") && getComputedStyle(e).opacity === "1" && !e.getAttribute("style")));
  ok(fim, "Visite: todos revelados, sem estilo inline sobrando");
  // sublinhado: barra em laca cresce no hover (dispositivo com hover)
  const escala = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector(".visite__link"), "::after").transform).a);
  const e0 = await escala();
  await page.hover(".visite__link");
  await page.waitForTimeout(300);
  const e1 = await escala();
  ok(e0 === 0 && e1 === 1, `links: sublinhado cresce no hover (scaleX ${e0} → ${e1})`);
  await page.mouse.move(5, 5);
  await page.focus(".visite__link");
  await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); // foco por teclado
  const foco = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
  ok(/solid/.test(foco), `links: foco por teclado com o contorno de sempre (${foco})`);
  ok(!erros.length, `Visite: sem erros de console (${erros.join(" | ") || "nenhum"})`);
  await ctx.close();
}
{
  // sem hover (toque): nada de barra animada
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(URL_SITE);
  const tem = await page.evaluate(() => getComputedStyle(document.querySelector(".visite__link"), "::after").content);
  ok(tem === "none" || tem === "normal", `toque (sem hover): o sublinhado animado não existe (${tem})`);
  await ctx.close();
}

// ── 2. rodapé: nunca escondido ──
for (const [nome, prep] of [
  ["rolando até o fim", async (p) => { await subirMotion(p); await rolarAte(p, 1e6, 200, 16); }],
  ["tecla End", async (p) => { await subirMotion(p); await p.keyboard.press("End"); await p.waitForTimeout(2500); }],
  ["navegação direta (#visite)", null],
]) {
  const { ctx, page, erros } = await abrir(nome.startsWith("navegação") ? { hash: "#visite" } : {});
  if (prep) await prep(page); else await page.waitForTimeout(4500);
  const r = await page.evaluate(() => { const e = document.querySelector(".rodape__conteudo"); return { op: getComputedStyle(e).opacity, rev: e.hasAttribute("data-revealed") || !e.classList.contains("reveal-pendente") }; });
  ok(r.op === "1" && r.rev, `rodapé visível — ${nome} (${JSON.stringify(r)})`);
  ok(!erros.length, `rodapé (${nome}): sem erros de console`);
  await ctx.close();
}

// ── 3. menu ──
{
  const { ctx, page, erros } = await abrir();
  await subirMotion(page);
  const estado = () => page.evaluate(() => ({
    aberto: window.kawageMenu.aberto, hidden: document.getElementById("menu").hidden,
    trava: document.documentElement.classList.contains("menu-aberto"),
    expandido: document.querySelector(".cabecalho__menu").getAttribute("aria-expanded"),
    op: getComputedStyle(document.getElementById("menu")).opacity,
    foco: document.activeElement?.className || document.activeElement?.tagName,
    lenisParado: motion.lenis ? motion.lenis.isStopped : null,
  }));
  await page.click(".cabecalho__menu");
  const e0 = await estado();
  ok(e0.aberto && !e0.hidden && e0.trava && e0.expandido === "true" && /menu__fechar/.test(e0.foco) && e0.lenisParado === true,
    `menu abre: aria-expanded, rolagem travada, Lenis parado, foco no "Fechar" (${JSON.stringify(e0)})`);
  const trans = await page.evaluate(() => ({
    overlay: getComputedStyle(document.getElementById("menu")).transitionDuration,
    atrasos: [...document.querySelectorAll(".menu__lista li")].map((li) => getComputedStyle(li).transitionDelay.split(",")[0].trim()),
  }));
  ok(trans.overlay === "0.32s" && JSON.stringify(trans.atrasos) === '["0s","0.06s","0.12s","0.18s"]', `menu: fade de 320 ms e itens a cada 60 ms (${JSON.stringify(trans)})`);
  // foco preso
  const dentro = [];
  for (let i = 0; i < 7; i++) { await page.keyboard.press("Tab"); dentro.push(await page.evaluate(() => !!document.activeElement.closest("#menu"))); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); dentro.push(await page.evaluate(() => !!document.activeElement.closest("#menu"))); }
  ok(dentro.every(Boolean), "menu: Tab e Shift+Tab ficam dentro do overlay");
  // rolagem travada
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 450); await page.mouse.wheel(0, 600); await page.waitForTimeout(500);
  ok((await page.evaluate(() => scrollY)) === y0, "menu aberto: a página não rola");
  // Esc fecha e devolve o foco
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const e1 = await estado();
  ok(!e1.aberto && e1.hidden && !e1.trava && e1.expandido === "false" && /cabecalho__menu/.test(e1.foco) && e1.lenisParado === false,
    `Esc fecha: overlay escondido, rolagem destravada, foco de volta no MENU (${JSON.stringify(e1)})`);
  const trFecha = await page.evaluate(() => getComputedStyle(document.getElementById("menu")).transitionDuration);
  ok(trFecha === "0.2s", `menu: fecha em 200 ms (${trFecha})`);
  await page.mouse.wheel(0, 600); await page.waitForTimeout(700);
  ok((await page.evaluate(() => scrollY)) > y0, "menu fechado: a página volta a rolar");
  // utilizável no 1º quadro: clique num item logo depois de abrir, sem esperar a transição
  await page.evaluate(() => motion.scrollTo("#hero", { imediato: true }));
  await page.click(".cabecalho__menu", { force: true });
  await page.click('.menu__lista a[href="#rodizio"]', { noWaitAfter: true, timeout: 200 });
  await page.waitForTimeout(1800);
  const nav = await page.evaluate(() => ({ topo: Math.round(document.getElementById("rodizio").getBoundingClientRect().top), hash: location.hash, aberto: window.kawageMenu.aberto, trava: document.documentElement.classList.contains("menu-aberto") }));
  ok(Math.abs(nav.topo) <= 2 && nav.hash === "#rodizio" && !nav.aberto && !nav.trava, `item clicado no 1º quadro: navega e fecha o menu (${JSON.stringify(nav)})`);
  // 20 aberturas/fechamentos seguidos, sem esperar
  for (let i = 0; i < 20; i++) await page.evaluate((i) => (i % 2 ? window.kawageMenu.fechar() : window.kawageMenu.abrir()), i);
  await page.waitForTimeout(400);
  const e2 = await estado();
  ok(!e2.aberto && e2.hidden && !e2.trava && e2.expandido === "false" && e2.op === "0" && e2.lenisParado === false, `20 aberturas/fechamentos seguidos: estado final fechado e coerente (${JSON.stringify(e2)})`);
  for (let i = 0; i < 21; i++) { await page.keyboard.press(i % 2 ? "Escape" : "Enter"); if (i === 0) await page.focus(".cabecalho__menu"); }
  await page.waitForTimeout(500);
  const e3 = await estado();
  ok(e3.aberto && !e3.hidden && e3.trava && e3.op === "1", `21 alternâncias por teclado: termina aberto e coerente (${JSON.stringify(e3)})`);
  await page.keyboard.press("Escape");
  ok(!erros.length, `menu: sem erros de console (${erros.join(" | ") || "nenhum"})`);
  await ctx.close();
}
{
  // sem JS: o MENU é um link âncora e o overlay abre por :target
  const { ctx, page } = await abrir({ js: false });
  await page.click(".cabecalho__menu");
  await page.waitForTimeout(200);
  const aberto = await page.evaluate(() => ({ hash: location.hash, visivel: getComputedStyle(document.getElementById("menu")).display !== "none" }));
  await page.click('.menu__lista a[href="#grelhados"]');
  await page.waitForTimeout(1500); // a âncora nativa rola suave (scroll-behavior do reset.css)
  const depois = await page.evaluate(() => ({ hash: location.hash, visivel: getComputedStyle(document.getElementById("menu")).display !== "none", topo: Math.round(document.getElementById("grelhados").getBoundingClientRect().top) }));
  ok(aberto.hash === "#menu" && aberto.visivel && depois.hash === "#grelhados" && !depois.visivel && Math.abs(depois.topo) <= 2, `sem JS: MENU abre o overlay por âncora e o item leva à seção (${JSON.stringify({ aberto, depois })})`);
  await ctx.close();
}
{
  const { ctx, page } = await abrir({ reduzido: true });
  await page.click(".cabecalho__menu");
  const r = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById("menu")).transitionDuration, li: getComputedStyle(document.querySelector(".menu__lista li")).translate }));
  ok(r.d === "0.2s" && (r.li === "none" || r.li === "0px"), `reduced: menu só com fade de 200 ms, sem deslocamento (${JSON.stringify(r)})`);
  await ctx.close();
}

// ── 4. pausa: nada roda em nenhuma seção (CSS e GSAP) ──
{
  const { ctx, page, erros } = await abrir();
  await subirMotion(page);
  const rodando = () => page.evaluate(() => ({
    css: document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.transitionProperty),
    gsap: !gsap.globalTimeline.paused() && gsap.globalTimeline.getChildren(true, true, false).some((t) => t.isActive()),
  }));
  const r = [];
  for (const alvo of ["#hero", "#grelhados", "#rodizio", "#visite"]) {
    await page.evaluate((a) => motion.scrollTo(a, { imediato: true }), alvo);
    await page.waitForTimeout(3300);
    if (alvo === "#hero") { await page.evaluate(() => document.querySelector("[data-pause]").click()); await page.waitForTimeout(100); }
    const x = await rodando();
    r.push(`${alvo}: ${x.css.length} CSS, GSAP ${x.gsap ? "ativo" : "parado"}`);
    ok(!x.css.length && !x.gsap, `pausa ativa em ${alvo}: nenhuma animação rodando (${x.css.join(", ") || "nenhuma"})`);
  }
  const b = await page.evaluate(() => { const e = document.querySelector("[data-pause]"); return { pressed: e.getAttribute("aria-pressed"), label: e.getAttribute("aria-label"), play: getComputedStyle(e.querySelector(".icone-play")).display, pausa: getComputedStyle(e.querySelector(".icone-pausa")).display }; });
  ok(b.pressed === "true" && b.label === "Retomar animações" && b.play !== "none" && b.pausa === "none", `botão de pausa ativo: ícone ▶ e rótulo "Retomar animações" (${JSON.stringify(b)})`);
  ok(!erros.length, "pausa: sem erros de console");
  await ctx.close();
}

// ── 5. nada "esquecido" no estilo final (depois de percorrer a página inteira e parar) ──
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await abrir({ w, h });
  await subirMotion(page);
  await rolarAte(page, 1e6, 150, 16);
  await rolarAte(page, 0, 300, 16);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const comEstilo = [...document.querySelectorAll("body [style]")].filter((e) => !e.closest("svg"));
    return {
      willChange: comEstilo.filter((e) => e.style.willChange).map((e) => e.className),
      filter: comEstilo.filter((e) => e.style.filter).map((e) => e.className),
      transformForaDoParallax: comEstilo.filter((e) => (e.style.transform || e.style.translate || e.style.rotate) && !e.hasAttribute("data-parallax")).map((e) => e.className),
      htmlLenis: document.documentElement.getAttribute("style"),
    };
  });
  ok(!r.willChange.length && !r.filter.length && !r.transformForaDoParallax.length, `${w}: nada esquecido no estilo final (${JSON.stringify(r)})`);
  await ctx.close();
}

// ── 6. vídeos da página inteira ──
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await abrir({ w, h, video: true });
  await page.waitForTimeout(3000);
  await subirMotion(page);
  await rolarAte(page, 1e6, 60, 30);
  await page.waitForTimeout(2000);
  const v = page.video();
  await ctx.close();
  const destino = join(OUT, `pagina-inteira-${w}.webm`);
  await rm(destino, { force: true });
  await rename(await v.path(), destino);
  console.log(`  vídeo: ${destino}`);
}

await browser.close();
server.close();
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ todos os testes da fase 2 passaram");
process.exit(falhas ? 1 : 0);
