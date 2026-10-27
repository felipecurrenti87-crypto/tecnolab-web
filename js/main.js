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
  function renderProductCard(p, eager = false) {
    const colores = p.colores || [];
    // Un solo color no se ofrece como elección: los swatches aparecen desde 2.
    const swatches = colores.length > 1
      ? `<div class="color-swatches" role="group" aria-label="Colores disponibles">
          ${colores.map((color, i) => `<button type="button" class="color-swatch${i === 0 ? " is-active" : ""}"
            style="--swatch: ${color.hex}" data-img="${color.imagen}" data-alt="${p.nombre} color ${color.nombre.toLowerCase()}"
            aria-label="${color.nombre}" aria-pressed="${i === 0}" title="${color.nombre}"></button>`).join("")}
        </div>`
      : "";
    return `
      <article class="product-card" data-categoria="${p.categoria}" data-nombre="${p.nombre.toLowerCase()}">
        <div class="product-card-media">
          ${colores.length
            ? `<img src="${colores[0].imagen}" alt="${p.nombre} color ${colores[0].nombre.toLowerCase()}" width="728" height="666" loading="${eager ? "eager" : "lazy"}" decoding="async">`
            : `<div class="product-card-media-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="7" y="2" width="10" height="20" rx="2.2"></rect>
                <line x1="11" y1="18" x2="13" y2="18"></line>
              </svg>
              <span>Foto próximamente</span>
            </div>`
          }
        </div>
        <div class="product-card-body">
          <h3 class="product-card-name">${p.nombre}</h3>
          <p class="product-card-variant">${p.variante}</p>
          ${swatches}
          <p class="product-card-spec">${p.especificacion}</p>
          <p class="product-card-price"><span class="sr-only">Precio: </span>${p.precio}</p>
          <a class="btn btn-primary" data-wa="Hola, me interesa el ${p.nombre} · ${p.variante}"
             href="https://wa.me/${typeof SITE_CONFIG !== "undefined" ? SITE_CONFIG.whatsappNumber : ""}"
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
    <a data-wa="Hola, quiero consultar por el catálogo" href="https://wa.me/" target="_blank" rel="noopener">Consultanos por WhatsApp</a>.</p>`;

  const catalogRow = document.querySelector(".catalog-cards-row");
  if (catalogRow) {
    catalogRow.innerHTML = typeof CATALOGO_DESTACADO !== "undefined"
      ? CATALOGO_DESTACADO.map((p, i) => renderProductCard(p, i < 2)).join("")
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
    const bar = document.querySelector(".catalog-progress-bar");
    const arrows = document.querySelectorAll(".catalog-arrow");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateUI() {
      const max = row.scrollWidth - row.clientWidth;
      const ratio = max > 0 ? row.scrollLeft / max : 1;
      if (bar) {
        // el thumb mide lo que se ve del total y recorre el resto de la pista
        const visible = row.scrollWidth > 0 ? Math.min(1, row.clientWidth / row.scrollWidth) : 1;
        bar.style.width = visible * 100 + "%";
        bar.style.transform = "translateX(" + (ratio * (1 - visible) / visible) * 100 + "%)";
      }
      arrows.forEach((btn) => {
        const atEdge = Number(btn.dataset.dir) < 0 ? row.scrollLeft <= 2 : row.scrollLeft >= max - 2;
        btn.setAttribute("aria-disabled", String(atEdge));
      });
    }
    row.addEventListener("scroll", updateUI, { passive: true });
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
    catalogGrid.innerHTML = CATALOGO_DESTACADO.map((p, i) => renderProductCard(p, i < 4)).join("");

    /* Filtro real: tabs de categoría generadas desde CATALOGO_DESTACADO
       (nunca hardcodeadas — si mañana hay productos Mac/iPad ahí, la tab
       aparece sola) + búsqueda de texto por nombre. 100% client-side,
       solo esconde/muestra .product-card, sin tocar el DOM de nuevo.
       ?cat=iPhone en la URL activa la pestaña correspondiente. */
    const filterTabs = document.querySelector(".catalog-filter-tabs");
    const filterSearch = document.querySelector(".catalog-filter-search");
    const countEl = document.querySelector(".catalog-count");
    const emptyEl = document.querySelector(".catalog-empty");
    const categorias = [...new Set(CATALOGO_DESTACADO.map((p) => p.categoria))];
    const requested = new URLSearchParams(window.location.search).get("cat");
    const initialCat = categorias.find((c) => c.toLowerCase() === (requested || "").toLowerCase()) || "all";

    if (filterTabs) {
      const tab = (cat, label) =>
        `<button type="button" class="catalog-filter-tab${cat === initialCat ? " is-active" : ""}" data-category="${cat}" aria-pressed="${cat === initialCat}">${label}</button>`;
      filterTabs.innerHTML = [tab("all", "Todos"), ...categorias.map((cat) => tab(cat, cat))].join("");
    }

    const applyCatalogFilter = () => {
      const activeTab = filterTabs ? filterTabs.querySelector(".is-active") : null;
      const activeCategory = activeTab ? activeTab.dataset.category : "all";
      const query = filterSearch ? filterSearch.value.trim().toLowerCase() : "";
      let visible = 0;
      catalogGrid.querySelectorAll(".product-card").forEach((card) => {
        const matchesCategory = activeCategory === "all" || card.dataset.categoria === activeCategory;
        const matchesQuery = !query || card.dataset.nombre.includes(query);
        const show = matchesCategory && matchesQuery;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (countEl) countEl.textContent = visible + (visible === 1 ? " equipo" : " equipos");
      if (emptyEl) emptyEl.hidden = visible > 0;
    };

    if (filterTabs) {
      filterTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".catalog-filter-tab");
        if (!btn) return;
        filterTabs.querySelectorAll(".catalog-filter-tab").forEach((t) => {
          t.classList.toggle("is-active", t === btn);
          t.setAttribute("aria-pressed", String(t === btn));
        });
        applyCatalogFilter();
      });
    }
    if (filterSearch) {
      filterSearch.addEventListener("input", applyCatalogFilter);
    }
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
    card.setAttribute("href", "https://wa.me/");
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
});
