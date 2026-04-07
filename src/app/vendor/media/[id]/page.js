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

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Cinema Screen', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

export default function EditMediaPage() {
    const router = useRouter();
    const params = useParams();
    const [formData, setFormData] = useState(null);
    const [variantRows, setVariantRows] = useState([]);
    const [pricingRules, setPricingRules] = useState([{ ruleName: '', optionLabel: '', multiplier: '' }]);
    const [optionValues, setOptionValues] = useState({ option1: '', option2: '', option3: '' });
    const [variantCustomFieldDefs, setVariantCustomFieldDefs] = useState(['']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [vendorMetafields, setVendorMetafields] = useState([]);
    const [metafieldValues, setMetafieldValues] = useState({});

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
                setFormData({ ...d, option1Name: d.option1Name || '', option2Name: d.option2Name || '', option3Name: d.option3Name || '' });
                setMetafieldValues(d.metafields || {});
                setVariantRows(
                    Array.isArray(d.variants) && d.variants.length > 0
                        ? d.variants.map((v) => ({
                            id: v.id,
                            option1Value: v.option1Value || '',
                            option2Value: v.option2Value || '',
                            option3Value: v.option3Value || '',
                            rate: v.rate ?? '',
                            customFields: v.customFields || {},
                        }))
                        : []
                );
                const defs = new Set();
                (d.variants || []).forEach((v) => Object.keys(v.customFields || {}).forEach((k) => k && defs.add(k)));
                setVariantCustomFieldDefs(defs.size > 0 ? Array.from(defs) : ['']);
                setPricingRules(
                    Array.isArray(d.pricingRules) && d.pricingRules.length > 0
                        ? d.pricingRules.map((r) => ({
                            id: r.id,
                            ruleName: r.ruleName || '',
                            optionLabel: r.optionLabel || '',
                            multiplier: r.multiplier ?? '',
                            displayOrder: r.displayOrder ?? 0,
                        }))
                        : [{ ruleName: '', optionLabel: '', multiplier: '' }]
                );
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

    function addVariantRow() { setVariantRows(prev => [...prev, { option1Value: '', option2Value: '', option3Value: '', rate: '', customFields: {} }]); }
    function removeVariantRow(i) { setVariantRows(prev => prev.filter((_, idx) => idx !== i)); }
    function updateVariant(i, field, val) { setVariantRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }
    function updateVariantCustomField(i, key, val) { setVariantRows(prev => prev.map((row, idx) => idx === i ? { ...row, customFields: { ...(row.customFields || {}), [key]: val } } : row)); }
    function addVariantCustomFieldDef() { setVariantCustomFieldDefs(prev => [...prev, '']); }
    function updateVariantCustomFieldDef(i, val) { setVariantCustomFieldDefs(prev => prev.map((k, idx) => idx === i ? val : k)); }
    function removeVariantCustomFieldDef(i) { setVariantCustomFieldDefs(prev => prev.filter((_, idx) => idx !== i)); }
    function addPricingRule() { setPricingRules(prev => [...prev, { ruleName: '', optionLabel: '', multiplier: '' }]); }
    function removePricingRule(i) { setPricingRules(prev => prev.filter((_, idx) => idx !== i)); }
    function updatePricingRule(i, key, val) { setPricingRules(prev => prev.map((row, idx) => idx === i ? { ...row, [key]: val } : row)); }
    function generateVariantCombinations() {
        const parseValues = (s) => String(s || '').split(',').map(v => v.trim()).filter(Boolean);
        const v1 = parseValues(optionValues.option1);
        const v2 = parseValues(optionValues.option2);
        const v3 = parseValues(optionValues.option3);
        if (v1.length === 0 && v2.length === 0 && v3.length === 0) {
            setError('Add comma-separated values for at least one option to generate variants.');
            return;
        }
        const all = [];
        if (v1.length > 0 && v2.length === 0 && v3.length === 0) {
            v1.forEach((a) => all.push({ option1Value: a, option2Value: '', option3Value: '', rate: '', customFields: {} }));
        } else if (v1.length > 0 && v2.length > 0 && v3.length === 0) {
            for (const a of v1) for (const b of v2) all.push({ option1Value: a, option2Value: b, option3Value: '', rate: '', customFields: {} });
        } else if (v1.length > 0 && v2.length > 0 && v3.length > 0) {
            for (const a of v1) for (const b of v2) for (const c of v3) all.push({ option1Value: a, option2Value: b, option3Value: c, rate: '', customFields: {} });
        } else if (v1.length === 0 && v2.length > 0 && v3.length === 0) {
            v2.forEach((b) => all.push({ option1Value: b, option2Value: '', option3Value: '', rate: '', customFields: {} }));
        } else if (v1.length === 0 && v2.length === 0 && v3.length > 0) {
            v3.forEach((c) => all.push({ option1Value: c, option2Value: '', option3Value: '', rate: '', customFields: {} }));
        } else if (v1.length === 0 && v2.length > 0 && v3.length > 0) {
            for (const b of v2) for (const c of v3) all.push({ option1Value: b, option2Value: c, option3Value: '', rate: '', customFields: {} });
        } else if (v1.length > 0 && v2.length === 0 && v3.length > 0) {
            for (const a of v1) for (const c of v3) all.push({ option1Value: a, option2Value: c, option3Value: '', rate: '', customFields: {} });
        }
        setVariantRows(all);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData?.city?.trim() || !formData?.address?.trim()) { setError('City and Address are required'); return; }
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) { setError('Please select a location on the map'); return; }
        const normalizedVariants = variantRows
            .filter(v => v.option1Value?.trim() || v.option2Value?.trim() || v.option3Value?.trim() || v.rate || Object.keys(v.customFields || {}).length > 0)
            .map((v, i) => ({
                id: v.id,
                option1Value: v.option1Value?.trim() || '',
                option2Value: v.option2Value?.trim() || null,
                option3Value: v.option3Value?.trim() || null,
                rate: v.rate ? parseInt(v.rate) : null,
                customFields: v.customFields || {},
                displayOrder: i,
            }))
            .filter((v) => v.option1Value);
        const pairSet = new Set();
        for (const v of normalizedVariants) {
            const key = `${v.option1Value}__${v.option2Value || ''}__${v.option3Value || ''}`.toLowerCase();
            if (pairSet.has(key)) { setError(`Duplicate variant option combination: ${v.option1Value} / ${v.option2Value}${v.option3Value ? ` / ${v.option3Value}` : ''}`); return; }
            pairSet.add(key);
        }
        const normalizedPricingRules = pricingRules
            .map((r, i) => ({
                id: r.id,
                ruleName: String(r.ruleName || '').trim(),
                optionLabel: String(r.optionLabel || '').trim(),
                multiplier: r.multiplier ? Number(r.multiplier) : null,
                displayOrder: i,
            }))
            .filter((r) => r.ruleName && r.optionLabel && Number.isFinite(r.multiplier) && r.multiplier > 0);
        setSaving(true);
        setError(null);
        try {
            const imageUrls = typeof formData.imageUrls === 'string' ? formData.imageUrls : (Array.isArray(formData.imageUrls) ? formData.imageUrls.join('\n') : '');
            const res = await fetch(`/api/vendors/hordings/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    imageUrls: imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
                    variants: normalizedVariants,
                    hasVariants: normalizedVariants.length > 0,
                    pricingRules: normalizedPricingRules,
                    option1Name: normalizedVariants.length > 0 ? formData.option1Name : null,
                    option2Name: normalizedVariants.length > 0 ? formData.option2Name : null,
                    option3Name: normalizedVariants.length > 0 ? formData.option3Name : null,
                    metafields: metafieldValues
                }),
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

    if (loading) return <div className={`${styles.content} ${styles.listContent}`}><div className={styles.loading}>Loading...</div></div>;
    if (error && !formData) return <div className={`${styles.content} ${styles.listContent}`}><div className={styles.error}>{error}</div></div>;

    return (
        <>
            <div className={`${styles.topbar} ${styles.listTopbar}`}>
                <h1 className={styles.title}>Edit Media #{params.id}</h1>
                <Link href="/vendor/media" className={styles.cancelBtn}>Back to List</Link>
            </div>
            <div className={`${styles.content} ${styles.listContent}`}>
                <div className={styles.createMediaShell}>
                    {error && <div className={styles.error}>{error}</div>}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Owner (Vendor)</h3>
                            <div className={`${styles.formRow} ${styles.ownerRow}`}>
                                <div className={`${styles.formGroup} ${styles.ownerVendorGroup}`}>
                                    <VendorDropdown value={formData?.vendorId ?? null} onChange={v => setFormData(prev => ({ ...prev, vendorId: v }))} placeholder="No owner (optional)" />
                                </div>
                                <div className={`${styles.formGroup} ${styles.ownerStatusGroup}`}>
                                    <label>Status</label>
                                    <select name="status" value={formData?.status || 'active'} onChange={handleChange}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
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
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}><label>Image URLs</label><textarea name="imageUrls" className={styles.imageUrlsInput} value={formData?.imageUrls || ''} onChange={handleChange} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Location</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>State</label><input type="text" name="state" value={formData?.state || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label className={styles.required}>City</label><input type="text" name="city" value={formData?.city || ''} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label>Area</label><input type="text" name="zone" value={formData?.zone || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Locality</label><input type="text" name="locality" value={formData?.locality || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}><div className={`${styles.formGroup} ${styles.wide}`}><label className={styles.required}>Address</label><textarea name="address" value={formData?.address || ''} onChange={handleChange} rows="2" required /></div></div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Landmark</label><input type="text" name="landmark" value={formData?.landmark || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Pincode</label><input type="text" name="pincode" value={formData?.pincode || ''} onChange={handleChange} /></div>
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
                                <div className={styles.formGroup}><label className={styles.required}>Min. Booking Duration</label><input type="text" name="minimumBookingDuration" value={formData?.minimumBookingDuration || ''} onChange={handleChange} required /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Screen / Display Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Screen Size</label><input type="text" name="screenSize" value={formData?.screenSize || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Format (16:9)</label><input type="text" name="displayFormat" value={formData?.displayFormat || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Hours</label><input type="text" name="displayHours" value={formData?.displayHours || ''} onChange={handleChange} /></div>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h3 className={styles.sectionHead}>Variants</h3>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Define options, add values, generate combinations, then set rate and custom fields.</p>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Option 1 Name</label><input type="text" name="option1Name" value={formData?.option1Name || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Option 2 Name</label><input type="text" name="option2Name" value={formData?.option2Name || ''} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Option 3 Name (optional)</label><input type="text" name="option3Name" value={formData?.option3Name || ''} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>{formData?.option1Name || 'Option 1'} values (comma separated)</label><input type="text" value={optionValues.option1} onChange={(e) => setOptionValues(prev => ({ ...prev, option1: e.target.value }))} /></div>
                                <div className={styles.formGroup}><label>{formData?.option2Name || 'Option 2'} values (comma separated)</label><input type="text" value={optionValues.option2} onChange={(e) => setOptionValues(prev => ({ ...prev, option2: e.target.value }))} /></div>
                                <div className={styles.formGroup}><label>{formData?.option3Name || 'Option 3'} values (optional)</label><input type="text" value={optionValues.option3} onChange={(e) => setOptionValues(prev => ({ ...prev, option3: e.target.value }))} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <button type="button" className={styles.pricingAddBtn} onClick={generateVariantCombinations}>Generate Variant Combinations</button>
                            </div>
                            <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>Variant Custom Fields</h4>
                            {variantCustomFieldDefs.map((fieldKey, idx) => (
                                <div key={idx} className={`${styles.formRow} ${styles.customFieldRow}`}>
                                    <div className={`${styles.formGroup} ${styles.customFieldKeyGroup}`}><label>Field key</label><input type="text" value={fieldKey} onChange={(e) => updateVariantCustomFieldDef(idx, e.target.value)} placeholder="e.g. projector_type" /></div>
                                    <div className={`${styles.formGroup} ${styles.customFieldActionGroup}`}>
                                        {idx === variantCustomFieldDefs.length - 1
                                            ? <button type="button" className={styles.pricingAddBtn} onClick={addVariantCustomFieldDef}>+ Add Field</button>
                                            : <button type="button" className={styles.pricingRemoveBtn} onClick={() => removeVariantCustomFieldDef(idx)}>Remove</button>}
                                    </div>
                                </div>
                            ))}
                            <div className={styles.variantHeader}>
                                <span>Variant</span>
                                <span>Price</span>
                                {variantCustomFieldDefs.map((f, i) => <span key={i}>{f || `Custom ${i + 1}`}</span>)}
                                <span></span>
                            </div>
                            {variantRows.map((row, i) => (
                                <div key={row.id || i} className={styles.variantRow}>
                                    <div className={styles.variantLabelCell}>{[row.option1Value, row.option2Value, row.option3Value].filter(Boolean).join(' / ') || 'Variant'}</div>
                                    <input type="number" placeholder="Rate" value={row.rate} onChange={e => updateVariant(i, 'rate', e.target.value)} />
                                    {variantCustomFieldDefs.map((f, idx) => (
                                        <input key={idx} type="text" placeholder={f || `Custom ${idx + 1}`} value={row.customFields?.[f] || ''} onChange={e => updateVariantCustomField(i, f, e.target.value)} />
                                    ))}
                                    <button type="button" className={styles.pricingRemoveBtn} onClick={() => removeVariantRow(i)}>Remove</button>
                                </div>
                            ))}
                        </div>

                        <div className={styles.formSection}><h3 className={styles.sectionHead}>Pricing Conditions</h3>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Add multiplier rules like Festive = 1.2x base rate.</p>
                            <div className={styles.variantHeader}>
                                <span>Variant Name</span>
                                <span>Option</span>
                                <span>Multiplier (x)</span>
                                <span></span>
                            </div>
                            {pricingRules.map((row, i) => (
                                <div key={row.id || i} className={styles.variantRow}>
                                    <input type="text" placeholder="e.g. Season" value={row.ruleName} onChange={e => updatePricingRule(i, 'ruleName', e.target.value)} />
                                    <input type="text" placeholder="e.g. Festive" value={row.optionLabel} onChange={e => updatePricingRule(i, 'optionLabel', e.target.value)} />
                                    <input type="number" min="0" step="0.01" placeholder="1.20" value={row.multiplier} onChange={e => updatePricingRule(i, 'multiplier', e.target.value)} />
                                    <button type="button" className={styles.pricingRemoveBtn} onClick={() => removePricingRule(i)}>Remove</button>
                                </div>
                            ))}
                            <div className={styles.formRow}>
                                <button type="button" className={styles.pricingAddBtn} onClick={addPricingRule}>+ Add Condition</button>
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
