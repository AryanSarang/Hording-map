/**
 * Tiny in-process TTL cache for expensive server-side reads.
 *
 * Why this instead of Next.js fetch cache or Redis:
 *   - The /explore SSR runs `revalidate = 0` because the user-scoped sections (e.g.
 *     current plan) need fresh data, but the public catalog pieces (distinct media
 *     types, vendor metafield list, base catalog) change infrequently and can be
 *     safely shared across users for short windows.
 *   - We don't yet have a Redis dependency and don't want to add one for this win.
 *   - Vercel serverless caches survive between warm-start invocations, so this still
 *     pays off in practice. Cold starts simply re-warm; correctness is unaffected
 *     because every entry has a TTL.
 *
 * Usage:
 *   const data = await getOrSetCached('key', 30_000, async () => fetchHeavyThing());
 *
 * Caveats:
 *   - Per-instance. With multiple serverless instances each warms independently.
 *   - Not safe for user-scoped data (no key scoping helper). Use only for shared/public
 *     reads. To cache per-user, include the user id in the key.
 */
const _cache = new Map();

/**
 * Returns cached value if fresh, otherwise calls `producer`, caches the result, and
 * returns it. If `producer` throws, the prior cached value is preserved (so transient
 * Supabase failures don't poison the cache).
 *
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} producer
 * @returns {Promise<T>}
 */
export async function getOrSetCached(key, ttlMs, producer) {
    const now = Date.now();
    const entry = _cache.get(key);
    if (entry && entry.expiresAt > now) {
        return entry.value;
    }
    try {
        const value = await producer();
        _cache.set(key, { value, expiresAt: now + ttlMs });
        return value;
    } catch (err) {
        if (entry) return entry.value; // stale-on-error
        throw err;
    }
}

/** Manual invalidation hook for write paths that mutate cached resources. */
export function invalidateCacheKey(key) {
    _cache.delete(key);
}

/**
 * Invalidates every key that starts with the given prefix. Useful when a single resource
 * has multiple cache permutations (e.g. catalog keyed by `:catalog:<region>:<mf-ids>`).
 */
export function invalidateCachePrefix(prefix) {
    if (!prefix) return;
    for (const key of _cache.keys()) {
        if (key.startsWith(prefix)) _cache.delete(key);
    }
}

/** Bulk clear — used by tests / dev refresh. */
export function clearMemoryCache() {
    _cache.clear();
}
