"""Gera site/css/fontes-file.css: as woff2 do site em base64, para abrir por file:// (duplo clique).
Uso: python scripts/fontes-file.py  (rodar de novo se as fontes mudarem)"""
import base64, pathlib
FONTES = [("Cormorant Garamond", "400", "cormorant-garamond-latin-400-normal.woff2"),
          ("Cormorant Garamond", "500", "cormorant-garamond-latin-500-normal.woff2"),
          ("Cormorant Garamond", "600", "cormorant-garamond-latin-600-normal.woff2"),
          ("Instrument Sans", "400 700", "instrument-sans-latin-wght-normal.woff2")]
css = ["/* Só para abrir por file:// (duplo clique): o Chrome bloqueia @font-face de arquivo local por CORS.",
       "   Gerado por scripts/fontes-file.py a partir de site/assets/fonts. Não é carregado por http(s). */"]
for fam, peso, arq in FONTES:
    b64 = base64.b64encode(pathlib.Path("site/assets/fonts/" + arq).read_bytes()).decode()
    css.append(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{peso};font-display:swap;src:url(data:font/woff2;base64,{b64}) format("woff2")}}')
pathlib.Path("site/css/fontes-file.css").write_text("
".join(css) + "
", encoding="utf-8")
print("site/css/fontes-file.css escrito")
