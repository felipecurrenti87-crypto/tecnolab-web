/**
 * Estructura de datos del catálogo destacado.
 * Agregar más modelos acá (iPhone, Mac, iPad) no requiere tocar el
 * markup ni el JS del scroll pineado — el render de cards es genérico.
 */

// CONVENCIÓN DE FOTOS: mismo ángulo de cámara para todos los colores de un
// mismo modelo (recomendado: frente, levemente en 3/4), fondo transparente
// o recortado, mismo encuadre/escala entre modelos de la misma familia.
// Las 2 fotos de iPhone 18 Pro Max que ya existen hoy NO cumplen esto
// (una es "front-back", la otra "back-side") — homogeneizar en cuanto
// entren fotos nuevas de esa familia, no las dejes como están si vas a
// sumar más colores de este modelo.
const CATALOGO_DESTACADO = [
  {
    id: "iphone-18-pro-max-negro",
    categoria: "iPhone",
    nombre: "iPhone 18 Pro Max",
    variante: "Negro · 256GB",
    especificacion: "Cámara Pro · Chip A20 Pro",
    precio: "Desde $1.850.000",
    colores: [
      { nombre: "Negro", hex: "#1a1a1a", imagen: "assets/img/iphone18promax-negro-front-back.jpg" },
      { nombre: "Plateado", hex: "#e8e8ea", imagen: "assets/img/iphone18promax-plateado-back-side.jpg" },
    ],
    disponible: true,
  },
  {
    id: "iphone-18-pro-plateado",
    categoria: "iPhone",
    nombre: "iPhone 18 Pro",
    variante: "Plateado · 256GB",
    especificacion: "Cámara Pro · Chip A20 Pro",
    precio: "Desde $1.650.000",
    colores: [
      { nombre: "Plateado", hex: "#e8e8ea", imagen: "assets/img/iphone18promax-plateado-back-side.jpg" },
    ],
    disponible: true,
  },
  // La variante Glacier / Azul (assets/img/iphone18promax-azul-camara-detalle.jpg)
  // queda afuera por ahora: es un macro diagonal de la cámara, no el
  // mismo encuadre de plano trasero recto que las dos de arriba.
  // Sumarla de nuevo apenas haya una foto de azul en ese mismo ángulo.
  {
    id: "iphone-air",
    categoria: "iPhone",
    nombre: "iPhone Air",
    variante: "256GB",
    especificacion: "Diseño ultradelgado · Chip A19 Pro",
    precio: "Consultar",
    // Solo Sky Blue por ahora (gallery-3, frente + dorso en 3/4). Pendientes:
    // Light Gold (gallery-5 es dorso recto + canto, otro ángulo),
    // Cloud White (gallery-4 es macro de cámara) y Space Black (solo aparece
    // en el lineup gallery-1). Sumarlos cuando haya fotos en el mismo ángulo.
    colores: [
      { nombre: "Sky Blue", hex: "#cfdde9", imagen: "assets/img/iphone-air-digitalmat-gallery-3-202509.jpg" },
    ],
    disponible: true,
  },
  {
    id: "iphone-duo",
    categoria: "iPhone",
    nombre: "iPhone Duo",
    variante: "256GB",
    especificacion: "Primer iPhone plegable · Pantalla exterior 5.4″ + interior 7.6″",
    precio: "Consultar",
    // Solo Star White por ahora (gallery-4, dorso con cámara). Night Sky
    // pendiente: solo aparece en el lineup (gallery-1) y abierto mostrando
    // pantalla (gallery-3), ninguna es un dorso comparable.
    colores: [
      { nombre: "Star White", hex: "#ece9e4", imagen: "assets/img/iphone-duo-digitalmat-gallery-4-202609.jpg" },
    ],
    disponible: true,
  },
  {
    id: "iphone-17-pro-max-negro",
    categoria: "iPhone",
    nombre: "iPhone 17 Pro Max",
    variante: "Titanio Negro · 256GB",
    especificacion: "Cámara Pro · Chip A19 Pro",
    precio: "Desde $1.550.000",
    colores: [], // sin fotos todavía — la card usa el fallback "Foto próximamente"
    disponible: true,
  },
  {
    id: "iphone-17-pro-natural",
    categoria: "iPhone",
    nombre: "iPhone 17 Pro",
    variante: "Titanio Natural · 256GB",
    especificacion: "Cámara Pro · Chip A19 Pro",
    precio: "Desde $1.380.000",
    colores: [], // sin fotos todavía — la card usa el fallback "Foto próximamente"
    disponible: true,
  },
  {
    id: "iphone-17-azul",
    categoria: "iPhone",
    nombre: "iPhone 17",
    variante: "Azul brumoso · 128GB",
    especificacion: "Chip A19",
    precio: "Desde $1.050.000",
    colores: [
      { nombre: "Azul brumoso", hex: "#96aed1", imagen: "assets/img/iphone-17-digitalmat-gallery-4-202509.jpg" },
    ],
    disponible: true,
  },
  {
    id: "iphone-16-pro-max-desierto",
    categoria: "iPhone",
    nombre: "iPhone 16 Pro Max",
    variante: "Titanio Desierto · 256GB",
    especificacion: "Cámara Pro · Chip A18 Pro",
    precio: "Desde $1.280.000",
    colores: [], // sin fotos todavía — la card usa el fallback "Foto próximamente"
    disponible: true,
  },
  {
    id: "iphone-16-pro-blanco",
    categoria: "iPhone",
    nombre: "iPhone 16 Pro",
    variante: "Titanio Blanco · 128GB",
    especificacion: "Cámara Pro · Chip A18 Pro",
    precio: "Desde $1.120.000",
    colores: [], // sin fotos todavía — la card usa el fallback "Foto próximamente"
    disponible: true,
  },
  {
    id: "iphone-16-verde",
    categoria: "iPhone",
    nombre: "iPhone 16",
    variante: "Verde azulado · 128GB",
    especificacion: "Chip A18",
    precio: "Desde $890.000",
    colores: [
      { nombre: "Verde azulado", hex: "#7fb5b0", imagen: "assets/img/iphone16-digitalmat-gallery-5-202409.jpg" },
    ],
    disponible: true,
  },
  {
    id: "airpods-5",
    categoria: "AirPods",
    nombre: "AirPods 5",
    variante: "Con carga inalámbrica",
    especificacion: "Cancelación activa de ruido · Chip H2",
    precio: "Consultar",
    colores: [
      { nombre: "Blanco", hex: "#f5f5f5", imagen: "assets/img/airpods-5-select-202609_FV1.jpg" },
    ],
    disponible: true,
  },
];
