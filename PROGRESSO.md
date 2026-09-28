# PROGRESSO — Kawage Sushi

Registro das fases finais. Se a sessão for interrompida, retomar pela primeira fase que não estiver ✅.
Cada fase fecha com: `bash scripts/fechar-fase.sh <rotulo>` verde (test:motion, autoteste da fita, empilhamento com
motion, auditoria em motion full/reduced/paused, sem gesto e WebKit, e Lighthouse mobile com mediana de 5), commit e tag.
Regra de desempenho: o Lighthouse mobile não cai mais de 3 pontos contra a fase anterior.

**Ponto de partida (28/09/2026):** commit `1218474 motion secao 3 pronta` · Lighthouse mobile 85 (mediana de 5), LCP 3,69 s.
Push: a variável `GH_TOKEN` não existe nesta sessão → só commits e tags locais, até ela ser definida.

| Fase | Status | Commit | Tag | Lighthouse (antes → depois) | Pendências |
|---|---|---|---|---|---|
| 1 · Motion da seção 04 | ⏳ | | `motion-s4` | 85 → | |
| 2 · Visite, rodapé, menu, coerência | ⏳ | | `motion-pronto` | | |
| 3 · Otimização | ⏳ | | `site-otimizado` | | |
| 4 · SEO local e metadados | ⏳ | | `site-seo-pronto` | | |
| 5 · QA final e publicação | ⏳ | | `kawage-v1-pronto` | | |
