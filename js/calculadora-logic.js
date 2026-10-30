/**
 * Lógica PURA de la calculadora de Plan Canje (sin DOM, sin estado global).
 * Se usa en el navegador (window.CalculadoraCanje) y en Node (scripts/test-calculadora.js).
 * Regla de batería (única): 98% o más → nivel 98; 90% a 97% → nivel 90; menos de 90% → SIEMPRE
 * el nivel 75, por baja que sea. No hay batería mínima ni consulta por batería baja.
 * La interfaz vive en js/main.js (initCalculadora). Los datos: js/canje-tabla.js (planilla de
 * Gonzalo) y js/calculadora-data.js (CANJE_CONFIG).
 *
 * tabla   = CANJE_TABLA  { moneda, bateriaNiveles: [98, 90, 75], modelos: [ { id, nombre, capacidades: [ { gb, valores: { 98, 90, 75 } } ] } ] }
 * config  = CANJE_CONFIG { moneda, redondeo, avisoLegal }
 * entrada = { modeloId, gb, bateria, detalles, detallesTexto, modeloTexto }
 *
 * calcularCanje(config, tabla, entrada, productos) devuelve un objeto con `estado`:
 *   "error"    → { errores: { modelo?, capacidad?, bateria? } }
 *   "consulta" → { motivo, mensaje }   (no se calcula: se consulta por WhatsApp)
 *   "valor"    → { valor, nivel, tramoTexto, modelo, capacidad, escalones }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalculadoraCanje = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var NO_LISTADO = "__no-listado";
  var MSG_DETALLES = "Con detalles, el valor lo definimos en el local. Consultalo por WhatsApp.";
    var MSG_SIN_VALOR = "Este modelo lo tasamos en el local. Consultalo por WhatsApp.";
  var MSG_NO_LISTADO = "Contanos qué modelo es y lo consultamos por WhatsApp.";

  function formatearMonto(config, n) {
    var num = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
    return config.moneda === "ARS" ? "$" + num : config.moneda + " " + num;
  }

  function buscarModelo(tabla, id) {
    return (tabla.modelos || []).find(function (m) { return m.id === id; }) || null;
  }

  function buscarCapacidad(modelo, gb) {
    if (!modelo) return null;
    var n = Number(gb);
    return (modelo.capacidades || []).find(function (c) { return c.gb === n; }) || null;
  }

  // Niveles de batería de referencia, de mayor a menor (ej. [98, 90, 75])
  function niveles(tabla) {
    return (tabla.bateriaNiveles || []).slice().sort(function (a, b) { return b - a; });
  }

  // Batería: "" / null / undefined → null (sin informar); entero 1–100 → número; otra cosa → NaN
  function parsearBateria(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return null;
    var n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : NaN;
  }

  function valorValido(v) {
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  // Texto del rango que cubre un nivel: "98% o más", "90% a 97%", "menos de 90%"
  function describirTramo(tabla, nivel) {
    var ns = niveles(tabla);
    var i = ns.indexOf(nivel);
    if (i <= 0) return nivel + "% o más";
    if (i === ns.length - 1) return "menos de " + ns[i - 1] + "%";
    return nivel + "% a " + (ns[i - 1] - 1) + "%";
  }

  // Regla "piso": se aplica el mayor nivel que la batería alcanza (98, 90 o 75). Si no alcanza
  // ninguno (menos de 75) se usa igual el nivel más bajo: no hay mínimo. La batería ya viene validada (1–100).
  function valorPorBateria(tabla, capacidad, bateria) {
    var ns = niveles(tabla);
    var nivel = ns.find(function (n) { return bateria >= n; });
    if (nivel === undefined) nivel = ns[ns.length - 1];
    var v = capacidad.valores[nivel];
    if (!valorValido(v)) return null;
    return { valor: v, nivel: nivel, tramoTexto: "Calculado para batería de " + describirTramo(tabla, nivel) };
  }

  function validar(tabla, entrada) {
    var errores = {};
    var modelo = buscarModelo(tabla, entrada.modeloId);
    if (!modelo) errores.modelo = "Elegí un modelo.";
    else if (!buscarCapacidad(modelo, entrada.gb)) errores.capacidad = "Elegí una capacidad.";
    var bateria = parsearBateria(entrada.bateria);
    if (Number.isNaN(bateria)) errores.bateria = "Ingresá un número entero entre 1 y 100.";
    else if (bateria === null && !entrada.detalles) errores.bateria = "Ingresá la salud de batería (un número entre 1 y 100).";
    return errores;
  }

  /**
   * Salto de gama: de los productos con precioNum numérico, ordenados por precio, el primero
   * MÁS CARO que el valor estimado y los dos inmediatamente superiores. Se muestran todos los
   * totales y las diferencias; no se oculta ningún precio. Sin productos con precio → [].
   * (precioNum debe estar en la misma moneda que la tabla.)
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

  function calcularCanje(config, tabla, entrada, productos) {
    var consulta = function (motivo, mensaje) { return { estado: "consulta", motivo: motivo, mensaje: mensaje }; };
    if (entrada.modeloId === NO_LISTADO) return consulta("no-listado", MSG_NO_LISTADO);

    var errores = validar(tabla, entrada);
    if (Object.keys(errores).length) return { estado: "error", errores: errores };

    var modelo = buscarModelo(tabla, entrada.modeloId);
    var capacidad = buscarCapacidad(modelo, entrada.gb);
    var bateria = parsearBateria(entrada.bateria);

    if (entrada.detalles) return consulta("detalles", MSG_DETALLES);

    var calculo = valorPorBateria(tabla, capacidad, bateria);
    if (!calculo) return consulta("sin-valor", MSG_SIN_VALOR);

    var paso = config.redondeo > 0 ? config.redondeo : 1;
    var valor = Math.floor(calculo.valor / paso + 1e-9) * paso; // hacia abajo: no se promete de más
    if (!(valor > 0)) return consulta("sin-valor", MSG_SIN_VALOR);

    return {
      estado: "valor",
      valor: valor,
      nivel: calculo.nivel,
      tramoTexto: calculo.tramoTexto,
      modelo: modelo,
      capacidad: capacidad,
      escalones: escalonesSaltoDeGama(productos, valor)
    };
  }

  /** Mensaje para un modelo que no está en la lista (sin codificar). */
  function mensajeModeloNoListado(texto) {
    var t = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 120);
    return "Hola, quiero cotizar mi iPhone (modelo no listado: " + (t || "sin especificar") + ").";
  }

  /** Texto del mensaje de WhatsApp (sin codificar). `equipo`: etiqueta del escalón elegido o vacío. */
  function mensajeWhatsApp(config, tabla, entrada, resultado, equipo) {
    if (entrada.modeloId === NO_LISTADO) return mensajeModeloNoListado(entrada.modeloTexto);
    var modelo = buscarModelo(tabla, entrada.modeloId);
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

  /**
   * Modelos agrupados por generación para los <optgroup>: "iPhone 17", "iPhone 16", … del más
   * nuevo al más viejo. Dentro de cada grupo se respeta el orden de la tabla.
   */
  function agruparModelosPorGeneracion(tabla) {
    var grupos = {};
    (tabla.modelos || []).forEach(function (m) {
      var hit = /iPhone\s+(\d+)/i.exec(m.nombre);
      var gen = hit ? Number(hit[1]) : 0;
      (grupos[gen] = grupos[gen] || []).push(m);
    });
    return Object.keys(grupos).map(Number).sort(function (a, b) { return b - a; }).map(function (gen) {
      return { generacion: gen, etiqueta: gen ? "iPhone " + gen : "Otros", modelos: grupos[gen] };
    });
  }

  return {
    NO_LISTADO: NO_LISTADO,
    calcularCanje: calcularCanje,
    escalonesSaltoDeGama: escalonesSaltoDeGama,
    mensajeWhatsApp: mensajeWhatsApp,
    mensajeModeloNoListado: mensajeModeloNoListado,
    agruparModelosPorGeneracion: agruparModelosPorGeneracion,
    formatearMonto: formatearMonto,
    buscarModelo: buscarModelo,
    buscarCapacidad: buscarCapacidad,
    describirTramo: describirTramo
  };
});
