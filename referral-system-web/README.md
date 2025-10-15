# Referral System Web – Componentes UI

Este proyecto incluye una colección de componentes UI vanilla pensados para prototipos rápidos. A continuación se muestran ejemplos mínimos de uso desde la consola del navegador o scripts de inicialización.

## Sidebar por rol
```js
import { createSidebar } from './src/components/sidebar.js';

const sidebar = createSidebar('admin', { title: 'Panel Administrativo' });
document.body.appendChild(sidebar);
```

## Tarjetas KPI
```js
import { renderKpiCards } from './src/components/kpiCards.js';

const container = document.createElement('section');
document.body.appendChild(container);

renderKpiCards(container, [
  { label: 'Ingresos', value: 125000, prefix: '$' },
  { label: 'Nuevos referidos', value: 87 },
  { label: 'Conversión', value: 0.32, suffix: '%' }
]);
```

## Tablas dinámicas
```js
import { createTable } from './src/components/tables.js';

const table = createTable({
  caption: 'Pagos recientes',
  headers: [
    { key: 'id', label: 'ID' },
    { key: 'partner', label: 'Partner' },
    { key: 'amount', label: 'Monto', formatter: (value) => `$${value}` }
  ],
  rows: [
    { id: 'PX-001', partner: 'Canal Norte', amount: 450 },
    { id: 'PX-002', partner: 'Oficina Centro', amount: 980 }
  ]
});

document.body.appendChild(table);
```

## Controles de formulario reutilizables
```js
import { createInputField, createSelectField, validateForm } from './src/components/forms.js';

const form = document.createElement('form');
const nameField = createInputField({ label: 'Nombre', name: 'name', required: true, minLength: 3 });
const roleField = createSelectField({
  label: 'Rol',
  name: 'role',
  required: true,
  placeholder: 'Seleccione un rol',
  options: ['Admin', 'Ejecutivo', 'Finanzas', 'Partner']
});

form.appendChild(nameField.field);
form.appendChild(roleField.field);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (validateForm([nameField, roleField])) {
    console.log('Formulario válido');
  }
});

document.body.appendChild(form);
```

## Modales
```js
import { createModal, openModal } from './src/components/modals.js';

const modal = createModal({
  id: 'demo-modal',
  title: 'Confirmación',
  content: '¿Desea continuar?',
  actions: [
    { label: 'Cancelar', variant: 'secondary', onClick: () => console.log('cancelado') },
    { label: 'Aceptar', onClick: () => console.log('aceptado') }
  ]
});

document.body.appendChild(modal.overlay);
openModal(modal.id);
```

## Toasts
```js
import { showToast } from './src/components/toast.js';

showToast('Cambios guardados correctamente', { type: 'success', duration: 2500 });
```

## Gráficas Canvas
```js
import { drawBar, drawLine, drawHeatMap } from './src/components/charts.js';

const barCanvas = document.createElement('canvas');
const lineCanvas = document.createElement('canvas');
const heatCanvas = document.createElement('canvas');

document.body.append(barCanvas, lineCanvas, heatCanvas);

drawBar(barCanvas);
drawLine(lineCanvas);
drawHeatMap(heatCanvas);
```

Cada ejemplo puede ejecutarse desde la consola del navegador en la vista principal para validar el DoD de los componentes.
