document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  /* ============================================================
     HEADER — fondo con blur al hacer scroll
     ============================================================ */
  const header = document.querySelector(".site-header");
  const onHeaderScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
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
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });

  /* ============================================================
     CATÁLOGO DESTACADO — scroll horizontal pineado
     ============================================================ */
  const pinSection = document.querySelector(".catalog-pin-section");
  const pinTrack = document.querySelector(".catalog-pin-track");

  if (pinSection && catalogRow && window.matchMedia("(min-width: 900px)").matches) {
    ScrollTrigger.matchMedia({
      "(min-width: 900px)": function () {
        const getScrollDistance = () =>
          Math.max(0, catalogRow.scrollWidth - pinTrack.clientWidth + 80);

        // Con pocas cards (o viewport muy ancho) la fila entra entera y
        // no hay nada para desplazar: getScrollDistance() daba negativo,
        // lo que rompía el rango del pin (quedaba en ~0.01px) y esa
        // sección degenerada corría mal el cálculo de scroll-posición
        // de TODOS los ScrollTrigger de .reveal de ahí en adelante —
        // eso era lo que se veía como el título del catálogo "roto".
        if (getScrollDistance() === 0) return;

        const horizontalTween = gsap.to(catalogRow, {
          x: () => -getScrollDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: pinSection,
            start: "top top",
            end: () => `+=${getScrollDistance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        return () => horizontalTween.scrollTrigger.kill();
      },
    });
  }

  // El pin de arriba inserta un spacer y corre el layout DESPUÉS de que
  // los ScrollTrigger de .reveal ya calcularon su punto de disparo — sin
  // este refresh, los .reveal que caen dentro/después de la sección
  // pineada (el eyebrow y el h2 de "Catálogo destacado") quedan con un
  // trigger desincronizado y nunca llegan a dispararse en desktop.
  ScrollTrigger.refresh();
});
