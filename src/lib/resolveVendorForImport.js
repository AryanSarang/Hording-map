import { isValidMediaId } from './genId10';

/** Normalize vendor name for dedupe (case-insensitive, trim). */
export function vendorNameKey(name) {
    return String(name || '').trim().toLowerCase();
}

/**
 * Load existing vendors for a user into a Map(nameKey -> id).
 */
export async function loadVendorNameCache(supabaseAdmin, userId) {
    const { data, error } = await supabaseAdmin
        .from('vendors')
        .select('id, name')
        .eq('user_id', userId);
    if (error) throw error;
    const map = new Map();
    for (const v of data || []) {
        const k = vendorNameKey(v.name);
        if (k && !map.has(k)) map.set(k, v.id);
    }
    return map;
}

/**
 * Resolve vendor id for import: optional legacy CSV vendor_id (must belong to user),
 * otherwise find-or-create by vendor_name for this user.
 */
export async function resolveVendorForImport(supabaseAdmin, userId, { vendorIdCsv, vendorNameCsv, cache }) {
    const idRaw = vendorIdCsv != null && String(vendorIdCsv).trim() !== '' ? String(vendorIdCsv).trim() : '';
    if (idRaw && isValidMediaId(idRaw)) {
        const { data: owned } = await supabaseAdmin
            .from('vendors')
            .select('id')
            .eq('id', idRaw)
            .eq('user_id', userId)
            .maybeSingle();
        if (owned?.id) return owned.id;
    }

    const name = String(vendorNameCsv || '').trim();
    if (!name) return null;

    const k = vendorNameKey(name);
    if (cache.has(k)) return cache.get(k);

    const { data: inserted, error: insErr } = await supabaseAdmin
        .from('vendors')
        .insert([{ name, user_id: userId, status: 'active' }])
        .select('id')
        .single();

    if (!insErr && inserted?.id) {
        cache.set(k, inserted.id);
        return inserted.id;
    }

    const isDup = insErr && (insErr.code === '23505' || String(insErr.message || '').toLowerCase().includes('duplicate'));

    // Unique race or duplicate name: reload this user's vendors for this key
    const { data: rows, error: selErr } = await supabaseAdmin
        .from('vendors')
        .select('id, name')
        .eq('user_id', userId);
    if (selErr) throw selErr;
    for (const v of rows || []) {
        const vk = vendorNameKey(v.name);
        if (vk && !cache.has(vk)) cache.set(vk, v.id);
    }
    if (cache.has(k)) return cache.get(k);

    if (isDup) {
        const { data: row } = await supabaseAdmin
            .from('vendors')
            .select('id, name')
            .eq('user_id', userId)
            .ilike('name', name)
            .maybeSingle();
        if (row?.id) {
            cache.set(vendorNameKey(row.name), row.id);
            return row.id;
        }
    }

    throw new Error(insErr?.message || 'Failed to resolve vendor');
}
