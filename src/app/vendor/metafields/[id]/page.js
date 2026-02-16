// app/vendor/metafields/[id]/page.js
// Edit metafield template (name, type, options) - not values
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../metafields.module.css';

export default function EditMetafieldPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [definitions, setDefinitions] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        definitionId: '',
        optionsInput: '',
    });

    useEffect(() => {
        Promise.all([
            fetch(`/api/vendors/metafields/${id}`).then(r => r.json()),
            fetch('/api/vendors/metafield-definitions').then(r => r.json())
        ]).then(([metaRes, defRes]) => {
            if (defRes.success) setDefinitions(defRes.data || []);
            if (metaRes.success && metaRes.data) {
                const m = metaRes.data;
                setFormData({
                    name: m.name || '',
                    definitionId: String(m.definition_id || ''),
                    optionsInput: Array.isArray(m.options) ? m.options.join(', ') : '',
                });
            } else {
                setError(metaRes.error || 'Metafield not found');
            }
        }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
    }, [id]);

    const selectedDef = definitions.find(d => d.id === parseInt(formData.definitionId));
    const isDropdown = selectedDef?.value_type === 'single_select';

    function handleInputChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData.name?.trim() || !formData.definitionId) {
            setError('Name and type are required');
            return;
        }
        if (isDropdown && !formData.optionsInput?.trim()) {
            setError('Dropdown options are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const options = isDropdown
                ? formData.optionsInput.split(',').map(s => s.trim()).filter(Boolean)
                : null;

            const res = await fetch(`/api/vendors/metafields/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    definitionId: formData.definitionId,
                    options,
                }),
            });

            const data = await res.json();
            if (data.success) router.push('/vendor/metafields');
            else setError(data.error);
        } catch (err) {
            setError('Failed to update metafield');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div className={styles.content}>
            <div className={styles.loading}>Loading...</div>
        </div>
    );

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Edit Metafield</h1>
                <Link href="/vendor/metafields" className={styles.cancelBtn}>
                    Back to List
                </Link>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Metafield type *</label>
                            <select
                                name="definitionId"
                                value={formData.definitionId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select a type...</option>
                                {definitions.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.label} ({d.value_type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isDropdown && (
                            <div className={styles.formGroup}>
                                <label>Dropdown options *</label>
                                <input
                                    type="text"
                                    name="optionsInput"
                                    value={formData.optionsInput}
                                    onChange={handleInputChange}
                                    placeholder="Option A, Option B, Option C"
                                    required={isDropdown}
                                />
                                <small style={{ color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                                    Comma-separated list of options
                                </small>
                            </div>
                        )}

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.submitBtn} disabled={saving}>
                                {saving ? 'Saving...' : 'Update Metafield'}
                            </button>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.push('/vendor/metafields')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
