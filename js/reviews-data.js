/**
 * Prueba social — reseñas reales de Google Maps de las dos sucursales de Tecnolab.
 *
 * Fuente: fichas públicas de Google Maps, leídas el 29/10/2026.
 * REGLAS DE USO (no romper):
 *  - Los textos están copiados TAL CUAL fueron publicados (con sus errores de
 *    tipeo). No se corrigen, no se resumen, no se mejoran.
 *  - Solo se usaron reseñas publicadas completas (se descartaron las que Google
 *    mostraba cortadas con "… Más").
 *  - Se muestra el nombre y la inicial del apellido ("Belen D."), nunca el
 *    nombre completo. NO se muestran estrellas por reseña: la fuente que
 *    leímos no indicaba la puntuación de cada una. Las estrellas van solo en
 *    el promedio de cada sucursal.
 *  - No se muestra "hace X meses" (queda desactualizado): se muestra una sola
 *    leyenda "Datos de Google Maps, octubre 2026".
 *  - Actualizar a mano cada tanto (promedio, cantidad y reseñas) y cambiar
 *    `actualizado`. Mejora a futuro: traerlas con la API oficial Google Places.
 */
const RESENAS_ACTUALIZADO = "octubre 2026";

const SUCURSALES_RESENAS = [
  {
    id: "dorrego",
    nombre: "Sucursal Dorrego",
    direccion: "Moldes 635, Dorrego, Mendoza",
    promedio: 4.8,
    cantidad: 209,
    lat: -32.9132971,
    lng: -68.8322202,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=TecnoLab+Suc.+Dorrego+Moldes+635+Mendoza",
    resenas: [
      {
        autor: "Daniela G.",
        texto: "Desde el primer momento de contacto, el servicio fue de excelencia, con rapidez y cordialidad. Destacan su atención al cliente y predisposición. Todo el servicio fue de primera calidad. Lo recomiendo un 100%. Muchas gracias por ayudarme con mi celular.",
      },
      {
        autor: "Leandro B.",
        texto: "Muy buena la atención...no demoraron nada en limpiarme el pin de carga y lo genial que es sin costo....unos genios!!!",
      },
      {
        autor: "Pat I.",
        texto: "Excelente servicio. Guillermo es super amable y sabe un montón. Me solucionaron todos los problemas en un rato. Los recomiendo",
      },
      {
        autor: "Pablo V.",
        texto: "Impecable! Totalmente recomendado. Los tipos saben lo que hacen y lo hacen bien. Saludos",
        localGuide: true,
      },
      {
        autor: "Ana E.",
        texto: "Muy buena atención, nos resolvieron el problema en dos minutos.\nLa atención de los chicos es más que buena\nMuy recomendable",
      },
      {
        autor: "Vanina T.",
        texto: "Super honesto. Soluciono nuestro problema en el momento.",
        localGuide: true,
      },
    ],
  },
  {
    id: "lomas",
    nombre: "Sucursal Complejo Lomas",
    direccion: "Complejo Lomas, Av. Champagnat, Local 10A, Mendoza",
    promedio: 4.7,
    cantidad: 60,
    lat: -32.8717334,
    lng: -68.8817052,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tecnolab+Lomas+Plaza+comercial+Mendoza",
    resenas: [
      {
        autor: "Federico A.",
        texto: "les compre un equipo usado, excelente todo. Los chicos me hicieron todo el traspaso de datos y hasta me gestionaron el eSim. Super recomendable",
      },
      {
        autor: "Anto D.",
        texto: "Muy buena atención. Me arreglaron un celu que no me habian podido arreglar en otro lugar",
      },
      {
        autor: "Mariana T.",
        texto: "Excelente la atención de Pablo!!. Muchísimas variedad en fundas y accesorios y muy buenos precios. Altamente recomendable!",
        localGuide: true,
      },
      {
        autor: "Melina O.",
        texto: "Excelente atención!! Vivimos lejos y no cambiaríamos por nada la amabilidad, responsabilidad y conocimiento de los chicos de Tecnolab. Muchas gracias ☺️",
      },
      {
        autor: "Rocio S.",
        texto: "Excelente atención de Pablo, arregló mi celular en tiempo y forma y quedó perfecto! Tienen todo tipo de accesorios y excelente calidad. SUPER RECOMENDABLE",
      },
    ],
  },
];
