import { payoutForUser } from './payouts.js';
import { monthKey } from '../../utils/dates.js';

const ensureArray = (maybeArray) => (Array.isArray(maybeArray) ? maybeArray : []);

const createPayoutTotals = () => ({ partner: 0, affiliate: 0, total: 0 });

const clonePayoutTotals = (totals) => ({
  partner: totals.partner,
  affiliate: totals.affiliate,
  total: totals.total,
});

const accumulatePayout = (totals, payout) => {
  totals.partner += payout.partner;
  totals.affiliate += payout.affiliate;
  totals.total = totals.partner + totals.affiliate;
  return totals;
};

const createBucket = (base = {}) => ({
  users: 0,
  payout: createPayoutTotals(),
  ...base,
});

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

const findAppById = (appId, db) => {
  const id = normaliseId(appId);
  if (id == null) {
    return null;
  }

  return ensureArray(db?.apps).find((app) => {
    const candidate = normaliseId(app?.id ?? app?.appId ?? app?.app_id);
    return candidate != null && candidate === id;
  }) ?? null;
};

const summariseUsers = (users, db) => {
  const totals = createBucket();
  const byMonth = new Map();

  for (const user of users) {
    const payout = payoutForUser(user, db);
    totals.users += 1;
    accumulatePayout(totals.payout, payout);

    const month = safeMonthKey(user?.createdAt ?? user?.created_at ?? user?.joinedAt);
    if (!byMonth.has(month)) {
      byMonth.set(month, createBucket({ month }));
    }
    const bucket = byMonth.get(month);
    bucket.users += 1;
    accumulatePayout(bucket.payout, payout);
  }

  const monthlySeries = Array.from(byMonth.values()).sort((a, b) => {
    if (a.month === 'unknown') return 1;
    if (b.month === 'unknown') return -1;
    return a.month.localeCompare(b.month);
  });

  return { totals, monthlySeries };
};

const ensurePartnerId = (entity, options = {}) => {
  const { includeEntityId = true } = options;
  const candidates = [
    entity?.partnerId,
    entity?.partner_id,
    entity?.parentPartnerId,
    entity?.parent_partner_id,
    entity?.ownerPartnerId,
    entity?.owner_partner_id,
  ];

  for (const candidate of candidates) {
    const normalised = normaliseId(candidate);
    if (normalised != null) {
      return normalised;
    }
  }

  if (includeEntityId) {
    const fallback = normaliseId(entity?.id ?? entity?.partner ?? entity?.code ?? entity?.identifier);
    if (fallback != null) {
      return fallback;
    }
  }

  return null;
};

const ensureAffiliateId = (entity, options = {}) => {
  const { includeEntityId = true } = options;
  const candidates = [
    entity?.affiliateId,
    entity?.affiliate_id,
    entity?.parentAffiliateId,
    entity?.parent_affiliate_id,
    entity?.ownerAffiliateId,
    entity?.owner_affiliate_id,
  ];

  for (const candidate of candidates) {
    const normalised = normaliseId(candidate);
    if (normalised != null) {
      return normalised;
    }
  }

  if (includeEntityId) {
    const fallback = normaliseId(entity?.id ?? entity?.affiliate ?? entity?.code ?? entity?.identifier);
    if (fallback != null) {
      return fallback;
    }
  }

  return null;
};

export function metricsGlobal(db = {}) {
  const users = ensureArray(db?.users);
  const totals = createBucket();
  const byApp = new Map();
  const byMonth = new Map();
  const byRegion = new Map();

  for (const user of users) {
    const payout = payoutForUser(user, db);
    totals.users += 1;
    accumulatePayout(totals.payout, payout);

    const appId = normaliseId(user?.appId ?? user?.app_id ?? user?.applicationId);
    const app = appId != null ? findAppById(appId, db) : null;
    const appKey = appId ?? 'unknown';
    if (!byApp.has(appKey)) {
      byApp.set(
        appKey,
        createBucket({
          id: appKey,
          name: app?.name ?? app?.label ?? appKey ?? 'Unknown',
        }),
      );
    }
    const appBucket = byApp.get(appKey);
    appBucket.users += 1;
    accumulatePayout(appBucket.payout, payout);

    const month = safeMonthKey(user?.createdAt ?? user?.created_at ?? user?.joinedAt);
    if (!byMonth.has(month)) {
      byMonth.set(month, createBucket({ month }));
    }
    const monthBucket = byMonth.get(month);
    monthBucket.users += 1;
    accumulatePayout(monthBucket.payout, payout);

    const regionKey =
      (typeof user?.region === 'string' && user.region.trim()) || 'Unknown';
    if (!byRegion.has(regionKey)) {
      byRegion.set(regionKey, createBucket({ region: regionKey }));
    }
    const regionBucket = byRegion.get(regionKey);
    regionBucket.users += 1;
    accumulatePayout(regionBucket.payout, payout);
  }

  const sortByUsersDesc = (array) =>
    array.sort((a, b) => {
      if (a.users === b.users) {
        const labelA = a.name ?? a.region ?? a.id ?? '';
        const labelB = b.name ?? b.region ?? b.id ?? '';
        return labelA.localeCompare(labelB);
      }
      return b.users - a.users;
    });

  const byAppList = sortByUsersDesc(Array.from(byApp.values()));
  const byRegionList = sortByUsersDesc(Array.from(byRegion.values()));
  const byMonthList = Array.from(byMonth.values()).sort((a, b) => {
    if (a.month === 'unknown') return 1;
    if (b.month === 'unknown') return -1;
    return a.month.localeCompare(b.month);
  });

  return {
    totals: {
      users: totals.users,
      payout: clonePayoutTotals(totals.payout),
    },
    byApp: byAppList.map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      users: bucket.users,
      payout: clonePayoutTotals(bucket.payout),
    })),
    byMonth: byMonthList.map((bucket) => ({
      month: bucket.month,
      users: bucket.users,
      payout: clonePayoutTotals(bucket.payout),
    })),
    byRegion: byRegionList.map((bucket) => ({
      region: bucket.region,
      users: bucket.users,
      payout: clonePayoutTotals(bucket.payout),
    })),
    partnersCount: ensureArray(db?.partners).length,
    affiliatesCount: ensureArray(db?.affiliates).length,
  };
}

export function summaryForCode(code, db = {}) {
  const codes = ensureArray(db?.codes);
  const normalisedCode = typeof code === 'string' ? code.trim() : code;
  const codeRecord = codes.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const entryValues = [entry.value, entry.code, entry.id, entry.codeId, entry.code_id]
      .map((value) => (typeof value === 'string' ? value.trim() : value))
      .filter((value) => value != null);
    return entryValues.includes(normalisedCode);
  }) ?? null;

  const codeId = normaliseId(codeRecord?.id ?? codeRecord?.codeId ?? codeRecord?.code_id);
  const users = ensureArray(db?.users).filter((user) => {
    const userCodeId = normaliseId(user?.codeId ?? user?.code_id ?? user?.code);
    if (codeId != null) {
      return userCodeId === codeId;
    }
    if (typeof normalisedCode === 'string') {
      const codeValue = user?.code ?? user?.codeValue ?? user?.code_value;
      return typeof codeValue === 'string' && codeValue.trim() === normalisedCode;
    }
    return false;
  });

  const { totals, monthlySeries } = summariseUsers(users, db);

  return {
    code: codeRecord?.value ?? codeRecord?.code ?? normalisedCode ?? null,
    codeId,
    totals: {
      users: totals.users,
      payout: clonePayoutTotals(totals.payout),
    },
    monthlySeries: monthlySeries.map((bucket) => ({
      month: bucket.month,
      users: bucket.users,
      payout: clonePayoutTotals(bucket.payout),
    })),
    metadata: {
      partnerId: ensurePartnerId(codeRecord ?? {}, { includeEntityId: false }),
      affiliateId: ensureAffiliateId(codeRecord ?? {}, { includeEntityId: false }),
    },
  };
}

const createPartnerTotals = () => ({
  direct: createPayoutTotals(),
  fromAffiliates: {
    partner: 0,
    affiliate: 0,
    total: 0,
  },
  overall: createPayoutTotals(),
});

const accumulatePartnerTotals = (totals, payout, type) => {
  if (type === 'direct') {
    accumulatePayout(totals.direct, payout);
  } else {
    totals.fromAffiliates.partner += payout.partner;
    totals.fromAffiliates.affiliate += payout.affiliate;
    totals.fromAffiliates.total =
      totals.fromAffiliates.partner + totals.fromAffiliates.affiliate;
  }

  totals.overall.partner = totals.direct.partner + totals.fromAffiliates.partner;
  totals.overall.affiliate = totals.fromAffiliates.affiliate;
  totals.overall.total = totals.overall.partner + totals.overall.affiliate;
  return totals;
};

const createMonthlyPartnerBucket = (month) => ({
  month,
  users: {
    direct: 0,
    affiliates: 0,
    total: 0,
  },
  payouts: {
    direct: createPayoutTotals(),
    affiliates: {
      partner: 0,
      affiliate: 0,
      total: 0,
    },
    overall: createPayoutTotals(),
  },
});

const accumulateMonthlyPartnerBucket = (bucket, payout, type) => {
  if (type === 'direct') {
    bucket.users.direct += 1;
    accumulatePayout(bucket.payouts.direct, payout);
  } else {
    bucket.users.affiliates += 1;
    bucket.payouts.affiliates.partner += payout.partner;
    bucket.payouts.affiliates.affiliate += payout.affiliate;
    bucket.payouts.affiliates.total =
      bucket.payouts.affiliates.partner + bucket.payouts.affiliates.affiliate;
  }

  bucket.users.total = bucket.users.direct + bucket.users.affiliates;
  bucket.payouts.overall.partner =
    bucket.payouts.direct.partner + bucket.payouts.affiliates.partner;
  bucket.payouts.overall.affiliate = bucket.payouts.affiliates.affiliate;
  bucket.payouts.overall.total =
    bucket.payouts.overall.partner + bucket.payouts.overall.affiliate;
  return bucket;
};

export function summaryForPartner(partnerIdInput, db = {}) {
  const partnerId = normaliseId(partnerIdInput);
  const partner = ensureArray(db?.partners).find((item) => {
    const candidateId = ensurePartnerId(item);
    return candidateId != null && candidateId === partnerId;
  }) ?? null;

  const affiliates = ensureArray(db?.affiliates).filter((affiliate) => {
    const affiliatePartnerId = ensurePartnerId(affiliate, { includeEntityId: false });
    return affiliatePartnerId != null && affiliatePartnerId === partnerId;
  });
  const affiliateIds = new Set(affiliates.map((affiliate) => ensureAffiliateId(affiliate)).filter(Boolean));

  const users = ensureArray(db?.users).filter((user) => {
    const userPartnerId = normaliseId(user?.partnerId ?? user?.partner_id ?? user?.parent_partner_id);
    if (userPartnerId == null || userPartnerId !== partnerId) {
      return false;
    }
    return true;
  });

  const totals = {
    users: {
      direct: 0,
      affiliates: 0,
      total: 0,
    },
    payouts: createPartnerTotals(),
  };

  const monthly = new Map();

  for (const user of users) {
    const payout = payoutForUser(user, db);
    const affiliateId = normaliseId(user?.affiliateId ?? user?.affiliate_id ?? user?.parent_affiliate_id);
    const type = affiliateId != null && affiliateIds.has(affiliateId) ? 'affiliate' : 'direct';

    if (type === 'direct') {
      totals.users.direct += 1;
    } else {
      totals.users.affiliates += 1;
    }
    totals.users.total += 1;

    accumulatePartnerTotals(totals.payouts, payout, type === 'direct' ? 'direct' : 'affiliate');

    const month = safeMonthKey(user?.createdAt ?? user?.created_at ?? user?.joinedAt);
    if (!monthly.has(month)) {
      monthly.set(month, createMonthlyPartnerBucket(month));
    }
    const bucket = monthly.get(month);
    accumulateMonthlyPartnerBucket(bucket, payout, type === 'direct' ? 'direct' : 'affiliate');
  }

  const monthlySeries = Array.from(monthly.values()).sort((a, b) => {
    if (a.month === 'unknown') return 1;
    if (b.month === 'unknown') return -1;
    return a.month.localeCompare(b.month);
  });

  return {
    partner: partner ?? { id: partnerId },
    totals: {
      users: { ...totals.users },
      payouts: {
        direct: clonePayoutTotals(totals.payouts.direct),
        fromAffiliates: {
          partner: totals.payouts.fromAffiliates.partner,
          affiliate: totals.payouts.fromAffiliates.affiliate,
          total: totals.payouts.fromAffiliates.total,
        },
        overall: clonePayoutTotals(totals.payouts.overall),
      },
    },
    monthlySeries: monthlySeries.map((bucket) => ({
      month: bucket.month,
      users: { ...bucket.users },
      payouts: {
        direct: clonePayoutTotals(bucket.payouts.direct),
        affiliates: {
          partner: bucket.payouts.affiliates.partner,
          affiliate: bucket.payouts.affiliates.affiliate,
          total: bucket.payouts.affiliates.total,
        },
        overall: clonePayoutTotals(bucket.payouts.overall),
      },
    })),
    affiliates,
  };
}

export default {
  metricsGlobal,
  summaryForCode,
  summaryForPartner,
};
