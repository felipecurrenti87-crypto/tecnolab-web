# Tecnolab — sitio web

Sitio estático (HTML/CSS/JS vanilla) desplegado en Vercel. **Sin build**: lo que está en el repo es lo que se publica.

## Estructura

```
index.html  catalogo.html  service.html  plan-canje.html  nosotros.html  404.html
css/style.css            Todo el CSS (variables de marca al principio).
js/main.js               Toda la interacción (menú, catálogo, carrusel, calculadora, opiniones, horarios…).
js/hero-glass.js         Lente de cristal del logo del hero (WebGL). Solo se descarga con mouse fino (ver index.html).
js/config.js             WhatsApp, URL del sitio y SUCURSALES (dirección, teléfono, horarios).
js/products-data.js      Catálogo destacado (iPhone, AirPods, Mac).
js/accesorios-data.js    Accesorios (se suman a la grilla de catalogo.html).
js/reviews-data.js       Reseñas de Google Maps y promedios.
js/calculadora-*.js, canje-tabla.js   Calculadora de Plan Canje (ver scripts/cargar-datos.md).
assets/img/              Solo imágenes en uso (WebP). assets/img/clientes/: fotos de clientes.
scripts/                 Herramientas de desarrollo y pruebas (se versiona, no se publica).
_originales/             Fotos originales y material pendiente. SOLO en el disco: no se versiona ni se publica.
vercel.json  robots.txt  sitemap.xml
```

## Antes de publicar

1. **WhatsApp**: `whatsappNumber` en `js/config.js` (formato internacional, sin `+`). Los `href` de respaldo de los HTML llevan el mismo número.
2. **Dominio**: `siteUrl` en `js/config.js` y el mismo dominio en `canonical` / `og:url` de cada HTML, en `sitemap.xml` y en `robots.txt`.
3. **Subir `?v=`** (ver abajo) si cambió algún CSS o JS.
4. Correr las pruebas (ver abajo).

## Tareas frecuentes

**Agregar un producto** — en `js/products-data.js`, un objeto nuevo en `CATALOGO_DESTACADO`
(`id`, `categoria`, `nombre`, `variante`, `especificacion`, `precio`, `precioNum`, `colores: [{ nombre, hex, imagen }]`, `disponible`).
La card, el detalle y el menú del catálogo se generan solos. Foto: ponerla en `assets/img/` (WebP, fondo transparente) y
referenciarla en `colores[].imagen`. Sin fotos, dejar `colores: []` y la card muestra «Foto próximamente».

**Agregar un accesorio** — una fila `["Subcategoría", "Nombre", precio]` en `ACCESORIOS_BASE` de `js/accesorios-data.js`.
Los precios no se muestran hasta que `ACCESORIOS_CONFIG.mostrarPrecio` sea `true`.

**Actualizar reseñas** — `js/reviews-data.js`: `promedio` y `cantidad` de cada sucursal, y la lista `resenas`.
Los textos se copian **tal cual** (sin corregir ni resumir); no se muestran estrellas por reseña. Cambiar `RESENAS_ACTUALIZADO`
(es la leyenda «Datos de Google Maps, mes año»). Las fotos de clientes son los nombres de `CLIENTES_FOTOS` al inicio de `js/main.js`
(archivos en `assets/img/clientes/`).

**Actualizar horarios o teléfono** — `SUCURSALES` en `js/config.js`: `horarios` por día (`lun`…`dom`) con tramos `"HH:MM–HH:MM"`
(lista vacía = cerrado) y `telefono` (`null` = no se muestra). El «Abierto ahora» se calcula con la hora de Mendoza.
Los horarios vienen de Google Maps: actualizar a mano si cambian.

**Imágenes** — `assets/*` se sirve con `Cache-Control: immutable` por un año (`vercel.json`): si se reemplaza una imagen,
**cambiarle el nombre** (y la referencia). Para convertir fotos nuevas: `cd scripts && npm install && node optimize-images.js`.

## Cache de CSS y JS: `?v=`

Todos los `<link>` y `<script>` de los HTML llevan `?v=N` (también el loader de `hero-glass.js` en `index.html`).
**Subirlo en cada entrega que cambie `css/style.css` o algo de `js/`**, para que los visitantes recurrentes bajen los archivos nuevos:

```bash
node scripts/subir-version.js        # suma 1 en los 6 HTML
node scripts/subir-version.js --ver  # muestra el valor actual y avisa si hay valores distintos
```

## Pruebas y chequeos

```bash
node scripts/test-calculadora.js     # lógica de la calculadora de Plan Canje
node scripts/validar-tabla.js        # valida js/canje-tabla.js
bash scripts/check-placeholders.sh   # número de WhatsApp, dominio y «Foto próximamente» pendientes
```

Salen con código 1 si algo falla (`check-placeholders.sh` solo avisa por las fotos pendientes).

## scripts/ y _originales/

- `scripts/`: `test-calculadora.js`, `validar-tabla.js`, `check-placeholders.sh`, `subir-version.js`, `optimize-images.js` y
  `cutout-products.js` (usan `sharp`: `cd scripts && npm install`), `cargar-datos.md` (cómo actualizar la tabla de Plan Canje).
  Se versiona (salvo `scripts/node_modules/`) y está en `.vercelignore`.
- `_originales/`: fotos originales, el render del hero y las fotos del catálogo pendiente (`_originales/pendientes/`).
  Está en `.gitignore` y en `.vercelignore`: queda en la computadora de quien la usa, no en el repositorio.
