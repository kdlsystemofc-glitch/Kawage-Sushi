"""Autoteste: o verificador aprova as fixtures ok-* e reprova as erro-*.

Uso: python tests/fita/testar_verificador.py
"""

import contextlib
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from verificar_empilhamento import verificar  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
FIXTURES = Path(__file__).parent / "fixtures"

resultado = 0
for arquivo in sorted(FIXTURES.glob("*.html")):
    esperado_falhar = arquivo.name.startswith("erro-")
    saida = io.StringIO()
    with contextlib.redirect_stdout(saida):
        falhou = verificar([str(arquivo)])
    certo = falhou == esperado_falhar
    print(f"{'PASSOU' if certo else 'ERRADO'}  {arquivo.name}  (esperado {'falhar' if esperado_falhar else 'passar'})")
    if not certo:
        print(saida.getvalue())
        resultado = 1
sys.exit(resultado)
