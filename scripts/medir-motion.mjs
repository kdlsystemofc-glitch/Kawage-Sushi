// Custo do motion (laboratório: Chromium headless, não aparelho real).
//   node scripts/medir-motion.mjs fita    -> entrada da fita: nenhuma × fade × clip-path
//   node scripts/medir-motion.mjs custo   -> 10 s parado + rolagem até a seção 03: high × low × sem motion
//   node scripts/medir-motion.mjs custo3  -> 10 s parado na seção 03 + rolagem da 02 até a 04 (inclui o
//                                            protótipo de vapor, injetado só na medição)
// Quadros: intervalos entre requestAnimationFrame; "descartado" = intervalo > 1,5 × 16,7 ms (cada intervalo
// conta os quadros perdidos dentro dele). Tarefas longas: PerformanceObserver("longtask", > 50 ms).
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const BASE = pathToFileURL(resolve("site/index.html")).href;
const modo = process.argv[2] || "custo";

const CENARIOS = [
  { nome: "1440×900 @1×", w: 1440, h: 900, dpr: 1, cpu: 1 },
  { nome: "390×844 @3×, CPU 4×", w: 390, h: 844, dpr: 3, cpu: 4 },
];

// instrumentação injetada antes de qualquer script da página
const SONDA = () => {
  window.__q = { frames: [], longas: [] };
  const passo = (t) => { window.__q.frames.push(t); requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__q.longas.push({ t: e.startTime, d: e.duration })))
      .observe({ type: "longtask", buffered: true });
  } catch {}
};
const resumo = (frames, longas, de, ate) => {
  const f = frames.filter((t) => t >= de && t <= ate);
  let descartados = 0, piores = 0;
  for (let i = 1; i < f.length; i++) {
    const d = f[i] - f[i - 1];
    if (d > 25) descartados += Math.round(d / 16.67) - 1;
    piores = Math.max(piores, d);
  }
  const l = longas.filter((x) => x.t >= de && x.t <= ate);
  const dur = (ate - de) / 1000;
  return { fps: +(f.length / dur).toFixed(1), descartados, pior: Math.round(piores), longas: l.length, maiorLonga: Math.round(Math.max(0, ...l.map((x) => x.d))) };
};

const VARIANTES_FITA = {
  nenhuma: "",
  fade: "@keyframes t-fita{from{opacity:0}} .js-motion.entrada-topo .fita{animation:t-fita 1400ms cubic-bezier(.4,0,.2,1) 200ms both}",
  clip: "@keyframes t-fita{from{clip-path:inset(0 0 100% 0)} 99.9%{clip-path:inset(0 0 calc(100% - 100vh) 0)} to{clip-path:inset(0)}} .js-motion.entrada-topo .fita{animation:t-fita 1400ms cubic-bezier(.4,0,.2,1) 200ms both}",
};

// Protótipo de vapor (D41): só para medir e avaliar; não está no site.
const VAPOR_CSS = `.vapor{position:absolute;bottom:52%;width:18%;height:75%;border-radius:50%;pointer-events:none;opacity:0;
  background:radial-gradient(ellipse at 50% 70%,rgba(244,239,230,.24),rgba(244,239,230,0) 65%);animation:vapor 7s ease-out infinite}
  .vapor.v1{left:28%}.vapor.v2{left:47%;width:14%;animation-delay:2.3s}.vapor.v3{left:63%;animation-delay:4.6s}
  @keyframes vapor{0%{opacity:0;transform:translateY(18%) scaleX(.6)}25%{opacity:.85}100%{opacity:0;transform:translateY(-42%) scaleX(1.35)}}`;
const comVapor = (page) => page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => {
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  const alvo = document.querySelector(".grelhados__foto");
  ["v1", "v2", "v3"].forEach((v) => { const e = document.createElement("span"); e.className = "vapor " + v; alvo.appendChild(e); });
}), VAPOR_CSS);

async function abrir(browser, c, url, css = "", vapor = false) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr });
  const page = await ctx.newPage();
  if (c.cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: c.cpu }); }
  await page.addInitScript(SONDA);
  if (vapor) await comVapor(page);
  // no DOMContentLoaded: injetado antes disso, o <style> é descartado quando o parser monta o documento
  if (css) await page.addInitScript((regra) => document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style"); s.textContent = regra; document.head.appendChild(s);
  }), css);
  await page.goto(url, { waitUntil: "load" });
  return { ctx, page };
}

const browser = await chromium.launch();

if (modo === "fita") {
  for (const c of CENARIOS) {
    console.log(`\n${c.nome} — entrada da fita, primeiros 3 s depois da navegação (3 repetições)`);
    for (const [nome, css] of Object.entries(VARIANTES_FITA)) {
      const rs = [];
      for (let i = 0; i < 3; i++) {
        const { ctx, page } = await abrir(browser, c, BASE, css);
        await page.waitForTimeout(600);
        const anims = await page.evaluate(() => document.querySelector(".fita").getAnimations().length);
        if (css && !anims) throw new Error(`variante ${nome}: a animação da fita não está rodando`);
        await page.waitForTimeout(2400);
        const q = await page.evaluate(() => window.__q);
        rs.push(resumo(q.frames, q.longas, 0, 3000));
        await ctx.close();
      }
      const med = (k) => rs.map((r) => r[k]).sort((a, b) => a - b)[1];
      console.log(`  ${nome.padEnd(8)} fps ${med("fps")} · quadros descartados ${med("descartados")} · pior quadro ${med("pior")} ms · tarefas longas ${med("longas")} (maior ${med("maiorLonga")} ms)`);
    }
  }
} else if (modo === "custo3") {
  for (const c of CENARIOS) {
    console.log(`\n${c.nome} — 10 s parado na seção 03 + rolagem da seção 02 até a 04`);
    const variantes = c.w >= 768
      ? { "sem motion": ["?motion=off", false], "motion high": ["?quality=high", false], "motion high + vapor": ["?quality=high", true], "motion low": ["?quality=low", false] }
      : { "sem motion": ["?motion=off", false], "motion low (automático)": ["", false], "motion high + vapor (forçado)": ["?quality=high", true] };
    for (const [nome, [q, vapor]] of Object.entries(variantes)) {
      const { ctx, page } = await abrir(browser, c, BASE + q, "", vapor);
      await page.keyboard.press("Shift");
      if (!q.includes("off")) await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 15000 });
      // estaciona na seção 03 (entrada disparada e concluída)
      await page.evaluate(() => { if (window.motion) motion.scrollTo("#grelhados", { imediato: true }); else document.getElementById("grelhados").scrollIntoView(); });
      await page.waitForTimeout(3500);
      if (vapor && c.w >= 768) await page.screenshot({ path: "screenshots/motion/prototipo-vapor.png" });
      const t0 = await page.evaluate(() => performance.now());
      await page.waitForTimeout(10000);
      const t1 = await page.evaluate(() => performance.now());
      // volta à seção 02 e rola por roda até a 04
      await page.evaluate(() => { if (window.motion) motion.scrollTo("#hero", { imediato: true }); else document.getElementById("hero").scrollIntoView(); });
      await page.waitForTimeout(600);
      const t1b = await page.evaluate(() => performance.now());
      await page.mouse.move(c.w / 2, c.h / 2);
      const alvo = await page.evaluate(() => document.getElementById("rodizio").getBoundingClientRect().top + scrollY);
      for (let i = 0; i < 300 && (await page.evaluate(() => scrollY)) < alvo - 5; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(16); }
      await page.waitForTimeout(1500);
      const t2 = await page.evaluate(() => performance.now());
      const sq = await page.evaluate(() => window.__q);
      const parado = resumo(sq.frames, sq.longas, t0, t1), rolando = resumo(sq.frames, sq.longas, t1b, t2);
      console.log(`  ${nome.padEnd(30)} parado: ${parado.fps} fps, ${parado.descartados} descartados, ${parado.longas} longas · rolando: ${rolando.fps} fps, ${rolando.descartados} descartados (pior ${rolando.pior} ms), ${rolando.longas} longas (maior ${rolando.maiorLonga} ms)`);
      await ctx.close();
    }
  }
} else {
  for (const c of CENARIOS) {
    console.log(`\n${c.nome} — 10 s parado + rolagem do topo até a seção 03`);
    const variantes = c.w >= 768
      ? { "sem motion": "?motion=off", "motion high": "?quality=high", "motion low": "?quality=low" }
      : { "sem motion": "?motion=off", "motion low (automático)": "" };
    for (const [nome, q] of Object.entries(variantes)) {
      const { ctx, page } = await abrir(browser, c, BASE + q);
      // sobe o motion (gesto que não clica em nada) e espera a entrada terminar
      await page.keyboard.press("Shift");
      if (!q.includes("off")) await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 15000 });
      await page.waitForTimeout(3200);
      const t0 = await page.evaluate(() => performance.now());
      await page.waitForTimeout(10000);
      const t1 = await page.evaluate(() => performance.now());
      // rolagem por roda do mouse até a seção 03 (com Lenis no modo full, nativa sem motion)
      await page.mouse.move(c.w / 2, c.h / 2);
      const alvo = await page.evaluate(() => document.getElementById("grelhados").getBoundingClientRect().top + scrollY);
      for (let i = 0; i < 200 && (await page.evaluate(() => scrollY)) < alvo - 5; i++) {
        await page.mouse.wheel(0, 90);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(1500); // a rolagem suave termina
      const t2 = await page.evaluate(() => performance.now());
      const sq = await page.evaluate(() => window.__q);
      const parado = resumo(sq.frames, sq.longas, t0, t1), rolando = resumo(sq.frames, sq.longas, t1, t2);
      console.log(`  ${nome.padEnd(24)} parado: ${parado.fps} fps, ${parado.descartados} descartados, ${parado.longas} longas · rolando: ${rolando.fps} fps, ${rolando.descartados} descartados (pior ${rolando.pior} ms), ${rolando.longas} longas (maior ${rolando.maiorLonga} ms)`);
      await ctx.close();
    }
  }
}
await browser.close();
