/**
 * Pruebas de la lógica pura de la calculadora de Plan Canje (sin dependencias).
 *
 *   node scripts/test-calculadora.js
 *
 * Sale con código 1 si alguna prueba falla. Las pruebas usan su propia config de
 * fixtures (no los datos de ejemplo), salvo el chequeo de estructura del final.
 */
const assert = require("assert");
const path = require("path");
const { calcularCanje, escalonesSaltoDeGama, mensajeWhatsApp, formatearMonto } = require("../js/calculadora-logic.js");

let ok = 0;
let fallas = 0;
function prueba(nombre, fn) {
  try {
    fn();
    ok++;
    console.log("  ok   " + nombre);
  } catch (e) {
    fallas++;
    console.log("  FALLA " + nombre + "\n        " + String(e.message).split("\n").join("\n        "));
  }
}

const CFG = {
  moneda: "USD",
  redondeo: 1,
  bateriaMinima: 70,
  bateria: [
    { desde: 90, hasta: 100, tipo: "porcentaje", valor: 0 },
    { desde: 80, hasta: 89, tipo: "porcentaje", valor: 10 },
    { desde: 70, hasta: 79, tipo: "monto", valor: 50 }
  ],
  modelos: [
    { id: "m1", nombre: "iPhone 13", capacidades: [{ gb: 128, valor: 1000 }, { gb: 256, valor: 0 }] }
  ],
  avisoLegal: "x"
};
const base = (extra) => Object.assign({ modeloId: "m1", gb: 128, bateria: 95, detalles: false, detallesTexto: "" }, extra);
const calc = (extra, cfg, prods) => calcularCanje(cfg || CFG, base(extra), prods || []);

console.log("Cálculo");
prueba("porcentaje: 85% de batería → tramo -10% sobre 1000 = 900", () => {
  const r = calc({ bateria: 85 });
  assert.strictEqual(r.estado, "valor");
  assert.strictEqual(r.valor, 900);
});
prueba("monto: 75% de batería → tramo -50 fijo sobre 1000 = 950", () => {
  const r = calc({ bateria: 75 });
  assert.strictEqual(r.estado, "valor");
  assert.strictEqual(r.valor, 950);
});
prueba("sin descuento: 95% → valor base", () => {
  assert.strictEqual(calc({ bateria: 95 }).valor, 1000);
});
prueba("bordes de tramo: 100, 90, 89, 80, 79, 70", () => {
  const esperado = { 100: 1000, 90: 1000, 89: 900, 80: 900, 79: 950, 70: 950 };
  Object.keys(esperado).forEach((b) => {
    const r = calc({ bateria: Number(b) });
    assert.strictEqual(r.estado, "valor", "batería " + b);
    assert.strictEqual(r.valor, esperado[b], "batería " + b);
  });
});
prueba("bajo el mínimo: 69 y 1 → consulta por batería, sin valor", () => {
  [69, 1].forEach((b) => {
    const r = calc({ bateria: b });
    assert.strictEqual(r.estado, "consulta");
    assert.strictEqual(r.motivo, "bateria");
    assert.strictEqual(r.valor, undefined);
    assert.strictEqual(r.mensaje, "Con esa batería, la tasación se confirma en el local. Consultala por WhatsApp.");
  });
});
prueba("con detalles: no se calcula (aun con batería buena y con batería vacía)", () => {
  const r = calc({ detalles: true, bateria: 100, detallesTexto: "pantalla rota" });
  assert.strictEqual(r.estado, "consulta");
  assert.strictEqual(r.motivo, "detalles");
  assert.strictEqual(r.mensaje, "Con detalles, el valor lo definimos en el local. Consultalo por WhatsApp.");
  assert.strictEqual(calc({ detalles: true, bateria: "" }).motivo, "detalles");
});
prueba("redondeo hacia abajo al múltiplo configurado", () => {
  const cfg = Object.assign({}, CFG, {
    redondeo: 1000,
    modelos: [{ id: "m1", nombre: "iPhone 13", capacidades: [{ gb: 128, valor: 1234567 }] }]
  });
  assert.strictEqual(calc({ bateria: 85 }, cfg).valor, 1111000); // 1.234.567 × 0,9 = 1.111.110,3 → 1.111.000
  assert.strictEqual(calc({ bateria: 95 }, cfg).valor, 1234000);
});
prueba("redondeo 1 no altera enteros y descarta decimales", () => {
  const cfg = Object.assign({}, CFG, { modelos: [{ id: "m1", nombre: "x", capacidades: [{ gb: 128, valor: 333 }] }] });
  assert.strictEqual(calc({ bateria: 85 }, cfg).valor, 299); // 299,7 → 299
});
prueba("capacidad con valor 0 (sin dato) → consulta, no valor", () => {
  const r = calc({ gb: 256 });
  assert.strictEqual(r.estado, "consulta");
  assert.strictEqual(r.motivo, "sin-valor");
});
prueba("batería sin tramo definido (hueco en la tabla) → consulta, no inventa", () => {
  const cfg = Object.assign({}, CFG, { bateria: [{ desde: 90, hasta: 100, tipo: "porcentaje", valor: 0 }] });
  const r = calc({ bateria: 80 }, cfg);
  assert.strictEqual(r.estado, "consulta");
  assert.strictEqual(r.motivo, "sin-tramo");
});
prueba("descuento que deja el valor en 0 o menos → consulta", () => {
  const cfg = Object.assign({}, CFG, { bateria: [{ desde: 70, hasta: 100, tipo: "monto", valor: 5000 }] });
  assert.strictEqual(calc({ bateria: 80 }, cfg).estado, "consulta");
});

console.log("Validación");
prueba("modelo vacío o inexistente → error de modelo", () => {
  assert.ok(calc({ modeloId: "" }).errores.modelo);
  assert.ok(calc({ modeloId: "zzz" }).errores.modelo);
});
prueba("modelo sin capacidad elegida (o capacidad ajena al modelo) → error de capacidad", () => {
  assert.ok(calc({ gb: "" }).errores.capacidad);
  assert.ok(calc({ gb: undefined }).errores.capacidad);
  assert.ok(calc({ gb: 512 }).errores.capacidad);
  assert.strictEqual(calc({ gb: "" }).estado, "error");
});
prueba("batería inválida: 0, 101, decimal, texto, negativa → error", () => {
  [0, 101, 85.5, "abc", -5].forEach((b) => {
    assert.ok(calc({ bateria: b }).errores.bateria, "batería " + b);
  });
});
prueba("batería vacía sin detalles → error; como string numérico es válida", () => {
  assert.ok(calc({ bateria: "" }).errores.bateria);
  assert.strictEqual(calc({ bateria: "85" }).valor, 900);
});
prueba("con detalles la batería es opcional, pero si se informa debe ser válida", () => {
  assert.strictEqual(calc({ detalles: true, bateria: "" }).estado, "consulta");
  assert.ok(calc({ detalles: true, bateria: 150 }).errores.bateria);
});

console.log("Salto de gama");
const prod = (nombre, precioNum, variante) => ({ nombre, precioNum, variante: variante || "256GB" });
prueba("ningún producto con precioNum numérico → sin escalones", () => {
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", null), prod("b", undefined), prod("c", "1000")], 500), []);
  assert.deepStrictEqual(escalonesSaltoDeGama([], 500), []);
  assert.deepStrictEqual(escalonesSaltoDeGama(undefined, 500), []);
});
prueba("valor mayor al producto más caro → sin escalones", () => {
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", 300), prod("b", 900)], 1000), []);
});
prueba("precio igual al valor no cuenta (tiene que ser mayor)", () => {
  const e = escalonesSaltoDeGama([prod("a", 500), prod("b", 700)], 500);
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].producto.nombre, "b");
});
prueba("tres escalones normales: orden, diferencias y suma vs. el anterior", () => {
  const prods = [prod("p900", 900), prod("p200", 200), prod("p500", 500), prod("p1100", 1100), prod("p300", 300), prod("p700", 700)];
  const e = escalonesSaltoDeGama(prods, 350);
  assert.deepStrictEqual(e.map((x) => x.producto.nombre), ["p500", "p700", "p900"]);
  assert.deepStrictEqual(e.map((x) => x.diferencia), [150, 350, 550]);
  assert.deepStrictEqual(e.map((x) => x.sumaVsAnterior), [null, 200, 200]);
  assert.deepStrictEqual(e.map((x) => x.precio), [500, 700, 900]);
});
prueba("menos de tres equipos por encima → solo los que hay", () => {
  const e = escalonesSaltoDeGama([prod("a", 400), prod("b", 600)], 350);
  assert.strictEqual(e.length, 2);
});
prueba("los productos sin precio se ignoran en medio de la lista", () => {
  const e = escalonesSaltoDeGama([prod("a", 400), prod("x", null), prod("b", 600)], 350);
  assert.deepStrictEqual(e.map((x) => x.producto.nombre), ["a", "b"]);
});
prueba("calcularCanje incluye los escalones del valor calculado", () => {
  const r = calc({ bateria: 95 }, CFG, [prod("a", 1500), prod("b", 1800), prod("c", 900)]);
  assert.deepStrictEqual(r.escalones.map((x) => x.producto.nombre), ["a", "b"]);
  assert.strictEqual(r.escalones[0].diferencia, 500);
});
prueba("consulta y error no traen escalones", () => {
  assert.strictEqual(calc({ detalles: true }, CFG, [prod("a", 1500)]).escalones, undefined);
  assert.strictEqual(calc({ bateria: 10 }, CFG, [prod("a", 1500)]).escalones, undefined);
});

console.log("Mensaje de WhatsApp");
prueba("con valor y equipo elegido", () => {
  const entrada = base({ bateria: 85 });
  const r = calcularCanje(CFG, entrada, []);
  assert.strictEqual(
    mensajeWhatsApp(CFG, entrada, r, "iPhone 17 (Azul · 256GB)"),
    "Hola, quiero cotizar mi iPhone 13 128GB, batería 85%, sin detalles. Valor estimado: USD 900. Me interesa: iPhone 17 (Azul · 256GB)."
  );
});
prueba("sin equipo elegido → 'ver opciones'", () => {
  const entrada = base({ bateria: 95 });
  const msg = mensajeWhatsApp(CFG, entrada, calcularCanje(CFG, entrada, []));
  assert.ok(msg.endsWith("Me interesa: ver opciones."), msg);
});
prueba("variante sin valor: omite 'Valor estimado' (detalles y texto)", () => {
  const entrada = base({ detalles: true, detallesTexto: "  pantalla   rota \n y golpe ", bateria: "" });
  const msg = mensajeWhatsApp(CFG, entrada, calcularCanje(CFG, entrada, []));
  assert.strictEqual(msg, "Hola, quiero cotizar mi iPhone 13 128GB, batería sin informar, con detalles: pantalla rota y golpe. Me interesa: ver opciones.");
  assert.ok(!msg.includes("Valor estimado"));
});
prueba("variante batería baja: sin valor", () => {
  const entrada = base({ bateria: 60 });
  const msg = mensajeWhatsApp(CFG, entrada, calcularCanje(CFG, entrada, []));
  assert.ok(msg.includes("batería 60%") && !msg.includes("Valor estimado"), msg);
});
prueba("detalles tildados sin texto → 'sin especificar'; texto muy largo se recorta", () => {
  assert.ok(mensajeWhatsApp(CFG, base({ detalles: true }), null).includes("con detalles: sin especificar"));
  const largo = mensajeWhatsApp(CFG, base({ detalles: true, detallesTexto: "a".repeat(1000) }), null);
  assert.ok(largo.length < 450);
});
prueba("el mensaje sobrevive a encodeURIComponent / decodeURIComponent", () => {
  const msg = mensajeWhatsApp(CFG, base({ detalles: true, detallesTexto: "á é & ? # 100%" }), null);
  assert.strictEqual(decodeURIComponent(encodeURIComponent(msg)), msg);
});

console.log("Formato");
prueba("monto con separador de miles es-AR", () => {
  assert.strictEqual(formatearMonto({ moneda: "USD" }, 1850000), "USD 1.850.000");
  assert.strictEqual(formatearMonto({ moneda: "ARS" }, 250), "ARS 250");
});

console.log("Estructura de js/calculadora-data.js");
const { CANJE_CONFIG } = require(path.join("..", "js", "calculadora-data.js"));
prueba("campos obligatorios y tipos", () => {
  assert.strictEqual(typeof CANJE_CONFIG.datosReales, "boolean");
  assert.ok(["USD", "ARS"].includes(CANJE_CONFIG.moneda));
  assert.ok(CANJE_CONFIG.redondeo > 0);
  assert.ok(CANJE_CONFIG.bateriaMinima >= 1 && CANJE_CONFIG.bateriaMinima <= 100);
  assert.ok(CANJE_CONFIG.avisoLegal.length > 20);
  assert.ok(CANJE_CONFIG.modelos.length > 0);
});
prueba("tramos de batería: tipos válidos, rangos sanos y sin solaparse", () => {
  const t = CANJE_CONFIG.bateria.slice().sort((a, b) => a.desde - b.desde);
  t.forEach((x, i) => {
    assert.ok(["porcentaje", "monto"].includes(x.tipo), "tipo " + x.tipo);
    assert.ok(x.desde >= 1 && x.hasta <= 100 && x.desde <= x.hasta, "rango " + x.desde + "-" + x.hasta);
    assert.ok(x.valor >= 0 && (x.tipo !== "porcentaje" || x.valor <= 100), "valor " + x.valor);
    if (i > 0) assert.ok(x.desde > t[i - 1].hasta, "se solapa con el tramo anterior: " + x.desde);
  });
});
prueba("modelos: ids únicos y cada uno con capacidades y valores numéricos", () => {
  const ids = CANJE_CONFIG.modelos.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length, "ids repetidos");
  CANJE_CONFIG.modelos.forEach((m) => {
    assert.ok(m.nombre && m.capacidades.length > 0, m.id);
    m.capacidades.forEach((c) => assert.ok(c.gb > 0 && typeof c.valor === "number" && c.valor >= 0, m.id + " " + c.gb));
  });
});

console.log("\n" + ok + " pruebas ok, " + fallas + " con falla");
process.exit(fallas ? 1 : 0);
