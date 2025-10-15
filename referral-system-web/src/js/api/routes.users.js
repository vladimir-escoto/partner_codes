import { loadDB, setDB } from '../db.js';

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

const normaliseCodeValue = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return String(value);
};

const extractCodeIdentifiers = (code = {}) => {
  const id = code.id ?? code.codeId ?? code.code_id ?? null;
  const value = code.value ?? code.code ?? null;
  return {
    id: id != null ? String(id) : null,
    value: typeof value === 'string' ? value.trim() : value,
  };
};

const findCode = (db, candidate) => {
  const codes = ensureArray(db?.codes);
  if (!candidate) {
    return null;
  }
  const candidateValue = normaliseCodeValue(candidate);

  return (
    codes.find((code) => {
      if (!code || typeof code !== 'object') {
        return false;
      }
      const { id, value } = extractCodeIdentifiers(code);
      const candidates = [id, value].filter((item) => item != null);
      return candidates.some((entry) => normaliseCodeValue(entry) === candidateValue);
    }) ?? null
  );
};

const ensureCounters = (db) => {
  if (!db.counters || typeof db.counters !== 'object') {
    db.counters = { lastUserId: 0, lastCodeId: 0 };
  }
  if (typeof db.counters.lastUserId !== 'number') {
    db.counters.lastUserId = Number(db.counters.lastUserId ?? 0) || 0;
  }
  return db.counters;
};

const currentUsesFor = (code) => {
  const numeric = toNumber(code?.current_uses ?? code?.currentUses ?? 0);
  return numeric != null ? numeric : 0;
};

const maxUsesFor = (code) => {
  const numeric = toNumber(code?.max_uses ?? code?.maxUses);
  if (numeric == null) {
    return null;
  }
  return numeric < 0 ? null : numeric;
};

const isCodeActive = (code) => {
  const statusRaw =
    code?.status ?? code?.state ?? code?.lifecycle ?? code?.metadata?.status ?? 'active';
  if (typeof statusRaw !== 'string') {
    return true;
  }
  const status = statusRaw.trim().toLowerCase();
  return !['inactive', 'disabled', 'revoked', 'blocked', 'archived'].includes(status);
};

const buildUserRecord = ({ payload, code, nextId, timestamp }) => {
  const codeIdentifiers = extractCodeIdentifiers(code);
  const partnerId =
    code?.partner_id ??
    code?.partnerId ??
    code?.parent_partner_id ??
    code?.parentPartnerId ??
    null;
  const affiliateId =
    code?.affiliate_id ?? code?.affiliateId ?? code?.parent_affiliate_id ?? code?.parentAffiliateId ?? null;

  const region = normaliseString(payload.region ?? payload.country ?? '');
  const type = normaliseString(payload.type ?? payload.userType ?? '');
  const status = normaliseString(payload.status ?? 'active') || 'active';

  const record = {
    id: nextId,
    firstName: normaliseString(payload.firstName ?? payload.first_name ?? ''),
    lastName: normaliseString(payload.lastName ?? payload.last_name ?? ''),
    email: normaliseString(payload.email ?? payload.mail ?? ''),
    code: codeIdentifiers.value,
    code_id: codeIdentifiers.id,
    partner_id: partnerId ?? null,
    affiliate_id: affiliateId ?? null,
    status,
    region: region || null,
    type: type || null,
    created_at: timestamp,
    app_id: normaliseString(payload.appId ?? payload.app_id ?? '' ) || null,
  };

  const metadata =
    payload.metadata && typeof payload.metadata === 'object' ? { ...payload.metadata } : null;
  if (metadata) {
    record.metadata = metadata;
  }

  return record;
};

const sanitiseUserForResponse = (user) => ({
  id: user.id,
  code: user.code,
  code_id: user.code_id,
  partner_id: user.partner_id ?? null,
  affiliate_id: user.affiliate_id ?? null,
  status: user.status,
  created_at: user.created_at,
});

const registerUserHandler = async ({ body }) => {
  loadDB();
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'Invalid payload.');
  }

  const codeInput =
    body.code ?? body.codeValue ?? body.code_value ?? body.referralCode ?? body.referral_code ?? null;
  const codeValue = normaliseCodeValue(codeInput);
  if (!codeValue) {
    return errorResponse(400, 'A referral code is required.');
  }

  const email = normaliseString(body.email ?? body.mail ?? '');
  if (!email || !email.includes('@')) {
    return errorResponse(400, 'A valid email address is required.');
  }

  const db = loadDB();
  const code = findCode(db, codeValue);
  if (!code) {
    return errorResponse(404, 'Referral code not found.');
  }

  if (!isCodeActive(code)) {
    return errorResponse(409, 'Referral code is not active.');
  }

  const maxUses = maxUsesFor(code);
  const currentUses = currentUsesFor(code);
  if (maxUses != null && currentUses >= maxUses) {
    return errorResponse(409, 'Referral code has reached its maximum uses.');
  }

  let createdUser;
  setDB((dbState) => {
    const counters = ensureCounters(dbState);
    counters.lastUserId = (Number(counters.lastUserId) || 0) + 1;
    const nextId = counters.lastUserId;
    const timestamp = new Date().toISOString();

    const users = ensureArray(dbState.users);
    const codeRecord = findCode(dbState, codeValue);
    if (!codeRecord) {
      return dbState;
    }

    const userRecord = buildUserRecord({ payload: body, code: codeRecord, nextId, timestamp });
    users.push(userRecord);
    dbState.users = users;

    const codeMax = maxUsesFor(codeRecord);
    const current = currentUsesFor(codeRecord) + 1;
    codeRecord.current_uses = current;
    if (codeMax != null && current > codeMax) {
      codeRecord.current_uses = codeMax;
    }
    codeRecord.updated_at = timestamp;

    createdUser = sanitiseUserForResponse(userRecord);

    return dbState;
  });

  if (!createdUser) {
    return errorResponse(500, 'Unable to register user.');
  }

  return success(201, { user: createdUser });
};

const routes = [
  {
    method: 'POST',
    path: '/api/users/register',
    handler: registerUserHandler,
  },
];

export { routes };
export default routes;
