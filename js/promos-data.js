/**
 * PROMOCIONES (las carga el desarrollador). Las usan:
 *   - js/promos.js     → tarjeta flotante (solo index.html y catalogo.html)
 *   - js/main.js       → etiqueta en las cards y bloque "Promo vigente" en el detalle del producto
 *   - js/pedido.js     → línea de regalo en "Mi pedido" y texto en el mensaje de WhatsApp
 *
 * REGLA: no se inventan condiciones ni fechas. Lo que no esté definido se deja vacío ("" / null / [])
 * y simplemente no se muestra.
 *
 * Campos de cada promo:
 *   id          texto único, minúsculas y guiones. La tarjeta flotante recuerda su cierre con ese id.
 *   activa      true / false. Con false la promo no se muestra en ningún lado (interruptor rápido).
 *   prioridad   (opcional) número; con varias promos vigentes va primero la de número menor. Por defecto 100.
 *   inicio      fecha ISO con la zona de Mendoza, ej. "2026-11-02T00:00:00-03:00". La promo no se ve antes.
 *   fin         fecha ISO con -03:00, o null. Con null la promo no vence y no muestra texto de vencimiento.
 *   titulo      título de la tarjeta, del bloque del detalle y del pedido.
 *   texto       frase corta debajo del título.
 *   regalos     lista de textos, ej. ["Cargador", "Funda", "Vidrio templado"] (llevan ícono si reconoce
 *               "cargador", "funda" o "vidrio"/"templado").
 *   etiqueta    texto de la etiqueta de las cards (una sola línea; lleva ícono de regalo).
 *   etiquetaCorta  versión corta ("Con regalos"): se usa cuando la etiqueta no cabe en el ancho de la card y siempre en
 *               la card compacta de móvil. Si falta y hay regalos, se usa "Con regalos".
 *   aplicaA     a qué productos alcanza:
 *                 categoria        igual a la categoría del producto ("iPhone", "AirPods"…)
 *                 prefijosNombre   lista; el nombre del producto debe ser igual o empezar con alguno
 *                                  (más un espacio): "iPhone 17" alcanza "iPhone 17 Pro" pero no "iPhone 170".
 *                                  Vacía = toda la categoría.
 *                 condicion        "nuevo", "usado" o null (null = ambos). Un producto sin condicion es "nuevo".
 *   condiciones texto con las condiciones (hoy vacío: no se muestra). Completar solo con lo confirmado.
 *   cta         { texto, mensaje }: botón de WhatsApp de la tarjeta flotante.
 *   popup       tarjeta flotante: { mostrar, retrasoSeg, frecuenciaHoras, paginas: ["index","catalogo"] }
 *                 aparece pasados retrasoSeg segundos y tras un scroll ≥ 25 % o un clic, una vez cada
 *                 frecuenciaHoras horas (se recuerda en localStorage "tecnolab_promo_{id}").
 *
 * Para apagar una promo: activa: false (o poner un fin). Para sumar otra: copiar el bloque.
 */
const PROMOS = [
  {
    id: "regalo-iphone-17-18",
    activa: true,
    prioridad: 1,
    inicio: "2026-11-02T00:00:00-03:00",
    fin: null,
    titulo: "Cargador, funda y vidrio templado de regalo",
    texto: "Por la compra de un iPhone 17 o un iPhone 18.",
    regalos: ["Cargador", "Funda", "Vidrio templado"],
    etiqueta: "Regalo: cargador, funda y vidrio",
    etiquetaCorta: "Con regalos",
    aplicaA: { categoria: "iPhone", prefijosNombre: ["iPhone 17", "iPhone 18"], condicion: null },
    condiciones: "",
    cta: {
      texto: "Aprovechar por WhatsApp",
      mensaje: "Hola Tecnolab, quiero aprovechar la promo: cargador, funda y vidrio templado de regalo por la compra de un iPhone 17 o 18."
    },
    popup: { mostrar: true, retrasoSeg: 8, frecuenciaHoras: 24, paginas: ["index", "catalogo"] }
  }
];

/* ---------- utilidades (no hace falta tocarlas) ---------- */

// Promos activas y dentro de fecha (inicio ≤ ahora ≤ fin), ordenadas por prioridad
function promoVigente(ahora) {
  const t = (ahora instanceof Date ? ahora : new Date(ahora || Date.now())).getTime();
  return PROMOS
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.activa === true
      && Number.isFinite(Date.parse(p.inicio)) && Date.parse(p.inicio) <= t
      && (!p.fin || (Number.isFinite(Date.parse(p.fin)) && t <= Date.parse(p.fin))))
    .sort((a, b) => ((a.p.prioridad ?? 100) - (b.p.prioridad ?? 100)) || a.i - b.i)
    .map(({ p }) => p);
}

// ¿La promo alcanza a este producto?
function promoAplica(promo, prod) {
  const a = promo.aplicaA || {};
  if (a.categoria && prod.categoria !== a.categoria) return false;
  if (a.condicion && (prod.condicion || "nuevo") !== a.condicion) return false;
  const pref = a.prefijosNombre || [];
  return !pref.length || pref.some((x) => prod.nombre === x || String(prod.nombre).startsWith(x + " "));
}

// Promos vigentes que alcanzan al producto (la primera es la de mayor prioridad)
function promosDe(prod, ahora) {
  return promoVigente(ahora).filter((pr) => promoAplica(pr, prod));
}

// "5 de noviembre" (con el año si no es el actual), en hora de Mendoza
function fechaLegible(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const z = { timeZone: "America/Argentina/Mendoza" };
  const anio = new Intl.DateTimeFormat("es-AR", { ...z, year: "numeric" }).format(d) !== new Intl.DateTimeFormat("es-AR", { ...z, year: "numeric" }).format(new Date());
  return new Intl.DateTimeFormat("es-AR", { ...z, day: "numeric", month: "long", ...(anio ? { year: "numeric" } : {}) }).format(d);
}

// ["Cargador", "Funda", "Vidrio templado"] → "cargador, funda y vidrio templado"
function listaRegalos(regalos) {
  const l = (regalos || []).map((x) => String(x).toLowerCase());
  return l.length > 1 ? l.slice(0, -1).join(", ") + " y " + l[l.length - 1] : l.join("");
}
