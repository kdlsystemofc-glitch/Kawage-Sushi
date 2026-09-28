// Diagnóstico por eliminação: quem faz o texto da seção 03 virar camada do compositor com o motion ligado?
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const F = ".hero__foto,.hero__foto *,.grelhados__foto,.grelhados__foto *,.rodizio__foto";
const SUSPEITOS = {
  "nada removido": "",
  "sem nenhum loop": ".loop{animation:none!important}",
  "chapa 20 px à esquerda (sem encostar no texto)": ".grelhados__foto{margin-left:-20px}",
  "chapa 20 px à esquerda e sem loops no hero": ".grelhados__foto{margin-left:-20px} .flutua--a,.flutua--b{animation:none!important}",
};
const b = await chromium.launch();
for (const [nome, css] of Object.entries(SUSPEITOS)) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(pathToFileURL(resolve("site/index.html")).href + (process.argv[2] || "?quality=low"));
  await page.keyboard.press("Shift");
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true");
  await page.evaluate(() => motion.scrollTo("#grelhados", { imediato: true }));
  await page.waitForTimeout(3000);
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(300);
  await cdp.send("DOM.getDocument", { depth: -1 });
  let ultima = null;
  cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) ultima = e.layers; });
  await cdp.send("LayerTree.enable");
  for (let i = 0; i < 20 && !ultima; i++) { await page.evaluate(() => { scrollBy(0, 1); scrollBy(0, -1); }); await page.waitForTimeout(100); }
  const n = (ultima || []).filter((l) => l.drawsContent).length;
  let textoPromovido = false;
  for (const l of ultima || []) {
    if (!l.backendNodeId) continue;
    const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: l.backendNodeId }).catch(() => ({}));
    if (!object) continue;
    const r = await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId, functionDeclaration: "function(){return !!(this.classList && this.classList.contains('grelhados__texto'))}", returnByValue: true });
    if (r.result.value) textoPromovido = true;
  }
  console.log(`${nome.padEnd(40)} camadas que desenham: ${n} · texto da seção 03 em camada própria: ${textoPromovido ? "SIM" : "não"}`);
  await ctx.close();
}
await b.close();
