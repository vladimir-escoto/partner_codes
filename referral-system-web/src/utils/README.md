# Utilidades compartidas

Colección de helpers ligeros utilizados en la aplicación. Todos los módulos exportan funciones nombradas para poder importarlas individualmente o desde `src/utils/index.js`.

## `dom.js`

- `$(selector, root?)`: devuelve el primer elemento que coincide con el selector.
- `$$(selector, root?)`: devuelve todos los elementos que coinciden en forma de array.
- `el(tag, attrs?, children?)`: crea un elemento HTML aplicando atributos simples, objetos `style/dataset` y manejadores `on*`.
- `mount(parent, child)`: inserta el nodo `child` dentro de `parent` (elemento o selector).

Cada helper ejecuta aserciones básicas en tiempo de desarrollo para verificar su funcionamiento.

## `format.js`

- `fmtMoney(n, currency)`: utiliza `Intl.NumberFormat` para formatear cantidades monetarias.

## `dates.js`

- `todayISO()`: fecha actual en formato `YYYY-MM-DD`.
- `ymd(date)`: normaliza una entrada (`Date`, `string` o `number`) a `YYYY-MM-DD`.
- `monthKey(date)`: genera la clave `YYYY-MM` del mes de la fecha proporcionada.

## `storage.js`

- `read(key)`: obtiene y deserializa un valor de `localStorage` (devuelve `null` si no existe).
- `write(key, value)`: serializa y guarda un valor en `localStorage`, devolviendo `true` o `false` según el resultado.

Estas utilidades están pensadas para pruebas rápidas en consola y uso general en componentes.
