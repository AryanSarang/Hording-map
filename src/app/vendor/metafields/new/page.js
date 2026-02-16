// app/vendor/metafields/new/page.js
// Create metafield template: name + type only. Values filled when creating hordings.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../metafields.module.css';

export default function CreateMetafieldPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [definitions, setDefinitions] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        definitionId: '',
        optionsInput: '', // Comma-separated for dropdown
    });

    useEffect(() => {
        fetch('/api/vendors/metafield-definitions')
            .then(r => r.json())
            .then(d => d.success && setDefinitions(d.data || []));
    }, []);

    const selectedDef = definitions.find(d => d.id === parseInt(formData.definitionId));
    const isDropdown = selectedDef?.value_type === 'single_select';

    function handleInputChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!formData.name?.trim()) {
            setError('Name is required');
            return;
        }
        if (!formData.definitionId) {
            setError('Metafield type is required');
            return;
        }
        if (isDropdown && !formData.optionsInput?.trim()) {
            setError('Dropdown options are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const options = isDropdown
                ? formData.optionsInput.split(',').map(s => s.trim()).filter(Boolean)
                : null;

            const res = await fetch('/api/vendors/metafields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    definitionId: formData.definitionId,
                    options,
                }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/vendor/metafields');
            } else {
                setError(data.error || 'Failed to create metafield');
            }
        } catch (err) {
            setError('Failed to create metafield');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Add Metafield</h1>
                <Link href="/vendor/metafields" className={styles.cancelBtn}>
                    Back to List
                </Link>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    {error && <div className={styles.error}>{error}</div>}

                    <p className={styles.hint} style={{ marginBottom: '1.5rem' }}>
                        Create a custom field that will be available when creating or editing hordings. Values are filled there, not here.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., Traffic Pattern"
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
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Metafield'}
                            </button>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
