# Inventário de motion — Kawage Sushi

Todas as animações do site em 28/09/2026 (fase 2). Fonte: `site/css/*.css`, `site/js/motion/core.js`, `site/js/menu.js`.
Regras que valem para todas: só `transform` e `opacity`, só em camadas-folha; a fita e a pedra não se movem;
sem JS o site fica no estado estático; o ⏸ congela tudo (CSS por `animation-play-state`, GSAP pela timeline global).

Legenda — **CSS**: animação CSS (começa sem esperar o motion); **GSAP**: revelação via `data-reveal` (motion carregado,
só para o que estava abaixo da dobra ao carregar, D34); **T**: transição CSS.

## Entradas (uma vez)

| Seção | Elemento | Técnica | Tipo | Duração | Easing | Atraso | Low | Reduced |
|---|---|---|---|---|---|---|---|---|
| Topo | Wordmark "KAWAGE" | CSS | fade + 24 px ↑ | 900 ms | `--ease-out` | 0 | igual | fade 200 ms |
| Topo | Logo e MENU | CSS | fade | 600 ms | `--ease-out` | 300 ms | igual | fade 200 ms |
| Topo/hero | Fita (só com a página aberta no topo) | CSS | `clip-path` de cima para baixo (high) · fade (low) | 1.400 ms | `--ease-soft` | 200 ms | fade | não existe |
| Hero | Foto A (bloco de sal, LCP) | CSS | pouso: 40 px + −2° → repouso, sem fade | 900 ms | `--ease-out` | 500 ms | igual | não existe |
| Hero | Sobretítulo, 2 linhas do título, corpo | GSAP | 16 px + fade | 600 ms | `--ease-out` | 0/120/240/360 ms | igual | fade 200 ms |
| Hero | Foto B (sushi variado) | GSAP | 32 px + fade | 800 ms | `--ease-out` | 0 | igual | fade 200 ms |
| 03 | Wordmark escuro | GSAP (grupo) | 24 px + fade | 900 ms | `--ease-out` | 0 | igual | fade 200 ms |
| 03 | Chapa de salmão | GSAP (grupo) | pouso: 48 px + 3° → repouso, sem fade | 1.000 ms | `--ease-out` | 300 ms | igual | fade 200 ms |
| 03 | Sobretítulo, título, corpo | GSAP (grupo) | 16 px + fade | 600 ms | `--ease-out` | 0/120/240 ms | igual | fade 200 ms |
| 04 | Título, corpo, pílula da nota | GSAP (grupo) | 16 px + fade | 600 ms | `--ease-out` | 0/120/240 ms | igual | fade 200 ms |
| 04 | Shimeji | GSAP | pouso: 40 px + −3° → repouso, sem fade | 900 ms | `--ease-out` | 0 | igual | fade 200 ms |
| Visite | Título e 3 colunas | GSAP (grupo) | 16 px + fade | 600 ms | `--ease-out` | 0/100/200/300 ms | igual | fade 200 ms |
| Rodapé | Conteúdo | GSAP | fade | 600 ms | `--ease-out` | 0 | igual | fade 200 ms |

## Loops (contínuos)

| Seção | Elemento | Tipo | Período | Easing | Começa | Low | Reduced |
|---|---|---|---|---|---|---|---|
| Hero | Foto A | `translateY` ±6 px (sobe primeiro) | 8 s | ease-in-out | 3 s após a carga | não existe | não existe |
| Hero | Foto B | `translateY` ±5 px (desce primeiro) | 9 s | ease-in-out | 3,6 s após a carga | não existe | não existe |
| 03 | Chapa | `translateY` ±5 px (sobe primeiro) | 9 s | ease-in-out | 1,5 s após o pouso | não existe | não existe |
| 03 | Brilho de brasa | `opacity` 0,10 ↔ 0,22 | 5 s | ease-in-out | ao carregar | fixo em 0,16 | não existe |
| 04 | Shimeji | `translateY` ±5 px (desce primeiro) | 9 s | ease-in-out | 1,5 s após o pouso | não existe | não existe |

Todos os loops têm a classe `.loop` e ficam dentro de `[data-loop]`: rodam **só com ≥ 50 % do elemento na tela** (D50) e,
fora disso, são **removidos** (não pausados), liberando a camada do compositor (D43).

## Contínuos atrelados à rolagem

| Elemento | Técnica | Fator | Teto | Repouso | Low / reduced / pausa |
|---|---|---|---|---|---|
| Foto A do hero | GSAP `quickSetter`, `translate` 2D | ×0,06 | 24 px | página no topo | desligado |
| Foto B do hero | idem | ×0,08 | 24 px | página no topo | desligado |
| Chapa (03) | idem | ×0,07 | 24 px | seção no topo | desligado |
| Shimeji (04) | idem | ×0,07 | 24 px | seção no topo | desligado |
| Rolagem suave | Lenis (só no modo full) | — | — | — | nativa em reduced e na pausa |

`will-change` só enquanto a página rola; parado, sai (e o `transform` também, se y = 0) — D42.

## Interface (transições)

| Elemento | Tipo | Duração | Easing | Reduced | Pausa |
|---|---|---|---|---|---|
| MENU, pausa, CTA, "Fechar" (pílulas) | T: cor de fundo e texto | 180 ms | `--ease-soft` | igual (não é movimento) | igual |
| Links da Visite e do rodapé | T: cor do sublinhado; barra em laca `scaleX` 0 → 1 (só com hover) | 180 ms | `--ease-out` | sem a barra animada | sem transição |
| Menu — abrir | T: overlay `opacity` + itens 16 px + fade, 60 ms entre eles | 320 ms | `--ease-soft` / `--ease-out` | só fade 200 ms | instantâneo |
| Menu — fechar | T: overlay `opacity`, itens sem sequência | 200 ms | `--ease-soft` | fade 200 ms | instantâneo |

## Loops simultâneos por posição de rolagem (orçamento D50: no máximo 3)

Medido por `node scripts/test-motion-fase2.mjs --loops` (passos de 25 % da tela, com as entradas concluídas).

| 1440×900 (high) | loops | 390×844 (high forçado) | loops |
|---|---|---|---|
| 0 px | 1 — A | 0 px | 2 — A, B |
| 225 px | 2 — A, B | 211 px | 2 — A, B |
| 450 px | 2 — A, B | 422 px | 3 — B, brasa, chapa |
| 675 px | 3 — B, brasa, chapa | 633 px | 3 — B, brasa, chapa |
| 900 px | 3 — B, brasa, chapa | 844 px | 2 — brasa, chapa |
| 1125 px | 3 — brasa, chapa, shimeji | 1055 px | 3 — brasa, chapa, shimeji |
| 1350 px | 3 — brasa, chapa, shimeji | 1266 px | 1 — shimeji |
| 1575 px | 1 — shimeji | 1477–1688 px | 1 — shimeji |
| 1800 px | 1 — shimeji | 1899 px | 0 |

Antes do ajuste, o pico era **4** (margem de 10 % do observador e "qualquer pixel na tela" bastava). No celular com qualidade
automática (low) não há nenhum loop.

## Ritmo percebido (avaliação pelos números; os vídeos estão em `screenshots/motion/pagina-inteira-*.webm`)

Não consigo assistir aos vídeos; a avaliação abaixo é pelos tempos, e deve ser confirmada olhando os vídeos.
- **Entradas coerentes:** todas entre 600 e 1.000 ms com o mesmo `--ease-out`; atrasos em passos de 100–120 ms.
- **O hero é a seção mais movimentada:** fita revelando, wordmark, pouso da foto A e, 3 s depois, duas flutuações. É a
  abertura, faz sentido ser a mais rica; se parecer agitado no vídeo, o primeiro corte seria a flutuação da foto B.
- **A seção 03 é a mais "viva" em loop:** brilho (5 s) + chapa (9 s). O brilho é só opacidade e é discreto.
- **As seções 04 e Visite são as mais calmas:** uma flutuação só e revelações curtas.
- Nenhuma animação passa de 1,4 s (a fita) e nenhum loop tem período menor que 5 s.
