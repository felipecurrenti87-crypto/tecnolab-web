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
          catalogRow.scrollWidth - pinTrack.clientWidth + 80;

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

  /* ============================================================
     HERO — tilt 3D sutil (mouse desktop / giroscopio mobile)
     ============================================================ */
  const heroBgImg = document.querySelector(".hero-bg img");
  const MAX_TILT = 6;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (heroBgImg && !prefersReducedMotion) {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      window.addEventListener("mousemove", (e) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        gsap.to(heroBgImg, {
          rotateY: x * MAX_TILT,
          rotateX: -y * MAX_TILT,
          scale: 1.04,
          duration: 0.6,
          ease: "power2.out",
          transformPerspective: 1400,
        });
      });
    } else if (window.DeviceOrientationEvent) {
      const applyTilt = (beta, gamma) => {
        const x = Math.max(-1, Math.min(1, gamma / 30));
        const y = Math.max(-1, Math.min(1, (beta - 40) / 30));
        gsap.to(heroBgImg, {
          rotateY: x * MAX_TILT,
          rotateX: -y * MAX_TILT,
          scale: 1.04,
          duration: 0.6,
          ease: "power2.out",
          transformPerspective: 1400,
        });
      };

      const startOrientation = () => {
        window.addEventListener("deviceorientation", (e) => {
          if (e.beta !== null && e.gamma !== null) applyTilt(e.beta, e.gamma);
        });
      };

      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        document.body.addEventListener(
          "touchstart",
          () => {
            DeviceOrientationEvent.requestPermission()
              .then((state) => state === "granted" && startOrientation())
              .catch(() => {});
          },
          { once: true }
        );
      } else {
        startOrientation();
      }
    }
  }
});
