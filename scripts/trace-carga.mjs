// Diagnóstico: do que são feitas as tarefas longas da carga (celular simulado, 390 @3×, CPU 4×).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const PORTA = 4300 + Math.floor(Math.random() * 30);
const srv = spawn(process.execPath, ["scripts/servir.mjs", String(PORTA)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const ev = []; cdp.on("Tracing.dataCollected", (e) => ev.push(...e.value));
const fim = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,blink,v8", transferMode: "ReportEvents" });
await page.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: "load" });
await page.waitForTimeout(2500);
await cdp.send("Tracing.end"); await fim;
const tid = ev.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain")?.tid;
const longas = ev.filter((e) => e.tid === tid && e.ph === "X" && e.dur > 50000 && /RunTask/.test(e.name)).sort((a, c) => a.ts - c.ts);
for (const e of longas) {
  const filhos = ev.filter((f) => f.tid === tid && f.ph === "X" && f.ts >= e.ts && f.ts + (f.dur || 0) <= e.ts + e.dur && f !== e && (f.dur || 0) > 8000)
    .sort((x, y) => y.dur - x.dur).map((f) => `${f.name}${f.args?.data?.url ? "(" + f.args.data.url.split("/").pop() + ")" : ""}:${(f.dur / 1000).toFixed(0)}`);
  console.log(`${(e.dur / 1000).toFixed(0)} ms -> ${[...new Set(filhos)].slice(0, 10).join(" | ")}`);
}
await b.close(); srv.kill();
