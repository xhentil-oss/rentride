// Shared constants
const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MS_PER_DAY = 86400000;

/**
 * Clamp pagination params to safe defaults.
 * @param {number|string} limit
 * @param {number|string} offset
 * @param {number} defaultLimit
 * @returns {[number, number]}
 */
function safePagination(limit, offset, defaultLimit = 100) {
  return [
    Math.min(Math.max(1, Number(limit) || defaultLimit), 500),
    Math.max(0, Number(offset) || 0),
  ];
}

module.exports = { BCRYPT_ROUNDS, REFRESH_TOKEN_EXPIRY_MS, MS_PER_DAY, safePagination };
