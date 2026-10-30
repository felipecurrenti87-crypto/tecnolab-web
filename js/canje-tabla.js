/**
 * Tabla de toma de iPhone usado — cargada de la planilla de Gonzalo (30/10/2026).
 * Alcance: del iPhone 13 en adelante (el iPhone 12 y anteriores ya no se toman).
 * Valores en dólares (USD), confirmado por el dueño.
 * Cada capacidad trae el valor para tres niveles de batería: 98, 90 y 75.
 * Regla de batería: 98% o más usa el nivel 98; de 90% a 97%, el nivel 90;
 * menos de 90% usa SIEMPRE el nivel 75, por baja que sea la batería.
 * Si un modelo no tiene una capacidad (casilla negra en la planilla), no figura acá.
 * Es el valor del equipo SIN detalles (sin golpes, pantalla rota, etc.): con detalles se consulta.
 * Verificar contra la planilla original antes de poner datosReales en true.
 */
const CANJE_TABLA = {
  moneda: "USD",
  bateriaNiveles: [98, 90, 75],
  modelos: [
    {
      id: "iphone-13",
      nombre: "iPhone 13",
      capacidades: [
        { gb: 128, valores: { 98: 270, 90: 240, 75: 220 } },
        { gb: 256, valores: { 98: 300, 90: 270, 75: 220 } }
      ]
    },
    {
      id: "iphone-13-mini",
      nombre: "iPhone 13 mini",
      capacidades: [
        { gb: 128, valores: { 98: 180, 90: 160, 75: 140 } },
        { gb: 256, valores: { 98: 180, 90: 160, 75: 140 } }
      ]
    },
    {
      id: "iphone-13-pro",
      nombre: "iPhone 13 Pro",
      capacidades: [
        { gb: 128, valores: { 98: 370, 90: 340, 75: 310 } },
        { gb: 256, valores: { 98: 400, 90: 370, 75: 340 } }
      ]
    },
    {
      id: "iphone-13-pro-max",
      nombre: "iPhone 13 Pro Max",
      capacidades: [
        { gb: 128, valores: { 98: 440, 90: 410, 75: 380 } },
        { gb: 256, valores: { 98: 480, 90: 450, 75: 410 } }
      ]
    },
    {
      id: "iphone-14",
      nombre: "iPhone 14",
      capacidades: [
        { gb: 128, valores: { 98: 300, 90: 270, 75: 240 } },
        { gb: 256, valores: { 98: 340, 90: 310, 75: 270 } }
      ]
    },
    {
      id: "iphone-14-plus",
      nombre: "iPhone 14 Plus",
      capacidades: [
        { gb: 128, valores: { 98: 350, 90: 330, 75: 290 } },
        { gb: 256, valores: { 98: 350, 90: 330, 75: 290 } }
      ]
    },
    {
      id: "iphone-14-pro",
      nombre: "iPhone 14 Pro",
      capacidades: [
        { gb: 128, valores: { 98: 450, 90: 410, 75: 370 } },
        { gb: 256, valores: { 98: 480, 90: 440, 75: 400 } }
      ]
    },
    {
      id: "iphone-14-pro-max",
      nombre: "iPhone 14 Pro Max",
      capacidades: [
        { gb: 128, valores: { 98: 500, 90: 480, 75: 450 } },
        { gb: 256, valores: { 98: 520, 90: 490, 75: 460 } }
      ]
    },
    {
      id: "iphone-15",
      nombre: "iPhone 15",
      capacidades: [
        { gb: 128, valores: { 98: 450, 90: 400, 75: 350 } },
        { gb: 256, valores: { 98: 480, 90: 440, 75: 390 } }
      ]
    },
    {
      id: "iphone-15-plus",
      nombre: "iPhone 15 Plus",
      capacidades: [
        { gb: 128, valores: { 98: 400, 90: 370, 75: 350 } },
        { gb: 256, valores: { 98: 400, 90: 370, 75: 350 } }
      ]
    },
    {
      id: "iphone-15-pro",
      nombre: "iPhone 15 Pro",
      capacidades: [
        { gb: 128, valores: { 98: 570, 90: 530, 75: 490 } },
        { gb: 256, valores: { 98: 620, 90: 570, 75: 530 } }
      ]
    },
    {
      id: "iphone-15-pro-max",
      nombre: "iPhone 15 Pro Max",
      capacidades: [
        { gb: 256, valores: { 98: 650, 90: 610, 75: 570 } }
      ]
    },
    {
      id: "iphone-16e",
      nombre: "iPhone 16e",
      capacidades: [
        { gb: 128, valores: { 98: 450, 90: 410, 75: 380 } },
        { gb: 256, valores: { 98: 450, 90: 410, 75: 380 } }
      ]
    },
    {
      id: "iphone-16",
      nombre: "iPhone 16",
      capacidades: [
        { gb: 128, valores: { 98: 600, 90: 570, 75: 540 } },
        { gb: 256, valores: { 98: 620, 90: 590, 75: 560 } }
      ]
    },
    {
      id: "iphone-16-pro",
      nombre: "iPhone 16 Pro",
      capacidades: [
        { gb: 128, valores: { 98: 690, 90: 660, 75: 630 } },
        { gb: 256, valores: { 98: 740, 90: 710, 75: 660 } }
      ]
    },
    {
      id: "iphone-16-pro-max",
      nombre: "iPhone 16 Pro Max",
      capacidades: [
        { gb: 256, valores: { 98: 820, 90: 770, 75: 720 } }
      ]
    },
    {
      id: "iphone-17",
      nombre: "iPhone 17",
      capacidades: [
        { gb: 256, valores: { 98: 790, 90: 750, 75: 690 } }
      ]
    },
    {
      id: "iphone-17-pro",
      nombre: "iPhone 17 Pro",
      capacidades: [
        { gb: 256, valores: { 98: 980, 90: 950, 75: 900 } }
      ]
    },
    {
      id: "iphone-17-pro-max",
      nombre: "iPhone 17 Pro Max",
      capacidades: [
        { gb: 256, valores: { 98: 1050, 90: 1030, 75: 980 } }
      ]
    }
  ]
};
