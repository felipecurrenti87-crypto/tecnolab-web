/**
 * Pruebas de la calculadora de Plan Canje (sin dependencias).
 *
 *   node scripts/test-calculadora.js
 *
 * Sale con código 1 si alguna prueba falla. La lógica se prueba con una tabla de fixtures
 * propia; al final se carga la tabla REAL (js/canje-tabla.js) para chequear valores puntuales.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  NO_LISTADO, calcularCanje, escalonesSaltoDeGama, mensajeWhatsApp, mensajeModeloNoListado,
  agruparModelosPorGeneracion, formatearMonto, describirTramo
} = require("../js/calculadora-logic.js");

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

// ---------- fixtures ----------
const TABLA = {
  moneda: "USD",
  bateriaNiveles: [98, 90, 75],
  modelos: [
    { id: "m1", nombre: "iPhone 13", capacidades: [
      { gb: 128, valores: { 98: 1000, 90: 900, 75: 800 } },
      { gb: 256, valores: { 98: null, 90: null, 75: null } },
      { gb: 512, valores: { 98: 0, 90: 0, 75: 0 } }
    ] },
    { id: "m3", nombre: "iPhone 14 Pro", capacidades: [{ gb: 64, valores: { 98: 500, 90: null, 75: 400 } }] },
    { id: "m5", nombre: "iPhone 16", capacidades: [{ gb: 128, valores: { 98: 1234567, 90: 1234567, 75: 1234567 } }] }
  ]
};
const CFG_BASE = { moneda: "USD", redondeo: 1 };
const base = (extra) => Object.assign({ modeloId: "m1", gb: 128, bateria: 98, detalles: false, detallesTexto: "" }, extra);
const calc = (extra, cfg, prods) => calcularCanje(cfg || CFG_BASE, TABLA, base(extra), prods || []);

console.log("Regla de batería (98+ / 90–97 / menos de 90 = nivel 75)");
prueba("niveles exactos: 98 → 1000, 90 → 900, 75 → 800", () => {
  assert.strictEqual(calc({ bateria: 98 }).valor, 1000);
  assert.strictEqual(calc({ bateria: 90 }).valor, 900);
  assert.strictEqual(calc({ bateria: 75 }).valor, 800);
});
prueba("bordes: 100, 98, 97, 90, 89, 75, 74, 60, 1", () => {
  const esperado = { 100: 1000, 98: 1000, 97: 900, 90: 900, 89: 800, 75: 800, 74: 800, 60: 800, 1: 800 };
  Object.keys(esperado).forEach((b) => {
    const r = calc({ bateria: Number(b) });
    assert.strictEqual(r.estado, "valor", "batería " + b);
    assert.strictEqual(r.valor, esperado[b], "batería " + b);
  });
});
prueba("89 y 60 usan el nivel 75 (no solo el valor: también el nivel y el texto)", () => {
  [89, 60].forEach((b) => {
    const r = calc({ bateria: b });
    assert.strictEqual(r.nivel, 75, "batería " + b);
    assert.strictEqual(r.tramoTexto, "Calculado para batería de menos de 90%");
  });
  assert.strictEqual(calc({ bateria: 97 }).nivel, 90);
  assert.strictEqual(calc({ bateria: 98 }).nivel, 98);
});
prueba("batería 0 y 101 (y decimal, texto, negativa) son inválidas: error, no valor", () => {
  [0, 101, 85.5, "abc", -5].forEach((b) => {
    const r = calc({ bateria: b });
    assert.strictEqual(r.estado, "error", "batería " + b);
    assert.ok(r.errores.bateria && r.errores.bateria.includes("entre 1 y 100"), "batería " + b);
  });
});
prueba("no existe ninguna ruta «batería baja → consulta»: toda batería de 1 a 100 calcula", () => {
  for (let b = 1; b <= 100; b++) {
    const r = calc({ bateria: b });
    assert.strictEqual(r.estado, "valor", "batería " + b);
    assert.notStrictEqual(r.motivo, "bateria");
  }
});
prueba("sin restos de la regla vieja en el código (interpolación, batería mínima, consulta por batería)", () => {
  const codigo = ["calculadora-logic.js", "calculadora-data.js", "main.js"].map((f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8")).join("\n");
  // (los nombres viejos se arman por partes para que este archivo no los contenga literalmente)
  const viejos = [new RegExp("interpol" + "ar|valorInterpol" + "ado", "i"), new RegExp("bateria" + "Minima"), new RegExp("regla" + "Bateria"), new RegExp("MSG_" + "BATERIA"), /consulta\("bateria"/];
  viejos.forEach((re) => assert.ok(!re.test(codigo), "quedó " + re));
  assert.ok(!/Con esa batería/.test(codigo), "quedó el texto de batería baja");
});
prueba("texto del tramo aplicado", () => {
  assert.strictEqual(calc({ bateria: 100 }).tramoTexto, "Calculado para batería de 98% o más");
  assert.strictEqual(calc({ bateria: 98 }).tramoTexto, "Calculado para batería de 98% o más");
  assert.strictEqual(calc({ bateria: 92 }).tramoTexto, "Calculado para batería de 90% a 97%");
  assert.strictEqual(calc({ bateria: 90 }).tramoTexto, "Calculado para batería de 90% a 97%");
  assert.strictEqual(calc({ bateria: 80 }).tramoTexto, "Calculado para batería de menos de 90%");
  assert.strictEqual(describirTramo(TABLA, 75), "menos de 90%");
});

console.log("Valores faltantes, redondeo y detalles");
prueba("valor null o 0 en el nivel que corresponde → consulta por WhatsApp", () => {
  [256, 512].forEach((gb) => {
    const r = calc({ gb });
    assert.strictEqual(r.estado, "consulta", "gb " + gb);
    assert.strictEqual(r.motivo, "sin-valor");
  });
  assert.strictEqual(calc({ modeloId: "m3", gb: 64, bateria: 92 }).motivo, "sin-valor"); // nivel 90 = null
  assert.strictEqual(calc({ modeloId: "m3", gb: 64, bateria: 98 }).valor, 500);
  assert.strictEqual(calc({ modeloId: "m3", gb: 64, bateria: 40 }).valor, 400);
});
prueba("redondeo hacia abajo al múltiplo configurado", () => {
  const cfg = { moneda: "ARS", redondeo: 1000 };
  assert.strictEqual(calc({ modeloId: "m5", bateria: 95 }, cfg).valor, 1234000);
  assert.strictEqual(calc({ modeloId: "m5", bateria: 95 }, CFG_BASE).valor, 1234567);
});
prueba("con detalles: no se calcula (aun con batería buena, baja o vacía)", () => {
  const r = calc({ detalles: true, bateria: 100, detallesTexto: "pantalla rota" });
  assert.strictEqual(r.estado, "consulta");
  assert.strictEqual(r.motivo, "detalles");
  assert.strictEqual(r.mensaje, "Con detalles, el valor lo definimos en el local. Consultalo por WhatsApp.");
  assert.strictEqual(calc({ detalles: true, bateria: "" }).motivo, "detalles");
  assert.strictEqual(calc({ detalles: true, bateria: 50 }).motivo, "detalles");
});

console.log("Validación");
prueba("modelo inexistente o vacío → error de modelo", () => {
  assert.ok(calc({ modeloId: "" }).errores.modelo);
  assert.ok(calc({ modeloId: "zzz" }).errores.modelo);
});
prueba("memoria inexistente o sin elegir → error de capacidad", () => {
  assert.ok(calc({ gb: 1024 }).errores.capacidad);
  assert.ok(calc({ gb: "" }).errores.capacidad);
  assert.ok(calc({ gb: undefined }).errores.capacidad);
  assert.ok(calc({ modeloId: "m3", gb: 256 }).errores.capacidad); // 256 no existe para ese modelo
});
prueba("batería vacía sin detalles → error; string numérico válido", () => {
  assert.ok(calc({ bateria: "" }).errores.bateria);
  assert.strictEqual(calc({ bateria: "90" }).valor, 900);
});
prueba("con detalles la batería es opcional, pero si se informa debe ser válida", () => {
  assert.strictEqual(calc({ detalles: true, bateria: "" }).estado, "consulta");
  assert.ok(calc({ detalles: true, bateria: 150 }).errores.bateria);
});

console.log("Modelo no listado");
prueba("modelo no listado → consulta, sin validar capacidad ni batería", () => {
  const r = calc({ modeloId: NO_LISTADO, gb: "", bateria: "" });
  assert.strictEqual(r.estado, "consulta");
  assert.strictEqual(r.motivo, "no-listado");
  assert.strictEqual(r.valor, undefined);
});
prueba("mensaje de WhatsApp de modelo no listado", () => {
  assert.strictEqual(mensajeModeloNoListado("iPhone XR 64GB"), "Hola, quiero cotizar mi iPhone (modelo no listado: iPhone XR 64GB).");
  assert.strictEqual(mensajeModeloNoListado("  iPhone   11  \n Pro "), "Hola, quiero cotizar mi iPhone (modelo no listado: iPhone 11 Pro).");
  assert.strictEqual(mensajeModeloNoListado(""), "Hola, quiero cotizar mi iPhone (modelo no listado: sin especificar).");
  assert.ok(mensajeModeloNoListado("x".repeat(500)).length < 200);
  assert.strictEqual(mensajeWhatsApp(CFG_BASE, TABLA, { modeloId: NO_LISTADO, modeloTexto: "iPhone SE" }, null), "Hola, quiero cotizar mi iPhone (modelo no listado: iPhone SE).");
});

console.log("Salto de gama");
const prod = (nombre, precioNum, variante) => ({ nombre, precioNum, variante: variante || "256GB" });
prueba("ningún producto con precioNum numérico → sin escalones", () => {
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", null), prod("b", undefined), prod("c", "1000")], 500), []);
  assert.deepStrictEqual(escalonesSaltoDeGama([], 500), []);
  assert.deepStrictEqual(escalonesSaltoDeGama(undefined, 500), []);
});
prueba("valor mayor al producto más caro → sin escalones; precio igual no cuenta", () => {
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", 300), prod("b", 900)], 1000), []);
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", 500), prod("b", 700)], 500).map((x) => x.producto.nombre), ["b"]);
});
prueba("tres escalones normales: orden, diferencias y suma vs. el anterior", () => {
  const prods = [prod("p900", 900), prod("p200", 200), prod("p500", 500), prod("p1100", 1100), prod("p300", 300), prod("p700", 700)];
  const e = escalonesSaltoDeGama(prods, 350);
  assert.deepStrictEqual(e.map((x) => x.producto.nombre), ["p500", "p700", "p900"]);
  assert.deepStrictEqual(e.map((x) => x.diferencia), [150, 350, 550]);
  assert.deepStrictEqual(e.map((x) => x.sumaVsAnterior), [null, 200, 200]);
});
prueba("menos de tres equipos por encima → solo los que hay; sin precio se ignoran", () => {
  assert.strictEqual(escalonesSaltoDeGama([prod("a", 400), prod("b", 600)], 350).length, 2);
  assert.deepStrictEqual(escalonesSaltoDeGama([prod("a", 400), prod("x", null), prod("b", 600)], 350).map((x) => x.producto.nombre), ["a", "b"]);
});
prueba("calcularCanje trae los escalones solo cuando hay valor", () => {
  const r = calc({ bateria: 98 }, CFG_BASE, [prod("a", 1500), prod("b", 1800), prod("c", 900)]);
  assert.deepStrictEqual(r.escalones.map((x) => x.producto.nombre), ["a", "b"]);
  assert.strictEqual(r.escalones[0].diferencia, 500);
  assert.strictEqual(calc({ detalles: true }, CFG_BASE, [prod("a", 1500)]).escalones, undefined);
  assert.strictEqual(calc({ modeloId: NO_LISTADO }, CFG_BASE, [prod("a", 1500)]).escalones, undefined);
});

console.log("Mensajes de WhatsApp y formato");
prueba("con valor y equipo elegido", () => {
  const entrada = base({ bateria: 92 });
  const r = calcularCanje(CFG_BASE, TABLA, entrada, []);
  assert.strictEqual(
    mensajeWhatsApp(CFG_BASE, TABLA, entrada, r, "iPhone 17 (Azul · 256GB)"),
    "Hola, quiero cotizar mi iPhone 13 128GB, batería 92%, sin detalles. Valor estimado: USD 900. Me interesa: iPhone 17 (Azul · 256GB)."
  );
});
prueba("sin equipo elegido → 'ver opciones'; batería baja ahora también lleva valor", () => {
  const e1 = base({ bateria: 95 });
  assert.ok(mensajeWhatsApp(CFG_BASE, TABLA, e1, calcularCanje(CFG_BASE, TABLA, e1, [])).endsWith("Me interesa: ver opciones."));
  const e2 = base({ bateria: 60 });
  assert.strictEqual(mensajeWhatsApp(CFG_BASE, TABLA, e2, calcularCanje(CFG_BASE, TABLA, e2, [])),
    "Hola, quiero cotizar mi iPhone 13 128GB, batería 60%, sin detalles. Valor estimado: USD 800. Me interesa: ver opciones.");
});
prueba("con detalles: sin «Valor estimado», texto normalizado, 'sin especificar', batería sin informar y recorte", () => {
  const e = base({ detalles: true, detallesTexto: "  pantalla   rota \n y golpe ", bateria: "" });
  assert.strictEqual(mensajeWhatsApp(CFG_BASE, TABLA, e, calcularCanje(CFG_BASE, TABLA, e, [])),
    "Hola, quiero cotizar mi iPhone 13 128GB, batería sin informar, con detalles: pantalla rota y golpe. Me interesa: ver opciones.");
  assert.ok(mensajeWhatsApp(CFG_BASE, TABLA, base({ detalles: true }), null).includes("con detalles: sin especificar"));
  assert.ok(mensajeWhatsApp(CFG_BASE, TABLA, base({ detalles: true, detallesTexto: "a".repeat(1000) }), null).length < 450);
});
prueba("los mensajes sobreviven a encodeURIComponent / decodeURIComponent", () => {
  const msg = mensajeWhatsApp(CFG_BASE, TABLA, base({ detalles: true, detallesTexto: "á é & ? # 100%" }), null);
  assert.strictEqual(decodeURIComponent(encodeURIComponent(msg)), msg);
});
prueba("formato de moneda: USD con puntos de miles, ARS con «$», sin decimales", () => {
  assert.strictEqual(formatearMonto({ moneda: "USD" }, 1050), "USD 1.050");
  assert.strictEqual(formatearMonto({ moneda: "USD" }, 230), "USD 230");
  assert.strictEqual(formatearMonto({ moneda: "ARS" }, 230000), "$230.000");
  assert.strictEqual(formatearMonto({ moneda: "USD" }, 230.7), "USD 231");
});

// ---------- tabla real ----------
console.log("Tabla real (js/canje-tabla.js + js/calculadora-data.js)");
const leer = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const real = vm.runInNewContext(leer("canje-tabla.js") + "\n" + leer("calculadora-data.js") + "\n;({ CANJE_TABLA, CANJE_CONFIG })");
const R = real.CANJE_TABLA;
const CFG = real.CANJE_CONFIG;
const GENERACIONES_FUERA = [12]; // ya no se toman (decisión del dueño): del iPhone 13 en adelante
const valorReal = (id, gb, bateria) => {
  const r = calcularCanje(CFG, R, { modeloId: id, gb, bateria, detalles: false }, []);
  assert.strictEqual(r.estado, "valor", id + " " + gb + "GB " + bateria + "%: " + JSON.stringify(r));
  return r;
};
prueba("la tabla trae 19 modelos, 33 combinaciones modelo+memoria y 3 niveles de batería", () => {
  assert.strictEqual(R.modelos.length, 19);
  assert.strictEqual(R.modelos.reduce((s, m) => s + m.capacidades.length, 0), 33);
  assert.deepStrictEqual(Array.from(R.bateriaNiveles), [98, 90, 75]); // Array.from: la tabla viene de otro contexto de vm
  assert.strictEqual(R.moneda, "USD");
});
prueba("no hay modelos de generaciones que ya no se toman (ni por id ni por nombre)", () => {
  GENERACIONES_FUERA.forEach((g) => {
    assert.ok(!R.modelos.some((m) => m.id.startsWith("iphone-" + g)), "id de generación " + g);
    assert.ok(!R.modelos.some((m) => new RegExp("iPhone\\s+" + g + "\\b").test(m.nombre)), "nombre de generación " + g);
  });
  assert.ok(R.modelos.every((m) => Number(/iPhone\s+(\d+)/.exec(m.nombre)[1]) >= 13), "todos son iPhone 13 o más nuevos");
});
prueba("valores de control de la tabla real", () => {
  assert.strictEqual(valorReal("iphone-13", 128, 98).valor, 270);
  assert.strictEqual(valorReal("iphone-14-pro", 256, 92).valor, 440);     // nivel 90
  assert.strictEqual(valorReal("iphone-14-pro", 256, 80).valor, 400);     // nivel 75
  assert.strictEqual(valorReal("iphone-15-pro", 256, 90).valor, 570);
  assert.strictEqual(valorReal("iphone-16", 256, 98).valor, 620);
  assert.strictEqual(valorReal("iphone-17-pro-max", 256, 98).valor, 1050);
  assert.strictEqual(valorReal("iphone-13-mini", 128, 50).valor, 140);    // batería muy baja: nivel 75, sin mínimo
});
prueba("iPhone 14 Pro 256GB: niveles 480 / 440 / 400 y textos del tramo", () => {
  const casos = [[100, 480, "98% o más"], [98, 480, "98% o más"], [97, 440, "90% a 97%"], [92, 440, "90% a 97%"], [90, 440, "90% a 97%"], [89, 400, "menos de 90%"], [75, 400, "menos de 90%"], [60, 400, "menos de 90%"], [1, 400, "menos de 90%"]];
  casos.forEach(([b, v, t]) => {
    const r = valorReal("iphone-14-pro", 256, b);
    assert.strictEqual(r.valor, v, "batería " + b);
    assert.strictEqual(r.tramoTexto, "Calculado para batería de " + t, "batería " + b);
  });
  assert.strictEqual(formatearMonto(CFG, 440), "USD 440");
});
prueba("iPhone 13 128GB: 99 → 270, 95 → 240, 89 → 220, 40 → 220", () => {
  assert.deepStrictEqual([99, 95, 89, 40].map((b) => valorReal("iphone-13", 128, b).valor), [270, 240, 220, 220]);
});
prueba("toda combinación real calcula un valor > 0 con cualquier batería de 1 a 100", () => {
  let n = 0;
  R.modelos.forEach((m) => m.capacidades.forEach((c) => {
    for (let b = 1; b <= 100; b++) { assert.ok(valorReal(m.id, c.gb, b).valor > 0); n++; }
  }));
  assert.strictEqual(n, 33 * 100);
});
prueba("optgroups: iPhone 17, 16, 15, 14 y 13 (más nuevo primero), 19 modelos", () => {
  const g = agruparModelosPorGeneracion(R);
  assert.deepStrictEqual(g.map((x) => x.etiqueta), ["iPhone 17", "iPhone 16", "iPhone 15", "iPhone 14", "iPhone 13"]);
  assert.deepStrictEqual(g.map((x) => x.modelos.length), [3, 4, 4, 4, 4]);
  assert.ok(g[1].modelos.some((m) => m.id === "iphone-16e"), "el 16e va en el grupo iPhone 16");
});
prueba("CANJE_CONFIG: moneda de la tabla, aviso legal y sin restos del modelo/regla viejos", () => {
  assert.strictEqual(typeof CFG.datosReales, "boolean");
  assert.strictEqual(CFG.moneda, R.moneda);
  assert.ok(CFG.redondeo > 0);
  assert.ok(CFG.avisoLegal.includes("sujeto a verificación final en el local") && CFG.avisoLegal.includes("No constituye presupuesto oficial"));
  ["modelos", "bateria", "bateria" + "Minima", "regla" + "Bateria"].forEach((k) => assert.ok(!(k in CFG), "CANJE_CONFIG." + k + " ya no existe"));
});

console.log("\n" + ok + " pruebas ok, " + fallas + " con falla");
process.exit(fallas ? 1 : 0);
