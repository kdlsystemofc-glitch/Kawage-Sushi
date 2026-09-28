"""Garante que a fita vermelha (SVG único) nunca fica presa num contexto de empilhamento local.

Contrato de marcação (ver DESIGN.md §4.6):
  - exatamente um  <svg data-fita>  na página, filho direto do <body> ou de [data-raiz-fita];
  - cada seção é  <section data-secao="nome">  dentro dessa raiz;
  - elementos em camadas levam  data-camada="atras-da-fita" | "sobre-a-fita" | "texto";
  - uma seção que PRECISA criar contexto declara  data-contexto-necessario="motivo";
    ela fica inteira abaixo da fita e não pode ter nada marcado "sobre-a-fita".

Uso:
  python tests/fita/verificar_empilhamento.py [arquivo.html ...]   (padrão: site/index.html)
  python tests/fita/verificar_empilhamento.py --motion            (carrega o motion antes de verificar)
Sai com código 1 se qualquer verificação falhar, em qualquer viewport.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

VIEWPORTS = {"celular": (390, 844), "tablet": (768, 1024), "desktop": (1440, 900)}

# Roda no navegador (tests/fita/verificar.js). Devolve {"erros": [...], "avisos": [...]}.
VERIFICAR_JS = (Path(__file__).parent / "verificar.js").read_text(encoding="utf-8")


def verificar(arquivos, motion=False):
    falhou = False
    with sync_playwright() as p:
        navegador = p.chromium.launch()
        for arquivo in arquivos:
            url = Path(arquivo).resolve().as_uri()
            for nome, (w, h) in VIEWPORTS.items():
                pagina = navegador.new_page(viewport={"width": w, "height": h})
                pagina.goto(url)
                if motion and "fixtures" not in arquivo:
                    pagina.keyboard.press("Shift")  # dispara o carregador do motion
                    pagina.wait_for_function("document.documentElement.dataset.motionReady === 'true'", timeout=12000)
                r = pagina.evaluate(VERIFICAR_JS)
                pagina.close()
                estado = "FALHOU" if r["erros"] else "ok"
                print(f"[{estado}] {arquivo} · {nome} {w}px")
                for e in r["erros"]:
                    print(f"    ERRO  {e}")
                for a in r["avisos"]:
                    print(f"    aviso {a}")
                falhou |= bool(r["erros"])
        navegador.close()
    return falhou


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    motion = "--motion" in sys.argv
    alvos = [a for a in sys.argv[1:] if a != "--motion"] or ["site/index.html"]
    faltando = [a for a in alvos if not Path(a).exists()]
    if faltando:
        print(f"arquivo não encontrado: {', '.join(faltando)}")
        sys.exit(2)
    sys.exit(1 if verificar(alvos, motion) else 0)
