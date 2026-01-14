'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import styles from '../hordings.module.css';

export default function NewHordingPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        city: '',
        state: '',
        address: '',
        latitude: '',
        longitude: '',
        rate: '',
        ourRate: '',
        minimumBookingDuration: '',
        mediaType: '',
        hordingType: '',
        visibility: 'Prime',
        status: 'pending',
        pocName: '',
        pocNumber: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!formData.name.trim() || !formData.city.trim()) {
            setError('Name and City are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/vendor/hordings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert('Hording created successfully!');
                router.push('/vendor/hordings');
            } else {
                const errData = await res.json();
                setError(errData.error || 'Error creating hording');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error creating hording');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <Sidebar />

            <main className={styles.main}>
                <div className={styles.topbar}>
                    <h1 className={styles.title}>Create Hording</h1>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        {error && <div className={styles.errorAlert}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            {/* BASIC INFORMATION */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>📍 Basic Information</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.required}>Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Hording name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Description</label>
                                        <input
                                            type="text"
                                            name="description"
                                            placeholder="Brief description"
                                            value={formData.description}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LOCATION */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>📍 Location</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.required}>City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            placeholder="City"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            placeholder="State"
                                            value={formData.state}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label>Address</label>
                                        <textarea
                                            name="address"
                                            placeholder="Full address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PRICING */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>💰 Pricing & Booking</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Rate (₹/month)</label>
                                        <input
                                            type="number"
                                            name="rate"
                                            placeholder="Rate"
                                            value={formData.rate}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Our Rate (₹/month)</label>
                                        <input
                                            type="number"
                                            name="ourRate"
                                            placeholder="Our rate"
                                            value={formData.ourRate}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.required}>Minimum Booking Duration</label>
                                        <input
                                            type="text"
                                            name="minimumBookingDuration"
                                            placeholder="e.g., 1 month"
                                            value={formData.minimumBookingDuration}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MEDIA DETAILS */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>📺 Media Details</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Media Type</label>
                                        <select name="mediaType" value={formData.mediaType} onChange={handleChange}>
                                            <option value="">Select media type</option>
                                            <option value="digitalScreen">Digital Screen</option>
                                            <option value="hoarding">Hoarding</option>
                                            <option value="busShelter">Bus Shelter</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Hording Type</label>
                                        <select name="hordingType" value={formData.hordingType} onChange={handleChange}>
                                            <option value="">Select hording type</option>
                                            <option value="led">LED</option>
                                            <option value="frontLit">Front Lit</option>
                                            <option value="backLit">Back Lit</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* STATUS & VISIBILITY */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>👁️ Status & Visibility</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Visibility</label>
                                        <select name="visibility" value={formData.visibility} onChange={handleChange}>
                                            <option value="Prime">Prime</option>
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                            <option value="None">None</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Status</label>
                                        <select name="status" value={formData.status} onChange={handleChange}>
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* VENDOR INFORMATION */}
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>👤 Vendor Information</h3>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>POC Name</label>
                                        <input
                                            type="text"
                                            name="pocName"
                                            placeholder="Point of contact name"
                                            value={formData.pocName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>POC Number</label>
                                        <input
                                            type="text"
                                            name="pocNumber"
                                            placeholder="+91 XXXXX XXXXX"
                                            value={formData.pocNumber}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FORM ACTIONS */}
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.submitBtn} disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Hording'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => router.back()}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
