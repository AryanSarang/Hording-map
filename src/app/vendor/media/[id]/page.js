'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../media.module.css';
import MetafieldSection from '../components/MetafieldSection';
import VendorDropdown from '../components/VendorDropdown';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
});

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const SCREEN_PLACEMENT_OPTIONS = ['Residential', 'Corporate', 'Cinema'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

export default function EditMediaPage() {
    const router = useRouter();
    const params = useParams();
    const [formData, setFormData] = useState(null);
    const [pricingRows, setPricingRows] = useState([{ priceName: '', price: '', duration: '' }]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [vendorMetafields, setVendorMetafields] = useState([]);
    const [metafieldValues, setMetafieldValues] = useState({});

    const isDigitalScreens = formData?.mediaType === 'Digital Screens';
    const isResidentialOrCorporate = formData?.mediaType === 'Residential' || formData?.mediaType === 'Corporate';

    useEffect(() => {
        fetchItem();
        fetch('/api/vendors/metafields').then(r => r.json()).then(d => d.success && setVendorMetafields(d.data || []));
    }, [params.id]);


    async function fetchItem() {
        try {
            setLoading(true);
            const res = await fetch(`/api/vendors/hordings/${params.id}`);
            const data = await res.json();
            if (data.success) {
                const d = data.data;
                setFormData(d);
                setMetafieldValues(d.metafields || {});
                setPricingRows(d.pricing?.length ? d.pricing : [{ priceName: '', price: '', duration: '' }]);
            } else setError(data.error || 'Failed to fetch media');
        } catch (err) { setError('Error fetching media'); }
        finally { setLoading(false); }
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }

    function handleLocationSelect(lat, lng) {
        setFormData(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    }

    function addPricingRow() { setPricingRows(prev => [...prev, { priceName: '', price: '', duration: '' }]); }
    function removePricingRow(i) { setPricingRows(prev => prev.filter((_, idx) => idx !== i)); }
    function updatePricing(i, field, val) { setPricingRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData?.city?.trim() || !formData?.address?.trim()) { setError('City and Address are required'); return; }
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) { setError('Please select a location on the map'); return; }
        setSaving(true);
        setError(null);
        try {
            const pricing = pricingRows.filter(r => r.priceName?.trim() && r.price && r.duration?.trim()).map((r, i) => ({ price_name: r.priceName.trim(), price: parseInt(r.price) || 0, duration: r.duration.trim(), display_order: i }));
            const imageUrls = typeof formData.imageUrls === 'string' ? formData.imageUrls : (Array.isArray(formData.imageUrls) ? formData.imageUrls.join('\n') : '');
            const res = await fetch(`/api/vendors/hordings/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, imageUrls: imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean), pricing, metafields: metafieldValues }),
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
                setSaving(false);
                setTimeout(() => router.push('/vendor/media'), 700);
            } else {
                setError(data.error || 'Error updating media');
                setSaving(false);
            }
        } catch (err) { setError('Error updating media'); setSaving(false); }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this media?')) return;
        try {
            const res = await fetch(`/api/vendors/hordings/${params.id}`, { method: 'DELETE' });
            if (res.ok) router.push('/vendor/media');
            else alert('Failed to delete');
        } catch (err) { alert('Error deleting'); }
    }

    if (loading) return <div className={styles.content}><div className={styles.loading}>Loading...</div></div>;
    if (error && !formData) return <div className={styles.content}><div className={styles.error}>{error}</div></div>;

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Edit Media #{params.id}</h1>
                <Link href="/vendor/media" className={styles.cancelBtn}>Back to List</Link>
            </div>
            <div className={styles.content}>
                <div className={styles.section}>
                    {error && <div className={styles.error}>{error}</div>}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Owner (Vendor)</h3>
                            <div className={styles.formRow}>
                                <VendorDropdown value={formData?.vendorId ?? null} onChange={v => setFormData(prev => ({ ...prev, vendorId: v }))} placeholder="No owner (optional)" />
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Media Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>Media Type</label>
                                    <select name="mediaType" value={formData?.mediaType || ''} onChange={handleChange} required>
                                        <option value="">Select</option>
                                        {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}><label>Width (ft)</label><input type="number" name="width" value={formData?.width ?? ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Height (ft)</label><input type="number" name="height" value={formData?.height ?? ''} onChange={handleChange} /></div>
                            </div>
                            {isDigitalScreens && (
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}><label>Screen Placement</label>
                                        <select name="screenPlacement" value={formData?.screenPlacement || ''} onChange={handleChange}>
                                            <option value="">Select</option>
                                            {SCREEN_PLACEMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {isResidentialOrCorporate && (
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}><label>Number of screens</label><input type="number" name="screenNumber" value={formData?.screenNumber ?? ''} onChange={handleChange} min={0} /></div>
                                </div>
                            )}
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}><label>Image URLs</label><textarea name="imageUrls" className={styles.imageUrlsInput} value={formData?.imageUrls || ''} onChange={handleChange} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Location</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>City</label><input type="text" name="city" value={formData?.city || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label className={styles.required}>State</label><input type="text" name="state" value={formData?.state || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label>Pincode</label><input type="text" name="pincode" value={formData?.pincode || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}><div className={`${styles.formGroup} ${styles.wide}`}><label className={styles.required}>Address</label><textarea name="address" value={formData?.address || ''} onChange={handleChange} rows="2" required /></div></div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Landmark</label><input type="text" name="landmark" value={formData?.landmark || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Zone</label><input type="text" name="zone" value={formData?.zone || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Road Name</label><input type="text" name="roadName" value={formData?.roadName || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Road From</label><input type="text" name="roadFrom" value={formData?.roadFrom || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Road To</label><input type="text" name="roadTo" value={formData?.roadTo || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Position w.r.t Road</label><input type="text" name="positionWrtRoad" value={formData?.positionWrtRoad || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>Latitude</label><input type="text" name="latitude" value={formData?.latitude ?? ''} readOnly className={styles.readOnlyInput} /></div>
                                <div className={styles.formGroup}><label className={styles.required}>Longitude</label><input type="text" name="longitude" value={formData?.longitude ?? ''} readOnly className={styles.readOnlyInput} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}><label>Select location on map</label><LocationPicker latitude={formData?.latitude} longitude={formData?.longitude} onLocationSelect={handleLocationSelect} height={280} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Point of Contact</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>POC Name</label><input type="text" name="pocName" value={formData?.pocName || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label className={styles.required}>POC Number</label><input type="text" name="pocNumber" value={formData?.pocNumber || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label>POC Email</label><input type="email" name="pocEmail" value={formData?.pocEmail || ''} onChange={handleChange} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Pricing & Booking</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Monthly Rental (₹)</label><input type="number" name="rate" value={formData?.rate ?? ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Vendor Rate (₹)</label><input type="number" name="ourRate" value={formData?.ourRate ?? ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Payment Terms</label><input type="text" name="paymentTerms" value={formData?.paymentTerms || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label className={styles.required}>Min. Booking Duration</label><input type="text" name="minimumBookingDuration" value={formData?.minimumBookingDuration || ''} onChange={handleChange} required /></div>
                            </div>
                            <div className={styles.pricingTiersHeader}><span>Price name</span><span>Price (₹)</span><span>Duration</span><span></span></div>
                            {pricingRows.map((row, i) => (
                                <div key={i} className={styles.pricingRow}>
                                    <input type="text" placeholder="Price name" value={row.priceName} onChange={e => updatePricing(i, 'priceName', e.target.value)} />
                                    <input type="number" placeholder="Price (₹)" value={row.price} onChange={e => updatePricing(i, 'price', e.target.value)} />
                                    <input type="text" placeholder="Duration" value={row.duration} onChange={e => updatePricing(i, 'duration', e.target.value)} />
                                    {i === pricingRows.length - 1 ? <button type="button" className={styles.pricingAddBtn} onClick={addPricingRow}>+ Add</button> : <button type="button" className={styles.pricingRemoveBtn} onClick={() => removePricingRow(i)}>Remove</button>}
                                </div>
                            ))}
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Screen / Display Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Screen Size</label><input type="text" name="screenSize" value={formData?.screenSize || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Screen Number</label><input type="number" name="screenNumber" value={formData?.screenNumber ?? ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Screen Placement</label><input type="text" name="screenPlacement" value={formData?.screenPlacement || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Format (16:9)</label><input type="text" name="displayFormat" value={formData?.displayFormat || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Slot Time</label><input type="text" name="slotTime" value={formData?.slotTime || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Loop Time</label><input type="text" name="loopTime" value={formData?.loopTime || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Hours</label><input type="text" name="displayHours" value={formData?.displayHours || ''} onChange={handleChange} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Traffic & Visibility</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Traffic Type</label><input type="text" name="trafficType" value={formData?.trafficType || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Visibility</label><select name="visibility" value={formData?.visibility || 'Prime'} onChange={handleChange}><option value="Prime">Prime</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
                                <div className={styles.formGroup}><label>Dwell Time</label><input type="text" name="dwellTime" value={formData?.dwellTime || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Condition</label><input type="text" name="condition" value={formData?.condition || ''} onChange={handleChange} /></div>
                                <div className={`${styles.formGroup} ${styles.wide}`}><label>Previous Clientele</label><textarea name="previousClientele" value={formData?.previousClientele || ''} onChange={handleChange} rows="2" /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Status</label><select name="status" value={formData?.status || 'active'} onChange={handleChange}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
                            </div>
                        </div>

                        <MetafieldSection vendorMetafields={vendorMetafields} values={metafieldValues} onValuesChange={setMetafieldValues} />

                        <div className={styles.formActions}>
                            <button type="submit" className={`${styles.submitBtn} ${saved ? styles.saved : ''}`} disabled={saving || saved}>{saving ? 'Updating...' : saved ? 'Saved!' : 'Update Media'}</button>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={saving || saved}>Cancel</button>
                            <button type="button" className={styles.submitBtn} onClick={handleDelete} disabled={saving || saved} style={{ marginLeft: 'auto', background: '#ef4444' }}>Delete</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
