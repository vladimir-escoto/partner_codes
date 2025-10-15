import { getDB, setDB } from '../../db.js';
import { generateInvoices, listInvoices, setInvoiceStatus } from '../../biz/invoices.js';
import { showToast } from '../../../components/toast.js';

let selectedInvoiceId = null;

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

const summarizeInvoices = (invoices) => {
  const summary = {
    total: invoices.length,
    pending: 0,
    paid: 0,
    amount: 0,
  };
  invoices.forEach((invoice) => {
    const status = typeof invoice.status === 'string' ? invoice.status.toLowerCase() : 'unknown';
    if (status === 'paid') {
      summary.paid += 1;
    } else {
      summary.pending += 1;
    }
    summary.amount += Number(invoice.amount ?? 0);
  });
  return summary;
};

const buildSummaryList = (summary) => {
  const list = document.createElement('ul');
  list.className = 'summary-list';

  const items = [
    { label: 'Facturas generadas', value: summary.total },
    { label: 'Pendientes', value: summary.pending },
    { label: 'Pagadas', value: summary.paid },
    { label: 'Monto total', value: currencyFormatter.format(summary.amount) },
  ];

  items.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    list.appendChild(li);
  });

  return list;
};

const renderDetailCard = (invoice) => {
  const card = createCard(`Detalle factura ${invoice?.id ?? ''}`);
  if (!invoice) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Selecciona una factura para ver el detalle.';
    card.appendChild(paragraph);
    return card;
  }

  const info = document.createElement('div');
  info.className = 'invoice-detail';
  info.innerHTML = `
    <p><strong>Partner:</strong> ${invoice.partner_name ?? invoice.partner_id ?? '—'}</p>
    <p><strong>Período:</strong> ${invoice.period ?? '—'}</p>
    <p><strong>Monto:</strong> ${currencyFormatter.format(invoice.amount ?? 0)}</p>
    <p><strong>Estado:</strong> ${invoice.status}</p>
    <p><strong>Usuarios:</strong> ${invoice.users_count ?? 0}</p>
    <p><strong>Cut-off:</strong> ${invoice.cutoff_date ?? '—'} | <strong>Vence:</strong> ${invoice.due_date ?? '—'}</p>
  `;
  card.appendChild(info);

  const breakdown = document.createElement('div');
  breakdown.className = 'invoice-breakdown';
  breakdown.innerHTML = `
    <h3>Breakdown</h3>
    <ul>
      <li><span>Directo</span><strong>${currencyFormatter.format(invoice.payout_direct ?? 0)}</strong></li>
      <li><span>Afiliados</span><strong>${currencyFormatter.format(invoice.payout_from_affiliates ?? 0)}</strong></li>
      <li><span>Payout afiliados</span><strong>${currencyFormatter.format(invoice.affiliate_payout ?? 0)}</strong></li>
    </ul>
  `;
  card.appendChild(breakdown);

  const notes = document.createElement('p');
  notes.className = 'invoice-notes';
  notes.textContent = invoice.notes ?? 'Sin notas registradas para esta factura.';
  card.appendChild(notes);

  return card;
};

const renderTable = (invoices, onSelect, onStatus) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Invoice', 'Partner', 'Período', 'Monto', 'Usuarios', 'Estado', 'Acciones'].forEach((label) => {
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
    cell.textContent = 'No hay facturas generadas aún.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    invoices.forEach((invoice) => {
      const row = document.createElement('tr');
      row.dataset.invoiceId = invoice.id;
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

      const pendingButton = document.createElement('button');
      pendingButton.type = 'button';
      pendingButton.textContent = 'Pendiente';
      pendingButton.className = 'button button--secondary';
      pendingButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onStatus(invoice.id, 'pending');
      });
      actions.appendChild(pendingButton);

      const paidButton = document.createElement('button');
      paidButton.type = 'button';
      paidButton.textContent = 'Marcar pagada';
      paidButton.className = 'button';
      paidButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onStatus(invoice.id, 'paid');
      });
      actions.appendChild(paidButton);

      row.appendChild(actions);
      row.addEventListener('click', () => onSelect(invoice));
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
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
    showToast('No fue posible actualizar la factura seleccionada.', { type: 'danger' });
  }
};

const handleGeneration = (form, refresh) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const rawDate = data.get('cutoff_date');
    if (!rawDate) {
      showToast('Debe elegir una fecha de corte.', { type: 'warning' });
      return;
    }

    let created = [];
    setDB((db) => {
      const next = { ...db };
      created = generateInvoices(new Date(rawDate), next) ?? [];
      return next;
    });

    if (created.length) {
      showToast(`Se generaron ${created.length} facturas.`, { type: 'success' });
    } else {
      showToast('No se generaron nuevas facturas para ese período.', { type: 'info' });
    }
    refresh();
  });
};

export function renderAdminPayments(container, { refresh }) {
  const db = getDB();
  const invoices = listInvoices({}, db);

  if (!selectedInvoiceId || !invoices.find((invoice) => invoice.id === selectedInvoiceId)) {
    selectedInvoiceId = invoices[0]?.id ?? null;
  }

  const intro = createCard(
    'Pagos e invoices',
    'Genera facturas al corte, administra estados y revisa detalles de cada partner.',
  );
  container.appendChild(intro);

  const formCard = createCard('Generar facturas', 'Seleccione fecha de corte para crear nuevas facturas.');
  const form = document.createElement('form');
  form.className = 'form-grid';

  const cutoffLabel = document.createElement('label');
  cutoffLabel.textContent = 'Fecha de corte';
  const cutoffInput = document.createElement('input');
  cutoffInput.type = 'date';
  cutoffInput.name = 'cutoff_date';
  cutoffInput.required = true;
  cutoffInput.className = 'form-control';
  cutoffLabel.appendChild(cutoffInput);
  form.appendChild(cutoffLabel);

  const submitWrapper = document.createElement('div');
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = 'Generar';
  submitButton.className = 'button';
  submitWrapper.appendChild(submitButton);
  form.appendChild(submitWrapper);

  formCard.appendChild(form);
  formCard.appendChild(buildSummaryList(summarizeInvoices(invoices)));
  container.appendChild(formCard);

  handleGeneration(form, refresh);

  const tableCard = createCard('Bandeja de facturas', 'Actualiza estados y consulta las facturas generadas.');
  const table = renderTable(
    invoices,
    (invoice) => {
      selectedInvoiceId = invoice.id;
      refresh();
    },
    (invoiceId, status) => applyStatusChange(invoiceId, status, refresh),
  );
  tableCard.appendChild(table);
  container.appendChild(tableCard);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  container.appendChild(renderDetailCard(selectedInvoice));
}
