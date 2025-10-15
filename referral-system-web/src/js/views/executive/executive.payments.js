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

const aggregateByPartner = (invoices) => {
  const map = new Map();
  invoices.forEach((invoice) => {
    const partnerId = (invoice.partner_id ?? invoice.partnerId ?? invoice.partner ?? 'unknown').toString();
    const partnerName = invoice.partner_name ?? partnerId ?? '—';
    if (!map.has(partnerId)) {
      map.set(partnerId, {
        partnerId,
        partnerName,
        pendingAmount: 0,
        paidAmount: 0,
        totalAmount: 0,
        pendingCount: 0,
        paidCount: 0,
      });
    }
    const bucket = map.get(partnerId);
    const amount = Number(invoice.amount ?? 0);
    const status = typeof invoice.status === 'string' ? invoice.status.toLowerCase() : 'pending';
    if (status === 'paid') {
      bucket.paidAmount += amount;
      bucket.paidCount += 1;
    } else {
      bucket.pendingAmount += amount;
      bucket.pendingCount += 1;
    }
    bucket.totalAmount += amount;
  });
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
};

const renderPartnerTable = (aggregated) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Partner', 'Pendiente', 'Pagado', 'Total'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (!aggregated.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'No hay facturas registradas.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    aggregated.forEach((bucket) => {
      const row = document.createElement('tr');
      const values = [
        `${bucket.partnerName} (${bucket.partnerId ?? 'N/A'})`,
        `${currencyFormatter.format(bucket.pendingAmount)} · ${bucket.pendingCount} facturas`,
        `${currencyFormatter.format(bucket.paidAmount)} · ${bucket.paidCount} facturas`,
        currencyFormatter.format(bucket.totalAmount),
      ];
      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  }
  table.appendChild(tbody);
  return table;
};

const renderRecentInvoices = (invoices) => {
  const list = document.createElement('ul');
  list.className = 'summary-list';
  invoices.slice(0, 5).forEach((invoice) => {
    const item = document.createElement('li');
    const status = typeof invoice.status === 'string' ? invoice.status.toLowerCase() : 'pending';
    item.innerHTML = `
      <span>${invoice.id} · ${invoice.partner_name ?? invoice.partner_id ?? '—'} (${status})</span>
      <strong>${currencyFormatter.format(invoice.amount ?? 0)}</strong>
    `;
    list.appendChild(item);
  });
  return list;
};

export function renderExecutivePayments(container) {
  const db = getDB();
  const invoices = listInvoices({}, db);
  const aggregated = aggregateByPartner(invoices);

  const intro = createCard(
    'Pagos consolidados',
    'Distribución de montos por partner y resumen de las facturas más recientes.',
  );
  container.appendChild(intro);

  const tableCard = createCard('Totales por partner');
  tableCard.appendChild(renderPartnerTable(aggregated));
  container.appendChild(tableCard);

  const recentCard = createCard('Últimas facturas generadas');
  recentCard.appendChild(renderRecentInvoices(invoices.sort((a, b) => {
    const aDate = new Date(a.created_at ?? 0).getTime();
    const bDate = new Date(b.created_at ?? 0).getTime();
    return bDate - aDate;
  })));
  container.appendChild(recentCard);
}
