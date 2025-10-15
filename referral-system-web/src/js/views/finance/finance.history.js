import { getDB } from '../../db.js';
import { listInvoices } from '../../biz/invoices.js';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const createCard = (title, description) => {
  const card = document.createElement('article');
  card.className = 'card';
  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = title;
    card.appendChild(heading);
  }
  if (description) {
    const paragraph = document.createElement('p');
    paragraph.textContent = description;
    card.appendChild(paragraph);
  }
  return card;
};

const enrichHistory = (history, invoices) => {
  const map = new Map();
  invoices.forEach((invoice) => {
    map.set(invoice.id, invoice);
  });
  return history
    .filter((entry) => (entry.status ?? '').toLowerCase() === 'paid')
    .sort((a, b) => new Date(b.changed_at ?? 0) - new Date(a.changed_at ?? 0))
    .map((entry) => ({
      ...entry,
      invoice: map.get(entry.invoice_id) ?? null,
    }));
};

const renderTable = (entries) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const row = document.createElement('tr');
  ['Factura', 'Partner', 'Monto', 'Fecha', 'Notas'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    row.appendChild(th);
  });
  thead.appendChild(row);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (!entries.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Sin pagos confirmados.';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
  } else {
    entries.forEach((entry) => {
      const invoice = entry.invoice ?? {};
      const tr = document.createElement('tr');
      const cells = [
        entry.invoice_id,
        invoice.partner_name ?? invoice.partner_id ?? entry.partner_id ?? '—',
        currencyFormatter.format(entry.amount ?? invoice.amount ?? 0),
        new Date(entry.changed_at ?? Date.now()).toLocaleString(),
        invoice.notes ?? 'Pago registrado',
      ];
      cells.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  return table;
};

export function renderFinanceHistory(container) {
  const db = getDB();
  const invoices = listInvoices({}, db);
  const history = Array.isArray(db.invoice_history) ? db.invoice_history : [];
  const entries = enrichHistory(history, invoices);

  const intro = createCard('Historial de pagos', 'Solo se muestran facturas con estado pagado.');
  container.appendChild(intro);

  const tableCard = createCard('Pagos confirmados');
  tableCard.appendChild(renderTable(entries));
  container.appendChild(tableCard);
}
