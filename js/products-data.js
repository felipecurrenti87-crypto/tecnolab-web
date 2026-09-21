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
];
