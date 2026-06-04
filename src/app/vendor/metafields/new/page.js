// app/vendor/metafields/new/page.js
// Create metafield template: name + type only. Values filled when creating hordings.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../metafields.module.css';

/**
 * Mirrors the canonical list used by vendor media pages + the import API. Kept inline
 * here (matching the project's existing pattern) rather than centralized to a shared
 * constants file — vendor-form sources of truth are intentionally duplicated for now.
 */
import { MEDIA_TYPES } from '../../../../lib/mediaTypes';

export default function CreateMetafieldPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [definitions, setDefinitions] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        definitionId: '',
        optionsInput: '',
        exploreFilterEnabled: false,
        /**
         * Empty array = "applies to all media types" on /explore. When the user picks one or
         * more types here, the filter will only appear when the matching media type is
         * selected in the explore filter panel.
         */
        appliesToMediaTypes: [],
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
                    exploreFilterEnabled: formData.exploreFilterEnabled,
                    appliesToMediaTypes: formData.appliesToMediaTypes,
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

                        <div className={styles.formGroup}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="exploreFilterEnabled"
                                    checked={formData.exploreFilterEnabled}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            exploreFilterEnabled: e.target.checked,
                                        }))
                                    }
                                />
                                <span>Use as filter on Explore</span>
                            </label>
                            <small style={{ color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                                When enabled, this metafield appears as a multi-select filter on the public
                                Explore map. Values are pulled from the inventory you publish (e.g. set
                                &ldquo;Cinema Chain&rdquo; on every cinema-screen media and users can filter by chain).
                            </small>
                        </div>

                        {formData.exploreFilterEnabled && (
                            <div className={styles.formGroup}>
                                <label>Show only for these media types</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    {MEDIA_TYPES.map((mt) => {
                                        const checked = formData.appliesToMediaTypes.includes(mt);
                                        return (
                                            <label
                                                key={mt}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    padding: '0.35rem 0.6rem',
                                                    borderRadius: '999px',
                                                    border: checked ? '1px solid #22c55e' : '1px solid #334155',
                                                    background: checked ? 'rgba(34,197,94,0.12)' : 'transparent',
                                                    color: checked ? '#86efac' : '#cbd5e1',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            appliesToMediaTypes: e.target.checked
                                                                ? [...prev.appliesToMediaTypes, mt]
                                                                : prev.appliesToMediaTypes.filter((x) => x !== mt),
                                                        }))
                                                    }
                                                    style={{ accentColor: '#22c55e' }}
                                                />
                                                {mt}
                                            </label>
                                        );
                                    })}
                                </div>
                                <small style={{ color: '#94a3b8', marginTop: '0.5rem', display: 'block' }}>
                                    Leave all unchecked to show the filter for every media type. Pick one or
                                    more to hide it unless the advertiser has selected a matching media type
                                    (e.g. &ldquo;Cinema Chain&rdquo; only on Cinema Screen).
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
