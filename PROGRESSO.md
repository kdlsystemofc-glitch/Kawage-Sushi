# PROGRESSO — Kawage Sushi

Registro das fases finais. Se a sessão for interrompida, retomar pela primeira fase que não estiver ✅.
Cada fase fecha com: `bash scripts/fechar-fase.sh <rotulo>` verde (test:motion, autoteste da fita, empilhamento com
motion, auditoria em motion full/reduced/paused, sem gesto e WebKit, e Lighthouse mobile com mediana de 5), commit e tag.
Regra de desempenho: o Lighthouse mobile não cai mais de 3 pontos contra a fase anterior.

**Ponto de partida (28/09/2026):** commit `1218474 motion secao 3 pronta` · Lighthouse mobile 85 (mediana de 5), LCP 3,69 s.
Push: `GH_TOKEN` não existe nesta sessão; em 28/09 o dono do projeto autorizou usar o token informado anteriormente (recomendado revogá-lo ao final).

| Fase | Status | Commit | Tag | Lighthouse (antes → depois) | Pendências |
|---|---|---|---|---|---|
| 1 · Motion da seção 04 | ✅ | `683f94c` | `motion-s4` | 85 → **85** | Hover do CTA passou para laca (D47); ponta da fita sem entrada (não precisou) |
| 2 · Visite, rodapé, menu, coerência | ✅ | `1c2ad16` | `motion-pronto` | 85 → **85** (LCP 3,69 → 3,77 s) | Orçamento de 3 loops exigiu a regra "≥ 50 % na tela" (D50); ritmo avaliado pelos números — confirmar olhando os vídeos |
| 3 · Otimização | ✅ | (ver tag) | `site-otimizado` | 85 → **99** (LCP 3,77 → 2,04 s; CLS 0; 878 → 800 KB) | Celular simulado ainda com 2 tarefas longas na carga (SVG da fita ~57 ms, layout ~164 ms com CPU 4×; exige P2); foto B sem versão de 400 px (textura); `decoding="async"` retirado da fita e da foto B; corrigido o carregador que não reconhecia `core.<hash>.js` (1 correção) |
| 4 · SEO local e metadados | ⏳ | | `site-seo-pronto` | | |
| 5 · QA final e publicação | ⏳ | | `kawage-v1-pronto` | | |
