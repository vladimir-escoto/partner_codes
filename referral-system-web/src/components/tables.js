const BASE_CLASS = 'ui-table';

function normalizeHeaders(headers = []) {
  return headers.map((header, index) => {
    if (typeof header === 'string') {
      return { key: header, label: header };
    }
    if (header && typeof header === 'object') {
      return {
        key: header.key ?? index,
        label: header.label ?? header.key ?? `Columna ${index + 1}`,
        formatter: header.formatter
      };
    }
    return { key: index, label: `Columna ${index + 1}` };
  });
}

function buildHeaderRow(headersConfig) {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');
  row.className = `${BASE_CLASS}__row ${BASE_CLASS}__row--header`;

  headersConfig.forEach(({ label }) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    th.className = `${BASE_CLASS}__header-cell`;
    row.appendChild(th);
  });

  thead.appendChild(row);
  return thead;
}

function resolveCellValue(row, index, key) {
  if (Array.isArray(row)) {
    return row[index];
  }
  if (row && typeof row === 'object') {
    return row[key];
  }
  return row;
}

function buildBodyRows(rows, headersConfig) {
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = `${BASE_CLASS}__row`;

    headersConfig.forEach((header, columnIndex) => {
      const td = document.createElement('td');
      td.className = `${BASE_CLASS}__cell`;

      const rawValue = resolveCellValue(row, columnIndex, header.key);
      const value = header.formatter ? header.formatter(rawValue, row) : rawValue;

      td.textContent = value !== undefined && value !== null && value !== '' ? value : '—';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  return tbody;
}

/**
 * Crea una tabla HTML dinámica.
 * @param {{ headers: Array<string|object>, rows: Array<Array|object>, caption?: string, emptyState?: string }} options
 * @returns {HTMLTableElement}
 */
export function createTable({ headers = [], rows = [], caption, emptyState = 'Sin información disponible' } = {}) {
  const headersConfig = normalizeHeaders(headers);
  const table = document.createElement('table');
  table.className = BASE_CLASS;

  if (caption) {
    const captionNode = document.createElement('caption');
    captionNode.className = `${BASE_CLASS}__caption`;
    captionNode.textContent = caption;
    table.appendChild(captionNode);
  }

  table.appendChild(buildHeaderRow(headersConfig));

  if (!rows.length) {
    const emptyBody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = headersConfig.length || 1;
    cell.textContent = emptyState;
    cell.className = `${BASE_CLASS}__cell ${BASE_CLASS}__cell--empty`;
    row.appendChild(cell);
    emptyBody.appendChild(row);
    table.appendChild(emptyBody);
    return table;
  }

  table.appendChild(buildBodyRows(rows, headersConfig));
  return table;
}

export function updateTableRows(table, rows, headers) {
  if (!(table instanceof HTMLTableElement)) {
    throw new Error('updateTableRows requiere una referencia a un elemento <table>.');
  }
  const headersConfig = headers ? normalizeHeaders(headers) : normalizeHeaders(Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent));

  const existingBody = table.querySelector('tbody');
  if (existingBody) {
    existingBody.remove();
  }

  table.appendChild(buildBodyRows(rows, headersConfig));
}

