document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  /* ============================================================
     HEADER — vidrio permanente desde el primer frame; el scroll
     ya solo achica el padding (is-compact), no trae el fondo/blur.
     ============================================================ */
  const header = document.querySelector(".site-header");
  const onHeaderScroll = () => {
    header.classList.toggle("is-compact", window.scrollY > 40);
  };
  onHeaderScroll();
  window.addEventListener("scroll", onHeaderScroll, { passive: true });

  /* ============================================================
     NAV MOBILE
     ============================================================ */
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      mainNav.classList.toggle("is-open");
    });
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => mainNav.classList.remove("is-open"));
    });
  }

  /* ============================================================
     CATÁLOGO — render de cards desde products-data.js
     ============================================================ */
  const catalogRow = document.querySelector(".catalog-cards-row");
  if (catalogRow && typeof CATALOGO_DESTACADO !== "undefined") {
    catalogRow.innerHTML = CATALOGO_DESTACADO.map(
      (p) => `
      <article class="product-card reveal">
        <div class="glow" aria-hidden="true"></div>
        <div class="product-card-media">
          <img src="${p.imagen}" alt="${p.nombre} ${p.variante}" loading="lazy">
        </div>
        <div class="product-card-body">
          <span class="product-card-tag">${p.categoria}</span>
          <h3 class="product-card-name">${p.nombre}</h3>
          <p class="product-card-spec">${p.variante} · ${p.especificacion}</p>
          <div class="product-card-price-row">
            <span class="product-card-price">Precio<strong>${p.precio}</strong></span>
            <a class="btn btn-outline btn-sm" href="https://wa.me/549XXXXXXXXX?text=${encodeURIComponent(
              "Hola, quiero consultar disponibilidad de " + p.nombre + " " + p.variante
            )}" target="_blank" rel="noopener">Consultar</a>
          </div>
        </div>
      </article>`
    ).join("");
  }

  /* ============================================================
     SCROLL REVEALS — fade + translateY sutil
     ============================================================ */
  // will-change solo mientras dura el tween: el reveal lo maneja GSAP
  // con requestAnimationFrame (no transition/@keyframes de CSS), así
  // que no hay transitionend/animationend para engancharse — se usa
  // el equivalente real, onStart/onComplete de GSAP. Si will-change
  // quedaba seteado en el CSS en reposo, eso es justo lo que deja una
  // capa de composición fantasma sin limpiar en Chrome.
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      force3D: true,
      onStart: () => {
        el.style.willChange = "transform, opacity";
      },
      onComplete: () => {
        el.style.willChange = "auto";
        // fuerza un reflow para que Chrome descarte cualquier capa de
        // raster obsoleta en casos límite (lectura descartada a propósito)
        void el.offsetHeight;
      },
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });

  /* ============================================================
     HOME CINEMATIC — hero con frame-sequence + catálogo, un solo pin
     ============================================================ */
  const FRAME_COUNT = 60; // ajustar cuando entren los frames reales
  const FRAME_PATH = (i) => `assets/video/iphone-hero/frame-${String(i).padStart(4, "0")}.webp`;

  function initHomeCinematic() {
    const section = document.querySelector(".home-cinematic");
    const pin = document.querySelector(".cinematic-pin");
    const canvas = document.getElementById("phoneCanvas");
    const heroText = document.querySelector(".cinematic-hero-text");
    const catalogLayer = document.querySelector(".cinematic-catalog");
    if (!section || !pin || !canvas || !catalogRow) return;

    // Gate a desktop, igual que el pin viejo del catálogo, y respeta
    // prefers-reduced-motion: en mobile o con reduced-motion, el CSS
    // ya deja todo en flujo normal (ver .cinematic-pin en media query) —
    // acá ni siquiera vale la pena precargar los 60 frames.
    const isDesktop = window.matchMedia("(min-width: 900px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isDesktop || reducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    const ctx = canvas.getContext("2d");
    const frames = [];
    let imagesLoaded = 0;
    const frameState = { f: 0 };

    function preload(onDone) {
      for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.onload = img.onerror = () => {
          imagesLoaded++;
          if (imagesLoaded === FRAME_COUNT) onDone();
        };
        img.src = FRAME_PATH(i);
        frames.push(img);
      }
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = pin.clientWidth * dpr;
      canvas.height = pin.clientHeight * dpr;
      canvas.style.width = pin.clientWidth + "px";
      canvas.style.height = pin.clientHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame(index) {
      const img = frames[Math.max(0, Math.min(FRAME_COUNT - 1, index))];
      if (!img || !img.complete || !img.naturalWidth) return;
      const w = pin.clientWidth, h = pin.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // "contain" centrado, el frame ya trae su propio margen/sombra
      const scale = Math.min(w / img.width, h / img.height) * 0.85;
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    function buildTimeline() {
      // Reserva del recorrido de scroll: se recalcula con el ancho real
      // del catálogo, igual que hacía el pin viejo, para que el tramo
      // horizontal alcance a mostrar todas las cards.
      const getCatalogDistance = () =>
        Math.max(0, catalogRow.scrollWidth - pin.clientWidth + 80);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 3 + getCatalogDistance()}`,
          pin: pin,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Duraciones explícitas para que la timeline dure exactamente 1 —
      // así los labels de fase (0.15, 0.55, ...) son directamente % de
      // scroll, no un time offset arbitrario de GSAP.

      // Fase 1 (15% → 55%): el iPhone sube desde abajo del viewport y rota.
      tl.fromTo(canvas,
        { yPercent: 130, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.4, ease: "none" }, 0.15)
        .to(frameState, {
          f: FRAME_COUNT - 1,
          duration: 0.4,
          ease: "none",
          onUpdate: () => drawFrame(Math.round(frameState.f)),
        }, 0.15)
        // el texto cede protagonismo a medida que el iPhone toma el centro
        .to(heroText, { opacity: 0, y: -24, duration: 0.2, ease: "none" }, 0.35)

        // Fase 2 (55% → 72%): el iPhone sale por la izquierda + fade.
        .to(canvas, { xPercent: -140, opacity: 0, duration: 0.17, ease: "none" }, 0.55)

        // Fase 3 (60% → 100%): el catálogo entra por la derecha y después
        // se desplaza horizontalmente para mostrar el resto de las cards.
        // Arranca antes de que el iPhone termine de salir, para que se
        // crucen en vez de dejar un hueco vacío.
        .fromTo(catalogLayer,
          { xPercent: 100, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.15, ease: "none" }, 0.60)
        .to(catalogRow, {
          x: () => -getCatalogDistance(),
          duration: 0.25,
          ease: "none",
        }, 0.75);
    }

    preload(() => {
      resizeCanvas();
      drawFrame(0);
      window.addEventListener("resize", () => { resizeCanvas(); drawFrame(Math.round(frameState.f)); });
      buildTimeline();
      // El pin recién insertado agrega un spacer y corre el layout de
      // todo lo que viene después — sin este refresh, los .reveal que
      // caen debajo del home-cinematic quedan con su punto de disparo
      // calculado contra el layout viejo (antes del spacer) y nunca
      // llegan a dispararse en el momento correcto.
      ScrollTrigger.refresh();
    });
  }

  initHomeCinematic();
});
