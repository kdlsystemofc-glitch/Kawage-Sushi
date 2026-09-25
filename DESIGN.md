# DESIGN — Kawage Sushi

Tradução do mockup `design/mockup-full.png.jpg` em regras de construção.

**Fontes:** `design/mockup-full.png.jpg` (768×1376 px, JPEG, apesar do nome `.png`), `DIRECAO.md`, `CLIENTE-bruto.md`
(a ficha do Google Maps; o `CLIENTE.md` contém só o briefing da análise anterior), as 23 imagens de `IMAGENS/` e o `CLAUDE.md`.

> **Regra que vale para o documento inteiro:** o mockup define **composição, clima, camadas e tipografia**.
> Ele **não** é fonte de conteúdo. Nenhum prato, fachada, texto ou ícone do mockup entra no site.
> Tudo é substituído por foto real (`IMAGENS/`), por dado real (`CLIENTE-bruto.md`), por texto autoral declarado
> (§1.3) ou marcado como **PENDENTE**.

---

## Registro de decisões · 25/09/2026

Decisões do responsável pelo projeto sobre as pendências da primeira versão deste documento.

| Tema | Decisão | Onde está aplicada |
|---|---|---|
| Troca de pratos | **Aprovada integralmente.** A=`imgi_22`, B=`imgi_37`, C=`imgi_21` (close em `imgi_70`), D=`imgi_33` | §1.2 |
| `imgi_68` (atum) | **Descartada do site inteiro**, não só do hero | §1.2, §1.5 |
| Fachada | Rodapé **sem foto de fachada** por enquanto; **slot comentado** no HTML/CSS; nunca escurecer nem recriar a foto real | §1.2, §5.1 |
| Terceira marca | A serifa do mockup é **só tipografia de título**, nunca selo ou logo. O **logo real (sol + hashis)** é o único símbolo de marca, no cabeçalho e no rodapé | §3.2 |
| Clima escuro | **Confirmado.** Substitui a recomendação clara do `DIRECAO.md` | §2 |
| Seção "Visite" | **Aprovada, em creme** | §1.4, §2.3, §6 |
| Fita | **SVG único aprovado**, com **teste automatizado** de contexto de empilhamento | §4, §4.6 |
| "A mesa pede mais um" | **Pode ficar**, registrada como **texto autoral**, não slogan oficial do cliente | §1.3 |
| Desktop | Extrapolado **por proporção** a partir do mockup; ambiguidades viram dúvidas explícitas | §7 |

### Decisões · 25/09/2026 (após topo + hero)

| Tema | Decisão | Onde está aplicada |
|---|---|---|
| D19 · altura no desktop | ✅ **A página mais alta no desktop é aceita.** Não compactar seções para caber na tela | §6, §7 |
| D20 · largura extra | ✅ **Pedra, moldura creme e ilha acompanham a largura total da tela**; a composição (wordmark, fita, fotos, texto) fica no palco de até 1280 px, nas proporções do mockup | §6, §7 |
| Teste visual 1920 e 2560 px | **Obrigatório antes de fechar a passada responsiva geral** (ainda não feito) | §7.3 |
| Transição creme → pedra do hero | **Polimento, não bloqueia:** hoje é corte reto horizontal. Avaliar na passada de motion ou numa revisão visual | §8 |

---

## 0. Fatias do mockup (`design/secoes/`)

Os cortes seguem os **blocos de conteúdo** (mudanças de fundo e grupos de texto), não a fita, que atravessa tudo.
Há 10–12 px de sobreposição entre fatias vizinhas para mostrar a costura.

| Arquivo | Faixa Y no mockup | O que contém |
|---|---|---|
| `01-topo-wordmark.png` | 0–167 | Topo **claro**: ícones sociais, botão MENU, wordmark "KAWAGE" preto em serifa. A fita nasce aqui, na frente do "W". |
| `02-hero-mesa-pede-mais-um.png` | 167–626 | Começa o fundo de pedra escura (com uma margem creme de ~7 px nas laterais). Atum sobre a fita, **ilha creme** com "SUBHEBAIN / A MESA PEDE MAIS UM" + lorem, trio de niguiri sobre a fita. |
| `03-grelhados-wordmark-escuro.png` | 614–905 | Segundo "KAWAGE", creme sobre escuro, com a fita cobrindo o "A". Frigideira com salmão, "TERIYAKI SALMON" + lorem à direita. |
| `04-rodizio-shimeji-nota.png` | 895–1206 | "RODÍZIO + À LA CARTE" + lorem, selo "4,5 ★ 2.851 avaliações", tigela de shimeji. A fita termina aqui. |
| `05-cta-fachada-rodape.png` | 1205–1376 | Pílula "FALAR COM O KAWAGE", botão hambúrguer flutuante, fachada noturna, ícones sociais do rodapé. |

**Limite da referência:** o mockup tem só 768 px de largura e proporção de retrato. Ele é a **referência 1:1 para 768 px**.
Celular e desktop saem dele pelas regras de proporção do §7. Os textos pequenos estão ilegíveis em 1×.

---

## 1. Leitura honesta: mockup × realidade

### 1.1 O que o mockup mostra e é inventado

| # | Elemento do mockup | Situação | Decisão |
|---|---|---|---|
| 1 | **Atum em cubos** com gelo e microverdes, sobre a fita | Gerado por IA; não é prato do Kawage | ✅ Substituído por `imgi_22` (§1.2) |
| 2 | **Trio de niguiri** (atum, salmão, atum) sobre a fita | Inventado | ✅ Substituído por `imgi_37` |
| 3 | **Salmão "teriyaki" em frigideira redonda** com fumaça | Inventado. O Kawage serve grelhados em **chapa oval de ferro sobre base de madeira queimada**. "Teriyaki" não aparece em nenhum dado | ✅ Substituído por `imgi_21` + close `imgi_70`; o nome "teriyaki" não é usado |
| 4 | **Shimeji em tigela de cerâmica** | Inventado. O shimeji real vem **na chapa oval sobre madeira** | ✅ Substituído por `imgi_33`, mostrando o serviço real |
| 5 | **Fachada noturna** | **Inventada.** A real (`imgi_28`) é parede cinza-escura com letreiro de madeira **"Kawage sushi" em letra cursiva**, de dia | ✅ Rodapé sem foto de fachada; slot comentado (§5.1) |
| 6 | **Wordmark "KAWAGE" em serifa romana** | Nome real, forma inventada. O logo real (`imgi_2`) é sem-serifa com sol vermelho e hashis | ✅ Serifa = só tipografia de título; logo real = único símbolo (§3.2) |
| 7 | `SUBHEBAIN` | Texto sem sentido | ✅ Substituído (§1.3) |
| 8 | Três blocos de **Lorem ipsum** / pseudolatim | Placeholder | ✅ Substituídos (§1.3) |
| 9 | `TERIYAKI SALMON` | Nome inventado, em inglês | ✅ Substituído |
| 10 | `A MESA PEDE MAIS UM` | Copy do mockup, não do cliente | ✅ Mantida como **texto autoral** (§1.3) |
| 11 | Ícones **Facebook + Instagram + YouTube** (topo) e **Facebook + Instagram + Twitter** (rodapé) | Inventados e incoerentes entre si. Os dados só confirmam **Instagram, sem o @** | Só o Instagram, e só quando o @ existir (D2, ainda aberta) |
| 12 | Botão `MENU` no topo **e** hambúrguer flutuante embaixo | Duplicação de interface | Um só: pílula fixa no topo |
| 13 | Gelo, microverdes, fumaça | Decoração de banco de imagem | Não recriar, nem em CSS |
| 14 | Textura de **pedra/ardósia preta** | Abstrata | Pode ser recriada (CSS/SVG ou plate gerado) |
| 15 | **Fita vermelha laqueada** | Abstrata e decorativa | Recriada em SVG (§4) |

### 1.2 Mapeamento prato a prato: mockup → foto real ✅ aprovado

Todas as posições usam **recorte** (objeto isolado sobre o fundo escuro), como o `CLAUDE.md` permite:
"Recorte/componha à vontade, mas a fonte é real".

| Posição | Mockup (inventado) | Foto real (aprovada) | Tratamento |
|---|---|---|---|
| **A** · hero, alto da fita | Atum em cubos | **`imgi_22`** (1440×1920): salmão enrolado sobre bloco de sal rosa em travessa cobalto, o "momento hero" do DIRECAO §4 | Recortar travessa + bloco; tirar a mão (canto inferior esquerdo) e o painel desfocado |
| **B** · trio de niguiri | Niguiri atum/salmão/atum | **`imgi_37`** (1320×1760): travessa redonda com niguiris maçaricados, hossomakis e joes ("Sushi Sashimi Variados", o mais pedido) | A borda sai do quadro nas laterais: recorte **circular interno** ou só a fileira inferior de niguiris. Tirar bisnaga e shoyu do fundo |
| **C** · grelhado (o "teriyaki" do mockup) | Frigideira redonda | **`imgi_21`** (1440×1920): chapa oval inteira com salmão grelhado e legumes, sobre madeira queimada · **close: `imgi_70`** (1440×1920) | `imgi_21` em recorte flutuante (é a única com o objeto inteiro; a mão sai junto com o fundo). `imgi_70` em **moldura** (recorte retangular do salmão na chapa), nunca flutuante |
| **D** · shimeji | Tigela de cerâmica | **`imgi_33`** (810×1080): shimeji com cebolinha na chapa oval sobre madeira | Recorte de ~500 px úteis, suficiente para ~27% da largura. Tirar os blocos de sal e as flores do topo |
| **E** · fachada | Vitrine noturna inventada | **Nenhuma, por enquanto** | Slot comentado (§5.1). Aceita: foto real noturna, se existir, **ou a diurna `imgi_28`/nova diurna**, mesmo destoando do clima escuro. **Proibido** escurecer, colorir para "noite" ou recriar |
| Marca | "KAWAGE" serifado | **`imgi_2`** (logo real, 150×150) | Resolução insuficiente para o cabeçalho final (D6, aberta) |

**Recortes (entrega de assets):** PNG/WebP com canal alfa em `/site/assets`, largura mínima 2× o maior tamanho exibido,
**borda limpa** (sem halo claro) e a sombra de contato do §4.4.

**Nota sobre cor:** as fotos reais têm **luz de dia, madeira mel e azul-cobalto**. Sobre a pedra escura, os recortes vão parecer
mais quentes e "caseiros" que o mockup. **Isso é desejável** (é o que o cliente é). Não ajustar cor para imitar o mockup.

### 1.3 Textos do mockup → texto final

| Texto do mockup | Texto do site | Status |
|---|---|---|
| `SUBHEBAIN` (sobretítulo) | "Rodízio e cardápio japonês" | Real (ficha do Google). *Ajuste de 25/09:* o bairro saiu do sobretítulo porque, em texto legível, ocupava 3 linhas e empurrava o texto para baixo da fita; o endereço fica no `<h1>` (texto oculto), no `<title>` e na seção Visite |
| `A MESA PEDE MAIS UM` | "A mesa pede mais um" | ✅ **Texto autoral** (título de marketing). **Não é slogan oficial do cliente** e não deve ser apresentado como tal (sem ™, sem "nosso lema"). Não afirma fato: pode ficar enquanto não contradisser nenhum dado real |
| Lorem sob o título | "Sushis, sashimis e grelhados de salmão, no rodízio ou no cardápio. Para comer aqui, retirar na porta ou receber em casa." | Real (descrição do Google + serviços). **Sem "em rede"** (D10) |
| `TERIYAKI SALMON` | "Da chapa" (sobretítulo) + "Grelhados de salmão" | Real ("grelhados de salmão" está na descrição do Google) |
| Lorem dos grelhados | "Salmão, legumes e shimeji chegam à mesa na chapa de ferro, sobre a base de madeira." | Descreve o que as fotos mostram. Nomes dos pratos **PENDENTES** (D16) |
| `RODÍZIO + À LA CARTE` | "Rodízio e à la carte" | Real ("Rodízio e cardápio", segundo o Google) |
| Lorem do rodízio | "Os mais pedidos da casa: sushi e sashimi variados e shimeji." + (se confirmado) "Bebida e sobremesa inclusas." | Primeira frase real. Segunda **PENDENTE** (D7) |
| `4,5 ★ 2.851 avaliações` | Idem, com fonte: "no Google · set/2026" | Real, mas **datado**: atualizar antes de publicar |
| `FALAR COM O KAWAGE` | "Falar com o Kawage", abrindo **WhatsApp** ou, sem ele, `tel:+551141215276` | Telefone real. WhatsApp **PENDENTE** (D4) |
| Placa "KAWAGE" da fachada | — | Removida |

**Critério para textos autorais:** título ou frase de clima pode ser autoral. **Fato** (preço, o que está incluso, nota,
horário, nomes, quantidade de unidades) só com fonte real. Texto autoral nunca pode implicar um fato não confirmado
(ex.: "bebida à vontade" seria fato disfarçado de slogan).

### 1.4 O que o mockup não mostra e o site precisa ter
Seção **"Visite"** ✅ aprovada, em creme, entre o rodízio e o rodapé: endereço (R. Continental, 372, Jardim do Mar,
São Bernardo do Campo, SP, 09750-060), telefone (11) 4121-5276, horário (**PENDENTE**, D1), serviços (refeição no local,
retirada na porta, entrega sem contato), link "Como chegar".
Opcional: bloco de depoimento sobre o atendimento (74 menções a "atendente"); o nome **Lázaro** só com autorização (D3).

### 1.5 Fotos indisponíveis para o site

| Foto | Motivo | Alcance |
|---|---|---|
| **`imgi_68`** | 640 px, mão aparecendo, provável repost | ✅ **Descartada de vez, em qualquer parte do site** (decisão de 25/09) |
| `imgi_54` | Texto embutido ("VOCÊ PERTINHO DO JAPÃO") | Proibida pela regra "nenhum texto dentro de imagem" |
| `imgi_47`, `imgi_66` | Latas de marca (Coca-Cola, Fanta, Guaraná) | Fora das posições de destaque; uso só com recorte que elimine as latas |
| `imgi_45` | Repost com compressão e saturação altas | Fora, até o direito de uso ser confirmado (D11) |
| `imgi_38`, `imgi_60` | Montagem "voador?" carregada; depende do painel de banco de imagem | Fora, até D5 |
| `imgi_53`, `imgi_56` | Frames de 640 px | Só em uso pequeno, se houver |

---

## 2. Clima escuro ✅ confirmado

### 2.1 A mudança
O `DIRECAO.md` recomendou a **Opção A "Mesa cheia"** (clara, papel de arroz, madeira e cobalto) e alertou contra o escuro
por dois motivos: o escuro promete "noite especial" (e o cliente é familiar, R$ 100–140) e o **Asami Sushi**, concorrente
na mesma cidade e projeto anterior, tem estética escura e cromada.

O mockup é **predominantemente escuro**: ~85% da altura é pedra preta, com fita de laca vermelha.
**Decisão confirmada: o clima escuro do mockup substitui a recomendação clara do `DIRECAO.md`.** O `CLAUDE.md` define `/design`
como a referência visual do projeto.

### 2.2 Justificativa registrada: laca quente + creme ≠ cromado frio do Asami
- **Outra família de escuro.** O Asami é escuro **cromado**: frio, metálico, reflexo prateado. O Kawage é **laca vermelha quente
  sobre pedra, dentro de uma moldura creme**: laqueado japonês, não vitrine de luxo.
  **Proibido no Kawage:** cromado, prata, gradiente metálico, brilho azul/neon, reflexos frios.
- **As fotos reais puxam o calor de volta.** Salmão laranja, madeira mel, travessa cobalto e crisântemos sobre fundo quase preto
  viram palco da mesa cheia, desde que as fotos sejam **muitas e grandes**.
- **A moldura creme permanece.** O escuro fica **dentro de uma folha clara** (topo creme, margem creme lateral, ilha creme, seção
  Visite creme), não sangra na tela.
- **O tom continua o do DIRECAO:** generoso, acolhedor, descomplicado. Nada de "experiência exclusiva" ou "alta gastronomia".

**Risco que continua valendo:** quem compara os dois sites ainda vê "dois japoneses escuros". A diferenciação depende
de cumprir à risca as proibições acima e do calor das fotos.

### 2.3 Trechos claros
| Trecho claro | No mockup? | Decisão |
|---|---|---|
| **Topo creme** | Sim | Seção de transição real: wordmark grande + sobretítulo. No celular, 30–40% da primeira tela, para já aparecerem o escuro e a primeira foto |
| **Margem creme** em volta do escuro | Sim (~7 px em 768) | `padding` fluido: `clamp(6px, 1vw, 16px)` |
| **Ilha creme** do título | Sim | Mantida. Texto escuro sobre claro |
| **Seção "Visite"** | Não | ✅ **Aprovada, em creme**, fechando a página como ela abriu (creme → escuro → creme → rodapé escuro) |

---

## 3. Paleta e tipografia

### 3.1 Paleta (amostrada do mockup)
Valores tirados por mediana de pixels do JPEG, arredondados. Uso só por variáveis CSS.

| Token | HEX | Origem no mockup | Uso |
|---|---|---|---|
| `--creme` | `#EDE7DB` | Fundo do topo e da ilha | Fundos claros, margem, texto grande sobre escuro |
| `--creme-luz` | `#F4EFE6` | Pílula do CTA | Botões sobre escuro, foco |
| `--tinta` | `#141312` | Wordmark e título sobre creme | Texto sobre creme |
| `--tinta-suave` | `#4A4640` | Texto corrido sobre creme | Parágrafos sobre creme |
| `--pedra` | `#0A0B0C` | Base da ardósia | Fundo escuro |
| `--pedra-veio` | `#16171A` | Realces da textura | Textura |
| `--apoio-escuro` | `#AAABA5` | Texto corrido sobre a pedra | Parágrafos sobre escuro (≈ 8,5:1) |
| `--laca` | `#8A0A10` | Face iluminada da fita | Fita: base |
| `--laca-sombra` | `#4A080C` | Dobras | Fita: meio-tom |
| `--laca-funda` | `#220103` | Verso e dobra interna | Fita: face de trás |
| `--laca-brilho` | `#C0605A` | Reflexo especular | Fita: filete de brilho, opacidade baixa |

- O vermelho é só da fita e de acentos mínimos (foco, estrela da nota). Nunca é cor de texto corrido.
- O azul entra **pelas fotos** (travessas); não há token azul.
- Contrastes: `--tinta`/`--creme` ≈ 15:1; `--creme`/`--pedra` ≈ 16:1; `--tinta-suave`/`--creme` ≈ 7,5:1.

### 3.2 Tipografia
| Papel | Mockup | Recomendada | Alternativas |
|---|---|---|---|
| **Display** (wordmark gigante) | Romana em caixa-alta, contraste médio-alto | **Cormorant Garamond 500** | Marcellus 400 · Gilda Display 400 |
| **Títulos** | Mesma família, caixa-alta, peso leve, espaçamento aberto | **Cormorant Garamond 400–500**, `letter-spacing: 0.02em` | Marcellus · EB Garamond |
| **Apoio** (parágrafos, sobretítulos, botões) | Sem-serifa grotesca neutra; sobretítulos em caixa-alta espaçada | **Instrument Sans 400/500** | Hanken Grotesk · Manrope |

- Cormorant só a partir de ~1.5rem e **peso ≥ 500 sobre escuro** (as hastes finas somem).
- Sobretítulos: Instrument Sans 500, caixa-alta, `letter-spacing: 0.14em`, ~0.75rem.
- Escala fluida: `--fs-display: clamp(4rem, 17vw, 13rem)`; `--fs-h2: clamp(2rem, 6vw, 3.5rem)`; `--fs-corpo: clamp(0.95rem, 0.9rem + 0.3vw, 1.1rem)`; `--fs-sobre: 0.75rem`.

**Marca ✅ decidido:**
- O "KAWAGE" em serifa é **tipografia de título**, em texto HTML real. **Nunca** vira selo, favicon, ícone, imagem de marca,
  assinatura de rodapé nem "logo alternativo".
- O **logo real (sol + hashis, `imgi_2`)** é o **único símbolo de marca** do site: cabeçalho fixo e rodapé. Enquanto não houver
  versão em alta (D6), usa-se a de 150 px no tamanho em que ela não pixeliza (≤ 75 px CSS em telas 2×).

---

## 4. A fita vermelha em SVG/CSS ✅ aprovada

### 4.1 O que ela é
Uma fita de laca vermelha **contínua**, que nasce no topo, desce em S pela página, torce mostrando o verso mais escuro e
termina acima do CTA. No mockup ela serve de bandeja para a comida; **isso não será reproduzido: a fita nunca carrega comida.**

### 4.2 Construção
- **Um único `<svg data-fita>`** decorativo (`aria-hidden="true"`, `focusable="false"`, `pointer-events: none`), com
  `position: absolute`, **filho direto** do wrapper `.pagina[data-raiz-fita]` que contém as seções 1–4, ou do `<body>`.
  **Nunca** cópias locais por seção.
- **Forma em preenchimento**, não traço: cada trecho é um `<path>` fechado (duas bordas), para a largura variar nas torções.
  No mockup, a face da fita ocupa de ~3% da largura (de perfil) a ~19% (de frente).
- **Faces:** trechos alternados de "frente" (gradiente `--laca` → `--laca-sombra`) e "verso" (`--laca-funda` → `--laca-sombra`).
- **Brilho:** `<path>` fino em `--laca-brilho`, `opacity: .35–.5`, blur leve do próprio SVG; luz do alto e da esquerda.
- **Sombra na pedra:** cópia do contorno em `--pedra`, com blur grande e opacidade baixa. Nada de `box-shadow` padrão.
- **Responsivo:** um desenho de caminho por faixa de largura (§7), trocado por `@media`. Nada de `preserveAspectRatio="none"`.
- **Movimento (opcional):** revelar de cima para baixo com a rolagem; estático com `prefers-reduced-motion: reduce`.

### 4.3 Fotos junto da fita, nunca grudadas
- As fotos são `<img>` com posição **independente** do caminho da fita, **sobre** ela por `z-index`.
- **No máximo metade do objeto** sobre a fita; a outra metade sobre a pedra.
- Redesenhar a fita não move nenhuma foto, e vice-versa.

### 4.4 Sombra de contato das fotos
Recorte com alfa + `filter: drop-shadow()` em **duas camadas** em `--pedra` (curta e densa + longa e difusa), no token
`--sombra-objeto`. O `filter` fica **no `<img>` em camada**, nunca num ancestral (ver §4.6).

### 4.5 Fita × wordmark
- **Topo:** a fita passa **na frente** do "W" do wordmark preto.
- **Seção 3:** a fita passa **na frente** do "A" do wordmark creme. O segundo wordmark é decorativo (`aria-hidden="true"`); há um só `<h1>`.

### 4.6 Teste automatizado de empilhamento ✅

A fita só consegue ficar **entre** o wordmark (atrás) e as fotos (na frente) se ela, o wordmark e as fotos estiverem no
**mesmo contexto de empilhamento**. Qualquer ancestral dessas camadas com `isolation`, `transform`, `filter`, `mix-blend-mode`,
`opacity < 1`, `z-index` posicionado, `will-change`, `contain`, `clip-path`, `mask` etc. fecha um contexto local, e aí a seção
inteira passa a ficar por cima ou por baixo da fita.

**Arquivos:**
- `tests/fita/verificar_empilhamento.py`: abre a página no Chromium (Playwright) em **390, 768 e 1440 px**
  (um `transform` que só aparece numa media query também é pego) e reprova se:
  1. não houver **exatamente um** `[data-fita]` (cópia local = erro);
  2. a fita não for **filha direta** do `<body>` ou de `[data-raiz-fita]`;
  3. algum elemento no caminho entre uma camada (`[data-camada]`) e a raiz, incluindo o próprio `<section>`, criar contexto
     de empilhamento; a mensagem diz qual elemento e qual propriedade;
  4. os `z-index` não seguirem `atras-da-fita` < fita < `sobre-a-fita` ≤ `texto`;
  5. uma seção justificada (abaixo) tiver elementos `sobre-a-fita`.
- `tests/fita/testar_verificador.py` + `tests/fita/fixtures/`: autoteste. Prova que o verificador aprova `ok-*.html` e reprova
  `erro-*.html` (transform numa coluna, isolation só no desktop, filter + blend na seção, cópia local da fita, seção justificada
  com foto por cima). **Estado em 25/09: 7/7 corretos.**

**Como rodar:**
```
python tests/fita/verificar_empilhamento.py            # site/index.html
python tests/fita/verificar_empilhamento.py outra.html # outro arquivo
python tests/fita/testar_verificador.py                # autoteste
```
Roda no fim de cada seção, junto com os screenshots de seção e de página inteira.

**Contrato de marcação que o HTML precisa seguir:**
```html
<body>
  <div class="pagina" data-raiz-fita>             <!-- raiz: position: relative, SEM z-index/transform/etc. -->
    <svg data-fita aria-hidden="true" focusable="false">…</svg>   <!-- z-index: var(--z-fita) -->
    <section data-secao="topo">                   <!-- z-index: auto, sem transform/filter/isolation -->
      <p data-camada="atras-da-fita" aria-hidden="true">KAWAGE</p> <!-- --z-atras -->
      …
      <img data-camada="sobre-a-fita" …>           <!-- --z-sobre -->
      <div data-camada="texto">…</div>             <!-- --z-texto -->
    </section>
    …
  </div>
</body>
```
Tokens: `--z-atras: 1; --z-fita: 2; --z-sobre: 3; --z-texto: 4; --z-cabecalho: 10`.

**Exceção:** se uma seção **precisar** de uma dessas propriedades por outro motivo (ex.: `mix-blend-mode` num mapa), ela declara
`data-contexto-necessario="motivo"`. O teste aceita com aviso, e a consequência fica explícita: a seção inteira passa a ficar
**abaixo** da fita e não pode ter nada marcado `sobre-a-fita`. A fita **continua única e filha da raiz**. Nunca se resolve com
uma cópia local da fita dentro da seção. Se o efeito é necessário só num elemento, aplica-se nele (folha), não no ancestral.

---

## 5. Camadas por seção

Ordem global: **z0** fundo · **z1** tipografia de exibição (atrás da fita) · **z2** fita (SVG único) · **z3** fotos recortadas ·
**z4** texto de leitura e interface · **z10** cabeçalho fixo.

| Seção | z0 fundo | z1 atrás da fita | z2 fita | z3 fotos | z4 texto / UI | Observações |
|---|---|---|---|---|---|---|
| **1 · Topo** | `--creme` | Wordmark "KAWAGE" `--tinta` | Nasce acima do quadro, cruza na frente do "W" | — | Sobretítulo real · Instagram (se houver @) · pílula MENU | Transição clara → escura. `<h1>` aqui |
| **2 · Hero** | Pedra escura, margem creme lateral | Ilha creme (fundo do bloco de texto) | Primeira curva em S; passa na frente da borda direita da ilha | **A** `imgi_22`, alto à direita · **B** `imgi_37`, baixo à direita | Sobretítulo, "A mesa pede mais um" (autoral), parágrafo real | A ilha é `atras-da-fita`; o texto dela é `texto` |
| **3 · Grelhados** | Pedra | Wordmark "KAWAGE" `--creme`, decorativo | Cobre o "A", curva larga | **C** `imgi_21` sobre a fita, centro · close `imgi_70` em moldura, ao lado do texto | "Da chapa" + "Grelhados de salmão" + parágrafo | — |
| **4 · Rodízio** | Pedra | — | Última curva; afina e termina acima do CTA | **D** `imgi_33` à direita | "Rodízio e à la carte" + mais pedidos + selo "4,5 ★ · 2.851 avaliações no Google" (+ D7) | — |
| **4b · Visite** | `--creme` | — | Sem fita | — | Endereço, horário (D1), telefone, serviços, "Como chegar" | Fecha a moldura creme |
| **5 · CTA + rodapé** | `--pedra` liso | — | — | Logo real · **slot de fachada comentado** (§5.1) | "Falar com o Kawage" · Instagram (D2) · endereço resumido · © | Sem hambúrguer flutuante |
| **Cabeçalho fixo** | Transparente sobre creme; `--pedra` a 90% sobre escuro | — | — | Logo real pequeno | MENU | Fica fora de `[data-raiz-fita]` ou acima dela; `position: fixed` cria contexto, o que é esperado aqui |

### 5.1 Slot da fachada (comentado, pronto para receber foto)
Vai no HTML e no CSS do rodapé **comentado**, sem nenhuma imagem carregada:
```html
<!-- SLOT FACHADA · aguardando foto real do cliente (DESIGN.md §5.1).
     Aceita: foto real noturna OU diurna. PROIBIDO escurecer/colorir para simular noite ou recriar.
     Para ativar: descomentar e apontar para /site/assets/fachada.webp.
<figure class="rodape__fachada">
  <img src="assets/fachada.webp" alt="Fachada do Kawage Sushi na Rua Continental, 372" width="…" height="…" loading="lazy">
</figure>
-->
```
```css
/* SLOT FACHADA · ver DESIGN.md §5.1. A foto entra com a cor dela: sem filter, sem overlay escurecedor.
.rodape__fachada { aspect-ratio: 16 / 7; overflow: hidden; }
.rodape__fachada img { width: 100%; height: 100%; object-fit: cover; }
*/
```
Se a foto for diurna, ela entra **em moldura** (com margem creme em volta, como uma foto emoldurada), não sangrando no rodapé,
para que o contraste de clima seja assumido e não pareça um erro.

---

## 6. Pendências

O `DIRECAO.md` não numera as pendências e os D1–D16 do projeto anterior (Asami) não estão nesta pasta. Numeração própria:
D1–D11 vêm do DIRECAO; D12 em diante surgiram com o mockup.

### Resolvidas em 25/09/2026
| # | Pendência | Resolução |
|---|---|---|
| **D12** | Qual é a marca (serifa do mockup × logo × letreiro) | ✅ Serifa = só tipografia de título; logo real = único símbolo, no cabeçalho e no rodapé (§3.2) |
| **D13** | Composição de desktop + seção "Visite" | ✅ Visite aprovada em creme. Desktop por **proporção** (§7); o que ficou ambíguo virou D18–D22 |
| **D14** | Foto da fachada | ✅ Rodapé sem fachada; slot comentado; aceita noturna ou diurna real, nunca simulada (§5.1). *A foto em si continua a pedir ao cliente* |
| **D15** | "A mesa pede mais um" | ✅ Mantida como **texto autoral** (§1.3) |
| **D17** | Salmão no bloco de sal no lugar do atum | ✅ Aprovada; `imgi_68` descartada do site inteiro (§1.5) |
| — | Clima escuro × DIRECAO | ✅ Escuro confirmado (§2) |
| — | Fita única × contexto de empilhamento | ✅ Aprovada, com teste automatizado (§4.6) |

### Ainda abertas (dependem do cliente)
| # | Pendência | Efeito no design | Bloqueia |
|---|---|---|---|
| **D1** | Horário completo (só se sabe "abre 11:30") | Seção Visite | Publicação |
| **D2** | @ do Instagram | Ícone oculto até existir | Nada |
| **D3** | Autorização para citar o **Lázaro** | Depoimento sem nome até autorizar | Só a versão com nome |
| **D4** | **WhatsApp** | Destino do único CTA | Texto final do CTA (sem ele: "Ligar") |
| **D5** | O que é o **"Voador"** | Se for a montagem de aros (`imgi_38`/`60`), pode virar uma 5ª parada da fita | Nada |
| **D6** | **Logo em alta resolução / vetor** | Cabeçalho e rodapé, agora que o logo é o único símbolo | Cabeçalho e rodapé finais |
| **D7** | **Bebida e sobremesa inclusas** | Parágrafo da seção 4 | Esse parágrafo |
| **D8** | Preço de almoço × jantar | Nenhum preço no site | Qualquer menção a preço |
| **D9** | Canal de delivery | "Entrega sem contato" sem botão "Pedir" | Só o botão "Pedir" |
| **D10** | "Rede": outras unidades? | Texto sem "rede" | Arquitetura, se houver |
| **D11** | Direito de uso das fotos (reposts 45, 53, 54, 56; painel da gueixa) | `imgi_68` já saiu; as outras seguem fora do destaque | Uso final dessas fotos |
| **D14b** | Foto da fachada (noturna ou diurna) | Ativa o slot §5.1 | Nada |
| **D16** | Nomes dos pratos no cardápio | Legendas das seções 3 e 4 | Legendas finais |

### Novas: ambiguidades da extrapolação para desktop (§7)
| # | Dúvida | Proposta padrão, até decisão em contrário |
|---|---|---|
| **D18** | **Largura máxima do "palco".** Proporção pura faz o wordmark ter 61% de qualquer tela (1170 px numa tela de 1920) | Palco com teto de **1280 px**; fora dele, só pedra e margem creme |
| **D19** ✅ | **Altura.** Escalar pela largura torna a página ~1,9× mais alta em 1440 px | **Resolvida:** altura maior aceita; não forçar compactação |
| **D20** ✅ | **O que ocupa o espaço horizontal extra** no desktop | **Resolvida:** pedra, moldura creme e ilha vão até as bordas da tela; a composição mantém as distâncias proporcionais do mockup dentro do palco; nenhuma coluna nova |
| **D21** | **Celular (< 600 px):** as duplas texto + foto do mockup ficam lado a lado a 768; empilhadas, qual vem primeiro? | Seguir a ordem de leitura do mockup (de cima para baixo): foto A → título → foto B; wordmark → foto C → texto; texto do rodízio → foto D |
| **D22** | **Close `imgi_70`** não existe no mockup | *Aplicada a regra padrão em 25/09:* abaixo do texto dos grelhados ele cairia sobre a curva direita da fita e sobre a área do shimeji (composição nova), então **saiu da seção 03**. O asset `grelhado-close` continua pronto para outro uso, se aprovado |

---

## 7. Desktop e celular a partir do mockup: extrapolação por proporção

O mockup (768 px) é a **referência 1:1**. As outras larguras não são "novos layouts": são o mesmo layout, com as mesmas
**proporções relativas** e a **mesma ordem de leitura**.

### 7.1 Proporções medidas no mockup (% da largura de 768)
| Elemento | Largura | Início (x) |
|---|---|---|
| Wordmark do topo | 60,5% | 19,5% |
| Wordmark escuro (seção 3) | 71,6% | 14,3% |
| Ilha creme | 50,1% | 0% |
| Foto A (hero) | 27,3% | 35,8% |
| Foto B | 31,5% | 37,8% |
| Foto C (chapa) | 39,1% | 31,9% |
| Foto D (shimeji) | 27,0% | 47,5% |
| Coluna de texto do hero | 23,7% | 19,3% |
| Texto dos grelhados | 14,6% | 71,0% |
| Texto do rodízio | 19,5% | 19,5% |
| Pílula CTA | 17,4% | 41,3% |
| Face da fita | 3% (de perfil) a 19% (de frente) | — |

### 7.2 Regras
1. **Unidade de palco.** Todas as medidas acima viram frações de `--palco` = `min(100vw − 2×margem, 1280px)` (teto: D18).
   Tamanhos em `calc(var(--palco) * 0.273)` etc., nunca em px fixos.
2. **Proporções entre si são invariantes:** wordmark : foto : fita : coluna de texto mantêm as razões do §7.1 em qualquer
   largura ≥ 768.
3. **Ordem de leitura invariante** (é também a ordem do DOM): topo → A → título do hero → B → wordmark escuro → C → grelhados →
   rodízio → D → Visite → CTA/rodapé.
4. **Espaço horizontal extra (≥ 1024 px):** o mockup já põe texto e foto lado a lado a 768. No desktop isso continua; o ganho é
   **respiro**, não colunas novas. Textos com menos de 24 caracteres por linha no palco escalado ganham largura até ~40ch,
   sem mudar de lado.
5. **Abaixo de 768 px:** as duplas lado a lado viram empilhadas na ordem da regra 3 (D21). Fotos passam a ~70% da largura;
   wordmarks mantêm a fração do mockup (61% / 72%); a fita ganha um caminho próprio, mais estreito.
6. **Onde a regra não decidir, não se inventa:** a dúvida vai para a tabela D18+ e a composição fica a mais literal possível
   em relação ao mockup até a resposta.

### 7.3 Verificação visual em telas grandes
Antes de fechar a **passada responsiva geral**, rodar `npm run shots -- 1920 2560` e conferir:
- o palco para em 1280 px e fica centralizado;
- pedra, moldura creme e ilha chegam às bordas da tela (D20), sem faixa creme sobrando nem textura esticada;
- a fita continua centrada no palco e não encosta nas bordas;
- o logo de 150 px não passa de 75 px CSS.

**Estado:** pendente (ainda não rodado).

---

## 8. Polimento (não bloqueia)

| # | Item | Quando | Direção |
|---|---|---|---|
| P1 | **Transição creme → pedra do hero** tem bordas retas e abruptas (topo creme e ilha creme cortam a pedra em linhas horizontais e verticais secas) | Passada de motion ou revisão visual futura | Avaliar suavizar a borda com degradê curto ou uma borda com textura (pedra "lascada") em vez do corte reto. Manter a leitura da moldura creme; não virar um degradê longo |

