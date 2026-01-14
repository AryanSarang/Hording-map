'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../metafields.module.css';

export default function CreateMetafieldPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        type: 'text',
        example: '',
        display_order: 0,
        multiple_values: false,
    });

    function autoGenerateKey(label) {
        return label
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }

    function handleInputChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const key = autoGenerateKey(formData.label);

            const res = await fetch('/api/vendor/metafields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    key,
                }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/vendor/metafields');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to create metafield');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <h1>Create Metafield Definition</h1>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Label *</label>
                    <input
                        type="text"
                        name="label"
                        value={formData.label}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Traffic Pattern"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Type *</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label>Example Value</label>
                    <input
                        type="text"
                        name="example"
                        value={formData.example}
                        onChange={handleInputChange}
                        placeholder="e.g., Morning 6-9am"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Display Order</label>
                    <input
                        type="number"
                        name="display_order"
                        value={formData.display_order}
                        onChange={handleInputChange}
                        min="0"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>
                        <input
                            type="checkbox"
                            name="multiple_values"
                            checked={formData.multiple_values}
                            onChange={handleInputChange}
                        />
                        Allow Multiple Values
                    </label>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Metafield'}
                </button>
            </form>
        </div>
    );
}
