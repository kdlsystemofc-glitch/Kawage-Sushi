#!/usr/bin/env bash
# Regressão completa para fechar uma fase (PROGRESSO.md). Uso: bash scripts/fechar-fase.sh <rotulo>
# Roda: test:motion, autoteste da fita, empilhamento com motion, auditoria (motion full, reduced, paused,
# sem gesto em todas as telas e modos, e WebKit com motion) e Lighthouse mobile (mediana de 5).
# Sai com 1 se qualquer etapa falhar. O resumo fica em screenshots/fases/<rotulo>.txt.
set -u
ROTULO="${1:-fase}"
mkdir -p screenshots/fases
LOG="screenshots/fases/${ROTULO}.txt"
: > "$LOG"
falhou=0
passo() { # nome, comando
  local nome="$1"; shift
  local saida; saida=$("$@" 2>&1); local codigo=$?
  echo "$saida" >> "$LOG"
  if [ $codigo -eq 0 ]; then echo "✓ $nome"; else echo "✗ $nome"; echo "$saida" | grep -E "✗|ERRO|Error" | head -8; falhou=1; fi
}
passo "test:motion" npm run -s test:motion
passo "autoteste da fita (7/7)" python tests/fita/testar_verificador.py
passo "empilhamento com motion (390, 768, 1440)" python tests/fita/verificar_empilhamento.py --motion
passo "auditoria motion full" node scripts/auditar.mjs --motion full
passo "auditoria motion reduced" node scripts/auditar.mjs --motion reduced
passo "auditoria motion paused" node scripts/auditar.mjs --motion paused
passo "auditoria sem gesto (12 telas, todos os modos)" node scripts/auditar.mjs
passo "auditoria WebKit + motion" node scripts/auditar.mjs --webkit 1440x900 1024x768 768x1024 390x844 320x568 844x390 --motion full
if [ -f scripts/test-seo.mjs ]; then passo "SEO" node scripts/test-seo.mjs; fi
node scripts/lighthouse.mjs --n 5 --rotulo "$ROTULO" | tee -a "$LOG"
echo
[ $falhou -eq 0 ] && echo "REGRESSÃO VERDE ($ROTULO)" || echo "REGRESSÃO COM FALHA ($ROTULO)"
exit $falhou
