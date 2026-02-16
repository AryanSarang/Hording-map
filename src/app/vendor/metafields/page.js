// app/vendor/metafields/page.js
// Metafields = custom field templates. When creating a hording, these fields appear to fill values.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './metafields.module.css';

export default function MetafieldsPage() {
    const [metafields, setMetafields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMetafields();
    }, []);

    async function fetchMetafields() {
        try {
            setLoading(true);
            const res = await fetch('/api/vendors/metafields');
            const data = await res.json();

            if (data.success) {
                setMetafields(data.data || []);
            } else {
                setError(data.error || 'Failed to fetch metafields');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to load metafields');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this metafield? It will be removed from all hordings.')) return;

        try {
            const res = await fetch(`/api/vendors/metafields/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMetafields(metafields.filter(m => m.id !== id));
            } else {
                alert('Failed to delete');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error deleting metafield');
        }
    }

    function getTypeLabel(m) {
        const d = m.metafield_definitions;
        return d ? d.label : m.key || '—';
    }

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Metafields</h1>
                <Link href="/vendor/metafields/new" className={styles.createBtn}>
                    + New Metafield
                </Link>
            </div>

            <div className={styles.content}>
                {error && <div className={styles.error}>{error}</div>}

                <p className={styles.hint} style={{ marginBottom: '1.5rem' }}>
                    Metafields are custom fields available when creating hordings. Add a field here, then fill in values when creating or editing each hording.
                </p>

                {loading ? (
                    <div className={styles.loading}>Loading metafields...</div>
                ) : metafields.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No metafields yet.</p>
                        <p className={styles.hint}>Create custom fields that will appear when you create or edit hordings.</p>
                        <Link href="/vendor/metafields/new" className={styles.createBtn} style={{ marginTop: '1rem', display: 'inline-block' }}>
                            Create your first metafield
                        </Link>
                    </div>
                ) : (
                    <div className={styles.section}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Key</th>
                                        <th>Type</th>
                                        <th>Options</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metafields.map((mf) => (
                                        <tr key={mf.id}>
                                            <td className={styles.nameTd}>{mf.name}</td>
                                            <td><code style={{ color: '#60a5fa', fontSize: '0.85rem' }}>{mf.key}</code></td>
                                            <td><span className={styles.badge}>{getTypeLabel(mf).toUpperCase()}</span></td>
                                            <td className={styles.valueTd}>
                                                {mf.options && Array.isArray(mf.options)
                                                    ? mf.options.join(', ')
                                                    : '—'}
                                            </td>
                                            <td className={styles.actions}>
                                                <Link href={`/vendor/metafields/${mf.id}`} className={styles.actionBtn}>
                                                    Edit
                                                </Link>
                                                <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(mf.id)}>
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
        </>
    );
}
