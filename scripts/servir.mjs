// Servidor estático de site/ (para Lighthouse e testes manuais). Uso: node scripts/servir.mjs [porta] [pasta]
// Serve com gzip quando o navegador aceita, como uma hospedagem comum faria.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = resolve(process.argv[3] || "site");
const PORTA = Number(process.argv[2]) || 4173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json",
};
const COMPRIMIR = new Set([".html", ".css", ".js", ".svg", ".json"]);

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    let body = await readFile(file);
    const ext = extname(file);
    const headers = { "content-type": TYPES[ext] ?? "application/octet-stream" };
    if (COMPRIMIR.has(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      body = gzipSync(body);
      headers["content-encoding"] = "gzip";
    }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end("404");
  }
}).listen(PORTA, "127.0.0.1", () => console.log(`site em http://127.0.0.1:${PORTA}/`));
