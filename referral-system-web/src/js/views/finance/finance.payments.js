import { getDB, setDB } from '../../db.js';
import { listInvoices, setInvoiceStatus } from '../../biz/invoices.js';
import { showToast } from '../../../components/toast.js';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

let statusFilter = 'all';
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

const applyStatusChange = (invoiceId, status, refresh) => {
  let updated = null;
  setDB((db) => {
    const next = { ...db };
    const result = setInvoiceStatus(invoiceId, status, next);
    if (result) {
      updated = result;
      if (status === 'paid') {
        const history = Array.isArray(next.invoice_history) ? [...next.invoice_history] : [];
        history.push({
          id: `${invoiceId}-${Date.now()}`,
          invoice_id: invoiceId,
          status,
          amount: result.amount,
          changed_at: new Date().toISOString(),
          partner_id: result.partner_id,
        });
        next.invoice_history = history;
      }
    }
    return next;
  });

  if (updated) {
    showToast(`Factura ${invoiceId} actualizada a ${status}`, { type: 'success' });
    refresh();
  } else {
    showToast('No fue posible actualizar la factura.', { type: 'danger' });
  }
};

const renderTable = (invoices, refresh) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Factura', 'Partner', 'Período', 'Monto', 'Usuarios', 'Estado', 'Acciones'].forEach((label) => {
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
    cell.colSpan = 7;
    cell.textContent = 'Sin facturas para este filtro.';
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
        invoice.partner_name ?? invoice.partner_id ?? '—',
        invoice.period ?? '—',
        currencyFormatter.format(invoice.amount ?? 0),
        invoice.users_count ?? 0,
        invoice.status ?? '—',
      ];
      cells.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });

      const actions = document.createElement('td');
      actions.className = 'table-actions';

      const reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.textContent = 'En revisión';
      reviewButton.className = 'button button--secondary';
      reviewButton.addEventListener('click', (event) => {
        event.stopPropagation();
        applyStatusChange(invoice.id, 'review', refresh);
      });
      actions.appendChild(reviewButton);

      const paidButton = document.createElement('button');
      paidButton.type = 'button';
      paidButton.textContent = 'Pago aplicado';
      paidButton.className = 'button';
      paidButton.addEventListener('click', (event) => {
        event.stopPropagation();
        applyStatusChange(invoice.id, 'paid', refresh);
      });
      actions.appendChild(paidButton);

      row.appendChild(actions);
      row.addEventListener('click', () => {
        selectedInvoiceId = invoice.id;
        refresh();
      });
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
};

const renderDetail = (invoice) => {
  const card = createCard('Detalle operacional');
  if (!invoice) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Selecciona una factura para ver su información.';
    card.appendChild(paragraph);
    return card;
  }

  const list = document.createElement('ul');
  list.className = 'summary-list';
  list.appendChild(
    (() => {
      const item = document.createElement('li');
      item.innerHTML = `<span>Partner</span><strong>${invoice.partner_name ?? invoice.partner_id ?? '—'}</strong>`;
      return item;
    })(),
  );
  list.appendChild(
    (() => {
      const item = document.createElement('li');
      item.innerHTML = `<span>Período</span><strong>${invoice.period ?? '—'}</strong>`;
      return item;
    })(),
  );
  list.appendChild(
    (() => {
      const item = document.createElement('li');
      item.innerHTML = `<span>Monto</span><strong>${currencyFormatter.format(invoice.amount ?? 0)}</strong>`;
      return item;
    })(),
  );
  list.appendChild(
    (() => {
      const item = document.createElement('li');
      item.innerHTML = `<span>Estado</span><strong>${invoice.status}</strong>`;
      return item;
    })(),
  );
  card.appendChild(list);

  return card;
};

export function renderFinancePayments(container, { refresh }) {
  const db = getDB();
  const filter = statusFilter === 'all' ? {} : { status: statusFilter };
  const invoices = listInvoices(filter, db);

  if (!selectedInvoiceId || !invoices.find((invoice) => invoice.id === selectedInvoiceId)) {
    selectedInvoiceId = invoices[0]?.id ?? null;
  }

  const intro = createCard('Bandeja operativa', 'Filtra facturas por estado y registra movimientos.');
  container.appendChild(intro);

  const filterCard = createCard('Filtros');
  const selectLabel = document.createElement('label');
  selectLabel.textContent = 'Estado';
  const select = document.createElement('select');
  select.className = 'form-control';
  [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'review', label: 'En revisión' },
    { value: 'paid', label: 'Pagada' },
  ].forEach((optionConfig) => {
    const option = document.createElement('option');
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    if (optionConfig.value === statusFilter) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  select.addEventListener('change', (event) => {
    statusFilter = event.target.value;
    refresh();
  });
  selectLabel.appendChild(select);
  filterCard.appendChild(selectLabel);
  container.appendChild(filterCard);

  const tableCard = createCard('Facturas');
  tableCard.appendChild(renderTable(invoices, refresh));
  container.appendChild(tableCard);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  container.appendChild(renderDetail(selectedInvoice));
}
