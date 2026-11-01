/* ============================================================
   BOTÓN «VER CATÁLOGO» DEL HERO — vidrio líquido propio.
   Misma técnica que el header (filtro SVG de refracción usado como backdrop-filter, un feDisplacementMap por canal
   R/G/B con escalas distintas y un mapa de desplazamiento que se dibuja en un canvas al tamaño real), pero con un
   filtro NUEVO, #lg-refract-btn: no usa ni modifica #lg-refract del header.
   - Se activa solo cuando el header decidió html[data-glass="liquid"] (Chromium de escritorio, puntero fino, sin
     reduced-motion ni reduced-transparency, sin ?glass=off): así ?glass=off lo desactiva igual que al header.
     Sin eso queda el vidrio simple del CSS (blur + saturate), sin filtro SVG.
   - La luz suave que sigue al mouse (--mx / --my) solo se actualiza con mouse fino y sin reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  // Escalas R/G/B suaves (desplazamiento máx. ≈ escala / 2 px) y ancho del bisel en px
  const BOTON = { escalaR: 22, escalaG: 20, escalaB: 18, bisel: 18 };

  const btn = document.querySelector(".hero-btn--ghost");
  if (!btn) return;
  const root = document.documentElement;
  const SVG_NS = "http://www.w3.org/2000/svg";
  let svg = null;
  let feImage = null;
  let ultimo = "";

  // Mapa de desplazamiento: gris neutro (128,128) en el centro; en el bisel, desplazamiento hacia adentro con
  // perfil de lente convexa. La forma es una cápsula (radio = alto / 2).
  function mapaDeDesplazamiento(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const radio = h / 2;
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
        const prof = Math.max(-sd(px, py), 0);
        let r = 128;
        let g = 128;
        if (prof < BOTON.bisel) {
          const u = Math.max(prof / BOTON.bisel, 0.0005);
          const pendiente = Math.pow(1 - Math.pow(1 - u, 4), -0.75) * Math.pow(1 - u, 3); // squircle convexo
          const m = Math.min(pendiente, PENDIENTE_MAX) / PENDIENTE_MAX;
          const e = 0.5;
          let gx = sd(px + e, py) - sd(px - e, py);
          let gy = sd(px, py + e) - sd(px, py - e);
          const largo = Math.hypot(gx, gy) || 1;
          gx /= largo;
          gy /= largo;
          r = 128 - gx * m * 127;
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
    const filtro = nodo("filter", { id: "lg-refract-btn", "color-interpolation-filters": "sRGB", x: "0", y: "0", width: "100%", height: "100%" });
    feImage = nodo("feImage", { x: "0", y: "0", width: "1", height: "1", preserveAspectRatio: "none", result: "mapa" });
    filtro.append(feImage);
    const canales = [
      ["R", BOTON.escalaR, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"],
      ["G", BOTON.escalaG, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1"],
      ["B", BOTON.escalaB, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1"]
    ];
    canales.forEach(([c, escala, matriz]) => {
      filtro.append(
        nodo("feDisplacementMap", { in: "SourceGraphic", in2: "mapa", scale: String(escala), xChannelSelector: "R", yChannelSelector: "G", result: "d" + c }),
        nodo("feColorMatrix", { in: "d" + c, type: "matrix", values: matriz, result: "c" + c })
      );
    });
    filtro.append(
      nodo("feBlend", { in: "cR", in2: "cG", mode: "screen", result: "rg" }),
      nodo("feBlend", { in: "rg", in2: "cB", mode: "screen" })
    );
    svg.append(filtro);
    document.body.prepend(svg);
  }

  function actualizarMapa() {
    if (!svg) return;
    const caja = btn.getBoundingClientRect();
    const w = Math.round(caja.width);
    const h = Math.round(caja.height);
    if (!w || !h || w + "x" + h === ultimo) return;
    ultimo = w + "x" + h;
    feImage.setAttribute("width", String(w));
    feImage.setAttribute("height", String(h));
    feImage.setAttribute("href", mapaDeDesplazamiento(w, h));
  }

  // Filtro SVG solo si el header está en modo liquid; si no, se quita (queda el vidrio simple del CSS)
  function sincronizar() {
    if (root.dataset.glass === "liquid") {
      montarFiltro();
      actualizarMapa();
    } else if (svg) {
      svg.remove();
      svg = null;
      feImage = null;
      ultimo = "";
    }
  }

  // Luz que sigue al mouse dentro del botón
  const mouseFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (mouseFino) {
    let raf = 0;
    let pos = null;
    btn.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = btn.getBoundingClientRect();
      pos = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          btn.style.setProperty("--mx", pos.x + "px");
          btn.style.setProperty("--my", pos.y + "px");
        });
      }
    }, { passive: true });
  }

  // main.js define html[data-glass] en DOMContentLoaded (este script va después): se lee ahí y se sigue el atributo
  document.addEventListener("DOMContentLoaded", () => {
    sincronizar();
    new MutationObserver(sincronizar).observe(root, { attributes: true, attributeFilter: ["data-glass"] });
    if ("ResizeObserver" in window) new ResizeObserver(actualizarMapa).observe(btn);
  });
})();
