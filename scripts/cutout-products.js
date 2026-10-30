/**
 * Recorta el fondo claro de las fotos de producto (originales en _originales/)
 * y las guarda como WebP con transparencia en assets/img/<nombre>-t.webp.
 * Flood-fill desde los bordes: solo se borra el fondo conectado al marco, así
 * los blancos del propio producto (AirPods, iPhone plateado) no se tocan.
 *
 *   cd scripts && node cutout-products.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "_originales");
const OUT = path.join(ROOT, "assets", "img");
const WIDTH = 800;
const BG_MIN = 244;    // canal mínimo para considerar "fondo" (0–255)
const FEATHER = 2;     // px de suavizado en el borde del recorte

// [archivo sin extensión, carpeta dentro de _originales, extensión]
const FILES = [
  ["airpods-5-select-202609_FV1", "", "jpg"],
  ["iphone-17-digitalmat-gallery-4-202509", "", "jpg"],
  ["iphone-air-digitalmat-gallery-3-202509", "", "jpg"],
  ["iphone-duo-digitalmat-gallery-4-202609", "", "jpg"],
  ["iphone16-digitalmat-gallery-5-202409", "", "jpg"],
  ["iphone18promax-negro-front-back", "", "jpg"],
  ["iphone18promax-plateado-back-side", "", "jpg"],
  ["mbp-14-digitalmat-gallery-1-202410", "pendientes", "png"],
];

async function cut([name, dir, ext]) {
  const { data, info } = await sharp(path.join(SRC, dir, name + "." + ext))
    .resize({ width: WIDTH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isBg = (i) => data[i] >= BG_MIN && data[i + 1] >= BG_MIN && data[i + 2] >= BG_MIN;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (bg[p] || !isBg(p * 4)) return;
    bg[p] = 1; stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  const alpha = Buffer.alloc(w * h, 255);
  for (let p = 0; p < w * h; p++) if (bg[p]) alpha[p] = 0;
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(FEATHER / 2 + 0.3).extractChannel(0).raw().toBuffer();
  for (let p = 0; p < w * h; p++) data[p * 4 + 3] = soft[p];
  const out = path.join(OUT, name + "-t.webp");
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 86, alphaQuality: 90 }).toFile(out);
  console.log("OK", path.basename(out), fs.statSync(out).size + " B");
}

(async () => { for (const n of FILES) await cut(n); })();
