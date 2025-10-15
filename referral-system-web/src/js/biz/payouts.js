const DEFAULT_ACCOUNT_TYPE = 'standard';
const DEFAULT_PARTNER_CUT = 0.25;

const toNumber = (value, fallback = null) => {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return fallback;
    }
    const normalised = trimmed.endsWith('%')
      ? trimmed.slice(0, -1)
      : trimmed;
    const parsed = Number(normalised);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normaliseMoney = (value) => {
  const numeric = toNumber(value, 0);
  if (numeric == null) {
    return 0;
  }

  const sanitized = Number.isFinite(numeric) ? numeric : 0;
  const nonNegative = sanitized < 0 ? 0 : sanitized;
  return Math.round(nonNegative * 100) / 100;
};

const normaliseAccountType = (user = {}) => {
  const raw =
    user.accountType ??
    user.account_type ??
    user.segment ??
    user.tier ??
    user.plan ??
    DEFAULT_ACCOUNT_TYPE;

  if (typeof raw !== 'string') {
    return DEFAULT_ACCOUNT_TYPE;
  }

  return raw.trim().toLowerCase() || DEFAULT_ACCOUNT_TYPE;
};

const ensureArray = (maybeArray) => (Array.isArray(maybeArray) ? maybeArray : []);

const resolveByPath = (obj, path) => {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  return path.reduce((acc, key) => {
    if (acc == null) {
      return undefined;
    }
    return acc[key];
  }, obj);
};

const resolveTable = (db, paths) => {
  for (const path of paths) {
    const table = resolveByPath(db, path);
    if (table && typeof table === 'object') {
      return table;
    }
  }
  return null;
};

const PARTNER_TABLE_PATHS = [
  ['payout_base'],
  ['payouts', 'base'],
  ['settings', 'payout_base'],
  ['settings', 'payouts', 'base'],
  ['config', 'payout_base'],
  ['config', 'payouts', 'base'],
];

const AFFILIATE_TABLE_PATHS = [
  ['payout_affiliate'],
  ['payouts', 'affiliate'],
  ['settings', 'payout_affiliate'],
  ['settings', 'payouts', 'affiliate'],
  ['config', 'payout_affiliate'],
  ['config', 'payouts', 'affiliate'],
];

const normaliseKey = (key) => {
  if (typeof key !== 'string') {
    return null;
  }
  return key.trim().toLowerCase();
};

const tableLookup = (table, key, fallback = 0) => {
  if (!table || typeof table !== 'object') {
    return fallback;
  }

  const normalisedKey = normaliseKey(key);
  const candidates = [
    normalisedKey,
    normalisedKey && normalisedKey.toUpperCase(),
    normalisedKey && normalisedKey.replace(/[-\s]/g, '_'),
    normalisedKey && normalisedKey.replace(/[-\s]/g, ''),
    'default',
    'DEFAULT',
    '*',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate in table) {
      const candidateValue = table[candidate];
      const numberValue = toNumber(candidateValue, null);
      if (numberValue != null) {
        return numberValue;
      }
    }
  }

  return fallback;
};

const pickNumber = (values, fallback = null) => {
  for (const value of values) {
    const numeric = toNumber(value, null);
    if (numeric != null) {
      return numeric;
    }
  }
  return fallback;
};

const normaliseCut = (value) => {
  const numeric = toNumber(value, null);
  if (numeric == null) {
    return null;
  }

  if (numeric < 0) {
    return null;
  }

  if (numeric > 1) {
    if (numeric <= 100) {
      return numeric / 100;
    }
    return null;
  }

  return numeric;
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

const findPartnerById = (partnerId, db) => {
  const id = normaliseId(partnerId);
  if (id == null) {
    return null;
  }

  return ensureArray(db?.partners).find((partner) => {
    const candidateId = normaliseId(partner?.id ?? partner?.partnerId ?? partner?.partner_id);
    return candidateId != null && candidateId === id;
  }) ?? null;
};

const findAffiliateById = (affiliateId, db) => {
  const id = normaliseId(affiliateId);
  if (id == null) {
    return null;
  }

  return ensureArray(db?.affiliates).find((affiliate) => {
    const candidateId = normaliseId(
      affiliate?.id ?? affiliate?.affiliateId ?? affiliate?.affiliate_id,
    );
    return candidateId != null && candidateId === id;
  }) ?? null;
};

const extractPartnerCut = (user, db) => {
  const partnerId = normaliseId(
    user?.partnerId ?? user?.partner_id ?? user?.parent_partner_id ?? user?.partner,
  );
  const affiliateId = normaliseId(user?.affiliateId ?? user?.affiliate_id ?? user?.affiliate);

  const partner = partnerId ? findPartnerById(partnerId, db) : null;
  const affiliate = affiliateId ? findAffiliateById(affiliateId, db) : null;

  const tables = [
    ['partner_cut'],
    ['payouts', 'partner_cut'],
    ['settings', 'partner_cut'],
    ['settings', 'payouts', 'partner_cut'],
    ['settings', 'billing', 'partner_cut'],
    ['config', 'partner_cut'],
    ['config', 'payouts', 'partner_cut'],
    ['defaults', 'partner_cut'],
  ];

  const tableValue = pickNumber(
    tables
      .map((path) => resolveByPath(db, path))
      .filter((value) => value != null),
    null,
  );

  const candidates = [
    user?.partnerCut,
    user?.partner_cut,
    user?.commission?.partner,
    user?.commission_partner,
    user?.payout?.partnerCut,
    user?.payout?.partner_cut,
    user?.partner_payout_cut,
    partner?.partnerCut,
    partner?.partner_cut,
    partner?.settings?.partner_cut,
    partner?.commission?.partner,
    partner?.payout?.partner_cut,
    partner?.share,
    affiliate?.partnerCut,
    affiliate?.partner_cut,
    affiliate?.settings?.partner_cut,
    tableValue,
  ].filter((value) => value != null);

  for (const candidate of candidates) {
    const normalised = normaliseCut(candidate);
    if (normalised != null) {
      return normalised;
    }
  }

  return DEFAULT_PARTNER_CUT;
};

const extractOverride = (user, key) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const overrideObject =
    user.payoutOverride ?? user.payout_override ?? user.payout ?? user.payouts ?? null;

  const keyVariants = [
    key,
    `${key}Amount`,
    `${key}_amount`,
    `${key}Payout`,
    `${key}_payout`,
    `${key}Override`,
    `${key}_override`,
    `${key}Value`,
    `${key}_value`,
  ];

  const directValues = [
    user?.[`${key}PayoutOverride`],
    user?.[`${key}_payout_override`],
    user?.[`${key}Payout`],
    user?.[`${key}_payout`],
    user?.[`${key}Override`],
    user?.[`${key}_override`],
  ];

  if (overrideObject && typeof overrideObject === 'object') {
    for (const variant of keyVariants) {
      if (variant in overrideObject) {
        directValues.push(overrideObject[variant]);
      }
    }
  }

  return pickNumber(directValues, null);
};

const getUserCodeValue = (user = {}) => {
  const codeValue =
    user.code ??
    user.codeValue ??
    user.code_value ??
    user.inviteCode ??
    user.invite_code ??
    null;

  if (typeof codeValue === 'string') {
    return codeValue.trim();
  }

  return null;
};

const isAffiliateUser = (user = {}) => {
  const explicitRole = user.role ?? user.roleCode ?? user.role_code ?? user.userType ?? null;

  if (typeof explicitRole === 'string') {
    const normalised = explicitRole.trim().toUpperCase();
    if (normalised === 'AF' || normalised === 'AFFILIATE' || normalised === 'AFFILIATED') {
      return true;
    }
    if (normalised === 'PT' || normalised === 'PARTNER') {
      return false;
    }
  }

  const affiliateId = normaliseId(user.affiliateId ?? user.affiliate_id ?? user.parent_affiliate_id);
  if (affiliateId != null && affiliateId !== '' && affiliateId !== 0) {
    return true;
  }

  const codeValue = getUserCodeValue(user);
  if (codeValue) {
    const upperCode = codeValue.toUpperCase();
    if (upperCode.startsWith('AF') || upperCode.includes('AF-')) {
      return true;
    }
    if (upperCode.startsWith('PT') || upperCode.includes('PT-')) {
      return false;
    }
  }

  return false;
};

const getPartnerTable = (db) => resolveTable(db, PARTNER_TABLE_PATHS);
const getAffiliateTable = (db) => resolveTable(db, AFFILIATE_TABLE_PATHS);

export function payoutForUser(user, db = {}) {
  if (!user || typeof user !== 'object') {
    return { partner: 0, affiliate: 0 };
  }

  const accountType = normaliseAccountType(user);
  const partnerOverride = extractOverride(user, 'partner');
  const affiliateOverride = extractOverride(user, 'affiliate');

  const partnerTable = getPartnerTable(db);
  const affiliateTable = getAffiliateTable(db);

  const affiliateUser = isAffiliateUser(user);

  if (!affiliateUser) {
    const partnerDefault = tableLookup(partnerTable, accountType, 0);
    const partnerPayout = partnerOverride != null ? partnerOverride : partnerDefault;
    return {
      affiliate: 0,
      partner: normaliseMoney(partnerPayout),
    };
  }

  const affiliateDefault = tableLookup(affiliateTable, accountType, 0);
  const affiliatePayout = affiliateOverride != null ? affiliateOverride : affiliateDefault;
  const partnerCut = extractPartnerCut(user, db);
  const partnerShareDefault = affiliatePayout * partnerCut;
  const partnerPayout = partnerOverride != null ? partnerOverride : partnerShareDefault;

  return {
    affiliate: normaliseMoney(affiliatePayout),
    partner: normaliseMoney(partnerPayout),
  };
}

export default {
  payoutForUser,
};
