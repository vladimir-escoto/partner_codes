const DB_KEY = 'referral-system-db';

const DEFAULT_SEED = {
  users: [],
  codes: [],
  invoices: [],
  reports: [],
};

const hasStructuredClone = typeof structuredClone === 'function';

const clone = (value) => {
  if (hasStructuredClone) {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

let inMemoryDB;

const getDefaultDB = () => clone(DEFAULT_SEED);

export const loadDB = () => {
  if (inMemoryDB) {
    return inMemoryDB;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    inMemoryDB = getDefaultDB();
    return inMemoryDB;
  }

  const stored = window.localStorage.getItem(DB_KEY);
  let shouldPersist = false;

  if (!stored) {
    inMemoryDB = getDefaultDB();
    shouldPersist = true;
  } else {
    try {
      const parsed = JSON.parse(stored);

      if (parsed && typeof parsed === 'object') {
        inMemoryDB = parsed;
      } else {
        inMemoryDB = getDefaultDB();
        shouldPersist = true;
      }
    } catch (error) {
      inMemoryDB = getDefaultDB();
      shouldPersist = true;
    }
  }

  if (shouldPersist) {
    persist(inMemoryDB);
  }

  return inMemoryDB;
};

export const persist = (db) => {
  const stateToPersist = typeof db === 'undefined' ? getDB() : db;
  inMemoryDB = stateToPersist;

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(DB_KEY, JSON.stringify(stateToPersist));
};

export const getDB = () => {
  if (!inMemoryDB) {
    return loadDB();
  }

  return inMemoryDB;
};

export const setDB = (updater) => {
  if (typeof updater !== 'function') {
    throw new TypeError('setDB(updater) expects a function as the updater argument.');
  }

  const current = getDB();
  const updated = updater(current);

  if (typeof updated !== 'undefined') {
    inMemoryDB = updated;
  } else {
    inMemoryDB = current;
  }

  persist(inMemoryDB);
  return inMemoryDB;
};

export { DB_KEY };
