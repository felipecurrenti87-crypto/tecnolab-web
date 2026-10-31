# Datos de la calculadora de Plan Canje

La calculadora (`plan-canje.html#calculadora`) toma **iPhone 13 en adelante**. Lee de tres archivos y **no hace falta tocar código** para cambiar números:

| Archivo | Qué tiene |
| --- | --- |
| `js/canje-tabla.js` | La planilla de toma de Gonzalo: un valor **absoluto** (en USD) por modelo, memoria y nivel de batería |
| `js/calculadora-data.js` | Configuración: `datosReales`, `redondeo`, `avisoLegal` (la moneda viene de la tabla) |
| `js/products-data.js` | `precioNum` de cada producto del catálogo (solo para el "salto de gama") |

> Mientras `datosReales` sea `false`, la calculadora **no se muestra al público**. Para verla: `plan-canje.html?preview=1` (aparece una franja de vista previa).

## 1. Regla de batería (fija)

La batería que ingresa el cliente (entero de 1 a 100) define qué columna de la tabla se usa:

| Batería | Nivel que se aplica | Texto que ve el cliente |
| --- | --- | --- |
| 98% o más (hasta 100) | 98 | "Calculado para batería de 98% o más" |
| 90% a 97% | 90 | "Calculado para batería de 90% a 97%" |
| **Menos de 90%** | **75, siempre** | "Calculado para batería de menos de 90%" |

No hay batería mínima: con 60% o con 20% se toma igual el valor del nivel 75. La regla vive en `js/calculadora-logic.js` y no se configura desde los datos.

El resultado se redondea **hacia abajo** al múltiplo de `redondeo` (1 en USD). No se calcula, y se consulta por WhatsApp con un mensaje armado, en estos casos:

- el cliente tilda **"Mi iPhone tiene detalles"** (pantalla rota, golpes, no enciende);
- el cliente elige **"Mi modelo no está en la lista"** (también es el camino para un iPhone anterior al 13);
- falta el valor del nivel que corresponde en la tabla (`null` o `0`).

## 2. Editar la tabla (`js/canje-tabla.js`)

```js
const CANJE_TABLA = {
  moneda: "USD",                    // "USD" o "ARS"
  bateriaNiveles: [98, 90, 75],     // niveles de referencia, de mayor a menor
  modelos: [
    {
      id: "iphone-13",              // único, minúsculas y guiones
      nombre: "iPhone 13",          // lo que ve el cliente; el número define el grupo del selector
      capacidades: [
        { gb: 128, valores: { 98: 270, 90: 240, 75: 220 } },
        { gb: 256, valores: { 98: 300, 90: 270, 75: 220 } }
      ]
    }
  ]
};
```

- **Cambiar un valor:** editar el número. Es el valor del equipo **sin detalles**, en la moneda de la tabla.
- **Agregar un modelo:** copiar un bloque `{ id, nombre, capacidades }` y completarlo. El nombre tiene que empezar con `iPhone` y el número de generación (`iPhone 18 Pro`): así el selector lo agrupa en "iPhone 18", del más nuevo al más viejo.
- **Agregar una memoria a un modelo:** sumar `{ gb: 512, valores: { 98: …, 90: …, 75: … } }` en `capacidades`.
- **Un modelo sin una memoria** (casilla negra en la planilla): no se carga esa memoria. El selector de capacidad solo muestra las que existen.
- Los tres valores (98, 90, 75) son obligatorios en cada memoria y tienen que ser números mayores que 0.
- **No cargar modelos anteriores al iPhone 13:** ya no se toman. El validador falla si aparece alguno.

## 3. Verificar la tabla

```bash
node scripts/validar-tabla.js      # estructura y coherencia de la planilla
node scripts/test-calculadora.js   # lógica + valores de control de la tabla real
```

`validar-tabla.js` falla (exit 1) si hay valores no numéricos o ≤ 0, un valor que **sube** al bajar la batería, una memoria mayor que vale **menos** que una menor, ids repetidos, o un modelo anterior al iPhone 13. Los empates (256GB = 128GB) los informa como aviso. Si cambia un valor que se usa como control, actualizarlo en `test-calculadora.js` ("valores de control").

## 4. Precios del catálogo (salto de gama)

En `js/products-data.js` cada producto tiene `precioNum: null`. Para que entre en el salto de gama, ponerlo como **número** (sin símbolos ni puntos) y en **USD**, la misma moneda que la tabla:

```js
precio: "Desde $1.850.000",   // texto que se muestra en la card: NO cambia
precioNum: 1850000,           // número que usa la calculadora
```

Los productos con `precioNum: null` se ignoran. Si ninguno tiene precio, la calculadora muestra solo el valor y el botón de WhatsApp.

## 5. Activarla

1. Verificar `js/canje-tabla.js` contra la planilla original (Gonzalo todavía no confirmó la tabla completa).
2. `node scripts/validar-tabla.js` y `node scripts/test-calculadora.js` deben terminar sin errores.
3. Revisarla en `plan-canje.html?preview=1`.
4. Poner `datosReales: true` en `js/calculadora-data.js`.
5. Subir el `?v=` de CSS y JS en los seis HTML y publicar.

Con `datosReales: true` la calculadora queda visible para todos y el link "Calculá tu valor →" aparece en el Home.

---

# Accesorios (catálogo)

Los accesorios viven en `js/accesorios-data.js` y **solo se cargan en `catalogo.html`** (el carrusel del Home usa únicamente `CATALOGO_DESTACADO`). Aparecen en la grilla del catálogo, en la pestaña **Accesorios**, con una segunda fila de chips por subcategoría.

## Cómo agregar un producto

Sumar una fila en `ACCESORIOS_BASE`: `["Subcategoría", "Nombre", precioEnPesos]`.

```js
["Cables", "Soul C - C", 17700],
["Audio", "AirPods Pro", null],      // null = sin precio cargado
```

- La **subcategoría** crea el chip sola: usar el mismo texto que las demás filas del grupo (si es nueva, aparece un chip nuevo).
- El **precio** es un número en pesos argentinos, sin puntos ni símbolos; `null` si todavía no hay.
- El `id` se arma solo con el nombre (sin tildes ni espacios) y es único.
- El buscador mira nombre, subcategoría y variante, sin distinguir mayúsculas ni tildes.

## Cómo cargar una foto

1. Pasar la foto a WebP con fondo transparente (ver `scripts/cutout-products.js` y `scripts/optimize-images.js`) y ponerla en `assets/img/` con un **nombre nuevo** (los assets se cachean un año).
2. Sumar la ruta como **cuarto valor** de la fila en `ACCESORIOS_BASE`:

   ```js
   ["Cables", "Soul C - C", 17700, "assets/img/soul-c-c-t.webp"],
   ```

   Sin ese valor la card muestra el ícono de caja con "Foto próximamente". Con foto, la card usa la misma imagen centrada (sin puntos de color) y la foto se carga en diferido.

## Cómo activar los precios

Hoy el sitio muestra **"Consultar"** en todos los accesorios, aunque el precio esté guardado. Cuando Gonzalo confirme que son **precios de venta vigentes**, cambiar en `js/accesorios-data.js`:

```js
const ACCESORIOS_CONFIG = { mostrarPrecio: true };
```

Con el interruptor en `true`, los accesorios con precio numérico se muestran como `$ 12.700` (los que tienen `null` siguen en "Consultar"). Después, subir el `?v=` de CSS y JS en los seis HTML y publicar.
