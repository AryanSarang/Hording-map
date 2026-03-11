/**
 * Generate a random 10-character string ID (hex).
 * Use when DB uses varchar(10) for id (after running short-id migration).
 */
import crypto from 'crypto';

export function genId10() {
    return crypto.randomBytes(5).toString('hex');
}

/** True if id is 10-char hex (for DB with varchar(10) id). */
export function isValidId10(id) {
    return typeof id === 'string' && id.length === 10 && /^[a-f0-9]{10}$/i.test(id);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if id is a valid UUID (current DB) or 10-char hex (after migration). */
export function isValidMediaId(id) {
    if (typeof id !== 'string' || !id) return false;
    return UUID_REGEX.test(id) || isValidId10(id);
}
