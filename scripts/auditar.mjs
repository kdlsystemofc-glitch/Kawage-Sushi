// Auditoria responsiva: roda o site em várias telas e modos e reprova problemas objetivos.
//   npm run auditar                  -> todas as telas, todos os modos
//   npm run auditar -- 390x844       -> só essas telas (modo normal + os modos que se aplicam)
//   npm run auditar -- --webkit      -> no motor do Safari (WebKit), só o modo normal
//   npm run auditar -- --motion full|reduced|paused  -> carrega o motion (gesto) e mede com ele ativo
// Saída: screenshots/auditoria/<tela>-<modo>.png e um resumo no terminal. Sai com 1 se houver erro.
//
// Checagens por tela/modo:
//   - rolagem horizontal; erros de console; pedidos que falharam (e qualquer pedido a /design)
//   - texto cortado (sai da tela ou do próprio box) e texto sobreposto a outro texto
//   - texto de leitura sobre a fita (mede pixels vermelhos atrás do texto, com o texto escondido)
//   - alvo de toque < 44×44 em link/botão visível
//   - fita: presente em cada seção escura, sem sair do palco, cobrindo o "A" do wordmark escuro,
//     ponta dentro da pedra
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium, webkit } from "playwright";
import pngjs from "pngjs";
const { PNG } = pngjs;

const ROOT = resolve("site");
const OUT = resolve("screenshots/auditoria");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };

const TELAS = {
  "2560x1440": [2560, 1440], "1920x1080": [1920, 1080], "1440x900": [1440, 900], "1366x768": [1366, 768],
  "1280x720": [1280, 720], "1024x768": [1024, 768], "768x1024": [768, 1024], "430x932": [430, 932],
  "390x844": [390, 844], "360x740": [360, 740], "320x568": [320, 568], "844x390": [844, 390],
};
// modos: normal em todas; os outros num subconjunto representativo
const MODOS = {
  normal: () => true,
  // zoom do navegador a 200%: a janela continua do mesmo tamanho, a viewport CSS cai pela metade
  zoom200: ([w]) => w >= 1024,
  // zoom só de texto (Firefox "Zoom text only"): fonte raiz a 200%
  texto200: ([w]) => [1440, 768, 390, 320].includes(w),
  escuroReduzido: ([w]) => [1440, 390].includes(w),
  semFontes: ([w]) => [1440, 768, 390, 320].includes(w),
};

const pedidos = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a));
const WEBKIT = process.argv.includes("--webkit");
const iMotion = process.argv.indexOf("--motion");
const MOTION = iMotion >= 0 ? process.argv[iMotion + 1] : null;
const telas = Object.entries(TELAS).filter(([k]) => !pedidos.length || pedidos.includes(k));

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try { res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end("404"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;
await mkdir(OUT, { recursive: true });

// ── medições no navegador ──
const MEDIR = () => {
  const r = (el) => el.getBoundingClientRect();
  const abs = (b) => ({ x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height });
  const visivel = (el) => { const s = getComputedStyle(el); const b = r(el); return s.visibility !== "hidden" && s.display !== "none" && b.width > 0 && b.height > 0 && !el.closest("[hidden]"); };
  const desc = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "") + (el.textContent.trim() ? ` "${el.textContent.trim().replace(/\s+/g, " ").slice(0, 32)}"` : "");
  const out = { overflowX: document.documentElement.scrollWidth - innerWidth, erros: [], textos: [], alvos: [] };

  // texto de leitura (não inclui wordmarks decorativos, que ficam atrás da fita de propósito)
  const TXT = "h1:not(.topo__wordmark), h2, p:not(.grelhados__wordmark), li, address, .pilula, .nota__valor, .nota__total, a";
  const folhas = [...document.querySelectorAll(TXT)].filter((el) => visivel(el) && !el.closest(".visualmente-oculto, .pular, [hidden]") && el.textContent.trim());
  for (const el of folhas) {
    const b = r(el);
    if (b.left < -1 || b.right > innerWidth + 1) out.erros.push(`texto sai da tela: ${desc(el)} (${Math.round(b.left)}–${Math.round(b.right)})`);
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") out.erros.push(`texto cortado no próprio box: ${desc(el)}`);
    out.textos.push({ d: desc(el), ...abs(b), camada: el.closest("[data-camada]")?.dataset.camada ?? null });
  }
  // sobreposição entre textos (ignora ancestral/descendente)
  for (let i = 0; i < folhas.length; i++) for (let j = i + 1; j < folhas.length; j++) {
    const a = folhas[i], c = folhas[j];
    if (a.contains(c) || c.contains(a)) continue;
    const A = r(a), C = r(c);
    const ix = Math.min(A.right, C.right) - Math.max(A.left, C.left), iy = Math.min(A.bottom, C.bottom) - Math.max(A.top, C.top);
    if (ix > 2 && iy > 2) out.erros.push(`textos sobrepostos: ${desc(a)} × ${desc(c)}`);
  }
  // texto que escapa da ilha creme (fica sobre a pedra, escuro sobre escuro)
  const ilha = document.querySelector(".hero__ilha"), txt = document.querySelector(".hero__texto");
  if (ilha && txt) {
    const I = r(ilha);
    for (const el of txt.querySelectorAll("p, h2")) { const b = r(el); if (b.top < I.top - 1 || b.bottom > I.bottom + 1 || b.right > I.right + 1) out.erros.push(`texto do hero fora da ilha creme: ${desc(el)}`); }
  }
  // texto que passa do fim da própria seção
  for (const sec of document.querySelectorAll("[data-secao]")) {
    const S = r(sec);
    for (const el of sec.querySelectorAll("[data-camada='texto'] p, [data-camada='texto'] h2")) { const b = r(el); if (b.bottom > S.bottom + 1) out.erros.push(`texto passa do fim da seção ${sec.dataset.secao}: ${desc(el)}`); }
  }
  // alvos de toque
  for (const el of document.querySelectorAll("a[href], button")) {
    if (!visivel(el) || el.closest(".pular")) continue;
    const b = r(el);
    if (b.width < 44 - 0.5 || b.height < 44 - 0.5) out.alvos.push(`${desc(el)} ${Math.round(b.width)}×${Math.round(b.height)}`);
  }
  // fita
  const fita = document.querySelector("[data-fita]");
  const desenho = [...fita.querySelectorAll("svg")].find((s) => getComputedStyle(s).display !== "none");
  out.fita = { desenho: desenho?.getAttribute("class"), caixa: abs(r(fita)), palco: abs(r(document.querySelector(".palco"))) };
  const escuro = document.querySelector(".escuro");
  out.escuro = abs(r(escuro));
  out.secoesEscuras = [...escuro.querySelectorAll("[data-secao]")].map((s) => ({ nome: s.dataset.secao, ...abs(r(s)) }));
  // "A" do wordmark escuro (2º caractere)
  const wm = document.querySelector(".grelhados__wordmark")?.firstChild;
  if (wm) {
    // miolo da letra, na faixa das maiúsculas (a caixa do Range inclui o espaço acima delas)
    const rg = document.createRange(); rg.setStart(wm, 1); rg.setEnd(wm, 2); const b = abs(rg.getBoundingClientRect());
    out.letraA = { x: b.x + b.w * 0.2, y: b.y + b.h * 0.3, w: b.w * 0.6, h: b.h * 0.55 };
  }
  out.ctas = [...document.querySelectorAll(".visite__cta")].map((e) => abs(r(e)));
  return out;
};

const png = (buf) => PNG.sync.read(buf);
// vermelho da laca, inclusive os tons escuros da fita (a pedra é cinza neutro e o creme é quente-claro)
const vermelho = (d, i) => d[i] > 30 && d[i] > d[i + 1] * 1.8 && d[i] > d[i + 2] * 1.5;
function fracaoVermelha(img, box, dpr = 1) {
  const x0 = Math.max(0, Math.round(box.x * dpr)), y0 = Math.max(0, Math.round(box.y * dpr));
  const x1 = Math.min(img.width, Math.round((box.x + box.w) * dpr)), y1 = Math.min(img.height, Math.round((box.y + box.h) * dpr));
  let n = 0, v = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { n++; if (vermelho(img.data, (y * img.width + x) * 4)) v++; }
  return n ? v / n : 0;
}

const browser = await (WEBKIT ? webkit : chromium).launch();
let totalErros = 0;
const resumo = [];

for (const [nome, [W, H]] of telas) {
  for (const [modo, aplica] of Object.entries(MODOS)) {
    if (!aplica([W, H]) || (WEBKIT && modo !== "normal") || (MOTION && !["normal", "zoom200", "texto200"].includes(modo))) continue;
    const vw = modo === "zoom200" ? Math.round(W / 2) : W, vh = modo === "zoom200" ? Math.round(H / 2) : H;
    const ctx = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: modo === "zoom200" ? 2 : 1,
      colorScheme: modo === "escuroReduzido" ? "dark" : "light",
      reducedMotion: modo === "escuroReduzido" || MOTION === "reduced" ? "reduce" : "no-preference",
      hasTouch: W < 1024, isMobile: W < 900 && H > W,
    });
    const page = await ctx.newPage();
    const console_ = [];
    page.on("console", (m) => m.type() === "error" && !(modo === "semFontes" && /ERR_FAILED/.test(m.text())) && console_.push(m.text()));
    page.on("pageerror", (e) => console_.push(e.message));
    page.on("requestfailed", (q) => { if (!(modo === "semFontes" && q.url().endsWith(".woff2"))) console_.push(`falhou: ${q.url()}`); });
    page.on("request", (q) => /\/design\//.test(q.url()) && console_.push(`PEDIDO A /design: ${q.url()}`));
    if (modo === "semFontes") await page.route("**/*.woff2", (r) => r.abort());
    await page.goto(url, { waitUntil: "networkidle" });
    if (MOTION) {
      await page.keyboard.press("Shift"); // gesto que não clica em nada: dispara o carregador
      await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 12000 });
      if (MOTION === "paused") await page.click("[data-pause]");
      await page.waitForTimeout(200);
    }
    if (modo === "texto200") await page.addStyleTag({ content: "html{font-size:200% !important}" });
    await page.evaluate(() => document.fonts.ready);
    // entradas (CSS) concluídas: a auditoria mede o estado final; loops infinitos ficam como estão
    await page.evaluate(() => document.getAnimations().forEach((an) => { if (an.effect?.getComputedTiming().iterations !== Infinity) an.finish(); }));
    // revelações (data-reveal) no estado final: a auditoria mede o layout que o visitante vê
    await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.remove("reveal-pendente"); el.setAttribute("data-revealed", "");
      ["opacity", "transform", "translate", "rotate", "scale"].forEach((p) => el.style.removeProperty(p));
    }));
    await page.waitForTimeout(150);

    const m = await page.evaluate(MEDIR);
    const erros = [...m.erros, ...console_.map((c) => `console: ${c}`)];
    if (m.overflowX > 0) erros.push(`rolagem horizontal: ${m.overflowX}px`);
    if (m.alvos.length) erros.push(...m.alvos.map((a) => `alvo de toque pequeno: ${a}`));

    // screenshot normal + um sem texto para medir a fita atrás do texto
    const arq = join(OUT, `${nome}-${modo}${WEBKIT ? "-webkit" : ""}${MOTION ? "-motion-" + MOTION : ""}.png`);
    const buf = await page.screenshot({ path: arq, fullPage: true });
    await page.addStyleTag({ content: "*{color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;transition:none!important} .pilula,.nota__valor{background:transparent!important;border-color:transparent!important} .pilula svg{visibility:hidden}" });
    const semTexto = png(await page.screenshot({ fullPage: true }));
    const dpr = modo === "zoom200" ? 2 : 1;
    for (const t of m.textos) {
      if (t.camada === "atras-da-fita") continue;
      const f = fracaoVermelha(semTexto, t, dpr);
      if (f > 0.04) erros.push(`texto sobre a fita (${Math.round(f * 100)}% vermelho atrás): ${t.d}`);
    }
    // fita: presente em cada seção escura; não encosta nas bordas do palco; cobre o "A"; ponta dentro da pedra
    for (const s of m.secoesEscuras) if (fracaoVermelha(semTexto, s, dpr) < 0.01) erros.push(`fita some na seção ${s.nome}`);
    for (const lado of [m.fita.caixa.x + 1, m.fita.caixa.x + m.fita.caixa.w - 2]) {
      const col = { x: lado, y: m.escuro.y, w: 1, h: m.escuro.h };
      if (fracaoVermelha(semTexto, col, dpr) > 0.002) erros.push(`fita cortada na borda do palco (x=${Math.round(lado)})`);
    }
    if (m.letraA) { const f = fracaoVermelha(semTexto, m.letraA, dpr); if (f < 0.6) erros.push(`fita não cobre o "A" do wordmark escuro (${Math.round(f * 100)}%)`); }
    const faixaFim = { x: m.escuro.x, y: m.escuro.y + m.escuro.h - 4, w: m.escuro.w, h: 3 };
    if (fracaoVermelha(semTexto, faixaFim, dpr) > 0.002) erros.push("fita cortada no fim da pedra (ponta não termina dentro)");

    totalErros += erros.length;
    resumo.push([`${nome} ${modo}`, erros]);
    console.log(`${erros.length ? "✗" : "✓"} ${nome.padEnd(9)} ${modo.padEnd(14)} ${m.fita.desenho ?? "?"}  ${erros.length ? erros.length + " problema(s)" : ""}`);
    for (const e of [...new Set(erros)].slice(0, 12)) console.log(`     - ${e}`);
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(`\n${totalErros ? "✗" : "✓"} ${totalErros} problema(s) no total`);
process.exit(totalErros ? 1 : 0);
