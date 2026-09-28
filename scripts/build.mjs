// Build de produção (fase 3, D51–D54). Os fontes legíveis ficam em site/css/*.css e site/js/**; o build:
//   1. fita: gera o SVG externo (scripts/build_fita.mjs → site/assets/fita.<hash>.svg) e o <img> no index;
//   2. CSS: junta os 8 arquivos na ordem da cascata, minifica (minificador conservador, abaixo) e põe INLINE
//      no <head> entre <!-- build:css --> e <!-- /build:css --> (nenhum CSS bloqueia a renderização);
//   3. JS: minifica core.js e menu.js com terser para site/js/build/<nome>.<hash>.js e atualiza as referências.
// Uso: npm run build   ·   node scripts/build.mjs --check (só confere se o index está em dia)
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { minify } from "terser";

const SITE = resolve("site");
const CSS = ["tokens", "reset", "base", "topo", "hero", "grelhados", "rodizio", "visite"];
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);

// Minificador de CSS conservador: tira comentários e espaços supérfluos, respeita strings e url(), não
// mexe em espaços dentro de calc() (+ e - precisam deles) e NUNCA remove declarações repetidas (são as
// alternativas para Safari antigo: 100vh antes de 100svh, overflow-x: hidden antes de clip, etc.).
export function minCSS(src) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") { const f = src.indexOf("*/", i + 2); i = f < 0 ? src.length : f + 2; continue; }
    if (c === '"' || c === "'") { // string literal, copiada como está
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (/\s/.test(c)) { while (i < src.length && /\s/.test(src[i])) i++; out += " "; continue; }
    out += c; i++;
  }
  // espaços em volta de { } ; , > e depois de ":" (fora de strings: já foram copiadas intactas, mas o
  // regex abaixo só age nos pedaços fora delas)
  const partes = out.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
  for (let k = 0; k < partes.length; k += 2) {
    partes[k] = partes[k]
      .replace(/\s*([{};,>])\s*/g, "$1")
      .replace(/:\s+/g, ":")
      .replace(/;}/g, "}");
  }
  return partes.join("").trim();
}

async function main() {
  const so = process.argv.includes("--check");
  let html = await readFile(join(SITE, "index.html"), "utf8");
  const original = html;

  // 1. fita externa
  if (!so) execFileSync(process.execPath, ["scripts/build_fita.mjs"], { stdio: "inherit" });
  html = await readFile(join(SITE, "index.html"), "utf8");

  // 2. CSS inline
  const fontes = await Promise.all(CSS.map((n) => readFile(join(SITE, "css", `${n}.css`), "utf8")));
  // tokens.css aponta as fontes por ../assets (relativo a css/); inline, o caminho é relativo ao index
  const junto = fontes.join("\n").replaceAll('url("../assets/', 'url("assets/');
  const min = minCSS(junto);
  const blocoCSS = `<!-- build:css (gerado por scripts/build.mjs a partir de css/*.css; não editar) -->\n  <style>${min}</style>\n  <!-- /build:css -->`;
  html = html.replace(/<!-- build:css[\s\S]*?<!-- \/build:css -->/, blocoCSS);

  // 3. JS minificado com hash
  await mkdir(join(SITE, "js", "build"), { recursive: true });
  // --check só compara: não apaga nem grava nada
  if (!so) for (const f of await readdir(join(SITE, "js", "build"))) await rm(join(SITE, "js", "build", f));
  const js = {};
  for (const [nome, fonte] of [["core", "js/motion/core.js"], ["menu", "js/menu.js"]]) {
    const src = await readFile(join(SITE, fonte), "utf8");
    const r = await minify(src, { compress: { passes: 2 }, mangle: true, format: { comments: false } });
    const arq = `js/build/${nome}.${hash(r.code)}.js`;
    if (!so) await writeFile(join(SITE, arq), r.code);
    js[nome] = { arq, antes: src.length, depois: r.code.length };
  }
  html = html.replace(/"js\/(?:motion\/core\.js|build\/core\.[0-9a-f]{8}\.js)"/, `"${js.core.arq}"`);
  html = html.replace(/<script src="js\/(?:menu\.js|build\/menu\.[0-9a-f]{8}\.js)" defer><\/script>/, `<script src="${js.menu.arq}" defer></script>`);

  if (so) { console.log(html === original ? "index em dia" : "index DESATUALIZADO: rode npm run build"); process.exit(html === original ? 0 : 1); }
  await writeFile(join(SITE, "index.html"), html);
  const { gzipSync } = await import("node:zlib");
  const kb = (n) => (n / 1024).toFixed(1) + " KB";
  console.log(`CSS inline: ${kb(junto.length)} → ${kb(min.length)} (gzip ${kb(gzipSync(min).length)})`);
  for (const [n, v] of Object.entries(js)) console.log(`${n}: ${kb(v.antes)} → ${kb(v.depois)} (gzip ${kb(gzipSync(await readFile(join(SITE, v.arq))).length)}) · ${v.arq}`);
  console.log(`index.html: ${kb(html.length)} (gzip ${kb(gzipSync(html).length)})`);
}
await main();
