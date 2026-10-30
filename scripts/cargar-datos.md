# Cargar los datos de la calculadora de Plan Canje

La calculadora (`plan-canje.html#calculadora`) lee **todo** de dos lugares: `js/calculadora-data.js` (valores de toma) y `js/products-data.js` (precios del catálogo para el "salto de gama"). No hace falta tocar código.

> Mientras `datosReales` sea `false`, la calculadora **no se muestra al público**. Para probarla con datos de ejemplo, abrí `plan-canje.html?preview=1` (aparece una franja "VISTA PREVIA — datos de ejemplo").

## 1. Modelos y capacidades

En `js/calculadora-data.js`, dentro de `modelos`:

```js
{ id: "iphone-13", nombre: "iPhone 13", capacidades: [ { gb: 128, valor: 250 }, { gb: 256, valor: 280 } ] },
```

- `id`: único, sin espacios (minúsculas y guiones).
- `nombre`: lo que ve el cliente y lo que va en el mensaje de WhatsApp.
- `capacidades`: una por cada versión. `valor` es lo que se toma con la **batería en el tramo sin descuento**, en la moneda de `moneda`.
- Un `valor` en `0` significa "sin dato": ese equipo no se calcula, se consulta por WhatsApp.

## 2. Moneda, redondeo y batería mínima

- `moneda`: `"USD"` o `"ARS"` (confirmar con el dueño). Los precios de `precioNum` tienen que estar en la **misma** moneda.
- `redondeo`: el resultado se redondea **hacia abajo** a este múltiplo (`1` en USD, `1000` en ARS).
- `bateriaMinima`: por debajo de este porcentaje no se calcula; se consulta por WhatsApp.

## 3. Tramos de batería

En `bateria`, un objeto por tramo (extremos incluidos, sin solaparse, enteros de 1 a 100):

```js
{ desde: 80, hasta: 89, tipo: "porcentaje", valor: 8 },   // 8% menos sobre el valor base
{ desde: 70, hasta: 79, tipo: "monto",      valor: 40 },  // 40 menos (en la moneda), fijo
```

Si el cliente ingresa una batería que no cae en ningún tramo (por ejemplo un hueco entre tramos), no se inventa un valor: se consulta por WhatsApp.

## 4. Aviso legal

`avisoLegal` se muestra siempre debajo del resultado. Cambiarlo solo si lo indica el dueño.

## 5. Precios del catálogo (salto de gama)

En `js/products-data.js` cada producto tiene `precioNum: null`. Para que entre en el salto de gama, poné el precio como **número** (sin símbolos ni puntos) y en la misma moneda:

```js
precio: "Desde $1.850.000",   // texto que se muestra en la card: NO cambia
precioNum: 1850000,           // número que usa la calculadora
```

Los productos con `precioNum: null` se ignoran. Si ninguno tiene precio, la calculadora muestra solo el valor y el botón de WhatsApp.

## 6. Activarla

1. Cargar modelos, tramos y precios reales (y borrar los comentarios `// EJEMPLO`).
2. Correr las pruebas: `node scripts/test-calculadora.js` (tiene que decir "0 con falla").
3. Revisarla en `plan-canje.html?preview=1`.
4. Poner `datosReales: true` en `js/calculadora-data.js`, y quitar la línea "DATOS DE EJEMPLO — NO PUBLICAR…" del encabezado.
5. Subir el `?v=` de los JS en los seis HTML (ver README principal) y publicar.

Con `datosReales: true` la calculadora queda visible para todos y el link "Calculá tu valor →" aparece en el Home.
