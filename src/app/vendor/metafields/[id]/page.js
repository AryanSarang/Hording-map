'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '../metafields.module.css';

export default function EditMetafieldPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        type: 'text',
        example: '',
        display_order: 0,
        multiple_values: false,
    });

    useEffect(() => {
        fetchDefinition();
    }, [id]);

    async function fetchDefinition() {
        try {
            const res = await fetch(`/api/vendor/metafields/${id}`);
            const data = await res.json();

            if (data.success) {
                setFormData(data.data);
            } else {
                setError('Definition not found');
            }
        } catch (err) {
            setError('Failed to load definition');
            console.error(err);
        } finally {
            setLoading(false);
        }
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
        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/vendor/metafields/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/vendor/metafields');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to update definition');
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure? This will delete all values using this definition.')) return;

        try {
            const res = await fetch(`/api/vendor/metafields/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                router.push('/vendor/metafields');
            } else {
                alert('Failed to delete definition');
            }
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error deleting definition');
        }
    }

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1>Edit Metafield Definition</h1>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Label</label>
                    <input
                        type="text"
                        name="label"
                        value={formData.label}
                        onChange={handleInputChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Type</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
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
                    <label>Example</label>
                    <input
                        type="text"
                        name="example"
                        value={formData.example}
                        onChange={handleInputChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Display Order</label>
                    <input
                        type="number"
                        name="display_order"
                        value={formData.display_order}
                        onChange={handleInputChange}
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

                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitBtn} disabled={saving}>
                        {saving ? 'Saving...' : 'Update Definition'}
                    </button>
                    <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={handleDelete}
                    >
                        Delete Definition
                    </button>
                </div>
            </form>
        </div>
    );
}
