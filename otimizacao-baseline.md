# Linha de base antes da otimização (fase 3)

Medida em 28/09/2026 sobre `ad2f21f` (fase 2 fechada, tag `motion-pronto`).

## Lighthouse mobile (`npm run lh`, mediana de 5, servidor local com gzip)

| Desempenho | Acessibilidade | Boas práticas | SEO | FCP | LCP | SI | TBT | CLS | Peso |
|---|---|---|---|---|---|---|---|---|---|
| **85** | 100 | 100 | 100 | 2,72 s | **3,77 s** | 2,72 s | 0 ms | 0 | 878 KB |

Por execução: 84 · 83 · 85 · 85 · 85. Relatórios: `screenshots/lighthouse/otimizacao-baseline-*.json`.

## Carga (`node scripts/medir-carga.mjs`, 3 s a partir da navegação, mediana de 3)

| Cenário | Tarefas longas | Soma | Maior | Quadros descartados |
|---|---|---|---|---|
| 1440×900 @1× | 2 | 110 ms | 57 ms | 16 |
| 390×844 @3×, CPU 4× | 2 | 147 ms | 117 ms | 4 |

## Peso

- `index.html`: 290 KB (74 KB com gzip) — quase tudo é a fita inline (~270 KB).
- CSS: 8 arquivos, ~40 KB sem minificar, todos bloqueando a renderização.
- JS próprio: `core.js` 23 KB, `menu.js` 3 KB, sem minificar. Terceiros (já minificados): GSAP 71 KB, ScrollTrigger 44 KB, Lenis 18 KB (51 KB com gzip no total).
- Fontes: 4 WOFF2 (Cormorant 400/500/600 + Instrument Sans variável), ~100 KB — mas a Cormorant só é usada no peso 500.
- Imagens: WebP 800 e 1600; nenhuma versão menor para celular.

## Regressão visual

Referências em `screenshots/regressao/antes/` (`node scripts/regressao-visual.mjs gravar`): as 12 telas, estático e estado final do
motion, página inteira. Autoteste da ferramenta (o site comparado consigo mesmo): 0,00 % em todas as 24 capturas.
