/**
 * Valida js/canje-tabla.js (la planilla de toma de Gonzalo). Sin dependencias.
 *
 *   node scripts/validar-tabla.js
 *
 * Errores (exit 1): valores no numéricos o <= 0, valor que SUBE al bajar la batería,
 * una capacidad mayor que vale MENOS que una menor del mismo modelo y nivel, ids repetidos,
 * niveles de batería mal definidos, y cualquier modelo de una generación que ya no se toma
 * (la tabla es del iPhone 13 en adelante). Los avisos (empates) no hacen fallar.
 * Correrlo cada vez que se edite la tabla y antes de poner datosReales en true.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const archivo = path.join(__dirname, "..", "js", "canje-tabla.js");
const T = vm.runInNewContext(fs.readFileSync(archivo, "utf8") + "\n;CANJE_TABLA");

// Generaciones que ya no se toman (decisión del dueño): la tabla es del iPhone 13 en adelante.
const GENERACIONES_FUERA = [12];

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);

if (!["USD", "ARS"].includes(T.moneda)) err("moneda inválida: " + T.moneda);
const niveles = (T.bateriaNiveles || []).slice();
if (!niveles.length || niveles.some((n) => !Number.isInteger(n) || n < 1 || n > 100)) err("bateriaNiveles debe ser una lista de enteros entre 1 y 100");
if (niveles.some((n, i) => i > 0 && n >= niveles[i - 1])) err("bateriaNiveles debe estar en orden descendente y sin repetidos: " + niveles.join(", "));

const ids = new Set();
let capacidades = 0;
let valores = 0;
(T.modelos || []).forEach((m) => {
  const etq = m.nombre || m.id || "(sin nombre)";
  if (!m.id) err(etq + ": falta id");
  else if (ids.has(m.id)) err("id repetido: " + m.id);
  ids.add(m.id);
  if (!m.nombre) err(m.id + ": falta nombre");
  GENERACIONES_FUERA.forEach((g) => {
    if (String(m.id).startsWith("iphone-" + g) || new RegExp("iPhone\\s+" + g + "\\b", "i").test(m.nombre || "")) {
      err(etq + ": el iPhone " + g + " y anteriores ya no se toman; borrar este modelo de la tabla");
    }
  });
  if (!Array.isArray(m.capacidades) || !m.capacidades.length) { err(etq + ": sin capacidades"); return; }

  const gbs = new Set();
  m.capacidades.forEach((c) => {
    capacidades++;
    if (!Number.isInteger(c.gb) || c.gb <= 0) err(etq + ": gb inválido (" + c.gb + ")");
    if (gbs.has(c.gb)) err(etq + ": capacidad repetida " + c.gb + "GB");
    gbs.add(c.gb);
    niveles.forEach((n) => {
      valores++;
      const v = c.valores && c.valores[n];
      if (typeof v !== "number" || !isFinite(v) || v <= 0) err(etq + " " + c.gb + "GB, batería " + n + "%: valor no numérico o <= 0 (" + v + ")");
    });
    // el valor no puede subir al bajar la batería
    for (let i = 1; i < niveles.length; i++) {
      const alto = c.valores && c.valores[niveles[i - 1]];
      const bajo = c.valores && c.valores[niveles[i]];
      if (typeof alto === "number" && typeof bajo === "number" && bajo > alto) {
        err(etq + " " + c.gb + "GB: vale más con " + niveles[i] + "% (" + bajo + ") que con " + niveles[i - 1] + "% (" + alto + ")");
      }
    }
  });

  // a igual modelo y nivel, más memoria nunca vale menos
  const ord = m.capacidades.slice().sort((a, b) => a.gb - b.gb);
  for (let i = 1; i < ord.length; i++) {
    niveles.forEach((n) => {
      const menor = ord[i - 1].valores && ord[i - 1].valores[n];
      const mayor = ord[i].valores && ord[i].valores[n];
      if (typeof menor === "number" && typeof mayor === "number") {
        if (mayor < menor) err(etq + ", batería " + n + "%: " + ord[i].gb + "GB (" + mayor + ") vale menos que " + ord[i - 1].gb + "GB (" + menor + ")");
        else if (mayor === menor) avisos.push(etq + ", batería " + n + "%: " + ord[i].gb + "GB vale lo mismo que " + ord[i - 1].gb + "GB (" + mayor + ")");
      }
    });
  }
});

console.log("Tabla: js/canje-tabla.js — moneda " + T.moneda + ", niveles de batería " + niveles.join("/") + "%");
console.log("  " + (T.modelos || []).length + " modelos, " + capacidades + " capacidades, " + valores + " valores revisados");
if (avisos.length) {
  const mods = new Set(avisos.map((a) => a.split(",")[0]));
  console.log("  avisos (no fallan): " + avisos.length + " empates 256GB = 128GB en " + mods.size + " modelos: " + [...mods].join(", "));
}
if (errores.length) {
  console.log("\n" + errores.length + " ERRORES:");
  errores.forEach((e) => console.log("  ✗ " + e));
  process.exit(1);
}
console.log("\nOK: sin errores.");
