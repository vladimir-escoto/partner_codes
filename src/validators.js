const CODE_REGEX = /^(PT|AF)[A-Z0-9]{5}$/;

export function isValidCode(code) {
  if (typeof code !== 'string') {
    return false;
  }

  const normalisedCode = code.trim().toUpperCase();
  return CODE_REGEX.test(normalisedCode);
}

export function canUseCode(codeObj) {
  if (!codeObj || typeof codeObj !== 'object') {
    return false;
  }

  const { status, max_uses: maxUses, uses, use_count: useCount, current_uses: currentUses } = codeObj;

  if (status && String(status).toLowerCase() !== 'active') {
    return false;
  }

  if (maxUses == null) {
    return true;
  }

  if (typeof maxUses !== 'number' || Number.isNaN(maxUses) || maxUses < 0) {
    return false;
  }

  const normalisedUses = [uses, useCount, currentUses].find((value) => value != null);
  const totalUses = normalisedUses == null ? 0 : Number(normalisedUses);

  if (!Number.isFinite(totalUses) || totalUses < 0) {
    return false;
  }

  return totalUses < maxUses;
}

export function requireParentForAffiliate(codePayload) {
  if (!codePayload || typeof codePayload !== 'object') {
    throw new Error('Code payload is required');
  }

  const { code, parent_partner_id: parentPartnerId } = codePayload;

  if (!isValidCode(code)) {
    throw new Error('Code format is invalid');
  }

  const isAffiliate = code.toUpperCase().startsWith('AF');

  if (!isAffiliate) {
    return true;
  }

  if (!Number.isInteger(parentPartnerId) || parentPartnerId <= 0) {
    throw new Error('Affiliate codes require a valid parent_partner_id');
  }

  return true;
}
