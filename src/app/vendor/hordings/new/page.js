'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../hordings.module.css';
import MetafieldSection from '../components/MetafieldSection';
import VendorDropdown from '../components/VendorDropdown';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
});

const MEDIA_TYPES = [
    'Digital Screens', 'Hoarding', 'Bus Shelter', 'Wall Wrap',
    'Kiosk', 'Transit', 'Neon Sign', 'Other'
];

const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

const initialForm = {
    vendorId: null,
    city: '', state: '', address: '', landmark: '', pincode: '', zone: '',
    latitude: '', longitude: '',
    roadName: '', roadFrom: '', roadTo: '', positionWrtRoad: '',
    pocName: '', pocNumber: '', pocEmail: '',
    rate: '', ourRate: '', paymentTerms: '', minimumBookingDuration: '',
    mediaType: '', hordingType: '', width: '', height: '',
    screenSize: '', screenNumber: '', screenPlacement: '', displayFormat: '',
    slotTime: '', loopTime: '', displayHours: '',
    trafficType: '', visibility: 'Prime', dwellTime: '',
    condition: '', previousClientele: '', compliance: false, status: 'active',
    imageUrls: '',
};

export default function NewHordingPage() {
    const router = useRouter();
    const [formData, setFormData] = useState(initialForm);
    const [pricingRows, setPricingRows] = useState([{ priceName: '', price: '', duration: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [vendorMetafields, setVendorMetafields] = useState([]);
    const [metafieldValues, setMetafieldValues] = useState({});

    useEffect(() => {
        fetch('/api/vendors/metafields')
            .then(r => r.json())
            .then(d => d.success && setVendorMetafields(d.data || []));
    }, []);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setError(null);
    }

    function handleLocationSelect(lat, lng) {
        setFormData(prev => ({
            ...prev,
            latitude: String(lat),
            longitude: String(lng),
        }));
        setError(null);
    }

    function addPricingRow() {
        setPricingRows(prev => [...prev, { priceName: '', price: '', duration: '' }]);
    }

    function removePricingRow(i) {
        setPricingRows(prev => prev.filter((_, idx) => idx !== i));
    }

    function updatePricing(i, field, val) {
        setPricingRows(prev => prev.map((row, idx) =>
            idx === i ? { ...row, [field]: val } : row
        ));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!formData.city?.trim() || !formData.address?.trim()) {
            setError('City and Address are required');
            return;
        }
        if (!formData.pocName?.trim() || !formData.pocNumber?.trim()) {
            setError('POC Name and POC Number are required');
            return;
        }
        if (!formData.minimumBookingDuration?.trim()) {
            setError('Minimum Booking Duration is required');
            return;
        }
        if (!formData.mediaType) {
            setError('Media Type is required');
            return;
        }
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
            setError('Please select a location on the map by clicking where the hording is located');
            return;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            setError('Invalid coordinates. Please select a valid location on the map.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const imageUrls = formData.imageUrls
                ? formData.imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
                : [];

            const pricing = pricingRows
                .filter(r => r.priceName?.trim() && r.price && r.duration?.trim())
                .map((r, i) => ({
                    price_name: r.priceName.trim(),
                    price: parseInt(r.price) || 0,
                    duration: r.duration.trim(),
                    display_order: i,
                }));

            const res = await fetch('/api/vendors/hordings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    imageUrls,
                    pricing,
                    metafields: metafieldValues,
                }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/vendor/hordings');
            } else {
                setError(data.error || 'Error creating hording');
            }
        } catch (err) {
            setError('Error creating hording');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Create Hording</h1>
                <Link href="/vendor/hordings" className={styles.cancelBtn}>Back to List</Link>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* OWNER (VENDOR) */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Owner (Vendor)</h3>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Select the vendor who owns this hording. If listing on behalf of someone else, add or select their vendor record.</p>
                            <div className={styles.formRow}>
                                <VendorDropdown
                                    value={formData.vendorId}
                                    onChange={v => setFormData(prev => ({ ...prev, vendorId: v }))}
                                    placeholder="No owner (optional)"
                                />
                            </div>
                        </div>

                        {/* LOCATION */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Location</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>City</label>
                                    <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>State</label>
                                    <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Pincode</label>
                                    <input type="text" name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label className={styles.required}>Address</label>
                                    <textarea name="address" placeholder="Full address" value={formData.address} onChange={handleChange} rows="2" required />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Landmark</label>
                                    <input type="text" name="landmark" placeholder="Nearby landmark" value={formData.landmark} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Zone</label>
                                    <input type="text" name="zone" placeholder="Zone" value={formData.zone} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Road Name</label>
                                    <input type="text" name="roadName" placeholder="Road name" value={formData.roadName} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Road From</label>
                                    <input type="text" name="roadFrom" placeholder="From" value={formData.roadFrom} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Road To</label>
                                    <input type="text" name="roadTo" placeholder="To" value={formData.roadTo} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Position w.r.t Road</label>
                                    <input type="text" name="positionWrtRoad" placeholder="Position" value={formData.positionWrtRoad} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>Latitude</label>
                                    <input type="text" name="latitude" value={formData.latitude || ''} readOnly placeholder="Select on map" className={styles.readOnlyInput} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>Longitude</label>
                                    <input type="text" name="longitude" value={formData.longitude || ''} readOnly placeholder="Select on map" className={styles.readOnlyInput} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label>Select location on map</label>
                                    <LocationPicker
                                        latitude={formData.latitude}
                                        longitude={formData.longitude}
                                        onLocationSelect={handleLocationSelect}
                                        height={280}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CONTACT */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Point of Contact</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>POC Name</label>
                                    <input type="text" name="pocName" placeholder="Contact person" value={formData.pocName} onChange={handleChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>POC Number</label>
                                    <input type="text" name="pocNumber" placeholder="+91 XXXXX XXXXX" value={formData.pocNumber} onChange={handleChange} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>POC Email</label>
                                    <input type="email" name="pocEmail" placeholder="Email" value={formData.pocEmail} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* PRICING & BOOKING */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Pricing & Booking</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Monthly Rental (₹)</label>
                                    <input type="number" name="rate" placeholder="Monthly rental" value={formData.rate} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Vendor Rate (₹)</label>
                                    <input type="number" name="ourRate" placeholder="Vendor rate" value={formData.ourRate} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Payment Terms</label>
                                    <input type="text" name="paymentTerms" placeholder="e.g., Net 30" value={formData.paymentTerms} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>Min. Booking Duration</label>
                                    <input type="text" name="minimumBookingDuration" placeholder="e.g., 1 month" value={formData.minimumBookingDuration} onChange={handleChange} required />
                                </div>
                            </div>
                            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>Additional Price Tiers</h4>
                            <div className={styles.pricingTiersHeader}>
                                <span>Price name</span>
                                <span>Price (₹)</span>
                                <span>Duration</span>
                                <span></span>
                            </div>
                            {pricingRows.map((row, i) => (
                                <div key={i} className={styles.pricingRow}>
                                    <input
                                        type="text"
                                        placeholder="Price name (e.g., 1 Week)"
                                        value={row.priceName}
                                        onChange={e => updatePricing(i, 'priceName', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price (₹)"
                                        value={row.price}
                                        onChange={e => updatePricing(i, 'price', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Duration"
                                        value={row.duration}
                                        onChange={e => updatePricing(i, 'duration', e.target.value)}
                                    />
                                    {i === pricingRows.length - 1 ? (
                                        <button type="button" className={styles.pricingAddBtn} onClick={addPricingRow}>+ Add</button>
                                    ) : (
                                        <button type="button" className={styles.pricingRemoveBtn} onClick={() => removePricingRow(i)}>Remove</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* MEDIA & IMAGES */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Media Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>Media Type</label>
                                    <select name="mediaType" value={formData.mediaType} onChange={handleChange} required>
                                        <option value="">Select media type</option>
                                        {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Hording Type</label>
                                    <select name="hordingType" value={formData.hordingType} onChange={handleChange}>
                                        <option value="">Select type</option>
                                        <option value="LED">LED</option>
                                        <option value="Front Lit">Front Lit</option>
                                        <option value="Back Lit">Back Lit</option>
                                        <option value="Non-Lit">Non-Lit</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Width (ft)</label>
                                    <input type="number" name="width" placeholder="Width" value={formData.width} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Height (ft)</label>
                                    <input type="number" name="height" placeholder="Height" value={formData.height} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label>Image URLs</label>
                                    <textarea
                                        name="imageUrls"
                                        className={styles.imageUrlsInput}
                                        placeholder="Enter image URLs, one per line or comma-separated"
                                        value={formData.imageUrls}
                                        onChange={handleChange}
                                    />
                                    <small>Add image URLs for this hording. One URL per line or comma-separated.</small>
                                </div>
                            </div>
                        </div>

                        {/* SCREEN / DISPLAY (Digital) */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Screen / Display Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Screen Size</label>
                                    <input type="text" name="screenSize" placeholder="e.g., 10x6" value={formData.screenSize} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Screen Number</label>
                                    <input type="number" name="screenNumber" placeholder="#" value={formData.screenNumber} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Screen Placement</label>
                                    <input type="text" name="screenPlacement" placeholder="Placement" value={formData.screenPlacement} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Display Format</label>
                                    <input type="text" name="displayFormat" placeholder="e.g., 16:9" value={formData.displayFormat} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Slot Time</label>
                                    <input type="text" name="slotTime" placeholder="e.g., 10 sec" value={formData.slotTime} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Loop Time</label>
                                    <input type="text" name="loopTime" placeholder="Loop duration" value={formData.loopTime} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Display Hours</label>
                                    <input type="text" name="displayHours" placeholder="e.g., 8am-10pm" value={formData.displayHours} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* TRAFFIC & OTHER */}
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Traffic & Visibility</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Traffic Type</label>
                                    <input type="text" name="trafficType" placeholder="e.g., Pedestrian" value={formData.trafficType} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Visibility</label>
                                    <select name="visibility" value={formData.visibility} onChange={handleChange}>
                                        <option value="Prime">Prime</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Dwell Time</label>
                                    <input type="text" name="dwellTime" placeholder="Dwell time" value={formData.dwellTime} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Condition</label>
                                    <input type="text" name="condition" placeholder="Condition" value={formData.condition} onChange={handleChange} />
                                </div>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label>Previous Clientele</label>
                                    <textarea name="previousClientele" placeholder="Previous clients/brands" value={formData.previousClientele} onChange={handleChange} rows="2" />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" name="compliance" checked={formData.compliance} onChange={handleChange} />
                                        Compliance
                                    </label>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* CUSTOM METAFIELDS */}
                        <MetafieldSection
                            vendorMetafields={vendorMetafields}
                            values={metafieldValues}
                            onValuesChange={setMetafieldValues}
                        />

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Hording'}
                            </button>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={loading}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
