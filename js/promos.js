/* Tarjeta flotante de promociones (solo index.html y catalogo.html). Los datos viven en js/promos-data.js.
   No bloqueante (role="dialog" aria-modal="false"): no atrapa ni mueve el foco. El DOM se crea al dispararse,
   no al cargar la página. Solo transform y opacity; will-change únicamente durante la animación. */
(function () {
  "use strict";
  if (typeof PROMOS === "undefined" || typeof promoVigente !== "function") return;
  const SALIDA_MS = 320, UMBRAL_ARRASTRE = 60;
  const $ = (s, r) => (r || document).querySelector(s);
  const pagina = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clave = (promo) => "tecnolab_promo_" + promo.id;
  const mem = {}; // respaldo si localStorage está bloqueado (vale solo para esta página)

  function vistaReciente(promo) {
    const horas = (promo.popup && promo.popup.frecuenciaHoras) || 0;
    let ts = mem[promo.id] || 0;
    try { ts = Math.max(ts, Number(localStorage.getItem(clave(promo))) || 0); } catch (e) { /* bloqueado */ }
    return ts > 0 && Date.now() - ts < horas * 3600000;
  }
  function recordar(promo) {
    mem[promo.id] = Date.now();
    try { localStorage.setItem(clave(promo), String(Date.now())); } catch (e) { /* bloqueado */ }
  }

  const promo = promoVigente(new Date()).find((p) => p.popup && p.popup.mostrar === true && (p.popup.paginas || []).includes(pagina) && !vistaReciente(p));
  if (!promo) return;

  /* ---------- cuándo aparece: retraso Y (scroll ≥ 25 % o clic); sin otro diálogo ni aviso encima ---------- */
  let pasoRetraso = false, huboInteraccion = false, tarjeta = null, espera = 0;
  const bloqueado = () => !!$("dialog[open]") || !!$(".pedido-toast.is-show");
  function intentar() {
    if (tarjeta || !pasoRetraso || !huboInteraccion || espera) return;
    if (!bloqueado()) { mostrar(); return; }
    espera = setInterval(() => { if (!bloqueado()) { clearInterval(espera); espera = 0; mostrar(); } }, 400); // espera a que se cierre
  }
  const alScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max > 0 && scrollY / max >= 0.25) interaccion();
  };
  const interaccion = () => {
    if (huboInteraccion) return;
    huboInteraccion = true;
    removeEventListener("scroll", alScroll); removeEventListener("pointerdown", interaccion);
    intentar();
  };
  addEventListener("scroll", alScroll, { passive: true });
  addEventListener("pointerdown", interaccion, { passive: true });
  setTimeout(() => { pasoRetraso = true; intentar(); }, ((promo.popup && promo.popup.retrasoSeg) || 0) * 1000);

  /* ---------- tarjeta ---------- */
  const ICONOS = {
    cargador: '<path d="M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-10 0V7zM12 15v4a2 2 0 0 0 2 2h2"/>',
    funda: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><rect x="9.5" y="5" width="3.5" height="3.5" rx="1"/>',
    vidrio: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    regalo: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M3 9h18M12 9c-2.5 0-4-1-4-2.5S9.5 4 12 9zM12 9c2.5 0 4-1 4-2.5S14.5 4 12 9z"/>'
  };
  const icono = (t) => {
    const k = /cargador/i.test(t) ? "cargador" : /funda/i.test(t) ? "funda" : /vidrio|templado/i.test(t) ? "vidrio" : "regalo";
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[k] + "</svg>";
  };
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function representativo() { // primer producto del catálogo que coincide y tiene foto
    const lista = typeof CATALOGO_DESTACADO !== "undefined" ? CATALOGO_DESTACADO : [];
    const p = lista.find((x) => promoAplica(promo, x) && (x.colores || []).length);
    return p ? { src: p.colores[0].imagen, alt: p.nombre } : null;
  }

  function mostrar() {
    const img = representativo(), c = promo.cta || {}, regalos = (promo.regalos || []).filter(Boolean);
    const wa = c.mensaje && typeof SITE_CONFIG !== "undefined" ? "https://wa.me/" + SITE_CONFIG.whatsappNumber + "?text=" + encodeURIComponent(c.mensaje) : "";
    let n = 0;
    const st = () => ' data-st style="--i:' + n++ + '"'; // elementos que entran escalonados
    tarjeta = document.createElement("div");
    tarjeta.className = "promo-card";
    tarjeta.setAttribute("role", "dialog");
    tarjeta.setAttribute("aria-modal", "false");
    tarjeta.setAttribute("aria-labelledby", "promo-titulo");
    tarjeta.innerHTML =
      '<button type="button" class="promo-cerrar" aria-label="Cerrar promoción"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="promo-cuerpo">' +
      (img ? '<div class="promo-thumb"' + st() + '><img src="' + esc(img.src) + '" alt="' + esc(img.alt) + '" width="96" height="96"></div>' : "") +
      '<div class="promo-info">' +
      '<h2 id="promo-titulo" class="promo-titulo"' + st() + ">" + esc(promo.titulo || "") + "</h2>" +
      (promo.texto ? '<p class="promo-texto"' + st() + ">" + esc(promo.texto) + "</p>" : "") + "</div></div>" +
      (regalos.length ? '<ul class="promo-chips"' + st() + ">" + regalos.map((r) => "<li>" + icono(r) + "<span>" + esc(r) + "</span></li>").join("") + "</ul>" : "") +
      (promo.fin ? '<p class="promo-nota">Válido hasta ' + esc(fechaLegible(promo.fin)) + "</p>" : "") +
      (promo.condiciones ? '<p class="promo-nota">' + esc(promo.condiciones) + "</p>" : "") +
      '<div class="promo-acciones"' + st() + ">" +
      (wa ? '<a class="btn btn-primary promo-cta" href="' + wa + '" target="_blank" rel="noopener">' + esc(c.texto || "Consultar por WhatsApp") + "</a>" : "") +
      '<a class="promo-ver" href="catalogo.html">Ver equipos</a></div>';
    document.body.append(tarjeta);
    recordar(promo);
    tarjeta.classList.add("is-anim", "is-in");
    const fin = () => tarjeta && tarjeta.classList.remove("is-anim");
    tarjeta.addEventListener("animationend", (e) => { if (e.target === tarjeta) fin(); });
    setTimeout(fin, 800);
    $(".promo-cerrar", tarjeta).addEventListener("click", () => cerrar());
    const cta = $(".promo-cta", tarjeta);
    if (cta) cta.addEventListener("click", () => { recordar(promo); cerrar(); });
    document.addEventListener("keydown", alTeclado);
    arrastre(tarjeta);
  }
  const alTeclado = (e) => { if (e.key === "Escape" && tarjeta) cerrar(); };

  function quitar() {
    if (!tarjeta) return;
    tarjeta.remove(); tarjeta = null;
    document.removeEventListener("keydown", alTeclado);
  }
  function cerrar(porArrastre) {
    const t = tarjeta;
    if (!t || t.dataset.saliendo) return;
    t.dataset.saliendo = "1";
    recordar(promo);
    t.classList.remove("is-in");
    t.classList.add("is-anim");
    if (!porArrastre) { t.style.transform = ""; t.classList.add("is-out"); } // por arrastre sale con la transición en línea
    let hecho = false;
    const listo = () => { if (hecho) return; hecho = true; if (tarjeta === t) quitar(); };
    t.addEventListener(porArrastre ? "transitionend" : "animationend", (e) => { if (e.target === t) listo(); });
    setTimeout(listo, SALIDA_MS + 120); // respaldo
  }

  /* ---------- móvil: cerrar arrastrando hacia abajo (umbral 60 px, sigue al dedo) ---------- */
  function arrastre(t) {
    let y0 = null, dy = 0;
    t.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || !matchMedia("(max-width: 699px)").matches || e.target.closest("a, button")) return;
      y0 = e.clientY; dy = 0;
      try { t.setPointerCapture(e.pointerId); } catch (err) { /* puntero sintético */ }
      t.style.transition = "none";
    });
    t.addEventListener("pointermove", (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      t.style.transform = "translateY(" + dy + "px)";
      t.style.opacity = String(Math.max(0.35, 1 - dy / 320));
    });
    const soltar = () => {
      if (y0 === null) return;
      y0 = null;
      if (dy > UMBRAL_ARRASTRE) { // salida suave desde donde quedó
        t.style.transition = "transform " + SALIDA_MS + "ms cubic-bezier(0.4, 0, 1, 1), opacity " + SALIDA_MS + "ms cubic-bezier(0.4, 0, 1, 1)";
        t.style.transform = "translateY(" + (dy + 140) + "px)";
        t.style.opacity = "0";
        cerrar(true);
      } else { // vuelve a su lugar
        t.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease";
        t.style.transform = ""; t.style.opacity = "";
      }
    };
    t.addEventListener("pointerup", soltar);
    t.addEventListener("pointercancel", soltar);
  }
})();
