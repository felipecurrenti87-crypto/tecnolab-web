/**
 * Convierte a WebP las imágenes que usa el sitio, mueve los originales a
 * _originales/ y genera el favicon. Se corre una vez a mano:
 *
 *   cd scripts && npm install && node optimize-images.js
 *
 * scripts/ y _originales/ están en .vercelignore: no se publican.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMG = path.join(ROOT, "assets", "img");
const ORIG = path.join(ROOT, "_originales");
const PEND = path.join(ORIG, "pendientes");
const QUALITY = 82;

// archivo → ancho máximo (px). Fotos de producto: la card las muestra a ~320 px
// css, 800 px cubre pantallas retina. Logos: ~4x el tamaño con el que se ven.
const USED = {
  "airpods-5-select-202609_FV1.jpg": 800,
  "iphone-17-digitalmat-gallery-4-202509.jpg": 800,
  "iphone-air-digitalmat-gallery-3-202509.jpg": 800,
  "iphone-duo-digitalmat-gallery-4-202609.jpg": 800,
  "iphone16-digitalmat-gallery-5-202409.jpg": 800,
  "iphone18promax-negro-front-back.jpg": 800,
  "iphone18promax-plateado-back-side.jpg": 800,
  "logo-horizontal-blanco.png": 612,
  "logo-vertical-blanco.png": 400,
};
// El isotipo queda como PNG (favicon); se usa de fuente para .ico y apple-touch-icon.
const KEEP = new Set(["logo-tecnolab-isotipo.png"]);
// Variantes de logo sin uso: se borran (siguen en el historial de git).
const DELETE = /^logo-/;

function icoFromPngs(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = [];
  for (const { size, png } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt8(0, 2);
    d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += png.length;
    dirs.push(d);
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.png)]);
}

async function squareIcon(src, size, background, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(src).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

(async () => {
  fs.mkdirSync(PEND, { recursive: true });

  // favicon desde el isotipo (antes de tocar nada)
  const iso = path.join(IMG, "logo-tecnolab-isotipo.png");
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const entries = [];
  for (const size of [16, 32, 48]) entries.push({ size, png: await squareIcon(iso, size, clear, 0.04) });
  fs.writeFileSync(path.join(ROOT, "favicon.ico"), icoFromPngs(entries));
  fs.writeFileSync(path.join(ROOT, "apple-touch-icon.png"), await squareIcon(iso, 180, { r: 255, g: 255, b: 255, alpha: 1 }, 0.16));

  let before = 0;
  let after = 0;
  for (const file of fs.readdirSync(IMG)) {
    const src = path.join(IMG, file);
    if (KEEP.has(file)) continue;

    if (USED[file]) {
      const out = path.join(IMG, file.replace(/\.(jpg|png)$/i, ".webp"));
      await sharp(src)
        .resize({ width: USED[file], withoutEnlargement: true })
        .webp({ quality: QUALITY, alphaQuality: 100 })
        .toFile(out);
      before += fs.statSync(src).size;
      after += fs.statSync(out).size;
      fs.renameSync(src, path.join(ORIG, file));
      console.log("webp   ", file, "→", path.basename(out), fs.statSync(path.join(IMG, path.basename(out))).size);
    } else if (/\.webp$/i.test(file)) {
      continue;
    } else if (DELETE.test(file)) {
      fs.unlinkSync(src);
      console.log("borrado", file);
    } else {
      fs.renameSync(src, path.join(PEND, file));
      console.log("pendiente", file);
    }
  }
  console.log(`\nimágenes usadas: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
})();
