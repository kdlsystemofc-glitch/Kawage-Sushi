// Verificação de empilhamento da fita (DESIGN.md §4.6), compartilhada entre
// tests/fita/verificar_empilhamento.py e scripts/test-motion.mjs. É uma função:
// avaliada no navegador, devolve { erros: [...], avisos: [...] }.
() => {
  const erros = [], avisos = [];
  const desc = el => {
    if (el === document.body) return 'body';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.dataset.secao) s += `[data-secao="${el.dataset.secao}"]`;
    else if (el.classList.length) s += '.' + [...el.classList].join('.');
    return s;
  };

  // Propriedades que criam um novo contexto de empilhamento.
  const motivos = el => {
    const cs = getComputedStyle(el);
    const pai = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const m = [];
    const z = cs.zIndex !== 'auto';
    if (cs.position === 'fixed' || cs.position === 'sticky') m.push(`position: ${cs.position}`);
    if (z && cs.position !== 'static') m.push(`z-index: ${cs.zIndex} com position: ${cs.position}`);
    if (z && pai && /flex|grid/.test(pai.display)) m.push(`z-index: ${cs.zIndex} em item flex/grid`);
    if (parseFloat(cs.opacity) < 1) m.push(`opacity: ${cs.opacity}`);
    for (const p of ['transform', 'translate', 'rotate', 'scale', 'filter', 'backdropFilter',
                     'perspective', 'clipPath', 'maskImage', 'viewTransitionName']) {
      const v = cs[p];
      if (v && v !== 'none') m.push(`${p}: ${v}`);
    }
    if (cs.mixBlendMode !== 'normal') m.push(`mix-blend-mode: ${cs.mixBlendMode}`);
    if (cs.isolation === 'isolate') m.push('isolation: isolate');
    if (/transform|opacity|filter|perspective|isolation|mix-blend-mode|clip-path|mask/.test(cs.willChange))
      m.push(`will-change: ${cs.willChange}`);
    if (/layout|paint|strict|content/.test(cs.contain)) m.push(`contain: ${cs.contain}`);
    if (/size|inline-size/.test(cs.containerType)) m.push(`container-type: ${cs.containerType}`);
    return m;
  };

  const fitas = document.querySelectorAll('svg[data-fita], [data-fita]');
  if (fitas.length !== 1) {
    erros.push(`esperada exatamente 1 fita [data-fita], encontradas ${fitas.length} (cópias locais são proibidas)`);
    if (!fitas.length) return { erros, avisos };
  }
  const fita = fitas[0];
  const raiz = fita.parentElement;
  if (raiz !== document.body && !raiz.hasAttribute('data-raiz-fita'))
    erros.push(`a fita é filha de ${desc(raiz)}; precisa ser filha direta do <body> ou de [data-raiz-fita]`);

  const zNum = el => { const z = getComputedStyle(el).zIndex; return z === 'auto' ? 0 : parseInt(z, 10); };
  const zFita = zNum(fita);
  if (getComputedStyle(fita).position === 'static') erros.push('a fita precisa ter position (absolute/fixed) para usar z-index');
  if (getComputedStyle(fita).pointerEvents !== 'none') avisos.push('a fita deveria ter pointer-events: none');

  const secoes = [...document.querySelectorAll('[data-secao]')];
  if (!secoes.length) erros.push('nenhuma seção [data-secao] encontrada');

  for (const secao of secoes) {
    if (!raiz.contains(secao)) { erros.push(`${desc(secao)} está fora da raiz da fita`); continue; }
    const justificativa = secao.getAttribute('data-contexto-necessario');
    const camadas = [...secao.querySelectorAll('[data-camada]')];

    // Caminho de cada elemento em camada (exclusive) até a raiz (exclusive).
    const caminho = new Set([secao]);
    for (const c of camadas)
      for (let a = c.parentElement; a && a !== raiz; a = a.parentElement) caminho.add(a);

    for (const el of caminho) {
      const m = motivos(el);
      if (!m.length) continue;
      if (el === secao && justificativa) {
        avisos.push(`${desc(secao)} cria contexto (${m.join('; ')}), justificado: "${justificativa}"; a seção inteira fica abaixo da fita`);
        continue;
      }
      erros.push(`${desc(el)} (em ${desc(secao)}) cria contexto de empilhamento e prende a fita: ${m.join('; ')}`);
    }

    for (const c of camadas) {
      const tipo = c.dataset.camada, z = zNum(c);
      const pos = getComputedStyle(c).position;
      const rotulo = `${desc(c)} [${tipo}] em ${desc(secao)}`;
      if (justificativa && tipo === 'sobre-a-fita')
        erros.push(`${rotulo}: a seção cria contexto próprio, então este elemento ficaria ABAIXO da fita`);
      if (tipo === 'atras-da-fita' && !(z < zFita)) erros.push(`${rotulo}: z-index ${z} deveria ser menor que o da fita (${zFita})`);
      if ((tipo === 'sobre-a-fita' || tipo === 'texto') && !(z > zFita))
        erros.push(`${rotulo}: z-index ${z} deveria ser maior que o da fita (${zFita})`);
      if (tipo !== 'atras-da-fita' && pos === 'static') erros.push(`${rotulo}: precisa de position para o z-index valer`);
    }
  }
  return { erros, avisos };
}
