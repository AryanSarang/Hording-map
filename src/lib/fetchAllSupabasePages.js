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

/**
 * Same as {@link fetchAllSupabasePages} but loads N pages per round in parallel
 * (fewer round trips — important for Vercel serverless RTT to Supabase).
 *
 * @param {(from: number, to: number) => Promise<{ data: unknown[] | null, error: Error | null }>} fetchPage
 * @param {number} [pageSize=1000]
 * @param {number} [parallelPages=4]
 */
export async function fetchAllSupabasePagesParallel(
    fetchPage,
    pageSize = 1000,
    parallelPages = 4
) {
    const all = [];
    let baseFrom = 0;
    for (; ;) {
        const ranges = Array.from({ length: parallelPages }, (_, p) => {
            const from = baseFrom + p * pageSize;
            return { from, to: from + pageSize - 1 };
        });
        const results = await Promise.all(
            ranges.map(({ from, to }) => fetchPage(from, to))
        );
        let stop = false;
        for (const { data, error } of results) {
            if (error) return { data: null, error };
            const chunk = Array.isArray(data) ? data : [];
            all.push(...chunk);
            if (chunk.length < pageSize) {
                stop = true;
                break;
            }
        }
        if (stop) break;
        baseFrom += parallelPages * pageSize;
    }
    return { data: all, error: null };
}
