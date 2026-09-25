# Assets — Kawage Sushi

Gerado por `scripts/build_assets.py` (não editar à mão). Todas as fontes são fotos reais de `imagens/`.
Nenhum arquivo de `design/` é usado no site.

## Slots com arquivo

| Slot | Seção | Fonte | Tipo | 800 | 1600 | alt |
|---|---|---|---|---|---|---|
| `hero-salmao-bloco-sal` | 02 hero · posição A | `imgi_22_…` (1440×1920) | recorte (birefnet-general) | `hero-salmao-bloco-sal-800.webp` 800×827 (45 KB) | `hero-salmao-bloco-sal-1600.webp` 1027×1062 (62 KB) ⚠ | Fatias de salmão enroladas sobre um bloco de sal rosa |
| `sushi-variado` | 02 hero · posição B | `imgi_37_…` (1320×1760) | recorte (birefnet-general) | `sushi-variado-800.webp` 800×603 (106 KB) | `sushi-variado-1600.webp` 1180×890 (158 KB) ⚠ | Sushis variados: niguiris maçaricados, hossomakis e joes |
| `grelhado-chapa` | 03 grelhados · posição C | `imgi_21_…` (1440×1920) | recorte (isnet-general-use) | `grelhado-chapa-800.webp` 800×624 (109 KB) | `grelhado-chapa-1600.webp` 1204×939 (180 KB) ⚠ | Salmão grelhado com legumes na chapa de ferro |
| `grelhado-close` | 03 grelhados · close | `imgi_70_…` (1440×1920) | moldura | `grelhado-close-800.webp` 800×874 (89 KB) | `grelhado-close-1600.webp` 1440×1574 (191 KB) ⚠ | Postas de salmão grelhado na chapa, de perto |
| `shimeji-chapa` | 04 rodízio · posição D | `imgi_33_…` (810×1080) | recorte (isnet-general-use) | `shimeji-chapa-800.webp` 531×639 (69 KB) ⚠ | `shimeji-chapa-1600.webp` 531×639 (69 KB) ⚠ | Shimeji com cebolinha servido na chapa |
| `logo-kawage-150` | cabeçalho, rodapé | `imgi_2…` (150×150) | fundo branco → transparente | — | — | Kawage Sushi |

## ⚠ Avisos

- **Slot sem arquivo: fachada** (05 rodapé · slot comentado). Sem foto utilizável: a imgi_28 tem 640 px, é diurna e inclinada. Aguardando foto do cliente (D14b).
- **Slot sem arquivo: logo (alta resolução)** (cabeçalho e rodapé). Só existe imgi_2 com 150×150 px. Usado no tamanho nativo; vetor pendente (D6).
- `hero-salmao-bloco-sal-1600.webp`: a fonte (imgi_22_…, 1440×1920) rende só 1027 px de largura após o corte; não foi ampliada.
- `sushi-variado-1600.webp`: a fonte (imgi_37_…, 1320×1760) rende só 1180 px de largura após o corte; não foi ampliada.
- `grelhado-chapa-1600.webp`: a fonte (imgi_21_…, 1440×1920) rende só 1204 px de largura após o corte; não foi ampliada.
- `grelhado-close-1600.webp`: a fonte (imgi_70_…, 1440×1920) rende só 1440 px de largura após o corte; não foi ampliada.
- `shimeji-chapa-800.webp`: a fonte (imgi_33_…, 810×1080) rende só 531 px de largura após o corte; não foi ampliada.
- `shimeji-chapa-1600.webp`: a fonte (imgi_33_…, 810×1080) rende só 531 px de largura após o corte; não foi ampliada.
- `imgi_68`: descartada do site inteiro (decisão de 25/09).

## Plates abstratos (sem arquivo de imagem)

| Plate | Onde | Como |
|---|---|---|
| Fita de laca | seções 01–04 | SVG inline único `svg[data-fita]` no `index.html` (camadas: sombra, base, verso, brilho, reflexo) |
| Pedra escura | fundo das seções escuras | CSS: gradientes + `feTurbulence` em SVG data-URI (`site/css/base.css`) |
