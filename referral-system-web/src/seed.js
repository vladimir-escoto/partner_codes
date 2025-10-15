import seedTemplate from './seed.json';
import { loadDB, persist } from './js/utils/storage.js';

const REGIONS = ['North America', 'Latin America', 'Europe', 'Asia Pacific'];
const USER_TYPES = ['customer', 'merchant', 'ambassador', 'promoter'];
const USER_STATUSES = ['active', 'inactive', 'pending'];
const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Camila',
  'Diego',
  'Sophie',
  'Lucas',
  'Maya',
  'Mateo',
  'Emma',
  'Noah'
];
const LAST_NAMES = [
  'Rivera',
  'Johnson',
  'Fernandez',
  'Smith',
  'Paredes',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Keller',
  'Williams'
];

const USERS_TO_GENERATE = 60;

function randomFrom(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}

function randomDateWithin(days) {
  const now = Date.now();
  const window = days * 24 * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * window);
  return new Date(now - offset).toISOString();
}

function createPartners() {
  const timestamp = new Date().toISOString();
  return [
    {
      id: 'PT-001',
      name: 'Terra Partners',
      shortName: 'Terra',
      region: 'Latin America',
      status: 'active',
      createdAt: timestamp
    },
    {
      id: 'PT-002',
      name: 'Nova Growth',
      shortName: 'Nova',
      region: 'Europe',
      status: 'active',
      createdAt: timestamp
    }
  ];
}

function createAffiliates(partners) {
  const [primaryPartner] = partners;
  const timestamp = new Date().toISOString();
  return [
    {
      id: 'AF-001',
      partnerId: primaryPartner.id,
      name: 'Horizons Media',
      region: 'Mexico',
      status: 'active',
      createdAt: timestamp
    },
    {
      id: 'AF-002',
      partnerId: primaryPartner.id,
      name: 'Pulse Digital',
      region: 'Chile',
      status: 'active',
      createdAt: timestamp
    }
  ];
}

function buildUser({
  userId,
  codeId,
  affiliate,
  partner,
  app,
  createdAt
}) {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  const email = `${firstName}.${lastName}${userId}@example.com`.toLowerCase();

  return {
    id: userId,
    partnerId: partner.id,
    affiliateId: affiliate.id,
    appId: app.id,
    codeId,
    firstName,
    lastName,
    email,
    region: randomFrom(REGIONS),
    type: randomFrom(USER_TYPES),
    status: randomFrom(USER_STATUSES),
    createdAt
  };
}

function buildCode({
  codeId,
  userId,
  affiliate,
  partner,
  app,
  createdAt
}) {
  return {
    id: codeId,
    value: `${affiliate.id}-${String(codeId).padStart(4, '0')}`,
    partnerId: partner.id,
    affiliateId: affiliate.id,
    userId,
    appId: app.id,
    createdAt
  };
}

function createUsersAndCodes({ affiliates, partners, apps, count }) {
  const users = [];
  const codes = [];
  let lastUserId = 0;
  let lastCodeId = 0;

  for (let index = 0; index < count; index += 1) {
    const affiliate = affiliates[Math.floor(Math.random() * affiliates.length)];
    const partner = partners.find((item) => item.id === affiliate.partnerId) || partners[0];
    const app = apps[index % apps.length];
    const createdAt = randomDateWithin(120);

    lastUserId += 1;
    lastCodeId += 1;

    const user = buildUser({
      userId: lastUserId,
      codeId: lastCodeId,
      affiliate,
      partner,
      app,
      createdAt
    });
    const code = buildCode({
      codeId: lastCodeId,
      userId: lastUserId,
      affiliate,
      partner,
      app,
      createdAt
    });

    users.push(user);
    codes.push(code);
  }

  return {
    users,
    codes,
    lastUserId,
    lastCodeId
  };
}

function cloneSeedTemplate() {
  return JSON.parse(JSON.stringify(seedTemplate));
}

function ensureSeed() {
  const existing = loadDB();
  if (existing && Array.isArray(existing.users) && existing.users.length > 0) {
    return existing;
  }

  const seed = cloneSeedTemplate();
  const partners = createPartners();
  const affiliates = createAffiliates(partners);
  const { users, codes, lastUserId, lastCodeId } = createUsersAndCodes({
    affiliates,
    partners,
    apps: seed.apps,
    count: USERS_TO_GENERATE
  });

  seed.settings.seededAt = new Date().toISOString();
  seed.partners = partners;
  seed.affiliates = affiliates;
  seed.users = users;
  seed.codes = codes;
  seed.counters.lastUserId = lastUserId;
  seed.counters.lastCodeId = lastCodeId;

  persist(seed);

  return seed;
}

export { ensureSeed };
