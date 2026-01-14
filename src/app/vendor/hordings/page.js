'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import styles from './hordings.module.css';

export default function HordingsPage() {
    const [hordings, setHordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchHordings();
    }, []);

    async function fetchHordings() {
        try {
            setLoading(true);
            const res = await fetch('/api/vendors/hordings');
            const data = await res.json();

            if (data.success) {
                setHordings(data.data || []);
            } else {
                setError(data.error || 'Failed to fetch hordings');
            }
        } catch (err) {
            console.error('Error fetching hordings:', err);
            setError('Error fetching hordings');
        } finally {
            setLoading(false);
        }
    }

    async function deleteHording(id) {
        if (!confirm('Are you sure you want to delete this hording?')) return;

        try {
            const res = await fetch(`/api/vendors/hordings/${id}`, { method: 'DELETE' });

            if (res.ok) {
                setHordings(hordings.filter(h => h.id !== id));
                alert('Hording deleted successfully');
            } else {
                alert('Failed to delete hording');
            }
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error deleting hording');
        }
    }

    return (
        <div className={styles.container}>
            <Sidebar />

            <main className={styles.main}>
                <div className={styles.topbar}>
                    <h1 className={styles.title}>🎯 Hordings</h1>
                    <Link href="/vendor/hordings/new" className={styles.createBtn}>
                        + Create Hording
                    </Link>
                </div>

                <div className={styles.content}>
                    {error && <div className={styles.errorAlert}>{error}</div>}

                    {loading ? (
                        <div className={styles.loading}>Loading hordings...</div>
                    ) : hordings.length === 0 ? (
                        <div className={styles.section}>
                            <div className={styles.emptyState}>
                                <p>No hordings yet</p>
                                <Link href="/vendor/hordings/new" className={styles.createLink}>
                                    Create your first hording
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.section}>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>City</th>
                                            <th>Type</th>
                                            <th>Rate</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hordings.map((hording) => (
                                            <tr key={hording.id}>
                                                <td className={styles.bold}>{hording.name}</td>
                                                <td>{hording.city || 'N/A'}</td>
                                                <td>{hording.mediaType || 'N/A'}</td>
                                                <td>₹{hording.rate?.toLocaleString() || '0'}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles[`badge-${hording.status}`]}`}>
                                                        {hording.status}
                                                    </span>
                                                </td>
                                                <td className={styles.actions}>
                                                    <Link
                                                        href={`/vendor/hordings/${hording.id}`}
                                                        className={styles.btnSmall}
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        className={`${styles.btnSmall} ${styles.btnDanger}`}
                                                        onClick={() => deleteHording(hording.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
