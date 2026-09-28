// Trace do thread principal durante uma rolagem curta (diagnóstico de tarefas longas).
// Uso: node scripts/trace-rolagem.mjs [?quality=high|?quality=low|?motion=off]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const q = process.argv[2] || "?quality=high";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(pathToFileURL(resolve("site/index.html")).href + q, { waitUntil: "load" });
await page.keyboard.press("Shift");
if (!q.includes("off")) await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true", null, { timeout: 15000 });
await page.waitForTimeout(3000);
const ev = []; cdp.on("Tracing.dataCollected", (e) => ev.push(...e.value));
const fim = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,v8", transferMode: "ReportEvents" });
await page.mouse.move(720, 450);
// do topo até a seção 03, como em medir-motion.mjs custo
const alvo = await page.evaluate(() => document.getElementById("grelhados").getBoundingClientRect().top + scrollY);
for (let i = 0; i < 200 && (await page.evaluate(() => scrollY)) < alvo - 5; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(16); }
await page.waitForTimeout(2500);
await cdp.send("Tracing.end"); await fim;
const main = ev.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
const tid = main?.tid;
const grandes = ev.filter((e) => e.tid === tid && e.dur > 30000 && e.ph === "X" && /RunTask|ThreadControllerImpl::RunTask/.test(e.name)).sort((a, c) => a.ts - c.ts);
for (const e of grandes) {
  const filhos = ev.filter((f) => f.tid === tid && f.ph === "X" && f.ts >= e.ts && f.ts + (f.dur || 0) <= e.ts + e.dur && f !== e && (f.dur || 0) > 3000)
    .sort((x, y) => y.dur - x.dur)
    .map((f) => `${f.name}${f.args?.data?.url ? "(" + f.args.data.url.split("/").pop() + ")" : ""}${f.args?.data?.functionName ? "[" + f.args.data.functionName + "]" : ""}:${(f.dur / 1000).toFixed(1)}`);
  console.log(`${e.name} ${(e.dur / 1000).toFixed(1)} ms ->`, [...new Set(filhos)].slice(0, 12).join(" | "));
}
await b.close();
