# Publicação — Kawage Sushi

O site é estático: publique **o conteúdo da pasta `site/`** (é ele que tem o `index.html`). Nada de servidor, banco ou build
na hospedagem: rode `npm run build` antes e publique o resultado.

Este documento **não escolhe a hospedagem** e **não cria arquivo de configuração** de nenhuma delas: os exemplos abaixo são
genéricos, para copiar quando a hospedagem for decidida.

## Antes de publicar

1. Preencha `cliente.config.json` (fase 5) e rode `npm run build`.
2. Rode `bash scripts/fechar-fase.sh publicacao`: tudo verde.
3. Confira que `design/`, `imagens/`, `screenshots/`, `tests/` e `node_modules/` **não** vão junto — só `site/`.

## Cache recomendado por tipo de arquivo

Arquivos com **hash no nome** (ex.: `fita.1a2b3c4d.svg`, `core.5e6f7a8b.js`) mudam de nome quando mudam de conteúdo:
podem ficar em cache "para sempre". O HTML não tem hash: cache curto ou nenhum, para cada publicação aparecer logo.

| Arquivos | Exemplo | Cabeçalho `Cache-Control` |
|---|---|---|
| HTML | `/index.html`, `/` | `public, max-age=0, must-revalidate` |
| JS e SVG com hash | `/js/build/*.js`, `/assets/fita.*.svg` | `public, max-age=31536000, immutable` |
| Fontes | `/assets/fonts/*.woff2` | `public, max-age=31536000, immutable` (renomeie se trocar a fonte) |
| Imagens | `/assets/*.webp`, `/assets/*.png`, `/assets/*.jpg` | `public, max-age=2592000` (30 dias; sem hash no nome) |
| Terceiros (GSAP, Lenis) | `/js/vendor/*.js` | `public, max-age=31536000, immutable` (a versão está fixa; troque o arquivo e o nome juntos) |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | | `public, max-age=86400` |

Compressão: **gzip ou Brotli** para HTML, CSS, JS, SVG, JSON e XML (as imagens WebP e as fontes WOFF2 já vêm comprimidas).
O HTML e a fita comprimem muito bem (a fita cai de ~270 KB para ~40 KB).

## Exemplos genéricos (para copiar quando a hospedagem for escolhida)

### Netlify — arquivo `_headers` na pasta publicada

```
/*
  X-Content-Type-Options: nosniff
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/js/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=2592000
```
(Netlify comprime sozinho. A regra mais específica de `/assets/fonts/*` vem antes de `/assets/*`.)

### Vercel — `vercel.json` na raiz do projeto publicado

```json
{
  "headers": [
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/js/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/assets/fonts/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000" }] }
  ]
}
```
(Configure a pasta de saída do projeto como `site/`. A Vercel comprime sozinha.)

### GitHub Pages

O GitHub Pages **não permite cabeçalhos personalizados**: o cache é fixo (cerca de 10 minutos para tudo) e a compressão é
automática. Funciona, mas os arquivos com hash não aproveitam o cache longo. Se o cache importar, use uma CDN na frente
(ex.: Cloudflare, com regras de cache por caminho equivalentes à tabela acima).

## O que só se confirma na hospedagem real

- Compressão de fato aplicada (confira o cabeçalho `content-encoding` no DevTools).
- Cabeçalhos de cache (o Lighthouse local não os mede; aparece como "cache ineficiente").
- HTTP/2 ou HTTP/3 e a latência real da CDN (o Lighthouse local mede um servidor na própria máquina).
