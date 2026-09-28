# Kawage Sushi — site

Página única do Kawage Sushi (rodízio japonês, Jardim do Mar, São Bernardo do Campo). Site estático em `site/`.
Decisões de design e de motion: `DESIGN.md`. Andamento das fases: `PROGRESSO.md`. Publicação: `DEPLOY.md`.

## Como rodar

```bash
npm install            # Playwright, Lighthouse, terser, pngjs (só para build e testes)
npm run build          # fita (SVG externo), CSS inline minificado e JS minificado no site/index.html
node scripts/servir.mjs   # http://127.0.0.1:4173/  (ou abra site/index.html com duplo clique)
```

Testes: `npm run test:motion`, `npm run auditar`, `python tests/fita/verificar_empilhamento.py --motion`,
`npm run lh` (Lighthouse mobile, mediana de 5) e `bash scripts/fechar-fase.sh <rotulo>` (tudo junto).

Os fontes legíveis ficam em `site/css/*.css`, `site/js/motion/core.js` e `site/js/menu.js`; o `index.html` recebe a versão
minificada pelo build. Depois de editar qualquer CSS ou JS, rode `npm run build`.

## Licenças de terceiros

| Item | Onde | Licença |
|---|---|---|
| **Cormorant Garamond** (Christian Thalmann / Catharsis Fonts), peso 500 | `site/assets/fonts/cormorant-garamond-latin-500-normal.woff2` | SIL Open Font License 1.1 |
| **Instrument Sans** (Instrument), variável, eixo `wght` | `site/assets/fonts/instrument-sans-latin-wght-normal.woff2` | SIL Open Font License 1.1 |
| GSAP 3.15.0 e ScrollTrigger | `site/js/vendor/` | licença padrão da GSAP (gratuita, inclusive uso comercial) — https://gsap.com/standard-license |
| Lenis 1.3.26 | `site/js/vendor/lenis.min.js` | MIT (`site/js/vendor/lenis.LICENSE.txt`) |

As fontes vêm dos pacotes `@fontsource` (subconjunto latino, que cobre o português) e são servidas pelo próprio site:
nenhum pedido ao Google Fonts. A SIL OFL 1.1 permite usar, embutir e redistribuir as fontes com o site; não permite
vendê-las isoladamente. Texto da licença: https://openfontlicense.org
