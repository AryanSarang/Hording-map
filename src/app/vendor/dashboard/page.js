'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        hordingsCount: 0,
        activeCount: 0,
        totalRevenue: 0,
    });
    const [recentHordings, setRecentHordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const res = await fetch('/api/vendors/hordings');
            const data = await res.json();

            if (data.success) {
                const hordings = data.data || [];
                const active = hordings.filter(h => h.status === 'active').length;
                const revenue = hordings.reduce((sum, h) => sum + (h.rate || 0), 0);

                setStats({
                    hordingsCount: hordings.length,
                    activeCount: active,
                    totalRevenue: revenue,
                });
                setRecentHordings(hordings.slice(0, 5));
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <Sidebar />

            <main className={styles.main}>
                <div className={styles.topbar}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <Link href="/vendor/hordings/new" className={styles.createBtn}>
                        + New Hording
                    </Link>
                </div>

                <div className={styles.content}>
                    {error && <div className={styles.errorAlert}>{error}</div>}

                    {loading ? (
                        <div className={styles.loading}>Loading dashboard...</div>
                    ) : (
                        <>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>Total Hordings</div>
                                    <div className={styles.statValue}>{stats.hordingsCount}</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>Active Sites</div>
                                    <div className={styles.statValue}>{stats.activeCount}</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>Total Revenue</div>
                                    <div className={styles.statValue}>₹{(stats.totalRevenue / 100000).toFixed(1)}L</div>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>📋 Recent Hordings</h2>
                                {recentHordings.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>No hordings yet. Create your first one!</p>
                                    </div>
                                ) : (
                                    <div className={styles.cardGrid}>
                                        {recentHordings.map((hording) => (
                                            <div key={hording.id} className={styles.card}>
                                                <div className={styles.cardHeader}>
                                                    <div>
                                                        <h3 className={styles.cardTitle}>{hording.name}</h3>
                                                        <p className={styles.cardMeta}>{hording.city}, {hording.state || 'N/A'}</p>
                                                    </div>
                                                    <span className={`${styles.badge} ${styles[`badge-${hording.status}`]}`}>
                                                        {hording.status}
                                                    </span>
                                                </div>
                                                <div className={styles.cardRow}>
                                                    <span>Rate:</span>
                                                    <strong>₹{hording.rate?.toLocaleString() || '0'}/mo</strong>
                                                </div>
                                                <div className={styles.cardRow}>
                                                    <span>Type:</span>
                                                    <strong>{hording.mediaType || 'N/A'}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
