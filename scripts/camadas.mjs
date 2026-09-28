// Diagnóstico: lista as camadas do compositor visíveis e os motivos de cada uma (CDP LayerTree).
// Uso: node scripts/camadas.mjs [#secao] [largura]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const alvo = process.argv[2] || "#grelhados", w = Number(process.argv[3]) || 1440;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(pathToFileURL(resolve("site/index.html")).href + "" + (process.argv[4] || "?quality=high"));
await page.keyboard.press("Shift");
const comMotion = !(process.argv[4] || "").includes("motion=off");
if (comMotion) await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true");
await page.evaluate((a) => window.motion ? motion.scrollTo(a, { imediato: true }) : document.querySelector(a).scrollIntoView(), alvo);
await page.waitForTimeout(3500);
await cdp.send("DOM.getDocument", { depth: -1 });
// a árvore chega no evento layerTreeDidChange; uma rolagem mínima força a atualização
let ultima = null;
cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) ultima = e.layers; });
await cdp.send("LayerTree.enable");
for (let i = 0; i < 20 && !ultima; i++) { await page.evaluate(() => { scrollBy(0, 1); scrollBy(0, -1); }); await page.waitForTimeout(100); }
const layers = ultima || [];
for (const l of layers || []) {
  if (process.argv[5] !== "todas" && (!l.drawsContent || l.width < 20 || l.height < 20)) continue;
  const { compositingReasons = [] } = await cdp.send("LayerTree.compositingReasons", { layerId: l.layerId }).catch(() => ({}));
  let nome = "";
  if (l.backendNodeId) {
    const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: l.backendNodeId }).catch(() => ({}));
    if (object) nome = (await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId, functionDeclaration: "function(){return this.tagName ? this.tagName.toLowerCase()+'.'+String(this.className?.baseVal ?? this.className).split(' ')[0] : String(this.nodeName)}", returnByValue: true })).result.value;
  }
  console.log(`${String(Math.round(l.width)).padStart(5)}×${String(Math.round(l.height)).padEnd(5)} ${nome.padEnd(34)} ${compositingReasons.join(", ")}`);
}
await b.close();
