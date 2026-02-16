'use client';

import { useState, useEffect } from 'react';
import styles from '../hordings.module.css';

export default function VendorDropdown({ value, onChange, placeholder = 'Select owner (vendor)' }) {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', contactEmail: '', contactPhone: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);

    async function fetchOwners() {
        try {
            setLoading(true);
            const res = await fetch('/api/owners');
            const data = await res.json();
            if (data.success) setOwners(data.data || []);
        } catch (err) {
            console.error('Failed to fetch owners:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOwners();
    }, []);

    async function handleCreate(e) {
        e.preventDefault();
        if (!createForm.name?.trim()) {
            setCreateError('Vendor name is required');
            return;
        }
        setCreating(true);
        setCreateError(null);
        try {
            const res = await fetch('/api/owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createForm.name.trim(),
                    contactEmail: createForm.contactEmail?.trim() || undefined,
                    contactPhone: createForm.contactPhone?.trim() || undefined,
                    description: createForm.description?.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setOwners(prev => [...prev, data.data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
                onChange(data.data.id);
                setCreateForm({ name: '', contactEmail: '', contactPhone: '', description: '' });
                setShowCreate(false);
            } else {
                setCreateError(data.error || 'Failed to create vendor');
            }
        } catch (err) {
            setCreateError('Failed to create vendor');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className={styles.formGroup}>
            <label>Owner (Vendor)</label>
            {loading ? (
                <div className={styles.loading}>Loading vendors...</div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                            name="vendorId"
                            value={value ?? ''}
                            onChange={e => {
                                const v = e.target.value;
                                onChange(v ? parseInt(v) : null);
                            }}
                        >
                            <option value="">{placeholder}</option>
                            {owners.map(o => (
                                <option key={o.id} value={o.id}>{o.name}{o.contact_email ? ` — ${o.contact_email}` : ''}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className={styles.createVendorBtn}
                            onClick={() => setShowCreate(prev => !prev)}
                        >
                            {showCreate ? 'Cancel' : '+ Create new vendor'}
                        </button>
                    </div>

                    {showCreate && (
                        <div className={styles.createVendorForm}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>Create new vendor (owner)</h4>
                            {createError && <div className={styles.error} style={{ marginBottom: 10 }}>{createError}</div>}
                            <form onSubmit={handleCreate}>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.required}>Name</label>
                                        <input
                                            type="text"
                                            placeholder="Vendor name"
                                            value={createForm.name}
                                            onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Contact Email</label>
                                        <input
                                            type="email"
                                            placeholder="contact@example.com"
                                            value={createForm.contactEmail}
                                            onChange={e => setCreateForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Contact Phone</label>
                                        <input
                                            type="text"
                                            placeholder="+91 XXXXX XXXXX"
                                            value={createForm.contactPhone}
                                            onChange={e => setCreateForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.wide}`}>
                                        <label>Description</label>
                                        <textarea
                                            placeholder="Brief description (optional)"
                                            value={createForm.description}
                                            onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                            rows="2"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <button type="submit" className={styles.submitBtn} disabled={creating}>
                                        {creating ? 'Creating...' : 'Create & Select'}
                                    </button>
                                    <button type="button" className={styles.cancelBtn} onClick={() => { setShowCreate(false); setCreateError(null); }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
