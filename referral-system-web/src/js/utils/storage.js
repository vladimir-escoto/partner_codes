const STORAGE_KEY = 'referral-system:db';
let memoryStore = null;

function hasLocalStorage() {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.localStorage !== 'undefined' &&
    globalThis.localStorage !== null
  );
}

function readRaw() {
  if (hasLocalStorage()) {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  }
  return memoryStore;
}

function writeRaw(value) {
  if (hasLocalStorage()) {
    if (value === null) {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    } else {
      globalThis.localStorage.setItem(STORAGE_KEY, value);
    }
    return;
  }

  memoryStore = value;
}

function loadDB() {
  const raw = readRaw();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse DB snapshot, resetting storage.', error);
    writeRaw(null);
    return null;
  }
}

function persist(db) {
  const serialized = JSON.stringify(db);
  writeRaw(serialized);
  return db;
}

export { STORAGE_KEY, loadDB, persist };
