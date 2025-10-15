import { loadDB, setDB } from '../db.js';
import { summaryForCode } from '../biz/summaries.js';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normaliseString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const normaliseId = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
};

const getRole = (context = {}) => {
  const candidates = [
    context.role,
    context.user?.role,
    context.currentUser?.role,
  ];
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

const ensureCounters = (db) => {
  if (!db.counters || typeof db.counters !== 'object') {
    db.counters = { lastUserId: 0, lastCodeId: 0 };
  }
  if (typeof db.counters.lastCodeId !== 'number') {
    db.counters.lastCodeId = Number(db.counters.lastCodeId ?? 0) || 0;
  }
  return db.counters;
};

const generateCodeValue = (type, nextId) => {
  const prefix = type === 'AF' ? 'AF' : 'PT';
  const suffix = String(nextId).padStart(4, '0');
  return `${prefix}-${suffix}`;
};

const normaliseStatus = (status) => {
  const value = normaliseString(status);
  return value || 'active';
};

const parseMaxUses = (input) => {
  const numeric = toNumber(input);
  if (numeric == null) {
    return null;
  }
  if (numeric < 0) {
    return null;
  }
  return Math.floor(numeric);
};

const sanitiseCode = (code, db) => {
  const maxUses = parseMaxUses(code?.max_uses ?? code?.maxUses);
  const currentUses = toNumber(code?.current_uses ?? code?.currentUses) || 0;
  const remaining = maxUses != null ? Math.max(maxUses - currentUses, 0) : null;
  const partnerId =
    code?.partner_id ??
    code?.partnerId ??
    code?.parent_partner_id ??
    code?.parentPartnerId ??
    null;
  const affiliateId = code?.affiliate_id ?? code?.affiliateId ?? null;

  const users = ensureArray(db?.users);
  const usageCount = users.filter((user) => {
    const userCodeId = normaliseId(user?.code_id ?? user?.codeId ?? user?.code);
    const codeId = normaliseId(code?.id ?? code?.codeId ?? code?.code_id);
    if (codeId && userCodeId) {
      return userCodeId === codeId;
    }
    const userCodeValue = normaliseString(user?.code ?? user?.codeValue ?? user?.code_value);
    const codeValue = normaliseString(code?.value ?? code?.code);
    return userCodeValue && codeValue && userCodeValue === codeValue;
  }).length;

  return {
    id: code?.id ?? code?.codeId ?? code?.code_id ?? null,
    value: code?.value ?? code?.code ?? null,
    type: code?.type ?? code?.codeType ?? null,
    status: normaliseStatus(code?.status ?? code?.state),
    max_uses: maxUses,
    current_uses: currentUses,
    remaining_uses: remaining,
    notes: code?.notes ?? null,
    payout_overrides: code?.payout_overrides ?? code?.payoutOverrides ?? null,
    currency: normaliseString(code?.currency ?? 'USD') || 'USD',
    partner_id: partnerId ?? null,
    affiliate_id: affiliateId ?? null,
    created_at: code?.created_at ?? code?.createdAt ?? null,
    updated_at: code?.updated_at ?? code?.updatedAt ?? null,
    users_count: usageCount,
  };
};

const requireAdmin = (context) => {
  if (!hasRole(context, ['admin'])) {
    return errorResponse(403, 'Admin privileges required.');
  }
  return null;
};

const createCodeHandler = async ({ body, context }) => {
  loadDB();
  const permissionError = requireAdmin(context);
  if (permissionError) {
    return permissionError;
  }

  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'Invalid payload.');
  }

  const typeRaw = normaliseString(body.type ?? body.codeType ?? 'PT').toUpperCase();
  const type = typeRaw === 'AF' ? 'AF' : 'PT';

  const partnerId = normaliseId(body.partner_id ?? body.partnerId ?? null);
  if (!partnerId) {
    return errorResponse(400, 'A partner_id is required.');
  }

  const parentPartnerRaw = body.parent_partner_id ?? body.parentPartnerId ?? null;
  if (type === 'AF' && !parentPartnerRaw) {
    return errorResponse(400, 'An affiliate code must include parent_partner_id.');
  }
  const parentPartnerId = normaliseId(parentPartnerRaw ?? partnerId);

  const affiliateId =
    type === 'AF'
      ? normaliseId(
          body.affiliate_id ??
            body.affiliateId ??
            body.parent_affiliate_id ??
            body.parentAffiliateId ??
            null,
        )
      : null;

  const maxUses = parseMaxUses(body.max_uses ?? body.maxUses);
  const notes = normaliseString(body.notes);
  const currency = normaliseString(body.currency ?? 'USD') || 'USD';
  const payoutOverrides =
    body.payout_overrides && typeof body.payout_overrides === 'object'
      ? { ...body.payout_overrides }
      : body.payoutOverrides && typeof body.payoutOverrides === 'object'
      ? { ...body.payoutOverrides }
      : null;

  let created;
  let conflictMessage = null;
  setDB((db) => {
    const counters = ensureCounters(db);
    counters.lastCodeId = (Number(counters.lastCodeId) || 0) + 1;
    const nextId = counters.lastCodeId;
    const timestamp = new Date().toISOString();

    const codes = ensureArray(db.codes);

    const id = normaliseString(body.id ?? body.code_id ?? body.codeId) || String(nextId);
    const value = normaliseString(body.value ?? body.code ?? generateCodeValue(type, nextId));

    const existsById = codes.find((code) => normaliseId(code?.id ?? code?.codeId ?? code?.code_id) === id);
    if (existsById) {
      conflictMessage = 'A referral code with this id already exists.';
      counters.lastCodeId -= 1;
      return db;
    }

    const existsByValue = codes.find((code) => normaliseString(code?.value ?? code?.code) === value);
    if (existsByValue) {
      conflictMessage = 'A referral code with this value already exists.';
      counters.lastCodeId -= 1;
      return db;
    }

    const record = {
      id,
      value,
      type,
      status: normaliseStatus(body.status),
      max_uses: maxUses,
      current_uses: 0,
      notes: notes || null,
      payout_overrides: payoutOverrides,
      currency,
      partner_id: partnerId,
      parent_partner_id: parentPartnerId,
      affiliate_id: affiliateId,
      created_at: timestamp,
      updated_at: timestamp,
    };

    codes.push(record);
    db.codes = codes;

    created = sanitiseCode(record, db);

    return db;
  });

  if (conflictMessage) {
    return errorResponse(409, conflictMessage);
  }

  if (!created) {
    return errorResponse(500, 'Unable to create referral code.');
  }

  return success(201, { code: created });
};

const updateCodeHandler = async ({ params, body, context }) => {
  loadDB();
  const permissionError = requireAdmin(context);
  if (permissionError) {
    return permissionError;
  }

  if (!params || !params.id) {
    return errorResponse(400, 'A code id is required.');
  }

  const updates = body && typeof body === 'object' ? body : {};
  let updated;

  setDB((db) => {
    const codes = ensureArray(db.codes);
    const targetId = normaliseId(params.id);
    const record = codes.find((code) => normaliseId(code?.id ?? code?.codeId ?? code?.code_id) === targetId);

    if (!record) {
      return db;
    }

    if ('status' in updates) {
      record.status = normaliseStatus(updates.status);
    }
    if ('max_uses' in updates || 'maxUses' in updates) {
      record.max_uses = parseMaxUses(updates.max_uses ?? updates.maxUses);
    }
    if ('notes' in updates) {
      record.notes = normaliseString(updates.notes) || null;
    }
    if ('payout_overrides' in updates || 'payoutOverrides' in updates) {
      const payload = updates.payout_overrides ?? updates.payoutOverrides;
      record.payout_overrides =
        payload && typeof payload === 'object' ? { ...payload } : null;
    }
    if ('currency' in updates) {
      record.currency = normaliseString(updates.currency ?? 'USD') || 'USD';
    }
    record.updated_at = new Date().toISOString();

    updated = sanitiseCode(record, db);
    return db;
  });

  if (!updated) {
    return errorResponse(404, 'Referral code not found.');
  }

  return success(200, { code: updated });
};

const listCodesHandler = async ({ context }) => {
  const permissionError = requireAdmin(context);
  if (permissionError) {
    return permissionError;
  }
  const db = loadDB();
  const codes = ensureArray(db.codes).map((code) => sanitiseCode(code, db));
  return success(200, { codes });
};

const codeSummaryHandler = async ({ params, context }) => {
  const permissionError = requireAdmin(context);
  if (permissionError) {
    return permissionError;
  }

  if (!params || !params.id) {
    return errorResponse(400, 'A code id is required.');
  }

  const db = loadDB();
  const summary = summaryForCode(params.id, db);
  return success(200, { summary });
};

const routes = [
  {
    method: 'POST',
    path: '/api/referral-codes',
    handler: createCodeHandler,
  },
  {
    method: 'PUT',
    path: '/api/referral-codes/{id}',
    handler: updateCodeHandler,
  },
  {
    method: 'GET',
    path: '/api/referral-codes',
    handler: listCodesHandler,
  },
  {
    method: 'GET',
    path: '/api/referral-codes/{id}/summary',
    handler: codeSummaryHandler,
  },
];

export { routes };
export default routes;
