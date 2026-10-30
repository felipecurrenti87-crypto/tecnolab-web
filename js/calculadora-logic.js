/**
 * Lógica PURA de la calculadora de Plan Canje (sin DOM, sin estado global).
 * Se usa en el navegador (window.CalculadoraCanje) y en Node (scripts/test-calculadora.js).
 * La interfaz vive en js/main.js (initCalculadora); los datos, en js/calculadora-data.js.
 *
 * entrada = { modeloId, gb, bateria, detalles, detallesTexto }
 * calcularCanje devuelve siempre un objeto con `estado`:
 *   "error"    → { errores: { modelo?, capacidad?, bateria? } }
 *   "consulta" → { motivo, mensaje }   (no se calcula: se consulta por WhatsApp)
 *   "valor"    → { valor, base, tramo, modelo, capacidad, escalones }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalculadoraCanje = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MSG_DETALLES = "Con detalles, el valor lo definimos en el local. Consultalo por WhatsApp.";
  var MSG_BATERIA = "Con esa batería, la tasación se confirma en el local. Consultala por WhatsApp.";
  var MSG_SIN_VALOR = "Este modelo lo tasamos en el local. Consultalo por WhatsApp.";

  function formatearMonto(config, n) {
    return config.moneda + " " + new Intl.NumberFormat("es-AR").format(n);
  }

  function buscarModelo(config, id) {
    return (config.modelos || []).find(function (m) { return m.id === id; }) || null;
  }

  function buscarCapacidad(modelo, gb) {
    if (!modelo) return null;
    var n = Number(gb);
    return (modelo.capacidades || []).find(function (c) { return c.gb === n; }) || null;
  }

  function tramoDeBateria(config, bateria) {
    return (config.bateria || []).find(function (t) { return bateria >= t.desde && bateria <= t.hasta; }) || null;
  }

  // Batería: "" / null / undefined → null (sin informar); entero 1–100 → número; otra cosa → NaN
  function parsearBateria(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return null;
    var n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : NaN;
  }

  function validar(config, entrada) {
    var errores = {};
    var modelo = buscarModelo(config, entrada.modeloId);
    if (!modelo) errores.modelo = "Elegí un modelo.";
    else if (!buscarCapacidad(modelo, entrada.gb)) errores.capacidad = "Elegí una capacidad.";
    var bateria = parsearBateria(entrada.bateria);
    if (Number.isNaN(bateria)) errores.bateria = "Ingresá un número entero entre 1 y 100.";
    else if (bateria === null && !entrada.detalles) errores.bateria = "Ingresá la salud de batería (un número entre 1 y 100).";
    return errores;
  }

  function aplicarDescuento(base, tramo) {
    if (tramo.tipo === "porcentaje") return base * (1 - tramo.valor / 100);
    if (tramo.tipo === "monto") return base - tramo.valor;
    return NaN;
  }

  /**
   * Salto de gama: de los productos con precioNum numérico, ordenados por precio, el primero
   * MÁS CARO que el valor estimado y los dos inmediatamente superiores. Se muestran todos los
   * totales y las diferencias; no se oculta ningún precio. Sin productos con precio → [].
   */
  function escalonesSaltoDeGama(productos, valor) {
    var conPrecio = (productos || []).filter(function (p) {
      return typeof p.precioNum === "number" && isFinite(p.precioNum) && p.precioNum > 0;
    });
    conPrecio.sort(function (a, b) { return a.precioNum - b.precioNum; });
    var i = conPrecio.findIndex(function (p) { return p.precioNum > valor; });
    if (i === -1) return [];
    return conPrecio.slice(i, i + 3).map(function (p, k, arr) {
      return {
        producto: p,
        etiqueta: p.variante ? p.nombre + " (" + p.variante + ")" : p.nombre,
        precio: p.precioNum,
        diferencia: p.precioNum - valor,
        sumaVsAnterior: k > 0 ? p.precioNum - arr[k - 1].precioNum : null
      };
    });
  }

  function calcularCanje(config, entrada, productos) {
    var errores = validar(config, entrada);
    if (Object.keys(errores).length) return { estado: "error", errores: errores };

    var modelo = buscarModelo(config, entrada.modeloId);
    var capacidad = buscarCapacidad(modelo, entrada.gb);
    var bateria = parsearBateria(entrada.bateria);
    var consulta = function (motivo, mensaje) { return { estado: "consulta", motivo: motivo, mensaje: mensaje }; };

    if (entrada.detalles) return consulta("detalles", MSG_DETALLES);
    if (bateria < config.bateriaMinima) return consulta("bateria", MSG_BATERIA);

    var base = capacidad.valor;
    if (!(base > 0)) return consulta("sin-valor", MSG_SIN_VALOR);

    var tramo = tramoDeBateria(config, bateria);
    if (!tramo) return consulta("sin-tramo", MSG_BATERIA);

    var valor = aplicarDescuento(base, tramo);
    if (!isFinite(valor)) return consulta("sin-tramo", MSG_BATERIA);
    var paso = config.redondeo > 0 ? config.redondeo : 1;
    valor = Math.floor(valor / paso + 1e-9) * paso; // hacia abajo: no se promete de más
    if (!(valor > 0)) return consulta("sin-valor", MSG_SIN_VALOR);

    return {
      estado: "valor",
      valor: valor,
      base: base,
      tramo: tramo,
      modelo: modelo,
      capacidad: capacidad,
      escalones: escalonesSaltoDeGama(productos, valor)
    };
  }

  /** Texto del mensaje de WhatsApp (sin codificar). `equipo`: etiqueta del escalón elegido o vacío. */
  function mensajeWhatsApp(config, entrada, resultado, equipo) {
    var modelo = buscarModelo(config, entrada.modeloId);
    var bateria = parsearBateria(entrada.bateria);
    var detalle = String(entrada.detallesTexto || "").replace(/\s+/g, " ").trim().slice(0, 300);
    var partes = [
      "Hola, quiero cotizar mi " + (modelo ? modelo.nombre : "iPhone") + " " + Number(entrada.gb) + "GB, " +
      (bateria ? "batería " + bateria + "%" : "batería sin informar") + ", " +
      (entrada.detalles ? "con detalles: " + (detalle || "sin especificar") : "sin detalles") + "."
    ];
    if (resultado && resultado.estado === "valor") partes.push("Valor estimado: " + formatearMonto(config, resultado.valor) + ".");
    partes.push("Me interesa: " + (equipo || "ver opciones") + ".");
    return partes.join(" ");
  }

  return {
    calcularCanje: calcularCanje,
    escalonesSaltoDeGama: escalonesSaltoDeGama,
    mensajeWhatsApp: mensajeWhatsApp,
    formatearMonto: formatearMonto,
    buscarModelo: buscarModelo,
    buscarCapacidad: buscarCapacidad,
    tramoDeBateria: tramoDeBateria
  };
});
