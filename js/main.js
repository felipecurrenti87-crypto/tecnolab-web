/* Interruptor de emergencia del efecto Liquid Glass del header: false → siempre el vidrio simple. */
const GLASS_LIQUID_ENABLED = true;

/* Parámetros de la refracción (un solo lugar para ajustarlos). Escala = cuánto desplaza cada canal
   el filtro SVG (desplazamiento máx. ≈ escala / 2 px); la diferencia entre canales da las franjas
   rojo/azul. Bisel = ancho en px de la franja del borde donde se curva la "lente". */
const LG = { escalaR: 48, escalaG: 42, escalaB: 36, bisel: 28, desenfoque: 0.6 };

/* Efecto 3D de las cards: inclinación máxima (grados) y paralaje de la imagen (px). */
const TILT_MAX = 6;
const TILT_PARALLAX = 8;

document.addEventListener("DOMContentLoaded", () => {
  /* ============================================================
     MAPA DE SUCURSAL — Leaflet + tiles oscuros de Esri (sin key).
     Leaflet (CSS + JS) no se pide al abrir el Home: se inyecta recién
     cuando el contenedor del mapa está a menos de 400px del viewport.
     ============================================================ */
  function initBranchMap() {
    const el = document.getElementById("home-branch-map");
    if (!el || typeof L === "undefined") return;

    const MOLDES = [-32.9132971, -68.8322202]; // confirmado en Google Maps
    // const CHAMPAGNAT = [lat, lng]; // pendiente de confirmar con el cliente — sumar acá cuando esté

    const map = L.map(el, {
      center: MOLDES,
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS',
      maxZoom: 16,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: "brand-map-pin",
      html: '<div class="brand-map-pin-dot"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    L.marker(MOLDES, { icon: pinIcon }).addTo(map);
  }

  function loadBranchMap() {
    const el = document.getElementById("home-branch-map");
    if (!el) return;
    const LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";

    const load = () => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET + "leaflet.min.css";
      document.head.appendChild(css);

      const js = document.createElement("script");
      js.src = LEAFLET + "leaflet.min.js";
      js.onload = initBranchMap;
      document.head.appendChild(js);
    };

    if (!("IntersectionObserver" in window)) {
      load();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "400px" });
    observer.observe(el);
  }


  /* ============================================================
     NAV MOBILE
     ============================================================ */
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    const setNav = (open) => {
      mainNav.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      // el nav está antes que el botón en el DOM: al abrir, el foco pasa al primer link
      if (open) mainNav.querySelector("a")?.focus();
    };
    navToggle.addEventListener("click", () => setNav(!mainNav.classList.contains("is-open")));
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setNav(false));
    });
    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !mainNav.classList.contains("is-open")) return;
      setNav(false);
      navToggle.focus();
    });
  }

  /* ============================================================
     HEADER ADAPTABLE — el tema del vidrio (data-theme="dark" | "light" sobre .site-header)
     lo decide la sección que está bajo el centro vertical del header, según su
     data-header-theme. Se observa una franja de 1px a esa altura. Si dos secciones la
     cruzan a la vez (la cortina de #why-tecnolab queda fija bajo #plan-canje) gana la
     que va después en el DOM, que es la que se ve por encima. Sin animación: el CSS
     solo transiciona el color (150ms).
     ============================================================ */
  function initHeaderTheme() {
    const header = document.querySelector(".site-header");
    const secciones = [...document.querySelectorAll("[data-header-theme]")];
    if (!header || !secciones.length || !("IntersectionObserver" in window)) return;
    const cruzan = new Set();
    let observer = null;

    const aplicar = () => {
      let elegida = null;
      cruzan.forEach((s) => {
        if (!elegida || (elegida.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)) elegida = s;
      });
      if (elegida) header.dataset.theme = elegida.dataset.headerTheme;
    };
    const observar = () => {
      if (observer) observer.disconnect();
      cruzan.clear();
      const caja = header.getBoundingClientRect();
      const centro = Math.round(caja.top + caja.height / 2);
      const abajo = Math.max(window.innerHeight - centro - 1, 0);
      observer = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) cruzan.add(e.target); else cruzan.delete(e.target); });
        aplicar();
      }, { rootMargin: "-" + centro + "px 0px -" + abajo + "px 0px", threshold: 0 });
      secciones.forEach((s) => observer.observe(s));
    };
    observar();
    window.addEventListener("resize", observar);
  }
  initHeaderTheme();

  /* ============================================================
     HEADER LIQUID GLASS — mejora progresiva. html[data-glass="liquid"] solo en Chromium de
     escritorio (puntero fino, ≥900px, sin reduced-motion ni reduced-transparency, sin
     ?glass=off). Fuera de eso queda html[data-glass="simple"]: el vidrio simple en cápsula.
     El efecto es un filtro SVG (#lg-refract) usado como backdrop-filter: 3 feDisplacementMap
     (uno por canal, con escalas distintas) leen un mapa de desplazamiento que se dibuja en un
     canvas al tamaño real de la cápsula. No hay animación propia: solo reacciona al scroll
     del contenido que pasa por debajo.
     ============================================================ */
  function initHeaderGlass() {
    const root = document.documentElement;
    const header = document.querySelector(".site-header");
    if (!header) return;
    const param = new URLSearchParams(window.location.search).get("glass");
    const SVG_NS = "http://www.w3.org/2000/svg";
    let svg = null;
    let feImage = null;
    let ultimo = "";

    const esChromium = () => {
      const marcas = (navigator.userAgentData && navigator.userAgentData.brands) || [];
      return marcas.some((m) => /chromium/i.test(m.brand)) || !!window.chrome;
    };
    const mq = (q) => window.matchMedia(q).matches;
    const quiereLiquid = () =>
      GLASS_LIQUID_ENABLED && param !== "off" && esChromium() && window.innerWidth >= 900 &&
      mq("(hover: hover) and (pointer: fine)") &&
      !mq("(prefers-reduced-motion: reduce)") && !mq("(prefers-reduced-transparency: reduce)");

    // Mapa de desplazamiento: gris neutro (128,128) en el centro; en el bisel, desplazamiento
    // hacia adentro con perfil de lente convexa (pendiente de un squircle: crece hacia el borde).
    function mapaDeDesplazamiento(w, h) {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const radio = h / 2; // cápsula
      const hw = w / 2;
      const hh = h / 2;
      const sd = (x, y) => { // distancia con signo al borde (negativa adentro)
        const qx = Math.abs(x - hw) - (hw - radio);
        const qy = Math.abs(y - hh) - (hh - radio);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radio;
      };
      const PENDIENTE_MAX = 3;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const prof = Math.max(-sd(px, py), 0); // profundidad desde el borde, en px
          let r = 128;
          let g = 128;
          if (prof < LG.bisel) {
            const u = Math.max(prof / LG.bisel, 0.0005);
            // altura de un squircle convexo h(u) = (1 − (1 − u)^4)^(1/4) y su pendiente
            const pendiente = Math.pow(1 - Math.pow(1 - u, 4), -0.75) * Math.pow(1 - u, 3);
            const m = Math.min(pendiente, PENDIENTE_MAX) / PENDIENTE_MAX;
            const e = 0.5;
            let gx = sd(px + e, py) - sd(px - e, py);
            let gy = sd(px, py + e) - sd(px, py - e);
            const largo = Math.hypot(gx, gy) || 1;
            gx /= largo;
            gy /= largo;
            r = 128 - gx * m * 127; // normal hacia adentro = −gradiente
            g = 128 - gy * m * 127;
          }
          const i = (y * w + x) * 4;
          d[i] = r; d[i + 1] = g; d[i + 2] = 128; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL("image/png");
    }

    const nodo = (tag, attrs) => {
      const n = document.createElementNS(SVG_NS, tag);
      Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
      return n;
    };

    function montarFiltro() {
      if (svg) return;
      svg = nodo("svg", { width: "0", height: "0", "aria-hidden": "true", focusable: "false" });
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
      const filtro = nodo("filter", { id: "lg-refract", "color-interpolation-filters": "sRGB", x: "0", y: "0", width: "100%", height: "100%" });
      feImage = nodo("feImage", { x: "0", y: "0", width: "1", height: "1", preserveAspectRatio: "none", result: "mapa" });
      filtro.append(feImage);
      // un desplazamiento por canal (escalas distintas) y cada resultado aislado a su canal
      const canales = [
        ["R", LG.escalaR, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"],
        ["G", LG.escalaG, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1"],
        ["B", LG.escalaB, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1"]
      ];
      canales.forEach(([c, escala, matriz]) => {
        filtro.append(
          nodo("feDisplacementMap", { in: "SourceGraphic", in2: "mapa", scale: String(escala), xChannelSelector: "R", yChannelSelector: "G", result: "d" + c }),
          nodo("feColorMatrix", { in: "d" + c, type: "matrix", values: matriz, result: "c" + c })
        );
      });
      filtro.append(
        nodo("feBlend", { in: "cR", in2: "cG", mode: "screen", result: "rg" }),
        nodo("feBlend", { in: "rg", in2: "cB", mode: "screen", result: "rgb" }),
        nodo("feGaussianBlur", { in: "rgb", stdDeviation: String(LG.desenfoque) })
      );
      svg.append(filtro);
      document.body.prepend(svg);
    }

    function actualizarMapa() {
      if (!svg) return;
      const caja = header.getBoundingClientRect();
      const w = Math.round(caja.width);
      const h = Math.round(caja.height);
      if (!w || !h || w + "x" + h === ultimo) return;
      ultimo = w + "x" + h;
      feImage.setAttribute("width", String(w));
      feImage.setAttribute("height", String(h));
      feImage.setAttribute("href", mapaDeDesplazamiento(w, h));
    }

    function aplicar() {
      const liquid = quiereLiquid();
      root.dataset.glass = liquid ? "liquid" : "simple";
      if (liquid) {
        montarFiltro();
        actualizarMapa();
      } else if (svg) {
        svg.remove();
        svg = null;
        feImage = null;
        ultimo = "";
      }
    }

    aplicar();
    let t = 0;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(aplicar, 150); });
  }
  initHeaderGlass();

  /* ============================================================
     CARDS 3D — la card (producto o categoría) se inclina siguiendo el mouse: perspective +
     rotateX/rotateY de hasta ±TILT_MAX grados, scale(1.02), la imagen se desplaza hasta
     TILT_PARALLAX px en sentido contrario y un brillo radial sigue al cursor. Eventos
     delegados en los contenedores; un solo loop de requestAnimationFrame, activo solo
     mientras alguna card se mueve. Se apaga sin (hover: hover) y (pointer: fine), con
     prefers-reduced-motion, mientras se arrastra el carrusel y si la card tiene el foco
     por teclado (el aro de foco no se inclina).
     ============================================================ */
  function initCardTilt() {
    const contenedores = document.querySelectorAll(".catalog-cards-row, .catalog-grid-full, .catalog-grid--few, .category-grid");
    if (!contenedores.length) return;
    const SEL = ".product-card, .category-tile";
    const TAU = 55; // ms: constante de suavizado (≈ 250 ms hasta asentarse)
    const habilitado = () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const estados = new Map(); // card → posición actual y objetivo
    let activa = null;
    let raf = 0;
    let ultimo = 0;

    const estadoDe = (card) => {
      let s = estados.get(card);
      if (!s) {
        const glare = document.createElement("span");
        glare.className = "tilt-glare";
        glare.setAttribute("aria-hidden", "true");
        card.append(glare);
        s = { rx: 0, ry: 0, sc: 1, px: 0, py: 0, gx: 50, gy: 50, trx: 0, try_: 0, tsc: 1, tpx: 0, tpy: 0, tgx: 50, tgy: 50 };
        estados.set(card, s);
      }
      return s;
    };

    const aplicar = (card, s) => {
      card.style.transform = "perspective(1200px) rotateX(" + s.rx.toFixed(3) + "deg) rotateY(" + s.ry.toFixed(3) + "deg) scale(" + s.sc.toFixed(4) + ")";
      card.style.setProperty("--px", s.px.toFixed(2) + "px");
      card.style.setProperty("--py", s.py.toFixed(2) + "px");
      card.style.setProperty("--gx", s.gx.toFixed(1) + "%");
      card.style.setProperty("--gy", s.gy.toFixed(1) + "%");
    };
    const limpiar = (card) => {
      card.style.transform = "";
      ["--px", "--py", "--gx", "--gy"].forEach((v) => card.style.removeProperty(v));
      card.classList.remove("is-tilting");
      estados.delete(card);
    };

    const tick = (t) => {
      const dt = Math.min(t - ultimo, 50);
      ultimo = t;
      const k = 1 - Math.exp(-dt / TAU);
      estados.forEach((s, card) => {
        s.rx += (s.trx - s.rx) * k;
        s.ry += (s.try_ - s.ry) * k;
        s.sc += (s.tsc - s.sc) * k;
        s.px += (s.tpx - s.px) * k;
        s.py += (s.tpy - s.py) * k;
        s.gx += (s.tgx - s.gx) * k;
        s.gy += (s.tgy - s.gy) * k;
        const enReposo = card !== activa &&
          Math.abs(s.rx) < 0.01 && Math.abs(s.ry) < 0.01 && Math.abs(s.sc - 1) < 0.0005 && Math.abs(s.px) < 0.05 && Math.abs(s.py) < 0.05;
        if (enReposo) limpiar(card); else aplicar(card, s);
      });
      raf = estados.size ? requestAnimationFrame(tick) : 0;
    };
    const arrancar = () => { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(tick); } };

    // Al agarrar el carrusel para arrastrar, la card vuelve a 0 de golpe (sin animación)
    const soltarYa = () => {
      if (!activa) return;
      const card = activa;
      card.classList.remove("is-tilt-hover");
      activa = null;
      limpiar(card);
    };
    const soltar = () => {
      if (!activa) return;
      const s = estados.get(activa);
      if (s) { s.trx = 0; s.try_ = 0; s.tsc = 1; s.tpx = 0; s.tpy = 0; }
      activa.classList.remove("is-tilt-hover");
      activa = null;
      arrancar(); // sigue el loop hasta que vuelva a 0
    };

    contenedores.forEach((cont) => {
      cont.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        if (!habilitado() || e.buttons || cont.classList.contains("is-dragging")) { soltar(); return; }
        const card = e.target.closest(SEL);
        if (!card || !cont.contains(card) || card.matches(":focus-visible") || card.querySelector(":focus-visible")) { soltar(); return; }
        if (card !== activa) {
          soltar();
          activa = card;
          estadoDe(card);
          card.classList.add("is-tilting", "is-tilt-hover");
        }
        const r = card.getBoundingClientRect();
        const cx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        const cy = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        const s = estadoDe(card);
        s.trx = -cy * TILT_MAX;        // el borde cercano al cursor se hunde
        s.try_ = cx * TILT_MAX;
        s.tsc = 1.02;
        s.tpx = -cx * TILT_PARALLAX;   // la imagen se mueve en sentido contrario al cursor
        s.tpy = -cy * TILT_PARALLAX;
        s.tgx = (cx + 1) * 50;
        s.tgy = (cy + 1) * 50;
        arrancar();
      });
      cont.addEventListener("pointerleave", soltar);
      cont.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.target.closest(".catalog-cards-row")) soltarYa(); });
      cont.addEventListener("focusin", (e) => { if (activa && e.target.matches(":focus-visible")) soltar(); });
    });
    window.addEventListener("blur", soltar);
  }
  initCardTilt();

  /* ============================================================
     PANEL «CATÁLOGO» — en escritorio, un panel de vidrio bajo el header con las líneas de
     iPhone, AirPods y las subcategorías de Accesorios (todo generado desde los datos) y el
     resto de la página atenuada; en mobile, un acordeón dentro del menú. Mejora progresiva:
     sin datos (p. ej. la página 404) el item queda como un link a catalogo.html.
     Abre con click, Enter/Espacio o hover (120 ms); cierra con Escape, click en el fondo,
     al salir el foco del panel o al cambiar a mobile. Sin trampas de foco.
     ============================================================ */
  function initNavCatalogo() {
    const enlace = document.querySelector('.main-nav > ul > li > a[href$="catalogo.html"]');
    if (!enlace || typeof CATALOGO_DESTACADO === "undefined") return;
    const li = enlace.closest("li");
    const base = enlace.getAttribute("href");
    const root = document.documentElement;
    const url = (params) => base + "?" + Object.keys(params).map((k) => k + "=" + encodeURIComponent(params[k])).join("&");
    const el = (tag, attrs = {}, ...hijos) => {
      const n = document.createElement(tag);
      Object.keys(attrs).forEach((k) => { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
      hijos.forEach((h) => h && n.append(h));
      return n;
    };

    // --- datos: líneas de modelos únicas (de la más nueva a la más vieja, como están en los datos)
    const lineas = (cat) => {
      const vistos = new Set();
      CATALOGO_DESTACADO.filter((p) => p.categoria === cat).forEach((p) => vistos.add(p.nombre.replace(/\s+(Pro Max|Pro|Plus|Max|mini)$/i, "")));
      return [...vistos];
    };
    const subcategorias = typeof ACCESORIOS_BASE !== "undefined" ? [...new Set(ACCESORIOS_BASE.map((f) => f[0]))] : [];
    const columnas = [];
    [["iPhone", lineas("iPhone"), (n) => ({ cat: "iPhone", q: n })], ["AirPods", lineas("AirPods"), (n) => ({ cat: "AirPods", q: n })]].forEach(([titulo, items, params]) => {
      if (items.length) columnas.push({ titulo, href: url({ cat: titulo }), items: items.map((n) => ({ texto: n, href: url(params(n)) })) });
    });
    if (subcategorias.length) columnas.push({ titulo: "Accesorios", href: url({ cat: "Accesorios" }), items: subcategorias.map((s) => ({ texto: s, href: url({ cat: "Accesorios", sub: s }) })) });
    if (!columnas.length) return;

    // --- DOM
    const boton = el("button", { type: "button", class: "nav-link nav-trigger" + (enlace.classList.contains("is-active") ? " is-active" : ""), "aria-expanded": "false", "aria-controls": "panel-catalogo" });
    boton.append(document.createTextNode(enlace.textContent.trim()));
    boton.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5 6 8.5l4-4"></path></svg>');
    const panel = el("div", { id: "panel-catalogo", class: "nav-panel" });
    panel.style.setProperty("--nav-cols", String(columnas.length + 1));
    columnas.forEach((col) => {
      panel.append(el("div", { class: "nav-panel-col" },
        el("a", { class: "nav-panel-heading", href: col.href, text: col.titulo }),
        el("ul", { class: "nav-panel-links" }, ...col.items.map((it) => el("li", {}, el("a", { href: it.href, text: it.texto }))))));
    });
    panel.append(el("a", { class: "nav-panel-all", href: base, text: "Ver todo el catálogo →" }));
    li.classList.add("nav-item");
    li.replaceChildren(boton, panel);
    const scrim = el("div", { class: "nav-scrim", "aria-hidden": "true" });
    document.body.append(scrim);

    // --- estado
    const escritorio = () => window.matchMedia("(min-width: 900px)").matches;
    const conMouse = () => escritorio() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let fijo = false;          // abierto por click/teclado (no se cierra al sacar el mouse)
    let mouseAdentro = false;
    let tAbrir = 0;
    let tCerrar = 0;
    const abierto = () => li.classList.contains("is-open");

    const bloquear = () => {
      root.style.setProperty("--sbw", (window.innerWidth - root.clientWidth) + "px");
      root.classList.add("nav-panel-open");
    };
    const desbloquear = () => { root.classList.remove("nav-panel-open"); root.style.removeProperty("--sbw"); };

    function abrir(esFijo) {
      clearTimeout(tCerrar);
      if (abierto()) { if (esFijo) fijo = true; return; }
      fijo = !!esFijo;
      if (escritorio()) { bloquear(); scrim.classList.add("is-open"); }
      li.classList.add("is-open");
      boton.setAttribute("aria-expanded", "true");
    }
    function cerrar(devolverFoco) {
      clearTimeout(tAbrir);
      clearTimeout(tCerrar);
      if (!abierto()) return;
      li.classList.remove("is-open");
      boton.setAttribute("aria-expanded", "false");
      scrim.classList.remove("is-open");
      desbloquear();
      fijo = false;
      if (devolverFoco) boton.focus();
    }

    boton.addEventListener("click", () => {
      if (!escritorio()) { if (abierto()) cerrar(false); else abrir(true); return; }
      if (abierto() && !fijo) { fijo = true; return; } // abierto por hover: el click lo deja fijo
      if (abierto()) cerrar(false); else abrir(true);
    });
    li.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || !conMouse()) return;
      mouseAdentro = true;
      clearTimeout(tCerrar);
      if (!abierto()) tAbrir = setTimeout(() => abrir(false), 120);
    });
    li.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      mouseAdentro = false;
      clearTimeout(tAbrir);
      if (abierto() && !fijo && conMouse()) tCerrar = setTimeout(() => cerrar(false), 160);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && abierto() && escritorio()) { e.preventDefault(); cerrar(true); }
    });
    scrim.addEventListener("click", () => cerrar(false));
    li.addEventListener("focusout", () => {
      setTimeout(() => {
        if (abierto() && escritorio() && !li.contains(document.activeElement) && !mouseAdentro) cerrar(false);
      }, 0);
    });
    panel.addEventListener("click", (e) => {
      if (!e.target.closest("a")) return;
      cerrar(false);
      const toggle = document.querySelector(".nav-toggle");
      if (!escritorio() && toggle && toggle.getAttribute("aria-expanded") === "true") toggle.click(); // cierra el menú mobile
    });
    window.addEventListener("resize", () => { if (abierto()) cerrar(false); });
  }
  initNavCatalogo();

  /* ============================================================
     DETALLE DE PRODUCTO — <dialog> modal que se abre al tocar una card (Home y catálogo).
     Todo sale de los datos (products-data.js y, si está cargado, accesorios-data.js): solo se
     muestra lo que existe. showModal da el foco atrapado y el Escape; el fondo cierra con click.
     URL compartible: #producto={id}. Sin animaciones.
     ============================================================ */
  function initDetalleProducto() {
    const productos = [...(typeof CATALOGO_DESTACADO !== "undefined" ? CATALOGO_DESTACADO : []), ...expandirAccesorios()];
    // las cards se renderizan más abajo en este mismo archivo: acá solo se comprueba que la página tenga el contenedor
    if (!productos.length || !document.querySelector(".catalog-cards-row, .catalog-grid-full")) return;
    const porId = new Map(productos.map((p) => [p.id, p]));
    const root = document.documentElement;
    const APPLE_COMPARAR = "https://www.apple.com/la/iphone/compare/";
    let dialogo = null;
    let producto = null;
    let color = 0;

    const el = (tag, attrs = {}, ...hijos) => {
      const n = document.createElement(tag);
      Object.keys(attrs).forEach((k) => { if (k === "text") n.textContent = attrs[k]; else if (attrs[k] !== false) n.setAttribute(k, attrs[k]); });
      hijos.flat().forEach((h) => h && n.append(h));
      return n;
    };
    const SVG_CERRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

    // Variante con el color activo: «Negro · 256GB» pasa a «Plateado · 256GB» al elegir Plateado
    const varianteActiva = () => {
      const cs = producto.colores || [];
      if (cs.length < 2 || !producto.variante) return producto.variante || "";
      return producto.variante.includes(cs[0].nombre) ? producto.variante.replace(cs[0].nombre, cs[color].nombre) : producto.variante + " · " + cs[color].nombre;
    };

    function pintar() {
      const p = producto;
      const cs = p.colores || [];
      const variante = varianteActiva();
      const pr = precioDe(p);
      const media = dialogo.querySelector(".product-dialog-media");
      media.replaceChildren();
      if (cs.length) {
        media.append(el("img", { src: cs[color].imagen, alt: p.categoria === "Accesorios" ? p.nombre : p.nombre + " color " + cs[color].nombre.toLowerCase(), width: "728", height: "666", decoding: "async" }));
      } else {
        const ph = el("div", { class: "product-card-media-placeholder" });
        ph.innerHTML = (p.categoria === "iPhone" ? ICONO_TELEFONO : ICONO_CAJA) + "<span>Foto próximamente</span>";
        media.append(ph);
      }
      const info = dialogo.querySelector(".product-dialog-info");
      info.replaceChildren(...[
        el("span", { class: "product-card-eyebrow" + (p.nuevo === true ? " is-new" : ""), text: p.nuevo === true ? "Nuevo" : p.subcategoria || p.categoria }),
        el("h2", { id: "product-dialog-titulo", class: "title-sentence", text: p.nombre }),
        variante ? el("p", { class: "product-dialog-variante", text: variante }) : null,
        cs.length > 1 ? el("div", { class: "product-dialog-colores" },
          el("p", { class: "product-dialog-color-nombre" }, "Color: ", el("strong", { text: cs[color].nombre })),
          el("div", { class: "color-swatches", role: "group", "aria-label": "Colores disponibles" }, cs.map((c, i) =>
            el("button", { type: "button", class: "color-swatch" + (i === color ? " is-active" : ""), style: "--swatch: " + c.hex, "aria-label": c.nombre, "aria-pressed": String(i === color), title: c.nombre, "data-i": String(i) })))) : null,
        el("p", { class: "product-card-price product-dialog-precio" }, pr.desde ? el("small", { text: pr.desde }) : null, el("strong", { text: pr.texto })),
        p.especificacion ? el("p", { class: "product-dialog-spec", text: p.especificacion }) : null,
        p.descripcion ? el("p", { class: "product-dialog-descripcion", text: p.descripcion }) : null,
        Array.isArray(p.detalles) && p.detalles.length ? el("ul", { class: "product-dialog-detalles" }, p.detalles.map((t) => el("li", { text: t }))) : null,
        el("div", { class: "product-dialog-acciones" },
          el("a", { class: "btn btn-primary", href: "https://wa.me/" + SITE_CONFIG.whatsappNumber + "?text=" + encodeURIComponent(mensajeProducto(p, variante)), target: "_blank", rel: "noopener", text: "Consultar por WhatsApp" }),
          p.categoria === "iPhone" ? el("a", { class: "product-dialog-apple", href: APPLE_COMPARAR, target: "_blank", rel: "noopener noreferrer", text: "Comparar modelos en el sitio de Apple ↗" }) : null)
      ].filter(Boolean)); // replaceChildren convierte null en el texto "null"
    }

    function crear() {
      dialogo = el("dialog", { class: "product-dialog", "aria-labelledby": "product-dialog-titulo" },
        el("div", { class: "product-dialog-body" },
          el("button", { type: "button", class: "product-dialog-close", "aria-label": "Cerrar detalle" }),
          el("div", { class: "product-dialog-media" }),
          el("div", { class: "product-dialog-info" })));
      dialogo.querySelector(".product-dialog-close").innerHTML = SVG_CERRAR;
      dialogo.querySelector(".product-dialog-close").addEventListener("click", () => dialogo.close());
      dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); }); // click en el fondo
      dialogo.addEventListener("click", (e) => {
        const sw = e.target.closest(".color-swatch");
        if (!sw) return;
        color = Number(sw.dataset.i);
        pintar();
        dialogo.querySelector('.color-swatch[aria-pressed="true"]').focus(); // el foco no se pierde al redibujar
      });
      dialogo.addEventListener("close", () => {
        root.classList.remove("dialog-open");
        root.style.removeProperty("--sbw");
        if (/^#producto=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
        const id = producto && producto.id;
        const card = id && document.querySelector('.product-card[data-id="' + id + '"]');
        const opener = card && card.querySelector(".product-card-open");
        if (opener && card.style.display !== "none") opener.focus(); // el foco vuelve a la card
        producto = null;
      });
      document.body.append(dialogo);
    }

    function abrir(id) {
      const p = porId.get(id);
      if (!p) return;
      if (!dialogo) crear();
      producto = p;
      color = 0;
      pintar();
      if (!dialogo.open) {
        root.style.setProperty("--sbw", (window.innerWidth - root.clientWidth) + "px");
        root.classList.add("dialog-open");
        dialogo.showModal();
      }
      history.replaceState(null, "", location.pathname + location.search + "#producto=" + encodeURIComponent(id));
    }

    // Click en cualquier parte de la card (el botón invisible la cubre), salvo «Consultar» y los puntos de color
    document.addEventListener("click", (e) => {
      const abridor = e.target.closest(".product-card-open");
      if (!abridor) return;
      const card = abridor.closest(".product-card");
      if (card) abrir(card.dataset.id);
    });
    const desdeHash = () => {
      const m = /^#producto=(.+)$/.exec(location.hash);
      if (m) abrir(decodeURIComponent(m[1]));
      else if (dialogo && dialogo.open) dialogo.close();
    };
    window.addEventListener("hashchange", desdeHash);
    desdeHash();
  }
  initDetalleProducto();

  /* ============================================================
     WHATSAPP — todos los links [data-wa] se arman acá con el número de
     js/config.js. El href del HTML es solo un respaldo sin mensaje.
     ============================================================ */
  function applyWhatsAppLinks(root = document) {
    if (typeof SITE_CONFIG === "undefined") return;
    root.querySelectorAll("[data-wa]").forEach((a) => {
      const text = a.dataset.wa;
      a.href = "https://wa.me/" + SITE_CONFIG.whatsappNumber + (text ? "?text=" + encodeURIComponent(text) : "");
    });
  }

  /* ============================================================
     CATÁLOGO — render de cards desde products-data.js
     Compartido entre el carrusel .catalog-cards-row del Home y el
     .catalog-grid-full de catalogo.html — misma data, mismo template.
     ============================================================ */
  // Sin mayúsculas ni tildes (NFD), para el buscador
  function normalizar(t) { return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

  // js/accesorios-data.js → objetos con el mismo formato que CATALOGO_DESTACADO (solo catalogo.html lo carga)
  function expandirAccesorios() {
    if (typeof ACCESORIOS_BASE === "undefined") return [];
    const usados = new Set();
    // cuarto valor opcional de cada fila = ruta de la foto (WebP con fondo transparente)
    return ACCESORIOS_BASE.map(([subcategoria, nombre, precioNum, foto]) => {
      const base = normalizar(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      let id = base;
      for (let n = 2; usados.has(id); n++) id = base + "-" + n;
      usados.add(id);
      return { id, categoria: "Accesorios", subcategoria, nombre, variante: "", especificacion: "", precioNum: Number.isFinite(precioNum) ? precioNum : null, colores: foto ? [{ nombre: "Único", hex: "#FFFFFF", imagen: foto }] : [], disponible: true };
    });
  }

  function escAttr(t) { return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

  // Precio visible de un producto: { desde, texto }. Accesorios: el precio guardado (precioNum) solo se
  // imprime con ACCESORIOS_CONFIG.mostrarPrecio === true; en cualquier otro caso, «Consultar».
  function precioDe(p) {
    if (p.categoria === "Accesorios") {
      const visible = typeof ACCESORIOS_CONFIG !== "undefined" && ACCESORIOS_CONFIG.mostrarPrecio === true && Number.isFinite(p.precioNum);
      return { desde: null, texto: visible ? "$ " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(p.precioNum) : "Consultar" };
    }
    const m = String(p.precio).match(/^(Desde)\s+(.+)$/i);
    return m ? { desde: m[1], texto: m[2] } : { desde: null, texto: String(p.precio) };
  }
  function mensajeProducto(p, variante) {
    return p.categoria === "Accesorios" ? "Hola, quiero consultar por " + p.nombre : "Hola, me interesa el " + p.nombre + " · " + variante;
  }

  const ICONO_TELEFONO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>`;
  const ICONO_CAJA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"></path><path d="M3 7.5 12 12l9-4.5M12 12v9"></path></svg>`;

  function renderProductCard(p, eager = false) {
    const colores = p.colores || [];
    // Un solo color no se ofrece como elección: los puntos de color aparecen desde 2.
    const swatches = colores.length > 1
      ? `<div class="color-swatches" role="group" aria-label="Colores disponibles">
          ${colores.map((color, i) => `<button type="button" class="color-swatch${i === 0 ? " is-active" : ""}"
            style="--swatch: ${color.hex}" data-img="${color.imagen}" data-alt="${escAttr(p.nombre + " color " + color.nombre.toLowerCase())}"
            aria-label="${escAttr(color.nombre)}" aria-pressed="${i === 0}" title="${escAttr(color.nombre)}"></button>`).join("")}
        </div>`
      : "";
    const esAccesorio = p.categoria === "Accesorios";
    const pr = precioDe(p);
    // «Consultar» como precio comparte la fila con el botón: va un poco más chico para que quepan en cards angostas
    const price = (pr.desde ? `<small>${pr.desde}</small>` : "") + `<strong${pr.texto === "Consultar" ? ' class="es-consulta"' : ""}>${pr.texto}</strong>`;
    const etiquetaTexto = p.subcategoria || p.categoria;
    const etiqueta = p.nuevo === true ? `<span class="product-card-eyebrow is-new">Nuevo</span>` : `<span class="product-card-eyebrow">${etiquetaTexto}</span>`;
    const mensajeWa = mensajeProducto(p, p.variante);
    return `
      <article class="product-card" data-id="${escAttr(p.id)}" data-categoria="${p.categoria}"${p.subcategoria ? ` data-subcategoria="${escAttr(p.subcategoria)}"` : ""} data-busqueda="${escAttr(normalizar([p.nombre, p.subcategoria || "", p.variante || ""].join(" ")))}">
        <button type="button" class="product-card-open" aria-haspopup="dialog" aria-label="${escAttr("Ver detalle de " + p.nombre + (p.variante ? ", " + p.variante : ""))}"></button>
        <div class="product-card-head">
          ${etiqueta}
          <h3 class="product-card-name">${p.nombre}</h3>
          ${p.variante ? `<p class="product-card-variant">${p.variante}</p>` : ""}
          ${p.especificacion ? `<p class="product-card-spec">${p.especificacion}</p>` : ""}
        </div>
        <div class="product-card-media${colores.length ? "" : " product-card-media--vacio"}">
          ${colores.length
            ? `<img src="${colores[0].imagen}" alt="${escAttr(esAccesorio ? p.nombre : p.nombre + " color " + colores[0].nombre.toLowerCase())}" width="728" height="666" loading="${eager ? "eager" : "lazy"}"${eager ? " fetchpriority=\"high\"" : ""} decoding="async">`
            : `<div class="product-card-media-placeholder">${p.categoria === "iPhone" ? ICONO_TELEFONO : ICONO_CAJA}<span>Foto próximamente</span></div>`
          }
        </div>
        ${swatches}
        <div class="product-card-foot">
          <p class="product-card-price"><span class="sr-only">Precio: </span>${price}</p>
          <a class="btn btn-primary" data-wa="${escAttr(mensajeWa)}"
             href="https://wa.me/5492614699026"
             target="_blank" rel="noopener">Consultar</a>
        </div>
      </article>`;
  }

  /* Selector de color: delegado a nivel documento para cubrir tanto el
     row del Home como la grilla de catalogo.html. Solo cambia el src de
     la imagen de esa card — no re-renderiza la card. */
  document.addEventListener("click", (e) => {
    const swatch = e.target.closest(".color-swatch");
    if (!swatch) return;
    const card = swatch.closest(".product-card");
    const img = card && card.querySelector(".product-card-media img");
    if (img) {
      img.src = swatch.dataset.img;
      if (swatch.dataset.alt) img.alt = swatch.dataset.alt;
    }
    swatch.parentElement.querySelectorAll(".color-swatch").forEach((s) => {
      s.classList.toggle("is-active", s === swatch);
      s.setAttribute("aria-pressed", String(s === swatch));
    });
  });

  // Si products-data.js no cargó, la fila no queda vacía sin explicación
  const catalogError = `<p class="catalog-error">No pudimos cargar el catálogo en este momento.
    <a data-wa="Hola, quiero consultar por el catálogo" href="https://wa.me/5492614699026" target="_blank" rel="noopener">Consultanos por WhatsApp</a>.</p>`;

  const catalogRow = document.querySelector(".catalog-cards-row");
  if (catalogRow) {
    // Última "card": lleva al catálogo completo
    const endCard = `<a class="catalog-end-card" href="catalogo.html">Ver todo el catálogo
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>`;
    catalogRow.innerHTML = typeof CATALOGO_DESTACADO !== "undefined"
      ? CATALOGO_DESTACADO.map((p, i) => renderProductCard(p, i < 2)).join("") + endCard
      : catalogError;
  }

  /* ============================================================
     CARRUSEL DESTACADO — scroll horizontal nativo (overflow-x + snap).
     El JS solo suma: arrastre con mouse, flechas y barra de progreso.
     La rueda vertical nunca se intercepta.
     ============================================================ */
  function initCatalogCarousel() {
    const row = document.querySelector(".catalog-cards-row");
    if (!row) return;
    const arrows = document.querySelectorAll(".catalog-arrow");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dotnav = document.querySelector(".dotnav");
    const cards = row.querySelectorAll(".product-card");
    const total = cards.length;
    // Un punto por equipo; el activo es el primero visible (o el último al llegar al final)
    const dots = [];
    if (dotnav) {
      cards.forEach((card, i) => {
        const li = document.createElement("li");
        li.className = "dot-item";
        li.style.setProperty("--dot-number", i);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dot-link";
        btn.setAttribute("aria-label", "Ver " + (card.querySelector("h3")?.textContent || "equipo " + (i + 1)));
        btn.addEventListener("click", () => {
          const padLeft = parseFloat(getComputedStyle(row).paddingLeft) || 0;
          const left = card.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - padLeft;
          row.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
        });
        li.appendChild(btn);
        dotnav.appendChild(li);
        dots.push(li);
      });
    }

    function updateUI() {
      const max = row.scrollWidth - row.clientWidth;
      const first = cards[0];
      const step = first ? first.offsetWidth + (parseFloat(getComputedStyle(row).columnGap) || 0) : 1;
      let current = Math.round(row.scrollLeft / step) + 1;
      if (max > 0 && row.scrollLeft >= max - 2) current = total; // al final del carrusel
      current = Math.max(1, Math.min(total, current));
      dots.forEach((li, i) => {
        const on = i === current - 1;
        li.classList.toggle("active", on);
        if (on) li.firstElementChild.setAttribute("aria-current", "true");
        else li.firstElementChild.removeAttribute("aria-current");
      });
      arrows.forEach((btn) => {
        const atEdge = Number(btn.dataset.dir) < 0 ? row.scrollLeft <= 2 : row.scrollLeft >= max - 2;
        btn.setAttribute("aria-disabled", String(atEdge));
      });
    }
    // el scroll se procesa una vez por frame
    let ticking = false;
    row.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; updateUI(); });
    }, { passive: true });
    window.addEventListener("resize", updateUI);
    updateUI();

    // Flechas: una card por click
    arrows.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const card = row.querySelector(".product-card");
        if (!card) return;
        const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
        row.scrollBy({ left: Number(btn.dataset.dir) * (card.offsetWidth + gap), behavior: reducedMotion ? "auto" : "smooth" });
      });
    });

    // Arrastre con mouse (el touch ya es nativo)
    let startX = 0, startLeft = 0, dragging = false, moved = false;
    row.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = row.scrollLeft;
    });
    row.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        row.classList.add("is-dragging"); // desactiva el snap mientras se arrastra
        row.setPointerCapture(e.pointerId);
      }
      if (moved) row.scrollLeft = startLeft - dx;
    });
    const endDrag = () => {
      dragging = false;
      row.classList.remove("is-dragging");
    };
    row.addEventListener("pointerup", endDrag);
    row.addEventListener("pointercancel", endDrag);
    // Si hubo arrastre, el click que sigue al pointerup no debe llegar a card/swatch/botón
    row.addEventListener("click", (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
    row.addEventListener("dragstart", (e) => e.preventDefault());
  }
  initCatalogCarousel();

  const catalogGrid = document.querySelector(".catalog-grid-full");
  if (catalogGrid && typeof CATALOGO_DESTACADO === "undefined") {
    catalogGrid.innerHTML = catalogError;
  }
  if (catalogGrid && typeof CATALOGO_DESTACADO !== "undefined") {
    // El carrusel del Home usa SOLO CATALOGO_DESTACADO; la grilla del catálogo suma los accesorios.
    const productos = [...CATALOGO_DESTACADO, ...expandirAccesorios()];
    catalogGrid.innerHTML = productos.map((p, i) => renderProductCard(p, i < 4)).join("");

    /* Filtros 100% client-side (solo esconden/muestran las .product-card ya renderizadas):
       - pestañas de categoría generadas desde los datos (nunca hardcodeadas);
       - al elegir "Accesorios", una segunda fila de chips de subcategoría (también desde los datos);
       - buscador insensible a mayúsculas y tildes, en nombre + subcategoría + variante, combinado
         con la pestaña/chip activos.
       URL: ?cat=Accesorios preselecciona la pestaña y ?q=texto, la búsqueda. */
    const filterTabs = document.querySelector(".catalog-filter-tabs");
    const subRow = document.querySelector(".catalog-subfilters");
    const subTabs = document.querySelector(".catalog-subtabs");
    const filterSearch = document.querySelector(".catalog-filter-search");
    const countEl = document.querySelector(".catalog-count");
    const emptyEl = document.querySelector(".catalog-empty");
    const emptyBtn = emptyEl ? emptyEl.querySelector("a") : null;
    const categorias = [...new Set(productos.map((p) => p.categoria))];
    const subcategorias = [...new Set(productos.filter((p) => p.subcategoria).map((p) => p.subcategoria))];
    const params = new URLSearchParams(window.location.search);
    let activeCat = categorias.find((c) => normalizar(c) === normalizar(params.get("cat") || "")) || "all";
    // ?sub=Cables preselecciona el chip de subcategoría (y, si falta ?cat, la pestaña Accesorios)
    let activeSub = subcategorias.find((s) => normalizar(s) === normalizar(params.get("sub") || "")) || "all";
    if (activeSub !== "all") activeCat = "Accesorios";
    if (filterSearch && params.get("q")) filterSearch.value = params.get("q");

    const btnFiltro = (clase, valor, label, activo) =>
      `<button type="button" class="catalog-filter-tab ${clase}${activo ? " is-active" : ""}" data-value="${escAttr(valor)}" aria-pressed="${activo}">${label}</button>`;
    if (filterTabs) {
      filterTabs.innerHTML = [btnFiltro("", "all", "Todos", activeCat === "all"), ...categorias.map((c) => btnFiltro("", c, c, activeCat === c))].join("");
    }
    if (subTabs) {
      subTabs.innerHTML = [btnFiltro("catalog-subtab", "all", "Todas", activeSub === "all"), ...subcategorias.map((s) => btnFiltro("catalog-subtab", s, s, activeSub === s))].join("");
    }

    const applyCatalogFilter = () => {
      const esAccesorios = activeCat === "Accesorios";
      if (subRow) subRow.hidden = !esAccesorios;
      const terminos = normalizar(filterSearch ? filterSearch.value.trim() : "").split(/\s+/).filter(Boolean);
      let visible = 0;
      catalogGrid.querySelectorAll(".product-card").forEach((card) => {
        const okCat = activeCat === "all" || card.dataset.categoria === activeCat;
        const okSub = !esAccesorios || activeSub === "all" || card.dataset.subcategoria === activeSub;
        const okQuery = terminos.every((t) => card.dataset.busqueda.includes(t));
        const show = okCat && okSub && okQuery;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (countEl) countEl.textContent = visible + (visible === 1 ? " producto" : " productos");
      if (emptyEl) emptyEl.hidden = visible > 0;
      if (emptyBtn && visible === 0 && typeof SITE_CONFIG !== "undefined") {
        const q = filterSearch ? filterSearch.value.trim() : "";
        emptyBtn.href = "https://wa.me/" + SITE_CONFIG.whatsappNumber + "?text=" +
          encodeURIComponent(q ? "Hola, estoy buscando \"" + q + "\" y no lo encuentro en el catálogo" : "Hola, no encuentro en el catálogo el producto que busco");
      }
    };

    const activar = (grupo, btn) => {
      grupo.querySelectorAll(".catalog-filter-tab").forEach((t) => {
        t.classList.toggle("is-active", t === btn);
        t.setAttribute("aria-pressed", String(t === btn));
      });
    };
    if (filterTabs) {
      filterTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".catalog-filter-tab");
        if (!btn) return;
        activeCat = btn.dataset.value;
        activar(filterTabs, btn);
        if (activeCat !== "Accesorios") { // al salir de Accesorios, la fila de chips se oculta y se resetea
          activeSub = "all";
          if (subTabs) activar(subTabs, subTabs.querySelector('[data-value="all"]'));
        }
        applyCatalogFilter();
      });
    }
    if (subTabs) {
      subTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".catalog-filter-tab");
        if (!btn) return;
        activeSub = btn.dataset.value;
        activar(subTabs, btn);
        applyCatalogFilter();
      });
    }
    if (filterSearch) filterSearch.addEventListener("input", applyCatalogFilter);
    applyCatalogFilter();
  }

  /* ============================================================
     ACCESOS RÁPIDOS (Home) — una categoría con productos lleva al catálogo
     filtrado; una sin productos cargados no se oculta: pasa a consultar
     disponibilidad por WhatsApp.
     ============================================================ */
  document.querySelectorAll(".category-card[data-cat]").forEach((card) => {
    const cat = card.dataset.cat;
    const hasProducts = typeof CATALOGO_DESTACADO !== "undefined" && CATALOGO_DESTACADO.some((p) => p.categoria === cat);
    if (hasProducts) return;
    card.setAttribute("data-wa", "Hola, quiero consultar disponibilidad de " + cat);
    card.setAttribute("target", "_blank");
    card.setAttribute("rel", "noopener");
    card.setAttribute("href", "https://wa.me/5492614699026");
    const cta = card.querySelector(".category-card-cta");
    if (cta) cta.textContent = "Consultá disponibilidad";
  });

  /* ============================================================
     MAPA — se carga solo en el Home, cuando se acerca al viewport
     ============================================================ */
  loadBranchMap();

  /* ============================================================
     STAT NUMBERS — conteo 0 → valor final al entrar en viewport.
     El HTML ya trae el valor final (sin JS o con reduced-motion se ve
     correcto); el JS lo baja a 0 solo si va a animar.
     ============================================================ */
  function initStatCounters() {
    const numbers = document.querySelectorAll(".stat-number[data-count]");
    if (!numbers.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const DURATION = 1600;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const format = (el, n) => (el.dataset.prefix || "") + n + (el.dataset.suffix || "");

    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / DURATION, 1);
        el.textContent = format(el, Math.round(target * easeOutCubic(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const num = entry.target.matches(".stat-number") ? entry.target : entry.target.querySelector(".stat-number[data-count]");
        if (num) animate(num);
      });
    }, { threshold: 0.4 });

    numbers.forEach((el) => {
      el.textContent = format(el, 0);
      observer.observe(el.closest(".stat-block") || el);
    });
  }

  initStatCounters();
  applyWhatsAppLinks();

  /* ============================================================
     REVELADO DE TÍTULOS — h2 de las secciones: opacidad + translateY(12px),
     una sola vez al entrar en viewport. Sin movimiento (reduced-motion) o sin
     IntersectionObserver no se oculta nada. El CSS vive en style.css (.reveal).
     ============================================================ */
  function initTitleReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const titles = document.querySelectorAll("main h2:not(.hero h2):not(#calculadora h2)");
    if (!titles.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    titles.forEach((t) => { t.classList.add("reveal"); observer.observe(t); });
  }
  initTitleReveal();

  /* ============================================================
     CALCULADORA DE PLAN CANJE — la interfaz arma el DOM acá. La lógica pura está en
     js/calculadora-logic.js; los valores, en js/canje-tabla.js (planilla de Gonzalo) y la
     configuración en js/calculadora-data.js.
     Mientras CANJE_CONFIG.datosReales sea false NO se renderiza (el contenedor queda
     vacío y hidden), salvo con ?preview=1, que agrega una franja de aviso.
     Sin animaciones: el resultado aparece de inmediato. Sin guardar datos.
     ============================================================ */
  function initCalculadora() {
    if (typeof CANJE_CONFIG === "undefined") return;
    const habilitada = CANJE_CONFIG.datosReales === true;
    // Home: el link "Calculá tu valor →" solo se muestra con datos reales
    document.querySelectorAll("[data-calc-link]").forEach((a) => { a.hidden = !habilitada; });

    const root = document.getElementById("calculadora");
    if (!root || typeof CalculadoraCanje === "undefined" || typeof CANJE_TABLA === "undefined") return;
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    if (!habilitada && !preview) return;

    const Calc = CalculadoraCanje;
    const productos = typeof CATALOGO_DESTACADO !== "undefined" ? CATALOGO_DESTACADO : [];
    const money = (n) => Calc.formatearMonto(CANJE_CONFIG, n);
    const waLink = (texto) =>
      "https://wa.me/" + (typeof SITE_CONFIG !== "undefined" ? SITE_CONFIG.whatsappNumber : "") + "?text=" + encodeURIComponent(texto);

    const el = (tag, props = {}, ...hijos) => {
      const n = document.createElement(tag);
      Object.entries(props).forEach(([k, v]) => {
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (v === true) n.setAttribute(k, "");
        else if (v !== false && v != null) n.setAttribute(k, v);
      });
      hijos.flat().forEach((h) => { if (h) n.append(h); });
      return n;
    };
    const field = (id, label, control, ayuda) =>
      el("div", { class: "calc-field" },
        el("label", { for: id, text: label }),
        control,
        ayuda ? el("p", { class: "calc-help", id: id + "-ayuda", text: ayuda }) : null);

    // --- Controles
    const selModelo = el("select", { id: "calc-modelo", name: "modelo" },
      el("option", { value: "", text: "Elegí un modelo" }),
      Calc.agruparModelosPorGeneracion(CANJE_TABLA).map((g) =>
        el("optgroup", { label: g.etiqueta }, g.modelos.map((m) => el("option", { value: m.id, text: m.nombre })))),
      el("option", { value: Calc.NO_LISTADO, text: "Mi modelo no está en la lista" }));
    const selCap = el("select", { id: "calc-capacidad", name: "capacidad", disabled: true },
      el("option", { value: "", text: "Elegí una capacidad" }));
    const inBateria = el("input", { id: "calc-bateria", name: "bateria", type: "number", inputmode: "numeric", min: "1", max: "100", step: "1", "aria-describedby": "calc-bateria-ayuda" });
    const chkDetalles = el("input", { id: "calc-detalles", name: "detalles", type: "checkbox" });
    const txtDetalles = el("textarea", { id: "calc-detalles-texto", name: "detallesTexto", rows: "3", maxlength: "300" });
    const inOtro = el("input", { id: "calc-modelo-texto", name: "modeloTexto", type: "text", maxlength: "60", autocomplete: "off" });
    const waOtro = el("a", { class: "btn btn-primary calc-wa-otro", target: "_blank", rel: "noopener", text: "Consultar por WhatsApp" });
    const btnCalcular = el("button", { class: "btn btn-primary calc-submit", type: "submit", text: "Calcular" });

    const fCap = field("calc-capacidad", "Capacidad", selCap);
    const fBat = field("calc-bateria", "Salud de batería (%)", inBateria, "Lo ves en Ajustes › Batería › Estado de la batería");
    const filaDetalles = el("div", { class: "calc-check" }, chkDetalles,
      el("label", { for: "calc-detalles", text: "Mi iPhone tiene detalles (pantalla rota, golpes, no enciende, etc.)" }));
    const boxDetalles = el("div", { class: "calc-field", hidden: true },
      el("label", { for: "calc-detalles-texto", text: "Contanos los detalles (opcional)" }), txtDetalles);
    const boxOtro = el("div", { class: "calc-otro", hidden: true },
      field("calc-modelo-texto", "¿Qué modelo es?", inOtro, "Escribí el modelo y la memoria si la sabés. Lo tasamos en el local."),
      waOtro);
    const resultado = el("div", { class: "calc-result", id: "calc-resultado", "aria-live": "polite" });

    const form = el("form", { class: "calc-card", novalidate: true, "aria-labelledby": "calc-titulo" },
      el("h2", { class: "title-sentence", id: "calc-titulo", text: "Calculá cuánto te tomamos tu iPhone" }),
      field("calc-modelo", "Modelo", selModelo),
      fCap, fBat, filaDetalles, boxDetalles, boxOtro, btnCalcular);

    root.append(el("div", { class: "container" },
      el("div", { class: "calc" },
        !habilitada ? el("p", { class: "calc-preview", text: "VISTA PREVIA — datos de ejemplo" }) : null,
        form, resultado)));
    root.hidden = false;

    // --- Comportamiento
    const limpiar = () => {
      resultado.replaceChildren();
      form.querySelectorAll(".calc-error").forEach((e) => e.remove());
      form.querySelectorAll("[aria-invalid]").forEach((c) => {
        c.removeAttribute("aria-invalid");
        if (c === inBateria) c.setAttribute("aria-describedby", "calc-bateria-ayuda");
        else c.removeAttribute("aria-describedby");
      });
    };

    const actualizarLinkOtro = () => { waOtro.href = waLink(Calc.mensajeModeloNoListado(inOtro.value)); };
    // "Mi modelo no está en la lista": sin capacidad ni batería, solo el modelo escrito + WhatsApp
    const modoOtro = (on) => {
      fCap.hidden = on;
      fBat.hidden = on;
      filaDetalles.hidden = on;
      boxDetalles.hidden = on || !chkDetalles.checked;
      boxOtro.hidden = !on;
      btnCalcular.hidden = on;
      if (on) actualizarLinkOtro();
    };

    selModelo.addEventListener("change", () => {
      limpiar();
      if (selModelo.value === Calc.NO_LISTADO) { modoOtro(true); return; }
      modoOtro(false);
      const m = Calc.buscarModelo(CANJE_TABLA, selModelo.value);
      selCap.replaceChildren(el("option", { value: "", text: "Elegí una capacidad" }),
        ...(m ? m.capacidades : []).map((c) => el("option", { value: String(c.gb), text: c.gb + " GB" })));
      selCap.disabled = !m;
      if (m && m.capacidades.length === 1) selCap.value = String(m.capacidades[0].gb); // una sola memoria: ya elegida
    });
    inOtro.addEventListener("input", actualizarLinkOtro);
    [selCap, inBateria, txtDetalles].forEach((c) => c.addEventListener("input", limpiar));
    chkDetalles.addEventListener("change", () => { boxDetalles.hidden = !chkDetalles.checked; limpiar(); });

    const mostrarErrores = (errores) => {
      const mapa = { modelo: selModelo, capacidad: selCap, bateria: inBateria };
      let primero = null;
      Object.keys(errores).forEach((k) => {
        const control = mapa[k];
        const id = "calc-error-" + k;
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", (k === "bateria" ? "calc-bateria-ayuda " : "") + id);
        control.closest(".calc-field").append(el("p", { class: "calc-error", id, role: "alert", text: errores[k] }));
        primero = primero || control;
      });
      if (primero) primero.focus();
    };

    const botonWa = (texto, etiqueta, clase) =>
      el("a", { class: "btn " + clase, href: waLink(texto), target: "_blank", rel: "noopener", text: etiqueta });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      limpiar();
      const entrada = {
        modeloId: selModelo.value,
        gb: selCap.value,
        bateria: inBateria.value,
        detalles: chkDetalles.checked,
        detallesTexto: txtDetalles.value,
        modeloTexto: inOtro.value
      };
      const r = Calc.calcularCanje(CANJE_CONFIG, CANJE_TABLA, entrada, productos);
      if (r.estado === "error") { mostrarErrores(r.errores); return; }

      const partes = [];
      if (r.estado === "valor") {
        partes.push(el("p", { class: "calc-valor-wrap" },
          el("span", { class: "calc-valor-label", text: "Valor estimado:" }),
          el("strong", { class: "calc-valor", text: money(r.valor) })),
          el("p", { class: "calc-tramo", text: r.tramoTexto }));
      } else {
        partes.push(el("p", { class: "calc-consulta", text: r.mensaje }));
      }
      partes.push(el("p", { class: "calc-aviso", text: CANJE_CONFIG.avisoLegal }));

      if (r.estado === "valor" && r.escalones.length) {
        partes.push(
          el("h3", { class: "calc-escalones-titulo", text: "Si querés cambiar por otro equipo" }),
          el("p", { class: "calc-help", text: "Estos son los equipos del catálogo con la diferencia que sumarías en cada caso:" }),
          el("ol", { class: "calc-escalones" }, r.escalones.map((s) =>
            el("li", { class: "calc-escalon" },
              el("p", { class: "calc-escalon-nombre", text: s.etiqueta }),
              el("p", { class: "calc-escalon-precio", text: "Precio de lista: " + money(s.precio) }),
              el("p", { class: "calc-escalon-paga" }, "Pagás ", el("strong", { text: money(s.diferencia) })),
              s.sumaVsAnterior > 0
                ? el("p", { class: "calc-escalon-suma", text: "Sumando solo " + money(s.sumaVsAnterior) + " más pasás al " + s.etiqueta })
                : null,
              botonWa(Calc.mensajeWhatsApp(CANJE_CONFIG, CANJE_TABLA, entrada, r, s.etiqueta), "Quiero este equipo", "btn-outline")))));
      }
      partes.push(el("div", { class: "calc-acciones" },
        botonWa(Calc.mensajeWhatsApp(CANJE_CONFIG, CANJE_TABLA, entrada, r, ""),
          r.estado === "valor" ? "Confirmar por WhatsApp" : "Consultar por WhatsApp", "btn-primary")));
      resultado.append(el("div", { class: "calc-card calc-card--result" }, partes));
    });
  }
  initCalculadora();
});
