// Gera a fita de laca (SVG puro, estático) e injeta no site/index.html entre
// <!-- fita:inicio --> e <!-- fita:fim -->. Uso: node scripts/build_fita.mjs
//
// Modelo: faixa que desce por uma curva Catmull-Rom pelos pontos de passagem. Cada ponto traz
// a LARGURA APARENTE e a LUZ (0–1) medidas na máscara vermelha do mockup (DESIGN.md §4): em vez
// de simular a torção, a luz é dirigida, para bater com o desenho aprovado. As camadas repetem a
// lógica do wordmark cromado do Asami, traduzida para laca: sombra (cópia borrada e deslocada) →
// base (tom pela luz, meia faixa do lado da luz mais clara) → brilho (faixa especular onde a luz
// passa de 0,68) → reflexo (filete na borda voltada para a luz).
//
// Coordenadas do mockup: "largo" = px de 768 (≥ 768 px, escala por --u), "estreito" = px de 390.
// y conta do topo da página (topo + hero + …).
import { readFile, writeFile } from "node:fs/promises";

const DESENHOS = {
  largo: {
    largura: 768,
    altura: 167 + 459 + 279, // topo + hero + grelhados (cresce com a seção 04)
    passo: 4,
    // [x, y, largura aparente, luz]
    pontos: [
      [372, -40, 60, 0.72], [388, 0, 50, 0.72], [405, 40, 33, 0.62], [407, 80, 19, 0.5],
      [402, 105, 12, 0.85], [384, 128, 26, 0.2], [352, 155, 48, 0.12], [305, 190, 58, 0.12],
      [270, 228, 62, 0.14], [255, 265, 70, 0.22], [268, 300, 100, 0.45], [330, 335, 120, 0.72],
      [411, 370, 122, 0.82], [490, 410, 118, 0.62], [540, 452, 125, 0.5], [530, 502, 110, 0.6],
      [485, 547, 100, 0.72], [420, 590, 96, 0.76], [345, 625, 88, 0.72], [275, 655, 62, 0.78],
      [228, 690, 44, 0.8], [203, 725, 30, 0.75], [192, 760, 22, 0.35], [205, 800, 40, 0.2],
      [245, 845, 60, 0.25], [330, 890, 90, 0.45], [430, 915, 120, 0.55], [520, 935, 110, 0.5],
      [575, 965, 70, 0.4], [585, 1010, 30, 0.75], [565, 1060, 40, 0.6], [500, 1100, 70, 0.3],
      [410, 1130, 120, 0.22], [360, 1165, 110, 0.18], [320, 1195, 70, 0.2], [300, 1215, 24, 0.5],
      [296, 1232, 3, 0.6],
    ],
  },
  estreito: {
    largura: 390,
    altura: 170 + 760 + 480,
    passo: 3,
    pontos: [
      [196, -40, 40, 0.72], [205, -5, 34, 0.72], [212, 30, 26, 0.62], [214, 70, 16, 0.5],
      [211, 118, 8, 0.85], [198, 145, 16, 0.2], [175, 172, 30, 0.12], [150, 205, 36, 0.12],
      [128, 240, 40, 0.15], [118, 275, 48, 0.25], [126, 308, 62, 0.45], [172, 338, 72, 0.72],
      [240, 368, 76, 0.82], [305, 398, 72, 0.62], [350, 440, 70, 0.5], [364, 505, 52, 0.58],
      [362, 585, 46, 0.66], [340, 655, 48, 0.72], [290, 712, 58, 0.76], [180, 752, 60, 0.72],
      [118, 792, 48, 0.78], [98, 840, 40, 0.8], [108, 890, 36, 0.8], [122, 932, 54, 0.8],
      [123, 966, 54, 0.78], [118, 1000, 20, 0.4], [110, 1040, 30, 0.2], [122, 1085, 44, 0.22],
      [160, 1180, 60, 0.4], [250, 1228, 76, 0.55], [328, 1252, 70, 0.5], [362, 1292, 40, 0.45],
      [362, 1335, 26, 0.75], [345, 1395, 44, 0.3], [280, 1450, 80, 0.22], [190, 1510, 60, 0.2],
      [130, 1570, 30, 0.4],
    ],
  },
};

// Luz do alto à esquerda (DESIGN.md §4.2): decide qual borda recebe o reflexo.
const LUZ = norm([-0.38, -0.58, 0.72]);

function norm(v) { const l = Math.hypot(...v); return v.map((c) => c / l); }
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const rgb = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const f = (n) => (Math.round(n * 10) / 10).toString();

// Tons da laca (tokens do DESIGN.md §3.1) + um vermelho mais aceso para o pico difuso.
const FUNDA = hex("#220103"), SOMBRA = hex("#4A080C"), LACA = hex("#8A0A10"), ACESA = hex("#B3171D");
const BRILHO = hex("#C0605A"), REFLEXO = hex("#F2C4B4");

// Catmull-Rom centrípeta amostrada em passos quase uniformes de comprimento.
function amostrar(pontos, passo) {
  const P = [pontos[0], ...pontos, pontos.at(-1)];
  const bruto = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (passo / 4)));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      bruto.push(p1.map((_, j) => cr(p0[j], p1[j], p2[j], p3[j])));
    }
  }
  bruto.push(pontos.at(-1));
  const out = [bruto[0]];
  let acc = 0;
  for (let i = 1; i < bruto.length; i++) {
    acc += Math.hypot(bruto[i][0] - bruto[i - 1][0], bruto[i][1] - bruto[i - 1][1]);
    if (acc >= passo) { out.push(bruto[i]); acc = 0; }
  }
  return out;
}

function gerar(nome, d) {
  const S = amostrar(d.pontos, d.passo);
  const secoes = S.map((p, i) => {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
    const T = norm([b[0] - a[0], b[1] - a[1]]);
    const N = [-T[1], T[0]];
    const luz = Math.max(0, Math.min(1, p[3]));
    // lado da borda voltado para a luz (no plano da tela)
    const lado = Math.sign(N[0] * LUZ[0] + N[1] * LUZ[1]) || 1;
    return { x: p[0], y: p[1], N, hw: p[2] / 2, lado, luz, spec: Math.max(0, (luz - 0.68) / 0.32) ** 1.4 };
  });
  const W = Math.max(...d.pontos.map((p) => p[2])) / 2;
  const tomBruto = (t) => t < 0.3 ? mix(FUNDA, SOMBRA, 0.35 + (0.65 * t) / 0.3) : t < 0.66 ? mix(SOMBRA, LACA, (t - 0.3) / 0.36) : mix(LACA, ACESA, (t - 0.66) / 0.34);
  const tom = (t) => tomBruto(Math.round(t * 40) / 40);

  const ponto = (q, k) => [q.x + q.N[0] * q.hw * k, q.y + q.N[1] * q.hw * k];

  // 1 · sombra: contorno inteiro, preenchido, borrado e deslocado para baixo.
  const esq = secoes.map((q) => ponto(q, 1)), dir = secoes.map((q) => ponto(q, -1)).reverse();
  const contorno = "M" + [...esq, ...dir].map((p) => f(p[0]) + " " + f(p[1])).join("L") + "Z";

  // 2 · base: um quadrilátero por passo, cor pelo difuso; o verso é mais fundo.
  // 3 · brilho: faixa estreita do lado da luz, opacidade pelo especular.
  // 4 · reflexo: filete na borda iluminada.
  const pt = (p) => f(p[0]) + " " + f(p[1]);
  // Tira contínua da amostra i0 até i1 (inclusive) entre as frações k0 e k1 da largura.
  // O lado da luz (k) é o da primeira amostra: dentro de uma tira ele não muda.
  const tira = (i0, i1, k0, k1) => {
    const k = secoes[i0].lado;
    const ida = [], volta = [];
    for (let i = i0; i <= i1; i++) { ida.push(pt(ponto(secoes[i], k * k0))); volta.push(pt(ponto(secoes[i], k * k1))); }
    return "M" + ida.concat(volta.reverse()).join("L") + "Z";
  };
  // Agrupa amostras consecutivas com a mesma chave (e o mesmo lado da luz) em tiras.
  const tiras = (chaveDe, k0, k1) => {
    const out = [];
    let i0 = 0;
    for (let i = 1; i <= secoes.length - 1; i++) {
      const fim = i === secoes.length - 1;
      const muda = chaveDe(secoes[i]) !== chaveDe(secoes[i0]) || secoes[i].lado !== secoes[i0].lado;
      if (muda || fim) {
        const chave = chaveDe(secoes[i0]);
        if (chave !== null) out.push({ chave, d: tira(i0, i, k0, k1) });
        i0 = i;
      }
    }
    return out;
  };

  // base: três faixas graduadas através da largura (do lado da luz para o de sombra), sem vinco
  const base = [
    ...tiras((q) => rgb(tom(Math.min(1, q.luz * 1.1))), 1, 1 / 3),
    ...tiras((q) => rgb(tom(q.luz * 0.98)), 1 / 3, -1 / 3),
    ...tiras((q) => rgb(tom(q.luz * 0.84)), -1 / 3, -1),
  ].map(({ chave, d }) => `<path d="${d}" fill="${chave}" stroke="${chave}" stroke-width=".7"/>`);

  // brilho: faixa especular do lado da luz
  const brilho = tiras((q) => {
    if (q.spec <= 0.02 || q.hw <= 4) return null;
    const sp = Math.round(q.spec * 20) / 20;
    return `fill="${rgb(mix(BRILHO, REFLEXO, sp * 0.6))}" fill-opacity="${Math.min(0.85, sp * 1.1).toFixed(2)}"`;
  }, 0.72, 0.3).map(({ chave, d }) => `<path d="${d}" ${chave}/>`);

  // reflexo: filete na borda da luz (linha aberta, não polígono)
  const reflexo = [];
  let r0 = 0;
  const chaveR = (q) => (q.hw > 2.5 ? (0.22 + 0.4 * Math.round(q.luz * 10) / 10).toFixed(2) : null);
  for (let i = 1; i < secoes.length; i++) {
    if (chaveR(secoes[i]) !== chaveR(secoes[r0]) || secoes[i].lado !== secoes[r0].lado || i === secoes.length - 1) {
      const c = chaveR(secoes[r0]);
      if (c !== null) {
        const k = secoes[r0].lado;
        const linha = [];
        for (let j = r0; j <= i; j++) linha.push(pt(ponto(secoes[j], k * 0.97)));
        reflexo.push(`<path d="M${linha.join("L")}" stroke-opacity="${c}"/>`);
      }
      r0 = i;
    }
  }

  const id = `fita-${nome}`;
  return `<svg class="fita__${nome}" viewBox="0 0 ${d.largura} ${d.altura}" preserveAspectRatio="xMidYMin meet">
        <defs>
          <filter id="${id}-sombra" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="${f(W * 0.28)}"/></filter>
          <filter id="${id}-brilho" x="-10%" y="-5%" width="120%" height="110%"><feGaussianBlur stdDeviation="${f(W * 0.07)}"/></filter>
        </defs>
        <g class="fita__sombra" filter="url(#${id}-sombra)" transform="translate(${f(W * 0.08)} ${f(W * 0.32)})"><path d="${contorno}" fill="#050506" fill-opacity=".6"/></g>
        <g class="fita__base">${base.join("")}</g>
        <g class="fita__brilho" filter="url(#${id}-brilho)">${brilho.join("")}</g>
        <g class="fita__reflexo" fill="none" stroke="${rgb(REFLEXO)}" stroke-width="${f(W * 0.035)}" stroke-linecap="butt" stroke-linejoin="round">${reflexo.join("")}</g>
      </svg>`;
}

const svg = `<!-- fita:inicio (gerado por scripts/build_fita.mjs; não editar à mão) -->
      <svg class="fita" data-fita aria-hidden="true" focusable="false">
      ${Object.entries(DESENHOS).map(([n, d]) => gerar(n, d)).join("\n      ")}
      </svg>
      <!-- fita:fim -->`;

const arq = new URL("../site/index.html", import.meta.url);
const html = await readFile(arq, "utf8");
const novo = html.replace(/<!-- fita:inicio[\s\S]*?<!-- fita:fim -->/, svg);
if (novo === html && !html.includes("fita:inicio")) throw new Error("marcadores da fita não encontrados");
await writeFile(arq, novo);
console.log(`fita: ${(svg.length / 1024).toFixed(0)} KB de SVG injetados em site/index.html`);
