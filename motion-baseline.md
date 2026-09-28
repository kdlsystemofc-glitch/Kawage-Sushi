# Linha de base antes do motion

Medida em 28/09/2026 sobre o commit `d45260c responsivo pronto` (sem nenhum JavaScript de motion).
Serve de referência para a etapa de motion: **o desempenho do Lighthouse mobile não pode cair mais de 3 pontos
em relação à mediana abaixo.**

## Auditoria responsiva (`npm run auditar`)

| Motor | Telas | Modos | Resultado |
|---|---|---|---|
| Chromium | 12 (2560×1440 a 320×568, mais 844×390) | normal, zoom 200%, zoom só de texto 200%, escuro + movimento reduzido, sem fontes | **0 problemas** |
| WebKit (`--webkit`) | 1440×900, 390×844 | normal | **0 problemas** |

Teste de empilhamento da fita: ok em 390, 768 e 1440. Autoteste do verificador: 7/7.

## Lighthouse mobile (5 execuções, servidor local com gzip, `scripts/servir.mjs`)

| Execução | Desempenho | Acessibilidade | Boas práticas | SEO | FCP | LCP | SI | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 82 | 100 | 100 | 100 | 2,4 s | 4,3 s | 2,4 s | 0 ms | 0 |
| 2 | 82 | 100 | 100 | 100 | 2,4 s | 4,3 s | 2,4 s | 0 ms | 0 |
| 3 | 88 | 100 | 100 | 100 | 2,4 s | 3,5 s | 2,4 s | 0 ms | 0 |
| 4 | 88 | 100 | 100 | 100 | 2,4 s | 3,5 s | 2,4 s | 0 ms | 0 |
| 5 | 88 | 100 | 100 | 100 | 2,4 s | 3,5 s | 2,4 s | 0 ms | 0 |
| **Mediana** | **88** | 100 | 100 | 100 | 2,4 s | 3,5 s | 2,4 s | 0 ms | 0 |

- **Elemento de LCP:** a foto A do hero (`hero-salmao-bloco-sal-800.webp`) em todas as execuções.
- **Variação 82 ↔ 88:** os tempos observados de rede e de renderização são iguais nas 5 execuções; o que muda é a
  simulação do Lighthouse (ordem dos recursos no caminho crítico). Por isso a comparação usa a **mediana de 5**.
- **Peso total:** 695 KB (sem compressão de imagens; HTML/CSS com gzip).
- **Maiores oportunidades:** cache dos arquivos (~406 KB), 7 CSS bloqueando a renderização (~410 ms), imagens de
  800 px no celular (~289 KB).

## Custo de desenho da pedra (filtro SVG) — laboratório

`node scripts/medir-pedra.mjs`: percorre a página inteira com trace do Chromium headless (rasterização por
software) e soma as tarefas de pintura/rasterização. **Não é medição em aparelho real.**

| Cenário | Variante | Pintura + raster (2 rodadas) | Maior tarefa (2 rodadas) |
|---|---|---|---|
| 2560×1440 @1× | pedra atual (7 oitavas) | 1.753 / 2.339 ms | 95 / 60 ms |
| | 4 oitavas | — / 2.593 ms | — / 49 ms |
| | 3 oitavas | 1.435 / 2.678 ms | 40 / 41 ms |
| | sem textura | 868 / 1.792 ms | 36 / 40 ms |
| 390×844 @3×, CPU 4× | pedra atual (7 oitavas) | 466 / 520 ms | 52 / 50 ms |
| | 4 oitavas | — / 439 ms | — / 38 ms |
| | 3 oitavas | 441 / 513 ms | 31 / 34 ms |
| | sem textura | 279 / 271 ms | 27 / 28 ms |

Leitura: o total é ruidoso entre rodadas; o sinal estável é a **maior tarefa isolada**, que cai com menos oitavas.
A pedra é rasterizada uma vez por bloco da tela (fica em cache enquanto nada a obriga a redesenhar).
Decisão tomada a partir disto: DESIGN.md §9, D24.
