// Configuración de la calculadora de Plan Canje. Los valores de toma NO están acá: vienen de
// js/canje-tabla.js (CANJE_TABLA, planilla de Gonzalo, del iPhone 13 en adelante), que se carga
// antes que este archivo. La regla de batería (98+ / 90–97 / menos de 90 usa el nivel 75) vive en
// js/calculadora-logic.js y no es configurable.
// Cómo cargar y activar: scripts/cargar-datos.md
//
// Mientras `datosReales` sea false, la calculadora NO se muestra al público
// (solo con ?preview=1 en la URL de plan-canje.html, con una franja de aviso).
const CANJE_CONFIG = {
  datosReales: false,              // pasar a true recién cuando se verifique la tabla contra la planilla
  moneda: CANJE_TABLA.moneda,      // la define la tabla ("USD" o "ARS")
  redondeo: 1,                     // el resultado se redondea hacia abajo a este múltiplo (1 en USD, 1000 en ARS)
  avisoLegal: "Valor estimado, sujeto a verificación final en el local, en persona. No constituye presupuesto oficial: puede haber detalles no informados."
};
