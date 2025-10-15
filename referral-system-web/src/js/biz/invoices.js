import { payoutForUser } from './payouts.js';
import { monthKey, ymd } from '../../utils/dates.js';

const ensureArray = (maybeArray) => (Array.isArray(maybeArray) ? maybeArray : []);

const toNumber = (value) => {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundCurrency = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
};

const normaliseId = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return null;
};

const safeMonthKey = (input) => {
  try {
    return monthKey(input);
  } catch (error) {
    return 'unknown';
  }
};

const extractPartnerId = (entity) =>
  normaliseId(entity?.id ?? entity?.partnerId ?? entity?.partner_id ?? entity?.code);

const extractAffiliatePartnerId = (affiliate) =>
  normaliseId(
    affiliate?.partnerId ??
      affiliate?.partner_id ??
      affiliate?.parentPartnerId ??
      affiliate?.parent_partner_id,
  );

const extractAffiliateId = (entity) =>
  normaliseId(
    entity?.affiliateId ??
      entity?.affiliate_id ??
      entity?.id ??
      entity?.code ??
      entity?.identifier,
  );

const buildInvoiceKey = (period, partnerId) => `${period}::${partnerId ?? 'unknown'}`;

const sanitiseInvoiceId = (period, partnerId) => {
  const safePeriod = typeof period === 'string' ? period.replace(/[^0-9A-Z-]/gi, '') : 'PERIOD';
  const safePartner = typeof partnerId === 'string' ? partnerId.replace(/[^0-9A-Z-]/gi, '') : partnerId;
  const partnerSegment = safePartner ? String(safePartner).toUpperCase() : 'PARTNER';
  return `INV-${safePeriod.toUpperCase()}-${partnerSegment}`;
};

const selectCutoffDay = (db) => {
  const candidates = [
    db?.cutoff_day,
    db?.cutoffDay,
    db?.settings?.cutoff_day,
    db?.settings?.cutoffDay,
    db?.settings?.billing?.cutoff_day,
    db?.settings?.billing?.cutoffDay,
    db?.billing?.cutoff_day,
    db?.billing?.cutoffDay,
    db?.config?.cutoff_day,
    db?.config?.cutoffDay,
    db?.config?.billing?.cutoff_day,
    db?.config?.billing?.cutoffDay,
  ];

  for (const candidate of candidates) {
    const numeric = toNumber(candidate);
    if (numeric != null && numeric >= 1 && numeric <= 31) {
      return Math.floor(numeric);
    }
  }

  return 15;
};

const calculateDueDate = (period, cutoffDay) => {
  if (typeof period !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(period)) {
    return ymd(new Date());
  }

  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const due = new Date(Date.UTC(year, monthIndex + 1, cutoffDay));
  return ymd(due);
};

const collectPartnerStats = (partnerId, period, db) => {
  const affiliates = ensureArray(db?.affiliates).filter((affiliate) => {
    const affiliatePartnerId = extractAffiliatePartnerId(affiliate);
    return affiliatePartnerId != null && affiliatePartnerId === partnerId;
  });
  const affiliateIds = new Set(affiliates.map((affiliate) => extractAffiliateId(affiliate)).filter(Boolean));

  const users = ensureArray(db?.users).filter((user) => {
    const userPartnerId = normaliseId(user?.partnerId ?? user?.partner_id ?? user?.parent_partner_id);
    if (userPartnerId == null || userPartnerId !== partnerId) {
      return false;
    }
    const userMonth = safeMonthKey(user?.createdAt ?? user?.created_at ?? user?.joinedAt);
    return userMonth === period;
  });

  let directUsers = 0;
  let affiliateUsers = 0;
  let directPartnerPayout = 0;
  let affiliatePartnerPayout = 0;
  let affiliateAffiliatePayout = 0;

  for (const user of users) {
    const payout = payoutForUser(user, db);
    const affiliateId = normaliseId(user?.affiliateId ?? user?.affiliate_id ?? user?.parent_affiliate_id);
    const isAffiliate = affiliateId != null && affiliateIds.has(affiliateId);

    if (isAffiliate) {
      affiliateUsers += 1;
      affiliatePartnerPayout += payout.partner;
      affiliateAffiliatePayout += payout.affiliate;
    } else {
      directUsers += 1;
      directPartnerPayout += payout.partner;
    }
  }

  const amount = roundCurrency(directPartnerPayout + affiliatePartnerPayout);

  return {
    directUsers,
    affiliateUsers,
    totalUsers: directUsers + affiliateUsers,
    directPartnerPayout: roundCurrency(directPartnerPayout),
    affiliatePartnerPayout: roundCurrency(affiliatePartnerPayout),
    affiliateAffiliatePayout: roundCurrency(affiliateAffiliatePayout),
    amount,
  };
};

const ensureInvoicesArray = (db) => {
  if (!Array.isArray(db.invoices)) {
    db.invoices = [];
  }
  return db.invoices;
};

const cloneInvoice = (invoice) => ({ ...invoice });

export function generateInvoices(cutoffDateInput, db = {}) {
  const invoices = ensureInvoicesArray(db);
  const cutoffDate = cutoffDateInput ?? new Date();
  const period = monthKey(cutoffDate);
  const cutoffDay = selectCutoffDay(db);
  const cutoffDateISO = ymd(cutoffDate);

  const existingKeys = new Set(
    invoices.map((invoice) => {
      const invoicePeriod =
        invoice?.period ?? safeMonthKey(invoice?.cutoff_date ?? invoice?.created_at);
      const invoicePartner = normaliseId(
        invoice?.partner_id ?? invoice?.partnerId ?? invoice?.partner,
      );
      return buildInvoiceKey(invoicePeriod, invoicePartner);
    }),
  );
  const existingIds = new Set(
    invoices
      .map((invoice) => normaliseId(invoice?.id ?? invoice?.invoiceId ?? invoice?.invoice_id))
      .filter((value) => value != null),
  );

  const created = [];

  for (const partner of ensureArray(db?.partners)) {
    const partnerId = extractPartnerId(partner);
    if (partnerId == null) {
      continue;
    }

    const key = buildInvoiceKey(period, partnerId);
    if (existingKeys.has(key)) {
      continue;
    }

    const stats = collectPartnerStats(partnerId, period, db);

    let invoiceIdBase = sanitiseInvoiceId(period, partnerId);
    let invoiceId = invoiceIdBase;
    let counter = 1;
    while (existingIds.has(invoiceId)) {
      counter += 1;
      invoiceId = `${invoiceIdBase}-${counter}`;
    }

    existingIds.add(invoiceId);
    existingKeys.add(key);

    const invoice = {
      id: invoiceId,
      partner_id: partnerId,
      partner_name: partner?.name ?? partner?.shortName ?? null,
      period,
      cutoff_date: cutoffDateISO,
      due_date: calculateDueDate(period, cutoffDay),
      cutoff_day: cutoffDay,
      amount: stats.amount,
      payout_direct: stats.directPartnerPayout,
      payout_from_affiliates: stats.affiliatePartnerPayout,
      affiliate_payout: stats.affiliateAffiliatePayout,
      users_count: stats.totalUsers,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    invoices.push(invoice);
    created.push(cloneInvoice(invoice));
  }

  return created;
}

export function listInvoices(filter = {}, db = {}) {
  const invoices = ensureInvoicesArray(db);

  const statusFilter = (() => {
    if (filter.status == null) return null;
    const collection = Array.isArray(filter.status) ? filter.status : [filter.status];
    const normalised = collection
      .map((status) => (typeof status === 'string' ? status.trim().toLowerCase() : null))
      .filter(Boolean);
    if (normalised.length === 0) {
      return null;
    }
    return new Set(normalised);
  })();

  const partnerFilter = (() => {
    if (!filter.partnerId && !filter.partner_id && !filter.partner) {
      return null;
    }
    return normaliseId(filter.partnerId ?? filter.partner_id ?? filter.partner);
  })();

  const periodFilter = typeof filter.period === 'string' ? filter.period.trim() : null;

  return invoices
    .filter((invoice) => {
      if (statusFilter) {
        const status = typeof invoice?.status === 'string' ? invoice.status.toLowerCase() : '';
        if (!statusFilter.has(status)) {
          return false;
        }
      }

      if (partnerFilter) {
        const invoicePartner = normaliseId(
          invoice?.partner_id ?? invoice?.partnerId ?? invoice?.partner,
        );
        if (invoicePartner !== partnerFilter) {
          return false;
        }
      }

      if (periodFilter) {
        const invoicePeriod = invoice?.period ?? safeMonthKey(invoice?.cutoff_date ?? invoice?.created_at);
        if (invoicePeriod !== periodFilter) {
          return false;
        }
      }

      return true;
    })
    .map(cloneInvoice);
}

export function setInvoiceStatus(idInput, statusInput, db = {}) {
  if (idInput == null) {
    throw new Error('An invoice id is required to update status.');
  }
  if (statusInput == null || (typeof statusInput === 'string' && statusInput.trim() === '')) {
    throw new Error('A valid status value is required.');
  }

  const invoices = ensureInvoicesArray(db);
  const targetId = normaliseId(idInput);
  const nextStatusRaw =
    typeof statusInput === 'string' ? statusInput : String(statusInput ?? '');
  const nextStatus = nextStatusRaw.trim();

  if (!nextStatus) {
    throw new Error('A valid status value is required.');
  }

  const invoice = invoices.find((item) => {
    const invoiceId = normaliseId(item?.id ?? item?.invoiceId ?? item?.invoice_id);
    return invoiceId != null && invoiceId === targetId;
  });

  if (!invoice) {
    return null;
  }

  invoice.status = nextStatus;
  invoice.updated_at = new Date().toISOString();

  return cloneInvoice(invoice);
}

export default {
  generateInvoices,
  listInvoices,
  setInvoiceStatus,
};
