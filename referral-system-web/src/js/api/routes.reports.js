import { loadDB } from '../db.js';
import { metricsGlobal, summaryForPartner } from '../biz/summaries.js';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

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

const sanitiseCode = (code) => {
  if (!code || typeof code !== 'object') {
    return null;
  }
  return {
    id: code.id ?? code.codeId ?? code.code_id ?? null,
    value: code.value ?? code.code ?? null,
    type: code.type ?? code.codeType ?? null,
    status: code.status ?? code.state ?? null,
    max_uses: code.max_uses ?? code.maxUses ?? null,
    current_uses: code.current_uses ?? code.currentUses ?? null,
    partner_id:
      code.partner_id ??
      code.partnerId ??
      code.parent_partner_id ??
      code.parentPartnerId ??
      null,
    affiliate_id: code.affiliate_id ?? code.affiliateId ?? null,
    created_at: code.created_at ?? code.createdAt ?? null,
    updated_at: code.updated_at ?? code.updatedAt ?? null,
  };
};

const sanitiseAffiliates = (collection) =>
  ensureArray(collection).map((affiliate) => ({
    id: affiliate?.id ?? affiliate?.affiliateId ?? affiliate?.affiliate_id ?? null,
    name: affiliate?.name ?? null,
    region: affiliate?.region ?? null,
    status: affiliate?.status ?? null,
  }));

const sanitisePartnerSummary = (summary) => {
  if (!summary || typeof summary !== 'object') {
    return null;
  }
  return {
    partner: summary.partner
      ? {
          id:
            summary.partner.id ??
            summary.partner.partnerId ??
            summary.partner.partner_id ??
            null,
          name: summary.partner.name ?? summary.partner.shortName ?? null,
          region: summary.partner.region ?? null,
          status: summary.partner.status ?? null,
        }
      : null,
    totals: summary.totals,
    monthlySeries: ensureArray(summary.monthlySeries),
    affiliates: sanitiseAffiliates(summary.affiliates),
  };
};

const globalReportHandler = async ({ context }) => {
  const role = getRole(context);
  if (!role || !['admin'].includes(role)) {
    return errorResponse(403, 'Admin privileges required.');
  }
  const db = loadDB();
  const report = metricsGlobal(db);
  return success(200, { report });
};

const ownerCodeHandler = async ({ context }) => {
  if (!hasRole(context, ['owner'])) {
    return errorResponse(403, 'Owner privileges required.');
  }
  const partnerId = extractPartnerId(context);
  if (!partnerId) {
    return errorResponse(400, 'A partner_id is required.');
  }
  const db = loadDB();
  const codes = ensureArray(db.codes);
  const code = codes.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const type = (entry.type ?? entry.codeType ?? '').toString().toUpperCase();
    const affiliateId = entry.affiliate_id ?? entry.affiliateId ?? null;
    const partner =
      entry.partner_id ?? entry.partnerId ?? entry.parent_partner_id ?? entry.parentPartnerId ?? null;
    if (type === 'AF') {
      return false;
    }
    return partner && String(partner) === String(partnerId) && !affiliateId;
  });

  return success(200, { code: sanitiseCode(code ?? null) });
};

const ownerSummaryHandler = async ({ context }) => {
  if (!hasRole(context, ['owner'])) {
    return errorResponse(403, 'Owner privileges required.');
  }
  const partnerId = extractPartnerId(context);
  if (!partnerId) {
    return errorResponse(400, 'A partner_id is required.');
  }
  const db = loadDB();
  const summary = summaryForPartner(partnerId, db);
  return success(200, { summary: sanitisePartnerSummary(summary) });
};

const ownerReportHandler = async ({ context }) => {
  if (!hasRole(context, ['owner'])) {
    return errorResponse(403, 'Owner privileges required.');
  }
  const partnerId = extractPartnerId(context);
  if (!partnerId) {
    return errorResponse(400, 'A partner_id is required.');
  }
  const db = loadDB();
  const summary = summaryForPartner(partnerId, db);
  return success(200, {
    report: {
      totals: summary?.totals ?? null,
      monthlySeries: ensureArray(summary?.monthlySeries),
    },
  });
};

const routes = [
  {
    method: 'GET',
    path: '/api/referral-codes/report',
    handler: globalReportHandler,
  },
  {
    method: 'GET',
    path: '/api/my-referral-code',
    handler: ownerCodeHandler,
  },
  {
    method: 'GET',
    path: '/api/my-referral-code/summary',
    handler: ownerSummaryHandler,
  },
  {
    method: 'GET',
    path: '/api/my-referral-code/report',
    handler: ownerReportHandler,
  },
];

export { routes };
export default routes;
