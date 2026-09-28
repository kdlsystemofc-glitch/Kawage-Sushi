// Motion — núcleo e fonte única de verdade do modo de animação (DESIGN.md §9, D23–D29).
// Script clássico (não ES module), para o site abrir por file://. Depende de js/vendor/
// gsap.min.js + ScrollTrigger.min.js (obrigatórios) e lenis.min.js (opcional). É pedido pelo
// carregador do <head> só depois do load / da 1ª interação (D25): nada da 1ª tela depende dele.
//
// API (window.motion):
//   motion.mode             "full" | "reduced" | "paused"   (paused > reduced > full)
//   motion.base             "full" | "reduced"              o que as animações registradas montaram
//   motion.quality          "high" | "low"                  html[data-quality], fixo por carga (D24)
//   motion.on("mode", fn)   fn(modo, anterior) a cada troca; devolve a função que desinscreve
//   motion.register(setup)  setup(motion) roda dentro de um gsap.context e pode devolver uma função
//                           de limpeza. É desfeito e refeito quando motion.base muda. A pausa NÃO
//                           refaz nada: congela a timeline global. Devolve a função que desregistra.
//   motion.loop(el, anim, { grupo })  animação contínua: pausada com `el` fora da tela e com a aba
//                           oculta; recusada em "reduced" (mata a animação e devolve null). Num
//                           `grupo`, só roda a do elemento mais visível
//   motion.entrada(gatilho, tl, fim)  timeline pausada que toca uma vez quando 35 % do gatilho
//                           aparece; em "paused" conclui na hora. Chamar dentro de motion.register
//   motion.abaixo(el)       true se `el` ainda não chegou a --reveal-at de visibilidade
//   motion.rolando          true enquanto a página rola (até 200 ms depois do último scroll)
//   motion.scrollTo(alvo)   rola até um elemento/seletor (Lenis se ativo, senão nativo)
//   motion.scan()           relê data-reveal / data-parallax / data-loop (conteúdo novo)
//   motion.ease, motion.easeSoft, motion.dur("--t-mid")   tokens de tokens.css já convertidos
//   motion.lenis            instância do Lenis ou null
//   motion.debug            gancho de inspeção para os testes
(() => {
  const raiz = document.documentElement;
  const { gsap, ScrollTrigger, Lenis } = window;

  const falhar = (erro) => {
    raiz.classList.remove("js-motion");
    raiz.dataset.motionReady = "failed";
    console.warn("[motion] desligado, conteúdo estático:", erro);
  };
  // o carregador do <head> desistiu (rede lenta): o conteúdo já está todo à mostra e fica assim
  if (raiz.dataset.motionReady === "failed") return;
  if (!gsap || !ScrollTrigger) return falhar("GSAP/ScrollTrigger não carregou");

  try {
    gsap.registerPlugin(ScrollTrigger);

    // ── tokens (tokens.css) ───────────────────────────────────
    const estilo = getComputedStyle(raiz);
    const token = (nome) => estilo.getPropertyValue(nome).trim();
    const dur = (nome) => { const v = token(nome); return v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v); };
    // cubic-bezier(x1, y1, x2, y2) → função de easing do GSAP (sem o plugin CustomEase)
    const bezier = (valor) => {
      const m = /cubic-bezier\(([^)]+)\)/.exec(valor);
      if (!m) return "power3.out";
      const [x1, y1, x2, y2] = m[1].split(",").map(Number);
      const curva = (a, b) => (t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
      const X = curva(x1, x2), Y = curva(y1, y2);
      return (x) => {
        if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
        let lo = 0, hi = 1, t = x;
        for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
        return Y(t);
      };
    };
    const fracaoReveal = () => parseFloat(token("--reveal-at")) || 0.35;

    // ── modos (D23) ───────────────────────────────────────────
    const mqReduzido = matchMedia("(prefers-reduced-motion: reduce)");
    const calcularModo = () => (raiz.dataset.motion === "paused" ? "paused" : mqReduzido.matches ? "reduced" : "full");
    const calcularBase = () => (mqReduzido.matches ? "reduced" : "full");
    // qualidade: decidida no <head>, antes da pintura (a pedra depende dela); aqui só lida
    const quality = raiz.dataset.quality === "low" ? "low" : "high";

    let modo = calcularModo();
    let base = null;
    const ouvintes = new Set();
    const registros = [];
    let emMontagem = null; // registro cujo setup está rodando (para motion.loop achar o dono)
    let rolando = false;
    let fimRolagem = 0;
    const aoParar = new Set(); // chamados quando a rolagem fica 200 ms parada
    addEventListener("scroll", () => {
      rolando = true;
      clearTimeout(fimRolagem);
      fimRolagem = setTimeout(() => { rolando = false; aoParar.forEach((f) => f()); }, 200);
    }, { passive: true });
    let iniciado = false; // ver "início" no fim: nada é montado antes de a rolagem parar

    const emAndamento = new Set(); // tweens de entrada/revelação, concluídos na hora ao pausar

    const api = {
      get mode() { return modo; },
      get base() { return base; },
      quality,
      lenis: null,
      get rolando() { return rolando; },
      debug: {},
      ease: bezier(token("--ease-out")),
      easeSoft: bezier(token("--ease-soft")),
      dur,
      on(evento, fn) {
        if (evento !== "mode") throw new Error(`[motion] evento desconhecido: ${evento}`);
        ouvintes.add(fn);
        return () => ouvintes.delete(fn);
      },
      register(setup) {
        const r = { setup, ctx: null, limpar: null, extras: [] };
        registros.push(r);
        if (iniciado) montar(r);
        return () => { desmontar(r); registros.splice(registros.indexOf(r), 1); };
      },
      loop(el, anim, { grupo = null } = {}) {
        if (base === "reduced") { anim.kill(); return null; }
        loops.add(el, anim, grupo);
        emMontagem?.extras.push(() => loops.remove(el, anim));
        return anim;
      },
      scrollTo(alvo, { imediato = false } = {}) {
        const el = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
        if (!el) return false;
        if (lenis) rolar(el, { immediate: imediato });
        else el.scrollIntoView({ behavior: imediato || mqReduzido.matches ? "auto" : "smooth", block: "start" });
        return true;
      },
      scan() { desmontar(declarativos); montar(declarativos); },
      abaixo(el) {
        return el.getBoundingClientRect().top + Math.min(el.offsetHeight, innerHeight) * fracaoReveal() > innerHeight;
      },
      entrada(gatilho, tl, fim) {
        const tocar = () => {
          tl.eventCallback("onComplete", () => { emAndamento.delete(tl); fim?.(); });
          if (modo === "paused") { tl.progress(1); return; }
          emAndamento.add(tl);
          tl.play();
        };
        ScrollTrigger.create({
          trigger: gatilho, once: true,
          start: () => `top+=${Math.min(gatilho.offsetHeight, innerHeight) * fracaoReveal()} bottom`,
          onEnter: tocar,
        });
        return tl;
      },
    };

    function montar(r) {
      emMontagem = r;
      try {
        r.ctx = gsap.context(() => {
          const limpar = r.setup(api);
          r.limpar = typeof limpar === "function" ? limpar : null;
        });
      } catch (e) {
        console.error("[motion] falha num setup registrado:", e);
      } finally {
        emMontagem = null;
      }
    }
    function desmontar(r) {
      r.extras.splice(0).forEach((f) => f());
      try { r.limpar?.(); } finally { r.ctx?.revert(); r.ctx = r.limpar = null; }
    }

    // ── Lenis: só no modo full (D26) ──────────────────────────
    let lenis = null;
    let destino = null; // alvo da rolagem suave em andamento
    const rolar = (el, opcoes = {}) => {
      destino = el;
      // duração fixa (tokens), não o lerp: a cauda sub-pixel do lerp desfaria uma rolagem nativa
      // (script, foco) feita logo depois
      lenis.scrollTo(el, {
        offset: 0, force: true, duration: dur("--t-slow"), easing: api.easeSoft, ...opcoes,
        onComplete: () => { destino = null; opcoes.onComplete?.(); },
      });
    };
    const raf = (t) => lenis?.raf(t * 1000);
    const ligarLenis = () => {
      if (lenis || !Lenis) return;
      lenis = api.lenis = new Lenis({ autoRaf: false, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    };
    const desligarLenis = () => {
      if (!lenis) return;
      const pendente = lenis.isSmooth ? destino : null; // rolagem suave em andamento: termina no destino
      destino = null;
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      // Lenis 1.3.26: destroy() não cancela o timer de 400 ms da rolagem nativa, que depois
      // devolve as classes .lenis ao <html>
      clearTimeout(lenis._resetVelocityTimeout);
      lenis.destroy();
      lenis = api.lenis = null;
      pendente?.scrollIntoView({ behavior: "instant", block: "start" });
    };

    // Âncoras da página (menu, "pular para o conteúdo") com o Lenis ativo: rolagem suave até o
    // alvo, offset zero, e o foco acompanha quando o clique veio do teclado. Sem Lenis, o
    // navegador cuida (scroll-behavior de reset.css) — os links funcionam igual sem JS.
    document.addEventListener("click", (e) => {
      if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href^="#"]');
      const id = a?.getAttribute("href").slice(1);
      const alvo = id && document.getElementById(id);
      if (!alvo) return;
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
      rolar(alvo, {
        onComplete: () => {
          if (e.detail !== 0) return; // detail 0 = ativado por teclado
          if (!alvo.hasAttribute("tabindex")) {
            alvo.setAttribute("tabindex", "-1");
            alvo.addEventListener("blur", () => alvo.removeAttribute("tabindex"), { once: true });
          }
          alvo.focus({ preventScroll: true });
        },
      });
    });

    // ── loops: pausados fora da tela (margem de 10 %) ─────────
    const loops = (() => {
      const anims = new Map();   // el → Set({ anim, grupo })
      const visivel = new Map(); // el → fração visível (0 = fora da tela)
      const decidir = () => {
        const lider = new Map(); // grupo → [el, fração]
        for (const [el, itens] of anims) {
          const f = visivel.get(el) ?? 0;
          for (const { grupo } of itens) if (grupo && f > (lider.get(grupo)?.[1] ?? 0)) lider.set(grupo, [el, f]);
        }
        for (const [el, itens] of anims) {
          for (const { anim, grupo } of itens) {
            const roda = grupo ? lider.get(grupo)?.[0] === el : (visivel.get(el) ?? 0) > 0;
            if (roda) anim.resume(); else anim.pause();
          }
        }
      };
      const io = new IntersectionObserver((entradas) => {
        for (const { target, isIntersecting, intersectionRatio } of entradas) {
          const naTela = isIntersecting && intersectionRatio > 0; // só encostar na borda não conta
          target.toggleAttribute("data-offscreen", !naTela);       // loops CSS (base.css)
          visivel.set(target, naTela ? intersectionRatio : 0);
        }
        decidir();
      }, { rootMargin: "10% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
      return {
        observar: (el) => io.observe(el),
        add(el, anim, grupo) {
          if (!anims.has(el)) { anims.set(el, new Set()); io.observe(el); }
          anims.get(el).add({ anim, grupo });
          decidir();
        },
        remove(el, anim) {
          const itens = anims.get(el);
          if (!itens) return;
          for (const it of itens) if (it.anim === anim) itens.delete(it);
          if (!itens.size) { anims.delete(el); if (!el.hasAttribute("data-loop")) { io.unobserve(el); visivel.delete(el); } }
          decidir();
        },
      };
    })();
    api.debug.loops = loops;

    // ── utilitários declarativos: data-reveal, data-parallax, data-loop (D27) ──
    // Escritas de estado vão direto no style: gsap.set entra na timeline global, e com ela
    // pausada (modo "paused") o valor não seria aplicado.
    const limparEstilo = (el, ...props) => props.forEach((p) => el.style.removeProperty(p));
    const concluir = (el) => {
      el.setAttribute("data-revealed", "");
      el.classList.remove("reveal-pendente");
      limparEstilo(el, "opacity", "transform", "will-change", "translate", "rotate", "scale");
    };
    const revelar = (el) => {
      if (el.hasAttribute("data-revealed")) return;
      if (modo === "paused") return concluir(el);
      const cheio = base === "full";
      // duração por elemento (--reveal-dur), senão --t-mid
      const proprio = getComputedStyle(el).getPropertyValue("--reveal-dur").trim();
      const duracao = proprio ? (proprio.endsWith("ms") ? parseFloat(proprio) / 1000 : parseFloat(proprio)) : dur("--t-mid");
      const t = gsap.to(el, {
        opacity: 1,
        ...(cheio && { y: 0, scale: 1, rotation: 0 }),
        duration: cheio ? duracao : dur("--t-fade"),
        ease: cheio ? api.ease : "none",
        delay: cheio ? (Number(el.dataset.revealDelay) || 0) / 1000 : 0,
        onStart: () => { el.style.willChange = cheio ? "transform, opacity" : "opacity"; },
        onComplete: () => { emAndamento.delete(t); concluir(el); },
      });
      emAndamento.add(t);
    };

    const declarativos = {
      extras: [],
      setup() {
        const escondidos = []; // "reduced": opacity 0 posta por aqui, desfeita na limpeza
        const limpezas = [() => escondidos.forEach((el) => { if (!el.hasAttribute("data-revealed")) limparEstilo(el, "opacity"); })];
        const limpar = () => limpezas.forEach((f) => f());
        const grupos = new Map();
        const disparar = (gatilho, membros) => ScrollTrigger.create({
          trigger: gatilho,
          start: () => `top+=${Math.min(gatilho.offsetHeight, innerHeight) * fracaoReveal()} bottom`,
          once: true,
          onEnter: () => membros.forEach(revelar),
        });
        for (const el of document.querySelectorAll("[data-reveal]:not([data-revealed])")) {
          const r = el.getBoundingClientRect();
          if (r.bottom <= 0) { concluir(el); continue; } // já ficou para trás (link direto a uma seção)
          // full: só anima o que ficou pendente (abaixo da dobra ao carregar, D34); o resto já está à mostra
          if (base === "full" && !el.classList.contains("reveal-pendente")) { concluir(el); continue; }
          if (base === "reduced") {
            // sem estado escondido pré-pintura em "reduced": só some quem ainda está abaixo da tela
            if (r.top < innerHeight) { concluir(el); continue; }
            el.style.opacity = "0";
            escondidos.push(el);
          }
          // data-reveal-grupo: o grupo inteiro dispara junto, quando o 1º membro atinge --reveal-at
          // (cada um com o próprio data-reveal-delay); sem grupo, cada elemento dispara sozinho
          const g = el.dataset.revealGrupo;
          if (g) { (grupos.get(g) || grupos.set(g, []).get(g)).push(el); continue; }
          disparar(el, [el]);
        }
        for (const membros of grupos.values()) disparar(membros[0], membros);

        for (const el of document.querySelectorAll("[data-loop]")) loops.observar(el);

        // parallax: y = fator × (scroll − repouso); repouso = seção alinhada ao topo da tela, então
        // cada seção parada (âncora do menu) mostra o layout estático exato
        if (base !== "full" || quality === "low") return limpar;
        const itens = [...document.querySelectorAll("[data-parallax]")].map((el) => {
          const fator = parseFloat(el.dataset.parallax) || 0;
          const teto = parseFloat(el.dataset.parallaxMax) || Infinity; // deslocamento máximo em px
          const noTopo = el.dataset.parallaxRepouso === "topo"; // repouso = página no topo (1ª tela)
          const secao = el.closest("[data-secao], section") || el;
          // translate 2D (force3D: false): parado fora do repouso, um translate3d manteria o elemento numa
          // camada do compositor e, por sobreposição, arrastaria o texto vizinho junto (sem antialiasing
          // subpixel). Rolando, quem promove é o will-change.
          gsap.set(el, { force3D: false });
          const setY = gsap.quickSetter(el, "y", "px");
          let atual = 0;
          // will-change só enquanto a página rola (D42): parado, o elemento sai da camada própria do
          // compositor e, no repouso (y = 0), fica sem transform — desenhado exatamente como no estático
          const y = (v) => {
            atual = gsap.utils.clamp(-teto, teto, v);
            if (rolando) el.style.willChange = "transform";
            setY(atual);
          };
          let repouso = 0; // scroll em que o elemento está na posição do layout estático
          const posicionar = (st) => y(fator * (gsap.utils.clamp(st.start, st.end, st.scroll()) - repouso));
          const st = ScrollTrigger.create({
            trigger: secao,
            start: "top bottom",
            end: "bottom top",
            onRefresh: (self) => { repouso = noTopo ? 0 : self.end - secao.offsetHeight; posicionar(self); },
            onUpdate: posicionar,
            onToggle: (self) => { if (!self.isActive) el.style.willChange = ""; },
          });
          repouso = noTopo ? 0 : st.end - secao.offsetHeight;
          posicionar(st);
          const descansar = () => {
            el.style.willChange = "";
            if (Math.abs(atual) < 0.5) limparEstilo(el, "transform", "translate", "rotate", "scale");
          };
          descansar();
          aoParar.add(descansar);
          return { el, st, y, posicionar, descansar };
        });
        const alternar = (m) => {
          for (const { el, st, y, posicionar } of itens) {
            // pausado: sem transform nenhum, para o elemento voltar a ser desenhado como no estático
            if (m === "paused") { st.disable(false); y(0); limparEstilo(el, "transform", "will-change", "translate", "rotate", "scale"); }
            else { st.enable(); posicionar(st); }
          }
        };
        if (modo === "paused") alternar(modo);
        limpezas.push(api.on("mode", alternar), () => itens.forEach(({ el, descansar }) => { aoParar.delete(descansar); limparEstilo(el, "transform", "will-change", "translate", "rotate", "scale"); }));
        return limpar;
      },
    };

    // ── botão de pausa (D28): [data-pause] no cabeçalho, escondido até o motion subir ──
    const botoesPausa = [...document.querySelectorAll("[data-pause]")];
    const sincronizarBotoes = () => {
      const pausado = raiz.dataset.motion === "paused";
      for (const b of botoesPausa) {
        b.setAttribute("aria-pressed", String(pausado));
        b.setAttribute("aria-label", pausado ? "Retomar animações" : "Pausar animações");
      }
    };
    for (const b of botoesPausa) {
      b.addEventListener("click", () => {
        if (raiz.dataset.motion === "paused") delete raiz.dataset.motion;
        else raiz.dataset.motion = "paused";
        sincronizarBotoes();
      });
    }

    // ── aplicar o modo (carga + toda mudança); idempotente ────
    const aplicar = () => {
      if (!iniciado) return;
      const anterior = modo;
      modo = calcularModo();
      const novaBase = calcularBase();
      if (novaBase !== base) {
        registros.forEach(desmontar);
        base = novaBase;
        raiz.classList.toggle("js-motion", base === "full"); // "reduced": nada escondido pré-pintura
        registros.forEach(montar);
      }
      if (modo === "paused") {
        gsap.globalTimeline.pause();
        emAndamento.forEach((t) => t.progress(1)); // nada fica meio revelado
      } else if (!document.hidden) {
        gsap.globalTimeline.resume();
      }
      if (modo === "full") ligarLenis(); else desligarLenis();
      sincronizarBotoes();
      if (anterior !== modo) ouvintes.forEach((fn) => fn(modo, anterior));
    };

    // prefers-reduced-motion em tempo real e o botão de pausa (data-motion)
    mqReduzido.addEventListener("change", aplicar);
    new MutationObserver(() => { if (calcularModo() !== modo) aplicar(); })
      .observe(raiz, { attributes: true, attributeFilter: ["data-motion"] });

    // aba oculta: tudo pausa (CSS via data-page-hidden, GSAP via timeline global)
    const visibilidade = () => {
      raiz.toggleAttribute("data-page-hidden", document.hidden);
      if (document.hidden) gsap.globalTimeline.pause();
      else if (modo !== "paused") gsap.globalTimeline.resume();
    };
    document.addEventListener("visibilitychange", visibilidade);
    visibilidade();

    registros.push(declarativos);
    window.motion = api;

    // ── início ──
    // O motion chega depois do load, muitas vezes disparado por um gesto (D25). Criar
    // ScrollTriggers faz um refresh que reescreve a posição de rolagem e interromperia uma
    // rolagem em andamento; por isso tudo é montado só quando a rolagem fica 150 ms parada.
    raiz.dataset.motionReady = "pending";
    let espera = 0;
    const adiar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        removeEventListener("scroll", adiar);
        iniciado = true;
        modo = null; // força a 1ª aplicação completa (e o aviso aos ouvintes)
        aplicar();
        botoesPausa.forEach((b) => { b.hidden = false; });
        document.fonts?.ready.then(() => ScrollTrigger.refresh()); // fontes mudam a altura do texto
        raiz.dataset.motionReady = "true";
        document.dispatchEvent(new Event("motion:pronto"));
      }, 150);
    };
    addEventListener("scroll", adiar, { passive: true });
    adiar();
  } catch (e) {
    falhar(e);
  }
})();
