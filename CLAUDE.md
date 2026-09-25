# Regras do projeto — Kawage Sushi (v2)

- Os arquivos em /design são REFERÊNCIA VISUAL. NUNCA usar como <img>,
  background-image, ou qualquer parte do site.
- Todo texto é HTML real. Nenhum texto dentro de imagem.
- Toda imagem vem de /site/assets: fotos REAIS do cliente (de /imagens)
  ou plates gerados de /design/plates.

REGRA DE OURO — o que é real e o que é gerado:
- Comida, fachada, salão, pessoas, logo: SEMPRE fotos reais do cliente
  (de /imagens), nunca as versões do mockup, que são inventadas pela IA
  de geração de imagem. Recorte/componha à vontade, mas a fonte é real.
- O laço/fita vermelha: é decorativo e abstrato, pode ser recriado
  livremente em SVG/CSS, sem depender de nenhum asset de imagem.
  Nunca carrega foto grudada nela — as fotos ficam por cima ou ao lado,
  por z-index, não "soldadas" ao caminho da fita.
- Texturas de fundo (pedra escura, respingos, brilho): podem ser CSS/SVG
  ou plates gerados, contanto que sejam abstratas.

- Cores, fontes, espaçamentos: só via variáveis CSS definidas em DESIGN.md.
- Mobile-first, unidades fluidas (clamp), sem largura fixa em px.
- Proibido: fonte Inter/Roboto/Arial, sombras padrão, cards genéricos.
- Ao terminar cada seção: screenshot da SEÇÃO e também da PÁGINA INTEIRA
  (para checar a costura com a seção anterior), comparar com a
  referência, listar diferenças e corrigir (máx. 3 iterações).
- Ao fim de cada etapa: commit e push, com o mesmo método (token só em
  variável de ambiente, nunca colado no chat).