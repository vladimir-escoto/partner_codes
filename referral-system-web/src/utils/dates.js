/**
 * Helpers para trabajar con fechas.
 */

const normalizeDate = (input) => {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }
  if (typeof input === 'string' || typeof input === 'number') {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new TypeError('Fecha inválida');
    }
    return parsed;
  }
  if (input === undefined) {
    return new Date();
  }
  throw new TypeError('Tipo de fecha no soportado');
};

const pad = (num) => String(num).padStart(2, '0');

/**
 * Devuelve la fecha actual en formato ISO (YYYY-MM-DD).
 * @returns {string}
 */
export const todayISO = () => ymd(new Date());

/**
 * Convierte una fecha a formato YYYY-MM-DD.
 * @param {Date|string|number} date
 * @returns {string}
 */
export const ymd = (date) => {
  const normalized = normalizeDate(date);
  const year = normalized.getFullYear();
  const month = pad(normalized.getMonth() + 1);
  const day = pad(normalized.getDate());
  return `${year}-${month}-${day}`;
};

/**
 * Crea una clave de mes en formato YYYY-MM a partir de una fecha.
 * @param {Date|string|number} date
 * @returns {string}
 */
export const monthKey = (date) => {
  const normalized = normalizeDate(date);
  const year = normalized.getFullYear();
  const month = pad(normalized.getMonth() + 1);
  return `${year}-${month}`;
};

if (typeof window !== 'undefined') {
  try {
    const sample = new Date('2024-01-02');
    console.assert(ymd(sample) === '2024-01-02', 'ymd(...) debería devolver YYYY-MM-DD');
    console.assert(monthKey(sample) === '2024-01', 'monthKey(...) debería devolver YYYY-MM');
    console.assert(typeof todayISO() === 'string', 'todayISO(...) debería devolver una cadena');
  } catch (error) {
    console.warn('Fallo en comprobaciones de dates.js:', error);
  }
}
