import { supabaseAdmin } from './supabase';
import { getCurrentUser } from './authServer';

function isAdminRole(role) {
  return role === 'admin';
}

export async function getCreditContext() {
  // Use getUser() (authenticated) to avoid auth-js warning.
  const user = await getCurrentUser();
  if (!user) return null;

  // profiles.role determines whether the user is admin (admins are exempt from credit deduction)
  let role = null;
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // If profile row isn't present yet, treat as non-admin.
      // We intentionally don't throw here because credits should still work.
      role = null;
    } else {
      role = profile?.role ?? null;
    }
  } catch {
    role = null;
  }

  const isAdmin = isAdminRole(role);
  return { user, role, isAdmin };
}

export async function getUserCreditBalance() {
  const ctx = await getCreditContext();
  if (!ctx) return { success: false, error: 'Not authenticated', status: 401 };

  if (ctx.isAdmin) {
    // Admins are exempt; we return `exempt: true`.
    return { success: true, credits: null, exempt: true };
  }

  // Robust read path: avoid RPC failures returning 500; directly read + lazy init.
  const { data: existingRow, error: readErr } = await supabaseAdmin
    .from('user_credit_balances')
    .select('credits')
    .eq('user_id', ctx.user.id)
    .maybeSingle();

  if (readErr) {
    return { success: false, error: readErr.message || 'Failed to read credits', status: 500 };
  }

  if (existingRow?.credits == null) {
    const { error: upsertErr } = await supabaseAdmin
      .from('user_credit_balances')
      .upsert({ user_id: ctx.user.id, credits: 50 }, { onConflict: 'user_id' });

    if (upsertErr) {
      return { success: false, error: upsertErr.message || 'Failed to initialize credits', status: 500 };
    }

    const { data: createdRow, error: createdReadErr } = await supabaseAdmin
      .from('user_credit_balances')
      .select('credits')
      .eq('user_id', ctx.user.id)
      .maybeSingle();

    if (createdReadErr) {
      return { success: false, error: createdReadErr.message || 'Failed to read credits', status: 500 };
    }

    return { success: true, credits: Number(createdRow?.credits ?? 50), exempt: false };
  }

  return { success: true, credits: Number(existingRow.credits), exempt: false };
}

export async function applyCreditDelta({ action, delta, metadata }) {
  const ctx = await getCreditContext();
  if (!ctx) return { success: false, error: 'Not authenticated', status: 401 };

  if (ctx.isAdmin) {
    return { success: true, credits: null, exempt: true, applied: false };
  }

  const safeDelta = Number(delta);
  if (!Number.isFinite(safeDelta)) {
    return { success: false, error: 'Invalid credit delta', status: 400 };
  }

  const { data, error } = await supabaseAdmin.rpc('apply_credit_delta', {
    p_user_id: ctx.user.id,
    p_action: action,
    p_delta: safeDelta,
    p_metadata: metadata ?? {},
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to apply credits', status: 500 };
  }

  return {
    success: true,
    credits: Number(data),
    exempt: false,
    applied: true,
  };
}

