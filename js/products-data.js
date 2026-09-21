/**
 * Estructura de datos del catálogo destacado.
 * Agregar más modelos acá (iPhone, Mac, iPad) no requiere tocar el
 * markup ni el JS del scroll pineado — el render de cards es genérico.
 */

const CATALOGO_DESTACADO = [
  {
    id: "iphone-18-pro-max-negro",
    categoria: "iPhone",
    nombre: "iPhone 18 Pro Max",
    variante: "Negro · 256GB",
    especificacion: "Cámara Pro · Chip A20 Pro",
    precio: "Desde $1.850.000",
    imagen: "assets/img/iphone18promax-negro-front-back.jpg",
    disponible: true,
  },
  {
    id: "iphone-18-pro-plateado",
    categoria: "iPhone",
    nombre: "iPhone 18 Pro",
    variante: "Plateado · 256GB",
    especificacion: "Cámara Pro · Chip A20 Pro",
    precio: "Desde $1.650.000",
    imagen: "assets/img/iphone18promax-plateado-back-side.jpg",
    disponible: true,
  },
  // La variante Azul (assets/img/iphone18promax-azul-camara-detalle.jpg)
  // queda afuera por ahora: es un macro diagonal de la cámara, no el
  // mismo encuadre de plano trasero recto que las dos de arriba.
  // Sumarla de nuevo apenas haya una foto de azul en ese mismo ángulo.
  {
    id: "iphone-17-pro-max-negro",
    categoria: "iPhone",
    nombre: "iPhone 17 Pro Max",
    variante: "Titanio Negro · 256GB",
    especificacion: "Cámara Pro · Chip A19 Pro",
    precio: "Desde $1.550.000",
    imagen: null,
    disponible: true,
  },
  {
    id: "iphone-17-pro-natural",
    categoria: "iPhone",
    nombre: "iPhone 17 Pro",
    variante: "Titanio Natural · 256GB",
    especificacion: "Cámara Pro · Chip A19 Pro",
    precio: "Desde $1.380.000",
    imagen: null,
    disponible: true,
  },
  {
    id: "iphone-17-azul",
    categoria: "iPhone",
    nombre: "iPhone 17",
    variante: "Azul · 128GB",
    especificacion: "Chip A19",
    precio: "Desde $1.050.000",
    imagen: null,
    disponible: true,
  },
  {
    id: "iphone-16-pro-max-desierto",
    categoria: "iPhone",
    nombre: "iPhone 16 Pro Max",
    variante: "Titanio Desierto · 256GB",
    especificacion: "Cámara Pro · Chip A18 Pro",
    precio: "Desde $1.280.000",
    imagen: null,
    disponible: true,
  },
  {
    id: "iphone-16-pro-blanco",
    categoria: "iPhone",
    nombre: "iPhone 16 Pro",
    variante: "Titanio Blanco · 128GB",
    especificacion: "Cámara Pro · Chip A18 Pro",
    precio: "Desde $1.120.000",
    imagen: null,
    disponible: true,
  },
  {
    id: "iphone-16-verde",
    categoria: "iPhone",
    nombre: "iPhone 16",
    variante: "Verde · 128GB",
    especificacion: "Chip A18",
    precio: "Desde $890.000",
    imagen: null,
    disponible: true,
  },
];
