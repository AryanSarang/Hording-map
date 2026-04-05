/**
 * Supabase/PostgREST returns at most `max_rows` per request (default often 1000).
 * Page with .range(from, to) until a short page is returned.
 *
 * @param {(from: number, to: number) => Promise<{ data: unknown[] | null, error: Error | null }>} fetchPage
 * @param {number} [pageSize=1000]
 * @returns {Promise<{ data: unknown[], error: Error | null }>}
 */
export async function fetchAllSupabasePages(fetchPage, pageSize = 1000) {
    const all = [];
    let from = 0;
    for (; ;) {
        const to = from + pageSize - 1;
        const { data, error } = await fetchPage(from, to);
        if (error) return { data: null, error };
        const chunk = Array.isArray(data) ? data : [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
    }
    return { data: all, error: null };
}
