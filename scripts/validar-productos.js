/**
 * Validador de js/products-data.js (sin dependencias).
 *
 *   node scripts/validar-productos.js [archivo-alternativo.js]
 *
 * Sale con código 1 si hay ERRORES. Las ADVERTENCIAS no cortan (ej. un usado sin batería).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const archivo = process.argv[2] ? path.resolve(process.argv[2]) : path.join(raiz, "js", "products-data.js"); // opcional: otro archivo, para pruebas
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(archivo, "utf8") + "\n;this.__datos = CATALOGO_DESTACADO;", ctx, { filename: archivo });
const productos = ctx.__datos;

const errores = [];
const avisos = [];
const err = (p, msg) => errores.push(`[${p && p.id ? p.id : "?"}] ${msg}`);
const aviso = (p, msg) => avisos.push(`[${p.id}] ${msg}`);
const texto = (v) => typeof v === "string" && v.trim() !== "";

if (!Array.isArray(productos)) { console.error("CATALOGO_DESTACADO no es un array"); process.exit(1); }

const ids = new Set();
productos.forEach((p, i) => {
  if (!texto(p.id)) { err({ id: "#" + i }, "id vacío o no es texto"); return; }
  if (ids.has(p.id)) err(p, "id repetido");
  ids.add(p.id);

  ["categoria", "nombre", "precio"].forEach((k) => { if (!texto(p[k])) err(p, `"${k}" vacío o ausente`); });
  ["variante", "especificacion", "descripcion"].forEach((k) => { if (k in p && p[k] !== "" && !texto(p[k])) err(p, `"${k}" no es texto`); });

  const usado = p.condicion === "usado";
  if ("condicion" in p && p.condicion !== "nuevo" && p.condicion !== "usado") err(p, `condicion inválida: ${JSON.stringify(p.condicion)} (usar "nuevo" o "usado")`);
  if ("moneda" in p && p.moneda !== "USD" && p.moneda !== "ARS") err(p, `moneda inválida: ${JSON.stringify(p.moneda)} (usar "USD" o "ARS")`);

  if (p.precioNum !== null && !(typeof p.precioNum === "number" && isFinite(p.precioNum) && p.precioNum >= 0)) err(p, `precioNum debe ser un número o null (es ${JSON.stringify(p.precioNum)})`);
  else if (typeof p.precioNum === "number" && !p.moneda) aviso(p, "tiene precioNum pero no moneda: se muestra el texto de \"precio\"");
  else if (p.precioNum === null && p.moneda) aviso(p, "tiene moneda pero precioNum es null: se muestra el texto de \"precio\"");

  // batería / estado: solo usados
  if ("bateria" in p) {
    if (!usado) err(p, "bateria solo corresponde a equipos usados");
    else if (!Number.isInteger(p.bateria) || p.bateria < 0 || p.bateria > 100) err(p, `bateria debe ser un entero de 0 a 100 (es ${JSON.stringify(p.bateria)})`);
  }
  if (!usado && ("estado" in p || "estadoDetalle" in p)) err(p, "estado / estadoDetalle solo corresponden a equipos usados");
  if (usado) {
    if (!("bateria" in p)) aviso(p, "usado sin bateria");
    if (!texto(p.estado)) aviso(p, "usado sin estado");
    else if (!["Excelente", "Muy bueno", "Bueno"].includes(p.estado)) err(p, `estado inválido: ${JSON.stringify(p.estado)} (Excelente, Muy bueno o Bueno)`);
    if ("estadoDetalle" in p && !texto(p.estadoDetalle)) err(p, "estadoDetalle vacío");
    if (!Array.isArray(p.colores) || p.colores.length !== 1) err(p, "un usado lleva UNA sola entrada en colores (cada unidad es un producto)");
    if (p.nuevo === true) err(p, "un usado no puede tener nuevo: true");
  }

  // ficha, garantía, incluye
  if ("ficha" in p) {
    if (!Array.isArray(p.ficha)) err(p, "ficha debe ser un array de { rotulo, valor }");
    else p.ficha.forEach((f, j) => { if (!f || !texto(f.rotulo) || !texto(f.valor)) err(p, `ficha[${j}] necesita rotulo y valor con texto`); });
  }
  if ("garantia" in p) {
    const g = p.garantia;
    if (!g || typeof g !== "object") err(p, "garantia debe ser { duracion, cobertura }");
    else {
      if (!texto(g.duracion) && !texto(g.cobertura)) err(p, "garantia vacía: completar duracion y/o cobertura o quitarla");
      ["duracion", "cobertura"].forEach((k) => { if (k in g && !texto(g[k])) err(p, `garantia.${k} vacío`); });
    }
  }
  ["incluye", "detalles"].forEach((k) => {
    if (!(k in p)) return;
    if (!Array.isArray(p[k])) err(p, `${k} debe ser un array de textos`);
    else p[k].forEach((t, j) => { if (!texto(t)) err(p, `${k}[${j}] vacío`); });
  });

  // colores e imágenes
  if (!Array.isArray(p.colores)) err(p, "colores debe ser un array (puede ser [])");
  else p.colores.forEach((c, j) => {
    if (!texto(c.nombre)) err(p, `colores[${j}].nombre vacío`);
    if (!/^#[0-9a-f]{3,8}$/i.test(c.hex || "")) err(p, `colores[${j}].hex inválido: ${JSON.stringify(c.hex)}`);
    if (!texto(c.imagen)) err(p, `colores[${j}].imagen vacía`);
    else if (!fs.existsSync(path.join(raiz, c.imagen))) err(p, `la imagen no existe: ${c.imagen}`);
  });
});

const usados = productos.filter((p) => p.condicion === "usado").length;
console.log(`Productos: ${productos.length} (${usados} usados, ${productos.length - usados} nuevos)`);
if (avisos.length) { console.log(`\nADVERTENCIAS (${avisos.length}):`); avisos.forEach((m) => console.log("  ! " + m)); }
if (errores.length) { console.log(`\nERRORES (${errores.length}):`); errores.forEach((m) => console.log("  x " + m)); console.log("\nResultado: FALLÓ"); process.exit(1); }
console.log(avisos.length ? "\nResultado: OK con advertencias" : "\nResultado: OK");
