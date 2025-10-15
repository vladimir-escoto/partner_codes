const BASE_CLASS = 'ui-kpi-card';

function formatValue(value, { prefix = '', suffix = '' } = {}) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    const formatted = value.toLocaleString('es-ES', {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2
    });
    return `${prefix}${formatted}${suffix}`;
  }
  return `${prefix}${value}${suffix}`;
}

function buildKpiNode(label, value, formatOptions) {
  const card = document.createElement('article');
  card.className = BASE_CLASS;

  const labelNode = document.createElement('p');
  labelNode.className = `${BASE_CLASS}__label`;
  labelNode.textContent = label;

  const valueNode = document.createElement('p');
  valueNode.className = `${BASE_CLASS}__value`;
  valueNode.textContent = formatValue(value, formatOptions);

  card.appendChild(labelNode);
  card.appendChild(valueNode);

  return card;
}

/**
 * Crea una tarjeta KPI con los valores indicados.
 * @param {{label: string, value: string|number, prefix?: string, suffix?: string, modifier?: string}} options
 * @returns {HTMLElement}
 */
export function createKpiCard({ label, value, prefix, suffix, modifier }) {
  const card = buildKpiNode(label, value, { prefix, suffix });

  if (modifier) {
    card.classList.add(`${BASE_CLASS}--${modifier}`);
  }

  return card;
}

/**
 * Renderiza un listado de KPIs dentro de un contenedor.
 * @param {HTMLElement} container
 * @param {Array} kpis - Lista de objetos { label, value, prefix?, suffix?, modifier? }
 */
export function renderKpiCards(container, kpis = []) {
  if (!(container instanceof HTMLElement)) {
    throw new Error('Se requiere un contenedor HTMLElement para renderizar las tarjetas KPI.');
  }

  container.classList.add(`${BASE_CLASS}__grid`);
  container.innerHTML = '';

  kpis.forEach((kpi) => {
    const card = createKpiCard(kpi);
    container.appendChild(card);
  });
}

export { buildKpiNode };

