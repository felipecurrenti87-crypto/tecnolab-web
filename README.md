# Tecnolab — sitio web

Sitio estático (HTML/CSS/JS vanilla) desplegado en Vercel. Sin build.

## Antes de publicar

1. **Número de WhatsApp**: cambiar `whatsappNumber` en `js/config.js` (formato internacional, sin `+`, ej. `5492610000000`).
   También reemplazar `549XXXXXXXXX` en los `href` de respaldo de los HTML (se usan solo si el JS no carga).
2. **Dominio**: cambiar `siteUrl` en `js/config.js` y el mismo dominio en los `canonical` / `og:url` de cada HTML, en `sitemap.xml` y en `robots.txt`.
3. Correr el chequeo:

   ```bash
   bash scripts/check-placeholders.sh
   ```

   Sale con código 1 si queda el número placeholder o si el dominio no coincide en todos lados.
   Avisa (sin fallar) dónde siguen apareciendo "Foto próximamente".

## Estructura

- `js/config.js` — número de WhatsApp y URL del sitio.
- `js/products-data.js` — catálogo destacado.
- `assets/` — solo imágenes en uso (WebP).
- `_originales/` — fotos originales y fotos del catálogo pendiente (`_originales/pendientes/`). No se publica (`.vercelignore`).
- `scripts/` — herramientas de desarrollo (`optimize-images.js` usa `sharp`). No se publica.

## Imágenes

`assets/*` se sirve con `Cache-Control: immutable` por un año (ver `vercel.json`): si se reemplaza una imagen,
**cambiarle el nombre** (o el nombre del archivo en el catálogo) para que los visitantes recurrentes la vean.

Para convertir fotos nuevas: `cd scripts && npm install && node optimize-images.js` (editar el listado `USED` del script).

## Cache de CSS/JS

Al cambiar `css/style.css` o los JS, subir el `?v=` en los cinco HTML y en `404.html`.
