'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    function isActive(path) {
        return pathname.startsWith(path);
    }

    function handleLogout() {
        localStorage.removeItem('vendorToken');
        router.push('/auth/login');
    }

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h2 className={styles.logo}>📍 Hording Map</h2>
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
                        href="/vendor/hordings"
                        className={`${styles.navItem} ${isActive('/vendor/hordings') ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>🎯</span>
                        <span>Hordings</span>
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
