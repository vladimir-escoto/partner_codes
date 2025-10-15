/**
 * Acceso seguro a localStorage con serialización JSON.
 */

const ensureStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage no está disponible en este entorno');
  }
  return window.localStorage;
};

/**
 * Lee un valor JSON desde localStorage.
 * @param {string} key
 * @returns {any}
 */
export const read = (key) => {
  const storage = ensureStorage();
  const raw = storage.getItem(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`No fue posible parsear la clave "${key}"`, error);
    return raw;
  }
};

/**
 * Serializa y guarda un valor en localStorage.
 * @param {string} key
 * @param {any} value
 */
export const write = (key, value) => {
  const storage = ensureStorage();
  try {
    const serialized = JSON.stringify(value);
    storage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`No fue posible guardar la clave "${key}"`, error);
    return false;
  }
};

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const testKey = '__utils_storage_test__';
    const payload = { ok: true };
    write(testKey, payload);
    const restored = read(testKey);
    console.assert(restored && restored.ok === true, 'read/write deberían preservar los datos');
    window.localStorage.removeItem(testKey);
  } catch (error) {
    console.warn('Fallo en comprobaciones de storage.js:', error);
  }
}
