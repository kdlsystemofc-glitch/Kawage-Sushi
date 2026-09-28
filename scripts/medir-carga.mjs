// Tarefas longas e quadros descartados nos primeiros 3 s da carga (laboratório). Usado para medir a fita
// inline × externa (P4) e o efeito da otimização. Uso: node scripts/medir-carga.mjs [rotulo]
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const PORTA = 4260 + Math.floor(Math.random() * 30);
const servidor = spawn(process.execPath, ["scripts/servir.mjs", String(PORTA)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const CENARIOS = [
  { nome: "1440×900 @1×", w: 1440, h: 900, dpr: 1, cpu: 1 },
  { nome: "390×844 @3×, CPU 4×", w: 390, h: 844, dpr: 3, cpu: 4 },
];
const b = await chromium.launch();
try {
  for (const c of CENARIOS) {
    const rs = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr });
      const page = await ctx.newPage();
      if (c.cpu > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: c.cpu });
      await page.addInitScript(() => {
        window.__q = { frames: [], longas: [] };
        const passo = (t) => { window.__q.frames.push(t); requestAnimationFrame(passo); };
        requestAnimationFrame(passo);
        new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__q.longas.push(e.duration))).observe({ type: "longtask", buffered: true });
      });
      await page.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: "load" });
      await page.waitForTimeout(3000);
      const q = await page.evaluate(() => window.__q);
      let desc = 0;
      for (let k = 1; k < q.frames.length; k++) { const d = q.frames[k] - q.frames[k - 1]; if (d > 25) desc += Math.round(d / 16.67) - 1; }
      rs.push({ longas: q.longas.length, soma: Math.round(q.longas.reduce((a, x) => a + x, 0)), maior: Math.round(Math.max(0, ...q.longas)), desc });
      await ctx.close();
    }
    const med = (k) => rs.map((r) => r[k]).sort((a, x) => a - x)[1];
    console.log(`${c.nome}: tarefas longas ${med("longas")} (soma ${med("soma")} ms, maior ${med("maior")} ms) · quadros descartados ${med("desc")}  [mediana de 3]`);
  }
} finally {
  await b.close();
  servidor.kill();
}
