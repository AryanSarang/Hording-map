/**
 * Cache invalidation helpers for routes that mutate explore-visible inventory.
 *
 * Centralized here so every write path that affects the /explore catalog (creates, updates,
 * deletes, bulk imports, variant changes, metafield toggles) clears the relevant in-memory
 * caches in lockstep. Otherwise stale data would hang around for up to the cache TTL (60s
 * for the catalog).
 *
 * Note: this only invalidates the *current serverless instance's* cache. Other warm
 * instances will continue serving stale data until their own TTL expires. That's an
 * acceptable trade-off because the TTLs are short (≤5 min); for stronger guarantees we'd
 * need Redis/KV with pub-sub which is overkill for this app size.
 */
import { invalidateCacheKey, invalidateCachePrefix } from './memoryCache';

/** Clears every catalog cache permutation (varies by enabled-metafield list). */
export function invalidateExploreCatalog() {
    invalidateCachePrefix('explore:catalog:');
}

/** Clears the distinct-media-type cache (vendor created a new media type / removed one). */
export function invalidateExploreMediaTypes() {
    invalidateCacheKey('explore:distinct-media-types');
}

/** Clears the metafield-filter-list cache (admin toggled explore_filter_enabled). */
export function invalidateExploreMetafieldList() {
    invalidateCacheKey('explore:metafield-filter-list');
}
