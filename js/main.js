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
  function escAttr(t) { return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

  function renderProductCard(p, eager = false) {
    const colores = p.colores || [];
    // Un solo color no se ofrece como elección: los swatches aparecen desde 2.
    const swatches = colores.length > 1
      ? `<div class="color-swatches" role="group" aria-label="Colores disponibles">
          ${colores.map((color, i) => `<button type="button" class="color-swatch${i === 0 ? " is-active" : ""}"
            style="--swatch: ${color.hex}" data-img="${color.imagen}" data-alt="${escAttr(p.nombre + " color " + color.nombre.toLowerCase())}"
            aria-label="${escAttr(color.nombre)}" aria-pressed="${i === 0}" title="${escAttr(color.nombre)}"></button>`).join("")}
        </div>`
      : "";
    // "Desde $1.850.000" → "Desde" chico arriba y monto grande; "Consultar" va solo, igual de prominente
    const m = String(p.precio).match(/^(Desde)\s+(.+)$/i);
    const price = m
      ? `<small>${m[1]}</small><strong>${m[2]}</strong>`
      : `<strong>${p.precio}</strong>`;
    const chips = String(p.especificacion || "").split("·").map((t) => t.trim()).filter(Boolean)
      .map((t) => `<li>${t}</li>`).join("");
    const status = p.disponible
      ? `<span class="pill pill-status">Disponible</span>`
      : `<span class="pill pill-status is-off">Consultar disponibilidad</span>`;
    return `
      <article class="product-card" data-categoria="${p.categoria}" data-nombre="${escAttr(p.nombre.toLowerCase())}">
        <div class="product-card-media">
          <div class="product-card-pills"><span class="pill">${p.categoria}</span>${status}</div>
          ${colores.length
            ? `<img src="${colores[0].imagen}" alt="${escAttr(p.nombre + " color " + colores[0].nombre.toLowerCase())}" width="728" height="666" loading="${eager ? "eager" : "lazy"}"${eager ? " fetchpriority=\"high\"" : ""} decoding="async">`
            : `<div class="product-card-media-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="7" y="2" width="10" height="20" rx="2.2"></rect>
                <line x1="11" y1="18" x2="13" y2="18"></line>
              </svg>
              <span>Foto próximamente</span>
            </div>`
          }
        </div>
        ${swatches}
        <div class="product-card-body">
          <h3 class="product-card-name">${p.nombre}</h3>
          <p class="product-card-variant">${p.variante}</p>
          <ul class="product-card-chips">${chips}</ul>
          <div class="product-card-foot">
            <p class="product-card-price"><span class="sr-only">Precio: </span>${price}</p>
            <a class="btn btn-primary" data-wa="${escAttr("Hola, me interesa el " + p.nombre + " · " + p.variante)}"
               href="https://wa.me/5492614699026"
               target="_blank" rel="noopener">Consultar</a>
          </div>
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
    // Con la calculadora visible, el degradé desde el hero pasa a su sección
    const siguiente = document.getElementById("plan-canje-como-funciona");
    if (siguiente) siguiente.classList.remove("fade-top", "from-0");

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
