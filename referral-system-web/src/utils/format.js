/**
 * Formateadores relacionados con presentación de datos.
 */

/**
 * Formatea un número como cantidad monetaria usando Intl.NumberFormat.
 * @param {number|string} value
 * @param {string} currency Código ISO 4217, por ejemplo 'USD' o 'EUR'.
 * @returns {string}
 */
export const fmtMoney = (value, currency = 'USD') => {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(amount)) {
    throw new TypeError('fmtMoney requiere un valor numérico válido');
  }

  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

if (typeof window !== 'undefined') {
  // Prueba rápida para usar en consola.
  try {
    console.assert(fmtMoney(12.5, 'USD') === new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(12.5));
  } catch (error) {
    console.warn('Fallo en comprobaciones de format.js:', error);
  }
}
