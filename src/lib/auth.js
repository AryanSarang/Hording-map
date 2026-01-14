// src/lib/auth.js
import { headers } from 'next/headers';

/**
 * Get current user from session
 * Returns user object or null if not authenticated
 */
export async function getCurrentUser() {
    try {
        const headersList = headers();
        const userHeader = headersList.get('x-user');

        if (!userHeader) return null;

        return JSON.parse(userHeader);
    } catch (error) {
        console.error('Error parsing user from headers:', error);
        return null;
    }
}

/**
 * Get vendor ID from current user
 */
export async function getVendorId() {
    const user = await getCurrentUser();
    return user?.vendor_id || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}

/**
 * Check if user has vendor role
 */
export async function isVendor() {
    const user = await getCurrentUser();
    return user?.role === 'vendor';
}

/**
 * Verify user has access to vendor
 */
export async function canAccessVendor(vendorId) {
    const user = await getCurrentUser();
    if (!user) return false;

    // Admin can access all vendors
    if (user.role === 'admin') return true;

    // Vendor can only access their own
    return user.vendor_id === vendorId;
}

/**
 * Format user display name
 */
export function formatUserName(user) {
    if (!user) return 'Guest';
    return user.name || user.email || 'User';
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
    const user = await getCurrentUser();
    return user?.role === 'admin';
}


