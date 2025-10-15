import { loadDB, setDB } from '../db.js';
import { generateInvoices, listInvoices, setInvoiceStatus } from '../biz/invoices.js';

const getRole = (context = {}) => {
  const candidates = [context.role, context.user?.role, context.currentUser?.role];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }
  return null;
};

const hasRole = (context, roles) => {
  const role = getRole(context);
  return role != null && roles.includes(role);
};

const success = (status, data) => ({
  ok: true,
  status,
  ...(typeof data !== 'undefined' ? { data } : {}),
});

const errorResponse = (status, message) => ({
  ok: false,
  status,
  message,
});

const extractPartnerId = (context = {}) => {
  const candidates = [
    context.partnerId,
    context.partner_id,
    context.user?.partnerId,
    context.user?.partner_id,
    context.currentUser?.partnerId,
    context.currentUser?.partner_id,
  ];
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }
    if (typeof candidate === 'number') {
      return String(candidate);
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

const parseDate = (input) => {
  if (!input) {
    return new Date();
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
};

const sanitiseInvoice = (invoice) => {
  if (!invoice || typeof invoice !== 'object') {
    return null;
  }
  return {
    id: invoice.id ?? invoice.invoiceId ?? invoice.invoice_id ?? null,
    partner_id: invoice.partner_id ?? invoice.partnerId ?? invoice.partner ?? null,
    partner_name: invoice.partner_name ?? null,
    period: invoice.period ?? null,
    cutoff_date: invoice.cutoff_date ?? null,
    due_date: invoice.due_date ?? null,
    cutoff_day: invoice.cutoff_day ?? null,
    amount: invoice.amount ?? 0,
    payout_direct: invoice.payout_direct ?? null,
    payout_from_affiliates: invoice.payout_from_affiliates ?? null,
    affiliate_payout: invoice.affiliate_payout ?? null,
    users_count: invoice.users_count ?? null,
    status: invoice.status ?? null,
    created_at: invoice.created_at ?? null,
    updated_at: invoice.updated_at ?? null,
  };
};

const requireFinanceRole = (context) => {
  if (!hasRole(context, ['admin', 'finance'])) {
    return errorResponse(403, 'Finance or admin role required.');
  }
  return null;
};

const generateInvoicesHandler = async ({ body, context }) => {
  const permissionError = requireFinanceRole(context);
  if (permissionError) {
    return permissionError;
  }

  const cutoffInput = body?.cutoff_date ?? body?.cutoffDate ?? null;
  const cutoffDate = parseDate(cutoffInput);

  let created = [];
  setDB((db) => {
    created = generateInvoices(cutoffDate, db).map(sanitiseInvoice);
    return db;
  });

  return success(201, { invoices: created });
};

const listInvoicesHandler = async ({ context, query }) => {
  const role = getRole(context);
  const allowedRoles = ['admin', 'finance', 'owner'];
  if (!role || !allowedRoles.includes(role)) {
    return errorResponse(403, 'Access denied.');
  }

  const db = loadDB();
  const filters = { ...query };

  if (role === 'owner') {
    const partnerId = extractPartnerId(context);
    if (!partnerId) {
      return errorResponse(400, 'A partner_id is required.');
    }
    filters.partnerId = partnerId;
  }

  const invoices = listInvoices(filters, db).map(sanitiseInvoice);
  return success(200, { invoices });
};

const updateInvoiceStatusHandler = async ({ params, body, context }) => {
  const permissionError = requireFinanceRole(context);
  if (permissionError) {
    return permissionError;
  }

  if (!params || !params.id) {
    return errorResponse(400, 'An invoice id is required.');
  }

  const nextStatus = body?.status ?? body?.nextStatus ?? null;
  if (typeof nextStatus !== 'string' || !nextStatus.trim()) {
    return errorResponse(400, 'A valid status value is required.');
  }

  let updated = null;
  setDB((db) => {
    updated = setInvoiceStatus(params.id, nextStatus, db);
    return db;
  });

  if (!updated) {
    return errorResponse(404, 'Invoice not found.');
  }

  return success(200, { invoice: sanitiseInvoice(updated) });
};

const routes = [
  {
    method: 'POST',
    path: '/api/invoices/generate',
    handler: generateInvoicesHandler,
  },
  {
    method: 'GET',
    path: '/api/invoices',
    handler: listInvoicesHandler,
  },
  {
    method: 'PUT',
    path: '/api/invoices/{id}/status',
    handler: updateInvoiceStatusHandler,
  },
];

export { routes };
export default routes;
