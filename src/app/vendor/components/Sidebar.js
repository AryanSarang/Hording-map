// app/vendor/components/Sidebar.js
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    function isActive(path) {
        // Exact match for dashboard, startsWith for others
        if (path === '/vendor/dashboard') return pathname === path;
        return pathname.startsWith(path);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <h2 className={styles.logo}>Hording Map</h2>
                </Link>
            </div>

            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    <div className={styles.navLabel}>Main</div>
                    <Link
                        href="/vendor/dashboard"
                        className={`${styles.navItem} ${isActive('/vendor/dashboard') ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>📊</span>
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/vendor/media"
                        className={`${styles.navItem} ${isActive('/vendor/media') ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>🎯</span>
                        <span>Media</span>
                    </Link>
                </div>

                <div className={styles.navSection}>
                    <div className={styles.navLabel}>Management</div>
                    <Link
                        href="/vendor/metafields"
                        className={`${styles.navItem} ${isActive('/vendor/metafields') ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>⚙️</span>
                        <span>Metafields</span>
                    </Link>
                </div>
            </nav>

            <div className={styles.sidebarFooter}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
}
