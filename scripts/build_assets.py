"""Gera site/assets/*.webp a partir das fotos reais de imagens/ e escreve assets.md.

Cada slot do DESIGN.md aponta para UMA foto real. Slots "recorte" passam por remoção de fundo
(rembg; o modelo foi escolhido por slot, ver MODELO) e ficam com canal alfa; slots "moldura" são
cortes retangulares. Nada é ampliado: se a fonte for menor que a largura pedida, sai no tamanho
real e o assets.md avisa.

Uso: python scripts/build_assets.py
"""

import glob
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
FONTE = RAIZ / "imagens"
DESTINO = RAIZ / "site" / "assets"
LARGURAS = (800, 1600)

# slot, arquivo-fonte (id imgi_), tipo, modelo de recorte, caixa de corte (fração l,t,r,b), alt, seção
SLOTS = [
    ("hero-salmao-bloco-sal", "22", "recorte", "birefnet-general", None,
     "Fatias de salmão enroladas sobre um bloco de sal rosa", "02 hero · posição A"),
    ("sushi-variado", "37", "recorte", "birefnet-general", None,
     "Sushis variados: niguiris maçaricados, hossomakis e joes", "02 hero · posição B"),
    ("grelhado-chapa", "21", "recorte", "isnet-general-use", None,
     "Salmão grelhado com legumes na chapa de ferro", "03 grelhados · posição C"),
    ("grelhado-close", "70", "moldura", None, (0.0, 0.18, 1.0, 1.0),
     "Postas de salmão grelhado na chapa, de perto", "03 grelhados · close"),
    ("shimeji-chapa", "33", "recorte", "isnet-general-use", None,
     "Shimeji com cebolinha servido na chapa", "04 rodízio · posição D"),
]
# Slots do DESIGN.md sem arquivo (avisados no assets.md).
SEM_ARQUIVO = [
    ("fachada", "05 rodapé · slot comentado", "Sem foto utilizável: a imgi_28 tem 640 px, é diurna e inclinada. Aguardando foto do cliente (D14b)."),
    ("logo (alta resolução)", "cabeçalho e rodapé", "Só existe imgi_2 com 150×150 px. Usado no tamanho nativo; vetor pendente (D6)."),
]
DESCARTADAS = {"68": "descartada do site inteiro (decisão de 25/09)"}

_sessoes = {}


def fonte(id_):
    return Path(glob.glob(str(FONTE / f"imgi_{id_}_*"))[0])


def recortar(img, modelo):
    from rembg import new_session, remove

    if modelo not in _sessoes:
        _sessoes[modelo] = new_session(modelo)
    rgba = remove(img, session=_sessoes[modelo])
    a = np.array(rgba.split()[3])

    # Só o maior objeto: restos de fundo (mesa, outras travessas) viram ruído desconectado.
    import cv2

    binaria = (a > 110).astype(np.uint8)
    binaria = cv2.morphologyEx(binaria, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, rotulos, stats, _ = cv2.connectedComponentsWithStats(binaria, 8)
    maior = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    manter = (rotulos == maior).astype(np.uint8)
    manter = cv2.dilate(manter, np.ones((5, 5), np.uint8))
    a = (a * manter).astype(np.uint8)

    # Sem halo: encolhe 1 px a borda e suaviza.
    alfa = Image.fromarray(a).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    rgba.putalpha(alfa)
    x0, y0, x1, y1 = alfa.point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = int(max(rgba.size) * 0.01)
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def salvar(img, nome):
    saidas = []
    for alvo in LARGURAS:
        w = min(alvo, img.width)
        h = round(img.height * w / img.width)
        out = img.resize((w, h), Image.LANCZOS) if w != img.width else img
        caminho = DESTINO / f"{nome}-{alvo}.webp"
        out.save(caminho, "WEBP", quality=82, method=6, **({"exact": False} if out.mode == "RGBA" else {}))
        saidas.append((caminho.name, w, h, caminho.stat().st_size, w < alvo))
    return saidas


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    DESTINO.mkdir(parents=True, exist_ok=True)
    linhas = []
    for nome, id_, tipo, modelo, caixa, alt, secao in SLOTS:
        arq = fonte(id_)
        img = Image.open(arq).convert("RGB")
        if caixa:
            l, t, r, b = caixa
            img = img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
        final = recortar(img, modelo) if tipo == "recorte" else img
        saidas = salvar(final, nome)
        linhas.append((nome, arq.name, Image.open(arq).size, tipo, modelo, alt, secao, saidas))
        print(f"{nome}: {', '.join(f'{s[0]} {s[1]}×{s[2]}' for s in saidas)}")

    # logo: tamanho nativo, fundo branco vira transparente (para funcionar no creme e no escuro)
    logo = Image.open(fonte("2")).convert("RGBA")
    px = np.array(logo)
    branco = (px[..., :3].min(axis=2) > 235)
    px[..., 3] = np.where(branco, 0, 255)
    Image.fromarray(px).save(DESTINO / "logo-kawage-150.webp", "WEBP", lossless=True)
    print("logo-kawage-150.webp 150×150")

    escrever_md(linhas)


def escrever_md(linhas):
    kb = lambda b: f"{b / 1024:.0f} KB"
    md = ["# Assets — Kawage Sushi", "",
          "Gerado por `scripts/build_assets.py` (não editar à mão). Todas as fontes são fotos reais de `imagens/`.",
          "Nenhum arquivo de `design/` é usado no site.", "",
          "## Slots com arquivo", "",
          "| Slot | Seção | Fonte | Tipo | 800 | 1600 | alt |", "|---|---|---|---|---|---|---|"]
    avisos = []
    for nome, src, (sw, sh), tipo, modelo, alt, secao, saidas in linhas:
        cel = []
        for arq, w, h, tam, menor in saidas:
            cel.append(f"`{arq}` {w}×{h} ({kb(tam)})" + (" ⚠" if menor else ""))
            if menor:
                avisos.append(f"`{arq}`: a fonte ({src[:8]}…, {sw}×{sh}) rende só {w} px de largura após o corte; não foi ampliada.")
        t = f"recorte ({modelo})" if tipo == "recorte" else "moldura"
        md.append(f"| `{nome}` | {secao} | `{src[:8]}…` ({sw}×{sh}) | {t} | {cel[0]} | {cel[1]} | {alt} |")
    md += ["| `logo-kawage-150` | cabeçalho, rodapé | `imgi_2…` (150×150) | fundo branco → transparente | — | — | Kawage Sushi |", ""]
    md += ["## ⚠ Avisos", ""]
    md += [f"- **Slot sem arquivo: {n}** ({onde}). {motivo}" for n, onde, motivo in SEM_ARQUIVO]
    md += [f"- {a}" for a in avisos]
    md += [f"- `imgi_{k}`: {v}." for k, v in DESCARTADAS.items()]
    md += ["", "## Plates abstratos (sem arquivo de imagem)", "",
           "| Plate | Onde | Como |", "|---|---|---|",
           "| Fita de laca | seções 01–04 | SVG inline único `svg[data-fita]` no `index.html` (camadas: sombra, base, verso, brilho, reflexo) |",
           "| Pedra escura | fundo das seções escuras | CSS: gradientes + `feTurbulence` em SVG data-URI (`site/css/base.css`) |", ""]
    (RAIZ / "assets.md").write_text("\n".join(md), encoding="utf-8")
    print("assets.md escrito")


if __name__ == "__main__":
    main()
