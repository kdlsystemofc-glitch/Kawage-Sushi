// Menu em overlay (DESIGN.md §9, D48). Script clássico, carregado com defer: não depende do GSAP nem do motion
// (o MENU está acima da dobra, D25). Sem JS, o MENU é um link para #menu e o overlay abre por :target.
// Com JS: fade de 320 ms, itens em sequência (CSS), foco preso, Esc fecha, foco volta ao botão, rolagem travada
// só com o menu aberto. Utilizável desde o 1º quadro (sem inert e sem pointer-events: none na transição).
(() => {
  const raiz = document.documentElement;
  const botao = document.querySelector(".cabecalho__menu");
  const menu = document.getElementById("menu");
  if (!botao || !menu) return;

  // aprimoramento: o link vira botão de abrir/fechar
  botao.setAttribute("role", "button");
  botao.setAttribute("aria-expanded", "false");
  botao.setAttribute("aria-controls", "menu");
  menu.hidden = true;
  menu.classList.add("menu--js");
  if (location.hash === "#menu") history.replaceState(null, "", location.pathname + location.search);

  let aberto = false;
  let fechamento = 0; // timer que esconde o overlay depois do fade de saída
  const focaveis = () => [...menu.querySelectorAll("a[href], button:not([disabled])")];

  const abrir = () => {
    if (aberto) return;
    aberto = true;
    clearTimeout(fechamento);
    menu.hidden = false;
    raiz.classList.add("menu-aberto"); // trava a rolagem (CSS) e para o Lenis (core.js)
    botao.setAttribute("aria-expanded", "true");
    // estado inicial pintado antes de ligar a classe que anima (senão a transição não acontece)
    menu.getBoundingClientRect();
    menu.classList.add("menu--visivel");
    focaveis()[0]?.focus({ preventScroll: true });
  };

  const fechar = ({ devolverFoco = true } = {}) => {
    if (!aberto) return;
    aberto = false;
    raiz.classList.remove("menu-aberto");
    botao.setAttribute("aria-expanded", "false");
    menu.classList.remove("menu--visivel");
    clearTimeout(fechamento);
    // o fade de saída dura até 200 ms; depois disso o overlay sai da árvore de acessibilidade
    fechamento = setTimeout(() => { if (!aberto) menu.hidden = true; }, 220);
    if (devolverFoco) botao.focus({ preventScroll: true });
  };

  botao.addEventListener("click", (e) => {
    e.preventDefault();
    if (aberto) fechar(); else abrir();
  });
  menu.querySelector(".menu__fechar")?.addEventListener("click", (e) => { e.preventDefault(); fechar(); });

  // item do menu: fecha (destrava a rolagem já) e deixa a navegação seguir (âncora nativa ou Lenis)
  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a || a.classList.contains("menu__fechar")) return;
    fechar({ devolverFoco: false });
  });

  document.addEventListener("keydown", (e) => {
    if (!aberto) return;
    if (e.key === "Escape") { e.preventDefault(); fechar(); return; }
    if (e.key !== "Tab") return;
    // foco preso dentro do overlay
    const f = focaveis();
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });

  window.kawageMenu = { abrir, fechar, get aberto() { return aberto; } }; // gancho para os testes
})();
