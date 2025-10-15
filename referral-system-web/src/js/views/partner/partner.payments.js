import { getDB } from '../../db.js';
import { listInvoices } from '../../biz/invoices.js';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

let selectedInvoiceId = null;

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

const summarize = (invoices) => {
  return invoices.reduce(
    (acc, invoice) => {
      const amount = Number(invoice.amount ?? 0);
      acc.count += 1;
      acc.amount += amount;
      if ((invoice.status ?? '').toLowerCase() === 'paid') {
        acc.paid += amount;
      } else {
        acc.pending += amount;
      }
      return acc;
    },
    { count: 0, amount: 0, paid: 0, pending: 0 },
  );
};

const renderSummary = (summary) => {
  const list = document.createElement('ul');
  list.className = 'summary-list';
  list.innerHTML = `
    <li><span>Facturas</span><strong>${summary.count}</strong></li>
    <li><span>Monto total</span><strong>${currencyFormatter.format(summary.amount)}</strong></li>
    <li><span>Pendiente</span><strong>${currencyFormatter.format(summary.pending)}</strong></li>
    <li><span>Pagado</span><strong>${currencyFormatter.format(summary.paid)}</strong></li>
  `;
  return list;
};

const renderTable = (invoices, onSelect) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Factura', 'Período', 'Monto', 'Estado', 'Usuarios'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (!invoices.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Sin facturas generadas.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    invoices.forEach((invoice) => {
      const row = document.createElement('tr');
      if (invoice.id === selectedInvoiceId) {
        row.classList.add('is-selected');
      }
      const cells = [
        invoice.id,
        invoice.period ?? '—',
        currencyFormatter.format(invoice.amount ?? 0),
        invoice.status ?? '—',
        invoice.users_count ?? 0,
      ];
      cells.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });
      row.addEventListener('click', () => onSelect(invoice));
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
};

const renderDetail = (invoice) => {
  const card = createCard('Detalle de factura');
  if (!invoice) {
    card.appendChild(document.createTextNode('Selecciona una factura para ver el detalle.'));
    return card;
  }
  const list = document.createElement('ul');
  list.className = 'summary-list';
  list.innerHTML = `
    <li><span>Período</span><strong>${invoice.period ?? '—'}</strong></li>
    <li><span>Monto</span><strong>${currencyFormatter.format(invoice.amount ?? 0)}</strong></li>
    <li><span>Estado</span><strong>${invoice.status ?? '—'}</strong></li>
    <li><span>Usuarios</span><strong>${invoice.users_count ?? 0}</strong></li>
    <li><span>Cut-off</span><strong>${invoice.cutoff_date ?? '—'}</strong></li>
    <li><span>Vencimiento</span><strong>${invoice.due_date ?? '—'}</strong></li>
  `;
  card.appendChild(list);
  return card;
};

export function renderPartnerPayments(container, { refresh }) {
  const db = getDB();
  const partner = Array.isArray(db.partners) && db.partners.length ? db.partners[0] : null;
  if (!partner) {
    const card = createCard('Mis pagos');
    card.appendChild(document.createTextNode('No se encontró un partner configurado.'));
    container.appendChild(card);
    return;
  }

  const invoices = listInvoices({ partnerId: partner.id }, db);
  if (!selectedInvoiceId || !invoices.find((invoice) => invoice.id === selectedInvoiceId)) {
    selectedInvoiceId = invoices[0]?.id ?? null;
  }

  container.appendChild(
    createCard(
      'Mis pagos',
      'Consulta facturas relacionadas a tu partner. Toda la información es solo lectura.',
    ),
  );

  const summaryCard = createCard('Resumen');
  summaryCard.appendChild(renderSummary(summarize(invoices)));
  container.appendChild(summaryCard);

  const tableCard = createCard('Facturas del partner');
  tableCard.appendChild(
    renderTable(invoices, (invoice) => {
      selectedInvoiceId = invoice.id;
      refresh?.();
    }),
  );
  container.appendChild(tableCard);

  const detail = renderDetail(invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null);
  container.appendChild(detail);
}
