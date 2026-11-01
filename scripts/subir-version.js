#!/usr/bin/env node
/*
 * Sube el ?v= de los CSS/JS en todos los HTML a un único valor.
 *
 *   node scripts/subir-version.js        → suma 1 al valor actual
 *   node scripts/subir-version.js 40     → fija el valor 40
 *   node scripts/subir-version.js --ver  → solo muestra el valor y avisa si hay valores distintos
 *
 * Cuándo: en cada entrega que cambie css/style.css o cualquier archivo de js/. Los HTML se publican con ?v=N en
 * <link> y <script> (y en el loader de hero-glass.js de index.html): al cambiar N los visitantes recurrentes bajan
 * el archivo nuevo en vez de usar el que tienen en caché. Las imágenes de assets/ NO usan ?v=: si cambia una,
 * se le cambia el nombre (ver README).
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const htmls = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));
const patron = /((?:css|js)\/[\w.-]+\.(?:css|js))\?v=(\d+)/g;

const valores = new Set();
const textos = {};
for (const f of htmls) {
  textos[f] = fs.readFileSync(path.join(raiz, f), 'utf8');
  for (const m of textos[f].matchAll(patron)) valores.add(m[2]);
}
if (!valores.size) { console.error('No encontré ningún ?v= en los HTML.'); process.exit(1); }

const actual = Math.max(...[...valores].map(Number));
if (valores.size > 1) console.warn(`Aviso: había valores distintos (${[...valores].join(', ')}); se unifican.`);
if (process.argv.includes('--ver')) { console.log(`?v=${actual}${valores.size > 1 ? ' (inconsistente)' : ''}`); process.exit(0); }

const pedido = process.argv[2];
const nuevo = pedido && /^\d+$/.test(pedido) ? Number(pedido) : actual + 1;
let cambios = 0;
for (const f of htmls) {
  const salida = textos[f].replace(patron, (_, ruta) => { cambios++; return `${ruta}?v=${nuevo}`; });
  if (salida !== textos[f]) fs.writeFileSync(path.join(raiz, f), salida);
}
console.log(`?v=${actual} → ?v=${nuevo} (${cambios} referencias en ${htmls.length} HTML)`);
