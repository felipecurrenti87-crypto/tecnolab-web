// DATOS DE EJEMPLO — NO PUBLICAR HASTA CARGAR VALORES REALES
//
// Datos de la calculadora de Plan Canje. Todo el cálculo lee solo de este objeto:
// cambiar números acá no requiere tocar código. Cómo cargarlos: scripts/cargar-datos.md
//
// Mientras `datosReales` sea false, la calculadora NO se muestra al público
// (solo con ?preview=1 en la URL de plan-canje.html, con una franja de aviso).
const CANJE_CONFIG = {
  datosReales: false,        // pasar a true recién cuando Gonzalo cargue sus valores
  moneda: "USD",             // "USD" o "ARS" (confirmar con el dueño)
  redondeo: 1,               // el resultado se redondea hacia abajo a este múltiplo (1 en USD, 1000 en ARS)
  bateriaMinima: 70,         // por debajo de este %, no se calcula: se consulta por WhatsApp

  // Tramos de descuento según salud de batería (porcentaje entero, ambos extremos incluidos).
  // tipo "porcentaje": descuento sobre el valor base · tipo "monto": descuento fijo en `moneda`.
  bateria: [ // EJEMPLO
    { desde: 90, hasta: 100, tipo: "porcentaje", valor: 0 },
    { desde: 80, hasta: 89,  tipo: "porcentaje", valor: 8 },
    { desde: 70, hasta: 79,  tipo: "porcentaje", valor: 15 }
  ],

  // Valor base de toma por modelo y capacidad, con batería en el tramo sin descuento.
  // Un valor en 0 significa "sin dato": ese equipo se consulta por WhatsApp.
  modelos: [ // EJEMPLO — cargar los reales del dueño
    { id: "iphone-12", nombre: "iPhone 12", capacidades: [ { gb: 64, valor: 150 }, { gb: 128, valor: 170 } ] },   // EJEMPLO
    { id: "iphone-13", nombre: "iPhone 13", capacidades: [ { gb: 128, valor: 250 }, { gb: 256, valor: 280 } ] },  // EJEMPLO
    { id: "iphone-14", nombre: "iPhone 14", capacidades: [ { gb: 128, valor: 350 }, { gb: 256, valor: 390 } ] },  // EJEMPLO
    { id: "iphone-15", nombre: "iPhone 15", capacidades: [ { gb: 128, valor: 480 }, { gb: 256, valor: 530 } ] }   // EJEMPLO
  ],

  avisoLegal: "Valor estimado, sujeto a verificación final en el local, en persona. No constituye presupuesto oficial: puede haber detalles no informados."
};

if (typeof module !== "undefined" && module.exports) module.exports = { CANJE_CONFIG };
