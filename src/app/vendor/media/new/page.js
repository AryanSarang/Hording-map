'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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

const initialForm = {
    vendorId: null,
    state: '', city: '', zone: '', locality: '', address: '', pincode: '', landmark: '',
    latitude: '', longitude: '',
    pocName: '', pocNumber: '', pocEmail: '',
    rate: '', ourRate: '', minimumBookingDuration: '',
    mediaType: '',
    screenSize: '', displayFormat: '',
    displayHours: '',
    status: 'active',
    imageUrls: '',
    option1Name: '',
    option2Name: '',
    option3Name: '',
};

export default function NewMediaPage() {
    const router = useRouter();
    const [formData, setFormData] = useState(initialForm);
    const [variantRows, setVariantRows] = useState([]);
    const [pricingRules, setPricingRules] = useState([{ ruleName: '', optionLabel: '', multiplier: '' }]);
    const [optionValues, setOptionValues] = useState({ option1: '', option2: '', option3: '' });
    const [variantCustomFieldDefs, setVariantCustomFieldDefs] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);
    const [vendorMetafields, setVendorMetafields] = useState([]);
    const [metafieldValues, setMetafieldValues] = useState({});

    useEffect(() => {
        fetch('/api/vendors/metafields').then(r => r.json()).then(d => d.success && setVendorMetafields(d.data || []));
    }, []);


    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setError(null);
    }

    function handleLocationSelect(lat, lng) {
        setFormData(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
        setError(null);
    }

    function addVariantRow() { setVariantRows(prev => [...prev, { option1Value: '', option2Value: '', option3Value: '', rate: '', customFields: {} }]); }
    function removeVariantRow(i) { setVariantRows(prev => prev.filter((_, idx) => idx !== i)); }
    function updateVariant(i, field, val) { setVariantRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }
    function updateVariantCustomField(i, key, val) {
        setVariantRows(prev => prev.map((row, idx) => idx === i ? { ...row, customFields: { ...(row.customFields || {}), [key]: val } } : row));
    }
    function addVariantCustomFieldDef() { setVariantCustomFieldDefs(prev => [...prev, '']); }
    function updateVariantCustomFieldDef(i, val) { setVariantCustomFieldDefs(prev => prev.map((k, idx) => idx === i ? val : k)); }
    function removeVariantCustomFieldDef(i) { setVariantCustomFieldDefs(prev => prev.filter((_, idx) => idx !== i)); }
    function addPricingRule() { setPricingRules(prev => [...prev, { ruleName: '', optionLabel: '', multiplier: '' }]); }
    function removePricingRule(i) { setPricingRules(prev => prev.filter((_, idx) => idx !== i)); }
    function updatePricingRule(i, key, value) { setPricingRules(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: value } : r)); }
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
        if (!formData.city?.trim() || !formData.address?.trim()) { setError('City and Address are required'); return; }
        if (!formData.pocName?.trim() || !formData.pocNumber?.trim()) { setError('POC Name and POC Number are required'); return; }
        if (!formData.minimumBookingDuration?.trim()) { setError('Minimum Booking Duration is required'); return; }
        if (!formData.mediaType) { setError('Media Type is required'); return; }
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
            setError('Please select a location on the map.');
            return;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError('Invalid coordinates.'); return; }
        const normalizedVariants = variantRows
            .filter(v => v.option1Value?.trim() || v.option2Value?.trim() || v.option3Value?.trim() || v.rate || Object.keys(v.customFields || {}).length > 0)
            .map((v, i) => ({
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
            if (pairSet.has(key)) {
                setError(`Duplicate variant option combination: ${v.option1Value} / ${v.option2Value}${v.option3Value ? ` / ${v.option3Value}` : ''}`);
                return;
            }
            pairSet.add(key);
        }
        const normalizedPricingRules = pricingRules
            .map((r, i) => ({
                ruleName: String(r.ruleName || '').trim(),
                optionLabel: String(r.optionLabel || '').trim(),
                multiplier: r.multiplier ? Number(r.multiplier) : null,
                displayOrder: i,
            }))
            .filter((r) => r.ruleName && r.optionLabel && Number.isFinite(r.multiplier) && r.multiplier > 0);

        setLoading(true);
        setError(null);
        try {
            const imageUrls = formData.imageUrls ? formData.imageUrls.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : [];

            const res = await fetch('/api/vendors/hordings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    imageUrls,
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
                setLoading(false);
                setTimeout(() => router.push('/vendor/media'), 700);
            } else {
                setError(data.error || 'Error creating media');
                setLoading(false);
            }
        } catch (err) {
            setError('Error creating media');
            setLoading(false);
        }
    }

    return (
        <>
            <div className={`${styles.topbar} ${styles.createMediaPage}`}>
                <h1 className={styles.title}>Create Media</h1>
                <Link href="/vendor/media" className={styles.cancelBtn}>Back to List</Link>
            </div>
            <div className={`${styles.content} ${styles.createMediaPage} ${styles.createMediaContent}`}>
                <div className={`${styles.section} ${styles.createMediaShell}`}>
                    {error && <div className={styles.error}>{error}</div>}
                    <form onSubmit={handleSubmit} className={`${styles.form} ${styles.createMediaForm}`}>
                        {/* OWNER */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Owner (Vendor)</h3>
                            <p className={styles.sectionHint}>Select the vendor who owns this media.</p>
                            <div className={`${styles.formRow} ${styles.ownerRow}`}>
                                <div className={`${styles.formGroup} ${styles.ownerVendorGroup}`}>
                                    <VendorDropdown value={formData.vendorId} onChange={v => setFormData(prev => ({ ...prev, vendorId: v }))} placeholder="No owner (optional)" />
                                </div>
                                <div className={`${styles.formGroup} ${styles.ownerStatusGroup}`}>
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* MEDIA DETAILS - ON TOP */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Media Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.required}>Media Type</label>
                                    <select name="mediaType" value={formData.mediaType} onChange={handleChange} required>
                                        <option value="">Select media type</option>
                                        {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label>Image URLs</label>
                                    <textarea name="imageUrls" className={styles.imageUrlsInput} placeholder="One per line or comma-separated" value={formData.imageUrls} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* LOCATION */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Location</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>State</label><input type="text" name="state" value={formData.state} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label className={styles.required}>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label>Area</label><input type="text" name="zone" value={formData.zone} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Locality</label><input type="text" name="locality" value={formData.locality} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}><label className={styles.required}>Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows="2" required /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Landmark</label><input type="text" name="landmark" value={formData.landmark} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Pincode</label><input type="text" name="pincode" value={formData.pincode} onChange={handleChange} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>Latitude</label><input type="text" name="latitude" value={formData.latitude || ''} readOnly placeholder="Select on map" className={styles.readOnlyInput} /></div>
                                <div className={styles.formGroup}><label className={styles.required}>Longitude</label><input type="text" name="longitude" value={formData.longitude || ''} readOnly placeholder="Select on map" className={styles.readOnlyInput} /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.wide}`}>
                                    <label>Select location on map</label>
                                    <LocationPicker latitude={formData.latitude} longitude={formData.longitude} onLocationSelect={handleLocationSelect} height={280} />
                                </div>
                            </div>
                        </div>

                        {/* CONTACT */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Point of Contact</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.required}>POC Name</label><input type="text" name="pocName" value={formData.pocName} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label className={styles.required}>POC Number</label><input type="text" name="pocNumber" value={formData.pocNumber} onChange={handleChange} required /></div>
                                <div className={styles.formGroup}><label>POC Email</label><input type="email" name="pocEmail" value={formData.pocEmail} onChange={handleChange} /></div>
                            </div>
                        </div>

                        {/* PRICING */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Pricing & Booking</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Monthly Rental (₹)</label><input type="number" name="rate" value={formData.rate} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Vendor Rate (₹)</label><input type="number" name="ourRate" value={formData.ourRate} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label className={styles.required}>Min. Booking Duration</label><input type="text" name="minimumBookingDuration" value={formData.minimumBookingDuration} onChange={handleChange} required /></div>
                            </div>
                        </div>

                        {/* SCREEN / DISPLAY */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Screen / Display Details</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Screen Size</label><input type="text" name="screenSize" placeholder="e.g., 10x6" value={formData.screenSize} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Format (e.g. 16:9)</label><input type="text" name="displayFormat" placeholder="e.g., 16:9" value={formData.displayFormat} onChange={handleChange} /></div>
                                <div className={styles.formGroup}><label>Display Hours</label><input type="text" name="displayHours" placeholder="e.g., 8am-10pm" value={formData.displayHours} onChange={handleChange} /></div>
                            </div>
                        </div>

                        {/* VARIANTS */}
                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Variants</h3>
                            <p className={styles.sectionHint}>Define options, add values, generate combinations, then set rate and custom fields.</p>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Option 1 Name</label><input type="text" name="option1Name" value={formData.option1Name} onChange={handleChange} placeholder="e.g. Screen Code / Color / Size" /></div>
                                <div className={styles.formGroup}><label>Option 2 Name</label><input type="text" name="option2Name" value={formData.option2Name} onChange={handleChange} placeholder="e.g. Auditorium / Material" /></div>
                                <div className={styles.formGroup}><label>Option 3 Name (optional)</label><input type="text" name="option3Name" value={formData.option3Name} onChange={handleChange} placeholder="e.g. Language / Format" /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>{formData.option1Name || 'Option 1'} values (comma separated)</label><input type="text" value={optionValues.option1} onChange={(e) => setOptionValues(prev => ({ ...prev, option1: e.target.value }))} placeholder="Red, Green, Yellow" /></div>
                                <div className={styles.formGroup}><label>{formData.option2Name || 'Option 2'} values (comma separated)</label><input type="text" value={optionValues.option2} onChange={(e) => setOptionValues(prev => ({ ...prev, option2: e.target.value }))} placeholder="S, M, L" /></div>
                                <div className={styles.formGroup}><label>{formData.option3Name || 'Option 3'} values (optional)</label><input type="text" value={optionValues.option3} onChange={(e) => setOptionValues(prev => ({ ...prev, option3: e.target.value }))} placeholder="Cotton, Silk" /></div>
                            </div>
                            <div className={styles.formRow}>
                                <button type="button" className={styles.pricingAddBtn} onClick={generateVariantCombinations}>Generate Variant Combinations</button>
                            </div>
                            <h4 className={styles.subSectionHead}>Variant Custom Fields</h4>
                            {variantCustomFieldDefs.map((fieldKey, idx) => (
                                <div key={idx} className={`${styles.formRow} ${styles.customFieldRow}`}>
                                    <div className={`${styles.formGroup} ${styles.customFieldKeyGroup}`}>
                                        <label>Field key</label>
                                        <input type="text" placeholder="e.g. projector_type" value={fieldKey} onChange={(e) => updateVariantCustomFieldDef(idx, e.target.value)} />
                                    </div>
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
                                <div key={i} className={styles.variantRow}>
                                    <div className={styles.variantLabelCell}>{[row.option1Value, row.option2Value, row.option3Value].filter(Boolean).join(' / ') || 'Variant'}</div>
                                    <input type="number" placeholder="Rate" value={row.rate} onChange={e => updateVariant(i, 'rate', e.target.value)} />
                                    {variantCustomFieldDefs.map((f, idx) => (
                                        <input key={idx} type="text" placeholder={f || `Custom ${idx + 1}`} value={row.customFields?.[f] || ''} onChange={e => updateVariantCustomField(i, f, e.target.value)} />
                                    ))}
                                    <button type="button" className={styles.pricingRemoveBtn} onClick={() => removeVariantRow(i)}>Remove</button>
                                </div>
                            ))}
                        </div>

                        <div className={`${styles.formSection} ${styles.cardSection}`}>
                            <h3 className={styles.sectionHead}>Pricing Conditions</h3>
                            <p className={styles.sectionHint}>Add multiplier rules like Festive = 1.2x base rate or Blockbuster = 2x.</p>
                            <div className={styles.variantHeader}>
                                <span>Variant Name</span>
                                <span>Option</span>
                                <span>Multiplier (x)</span>
                                <span></span>
                            </div>
                            {pricingRules.map((row, i) => (
                                <div key={i} className={styles.variantRow}>
                                    <input type="text" placeholder="e.g. Season" value={row.ruleName} onChange={(e) => updatePricingRule(i, 'ruleName', e.target.value)} />
                                    <input type="text" placeholder="e.g. Festive" value={row.optionLabel} onChange={(e) => updatePricingRule(i, 'optionLabel', e.target.value)} />
                                    <input type="number" step="0.01" min="0" placeholder="1.20" value={row.multiplier} onChange={(e) => updatePricingRule(i, 'multiplier', e.target.value)} />
                                    <button type="button" className={styles.pricingRemoveBtn} onClick={() => removePricingRule(i)}>Remove</button>
                                </div>
                            ))}
                            <div className={styles.formRow}>
                                <button type="button" className={styles.pricingAddBtn} onClick={addPricingRule}>+ Add Condition</button>
                            </div>
                        </div>

                        <MetafieldSection vendorMetafields={vendorMetafields} values={metafieldValues} onValuesChange={setMetafieldValues} />

                        <div className={`${styles.formActions} ${styles.stickyFormActions}`}>
                            <button type="submit" className={`${styles.submitBtn} ${saved ? styles.saved : ''}`} disabled={loading || saved}>{loading ? 'Creating...' : saved ? 'Saved!' : 'Create Media'}</button>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={loading || saved}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
