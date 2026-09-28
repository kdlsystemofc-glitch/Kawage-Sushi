// Lighthouse mobile, mediana de N execuções, contra um servidor local com gzip (scripts/servir.mjs).
// Uso: npm run lh [-- --n 5] [-- --rotulo nome]   → imprime a tabela e grava screenshots/lighthouse/resumo-<rotulo>.json
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const arg = (nome, padrao) => { const i = process.argv.indexOf(nome); return i >= 0 ? process.argv[i + 1] : padrao; };
const N = Number(arg("--n", 5));
const ROTULO = arg("--rotulo", "ultimo");
const PORTA = 4190 + Math.floor(Math.random() * 50);
const OUT = resolve("screenshots/lighthouse");
await mkdir(OUT, { recursive: true });

const servidor = spawn(process.execPath, ["scripts/servir.mjs", String(PORTA)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const execucoes = [];
try {
  for (let i = 1; i <= N; i++) {
    const arq = resolve(OUT, `${ROTULO}-${i}.json`);
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await rm(arq, { force: true });
      try {
        execFileSync(npx, ["--no-install", "lighthouse", `http://127.0.0.1:${PORTA}/`, "--quiet",
          "--chrome-flags=--headless=new --no-sandbox", "--output=json", `--output-path=${arq}`,
          "--only-categories=performance,accessibility,best-practices,seo"], { env, stdio: "ignore", shell: process.platform === "win32" });
      } catch { /* no Windows o Lighthouse às vezes falha só ao apagar a pasta temporária */ }
      try { execucoes.push(JSON.parse(await readFile(arq, "utf8"))); break; } catch { /* sem relatório: tenta de novo */ }
    }
  }
} finally {
  servidor.kill();
}

const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const cat = (r, k) => Math.round(r.categories[k].score * 100);
const au = (r, k) => r.audits[k].numericValue;
const resumo = {
  rotulo: ROTULO, execucoes: execucoes.length,
  desempenho: med(execucoes.map((r) => cat(r, "performance"))),
  acessibilidade: med(execucoes.map((r) => cat(r, "accessibility"))),
  boasPraticas: med(execucoes.map((r) => cat(r, "best-practices"))),
  seo: med(execucoes.map((r) => cat(r, "seo"))),
  fcp: med(execucoes.map((r) => au(r, "first-contentful-paint"))),
  lcp: med(execucoes.map((r) => au(r, "largest-contentful-paint"))),
  tbt: med(execucoes.map((r) => au(r, "total-blocking-time"))),
  cls: med(execucoes.map((r) => au(r, "cumulative-layout-shift"))),
  si: med(execucoes.map((r) => au(r, "speed-index"))),
  bytes: med(execucoes.map((r) => au(r, "total-byte-weight"))),
  todas: execucoes.map((r) => ({ desempenho: cat(r, "performance"), lcp: Math.round(au(r, "largest-contentful-paint")) })),
};
await writeFile(resolve(OUT, `resumo-${ROTULO}.json`), JSON.stringify(resumo, null, 2));
console.log(`Lighthouse mobile (${resumo.execucoes} execuções, mediana): desempenho ${resumo.desempenho} · acessibilidade ${resumo.acessibilidade} · boas práticas ${resumo.boasPraticas} · SEO ${resumo.seo}`);
console.log(`FCP ${(resumo.fcp / 1000).toFixed(2)} s · LCP ${(resumo.lcp / 1000).toFixed(2)} s · SI ${(resumo.si / 1000).toFixed(2)} s · TBT ${Math.round(resumo.tbt)} ms · CLS ${resumo.cls.toFixed(3)} · peso ${Math.round(resumo.bytes / 1024)} KB`);
console.log(`por execução: ${resumo.todas.map((t) => `${t.desempenho} (${(t.lcp / 1000).toFixed(2)} s)`).join(" · ")}`);
