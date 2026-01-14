'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CldUploadWidget } from 'next-cloudinary';
import { State, City } from 'country-state-city';
import { ChevronDown, Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Map = dynamic(() => import('./EntryMap'), { ssr: false });

// Initial form data matching Hording schema
const initialFormData = {
    // LOCATION
    latitude: '',
    longitude: '',
    state: 'MH',
    city: 'Mumbai',
    address: '',
    pincode: '',
    zone: '',
    landmark: '',
    road_name: '',
    road_from: '',
    road_to: '',
    position_wrt_road: 'LHS',

    // CONTACT
    poc_name: '',
    poc_number: '',
    poc_email: '',

    // COMMERCIAL
    monthly_rental: '',
    vendor_rate: '',
    payment_terms: '',
    minimum_booking_duration: '',
    vendor_name: '',

    // MEDIA CORE
    media_type: 'Digital Screens',
    media: [],

    // SPECS (varies by media_type)
    screen_size: '',
    screen_number: '',
    screen_placement: 'Roadside',
    display_format: 'Static',
    width: '',
    height: '',
    hording_type: 'Static',

    // ADDITIONAL
    traffic_type: 'Heavy',
    visibility: 'High',
    condition: 'Excellent',
    dwell_time: '',
    previous_clientele: '',

    // SYSTEM
    status: 'active',
    compliance: false,

    // METAFIELDS
    metafields: {},
};

// Available metafield namespaces for Hordings
const METAFIELD_NAMESPACES = [
    { namespace: 'custom', key: 'seo_notes', name: 'SEO Notes', type: 'string' },
    { namespace: 'custom', key: 'traffic_pattern', name: 'Traffic Pattern', type: 'string' },
    { namespace: 'custom', key: 'foot_traffic_count', name: 'Foot Traffic Count', type: 'number' },
    { namespace: 'custom', key: 'vehicle_traffic_count', name: 'Vehicle Traffic Count', type: 'number' },
    { namespace: 'custom', key: 'peak_hours', name: 'Peak Hours', type: 'string' },
    { namespace: 'custom', key: 'demographics', name: 'Demographics', type: 'string' },
    { namespace: 'custom', key: 'nearby_landmarks', name: 'Nearby Landmarks', type: 'string' },
    { namespace: 'custom', key: 'installation_date', name: 'Installation Date', type: 'date' },
    { namespace: 'custom', key: 'maintenance_notes', name: 'Maintenance Notes', type: 'string' },
    { namespace: 'custom', key: 'certifications', name: 'Certifications', type: 'string' },
];

// Styling
const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const sectionClass = 'border-b border-gray-200 dark:border-gray-700 pb-6 mb-6';
const buttonPrimaryClass = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition';
const buttonSecondaryClass = 'px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition';
const buttonDangerClass = 'px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded text-sm transition';

// Collapsible Section Component
const CollapsibleSection = ({ title, children, defaultOpen = true, icon: Icon = null }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={sectionClass}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5" />}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div>{children}</div>}
        </div>
    );
};

// Input Component
const InputField = ({ label, name, type = 'text', value, onChange, error, required = false, hint }) => (
    <div className="mb-4">
        <label className={labelClass}>
            {label}
            {required && <span className="text-red-600 dark:text-red-400">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className={`${inputClass} ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {error && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>}
        {hint && <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{hint}</p>}
    </div>
);

// Select Component
const SelectField = ({ label, name, value, options, onChange, error, required = false }) => (
    <div className="mb-4">
        <label className={labelClass}>
            {label}
            {required && <span className="text-red-600 dark:text-red-400">*</span>}
        </label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className={`${inputClass} ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        >
            <option value="">Select {label}</option>
            {Array.isArray(options) && options.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
            ))}
        </select>
        {error && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>}
    </div>
);

// Metafield Row Component
const MetafieldRow = ({ mf, value, onUpdate, onDelete }) => {
    const [showValue, setShowValue] = useState(false);

    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{mf.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">custom.{mf.key}</p>
            </div>
            <div className="flex-1">
                <input
                    type={mf.type === 'date' ? 'date' : mf.type === 'number' ? 'number' : 'text'}
                    value={value || ''}
                    onChange={(e) => onUpdate(mf.key, e.target.value)}
                    placeholder={`Enter ${mf.name.toLowerCase()}`}
                    className={`${inputClass} text-sm`}
                />
            </div>
            <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
                {showValue ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
                type="button"
                onClick={() => onDelete(mf.key)}
                className={buttonDangerClass}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};

// Main Component
export default function HordingEditor() {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [clickLocation, setClickLocation] = useState(null);
    const [addingMetafield, setAddingMetafield] = useState(null);

    // Fetch vendors
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const res = await fetch('/api/vendors');
                if (res.ok) {
                    const data = await res.json();
                    setVendors(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Error fetching vendors:', err);
            }
        };
        fetchVendors();
    }, []);

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setSaved(false);
    };

    // Handle map click
    const handleMapClick = useCallback((lat, lng) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
        setClickLocation({ lat, lng });
    }, []);

    // Handle metafield update
    const handleMetafieldUpdate = (key, value) => {
        setFormData(prev => ({
            ...prev,
            metafields: {
                ...prev.metafields,
                [key]: value
            }
        }));
    };

    // Handle metafield delete
    const handleMetafieldDelete = (key) => {
        setFormData(prev => {
            const newMetafields = { ...prev.metafields };
            delete newMetafields[key];
            return {
                ...prev,
                metafields: newMetafields
            };
        });
    };

    // Add metafield
    const handleAddMetafield = (mf) => {
        setFormData(prev => ({
            ...prev,
            metafields: {
                ...prev.metafields,
                [mf.key]: ''
            }
        }));
        setAddingMetafield(null);
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.latitude) newErrors.latitude = 'Latitude is required';
        if (!formData.longitude) newErrors.longitude = 'Longitude is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.poc_name) newErrors.poc_name = 'POC Name is required';
        if (!formData.poc_number) newErrors.poc_number = 'POC Number is required';
        if (!formData.monthly_rental) newErrors.monthly_rental = 'Monthly Rental is required';
        if (!formData.vendor_name) newErrors.vendor_name = 'Vendor is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/formdata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                setErrors({ submit: err.message || 'Failed to save' });
                setLoading(false);
                return;
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Available metafields not yet added
    const availableMetafields = METAFIELD_NAMESPACES.filter(mf => !formData.metafields.hasOwnProperty(mf.key));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Add Hording</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create a new outdoor advertising location</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {saved && (
                            <div className="text-green-600 dark:text-green-400 font-medium">✓ Saved</div>
                        )}
                        <button
                            type="submit"
                            form="hordings-form"
                            disabled={loading}
                            className={`${buttonPrimaryClass} disabled:opacity-50`}
                        >
                            {loading ? 'Saving...' : 'Save Hording'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <form id="hordings-form" onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="col-span-2">
                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-700 dark:text-red-300">{errors.submit}</p>
                                </div>
                            </div>
                        )}

                        {/* LOCATION SECTION */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <CollapsibleSection title="Location Information" defaultOpen={true}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Latitude"
                                        name="latitude"
                                        type="number"
                                        value={formData.latitude}
                                        onChange={handleInputChange}
                                        error={errors.latitude}
                                        required
                                    />
                                    <InputField
                                        label="Longitude"
                                        name="longitude"
                                        type="number"
                                        value={formData.longitude}
                                        onChange={handleInputChange}
                                        error={errors.longitude}
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className={labelClass}>Select on Map</label>
                                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                                        <Map onMapClick={handleMapClick} clickLocation={clickLocation} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        label="State"
                                        name="state"
                                        value={formData.state}
                                        options={State.getStatesOfCountry('IN').map(s => s.isoCode)}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <SelectField
                                        label="City"
                                        name="city"
                                        value={formData.city}
                                        options={City.getCitiesOfState('IN', formData.state).map(c => c.name)}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <InputField
                                    label="Address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    error={errors.address}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Pincode"
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleInputChange}
                                    />
                                    <InputField
                                        label="Zone"
                                        name="zone"
                                        value={formData.zone}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Landmark"
                                        name="landmark"
                                        value={formData.landmark}
                                        onChange={handleInputChange}
                                    />
                                    <SelectField
                                        label="Position WRT Road"
                                        name="position_wrt_road"
                                        value={formData.position_wrt_road}
                                        options={['LHS', 'RHS', 'Center']}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Road Name"
                                        name="road_name"
                                        value={formData.road_name}
                                        onChange={handleInputChange}
                                    />
                                    <InputField
                                        label="Traffic Type"
                                        name="traffic_type"
                                        value={formData.traffic_type}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </CollapsibleSection>
                        </div>

                        {/* MEDIA TYPE & SPECS */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <CollapsibleSection title="Media Type & Specifications" defaultOpen={true}>
                                <SelectField
                                    label="Media Type"
                                    name="media_type"
                                    value={formData.media_type}
                                    options={['Digital Screens', 'Hoarding', 'Bus Shelter', 'Wall Wrap', 'Kiosk', 'Transit', 'Neon Sign', 'Other']}
                                    onChange={handleInputChange}
                                    required
                                />

                                {formData.media_type === 'Digital Screens' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField
                                                label="Screen Size (inches)"
                                                name="screen_size"
                                                type="number"
                                                value={formData.screen_size}
                                                onChange={handleInputChange}
                                            />
                                            <InputField
                                                label="Number of Screens"
                                                name="screen_number"
                                                type="number"
                                                value={formData.screen_number}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField
                                                label="Display Format"
                                                name="display_format"
                                                value={formData.display_format}
                                                options={['Static', 'LED', 'LCD', 'Projection']}
                                                onChange={handleInputChange}
                                            />
                                            <SelectField
                                                label="Screen Placement"
                                                name="screen_placement"
                                                value={formData.screen_placement}
                                                options={['Roadside', 'Residential', 'Commercial', 'Mall', 'Transit']}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.media_type === 'Hoarding' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField
                                                label="Width (feet)"
                                                name="width"
                                                type="number"
                                                value={formData.width}
                                                onChange={handleInputChange}
                                            />
                                            <InputField
                                                label="Height (feet)"
                                                name="height"
                                                type="number"
                                                value={formData.height}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField
                                                label="Hoarding Type"
                                                name="hording_type"
                                                value={formData.hording_type}
                                                options={['Static', 'Rotating', 'Trivision']}
                                                onChange={handleInputChange}
                                            />
                                            <SelectField
                                                label="Condition"
                                                name="condition"
                                                value={formData.condition}
                                                options={['Excellent', 'Good', 'Fair', 'Poor']}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </>
                                )}

                                <SelectField
                                    label="Visibility"
                                    name="visibility"
                                    value={formData.visibility}
                                    options={['High', 'Medium', 'Low']}
                                    onChange={handleInputChange}
                                />
                            </CollapsibleSection>
                        </div>

                        {/* CONTACT & COMMERCIAL */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <CollapsibleSection title="Contact Information" defaultOpen={true}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="POC Name"
                                        name="poc_name"
                                        value={formData.poc_name}
                                        onChange={handleInputChange}
                                        error={errors.poc_name}
                                        required
                                    />
                                    <InputField
                                        label="POC Number"
                                        name="poc_number"
                                        value={formData.poc_number}
                                        onChange={handleInputChange}
                                        error={errors.poc_number}
                                        required
                                    />
                                </div>

                                <InputField
                                    label="POC Email"
                                    name="poc_email"
                                    type="email"
                                    value={formData.poc_email}
                                    onChange={handleInputChange}
                                />
                            </CollapsibleSection>

                            <CollapsibleSection title="Commercial Details" defaultOpen={true}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Monthly Rental (₹)"
                                        name="monthly_rental"
                                        type="number"
                                        value={formData.monthly_rental}
                                        onChange={handleInputChange}
                                        error={errors.monthly_rental}
                                        required
                                    />
                                    <InputField
                                        label="Vendor Rate (₹)"
                                        name="vendor_rate"
                                        type="number"
                                        value={formData.vendor_rate}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Payment Terms"
                                        name="payment_terms"
                                        value={formData.payment_terms}
                                        onChange={handleInputChange}
                                    />
                                    <InputField
                                        label="Minimum Booking Duration"
                                        name="minimum_booking_duration"
                                        value={formData.minimum_booking_duration}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <InputField
                                    label="Dwell Time (Optional)"
                                    name="dwell_time"
                                    value={formData.dwell_time}
                                    onChange={handleInputChange}
                                />
                            </CollapsibleSection>
                        </div>

                        {/* MEDIA GALLERY */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <CollapsibleSection title="Media Gallery" defaultOpen={true}>
                                <div className="mb-4">
                                    <CldUploadWidget
                                        uploadPreset="hording_media"
                                        onSuccess={(result) => {
                                            if (result.event === 'success') {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    media: [...(prev.media || []), result.info.secure_url]
                                                }));
                                            }
                                        }}
                                    >
                                        {({ open }) => (
                                            <button
                                                type="button"
                                                onClick={() => open()}
                                                className={`${buttonPrimaryClass} w-full text-center`}
                                            >
                                                <Plus className="w-4 h-4 inline mr-2" />
                                                Upload Images/Videos
                                            </button>
                                        )}
                                    </CldUploadWidget>
                                </div>

                                {formData.media && formData.media.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{formData.media.length} file(s) uploaded</p>
                                        <div className="grid grid-cols-4 gap-3">
                                            {formData.media.map((url, idx) => (
                                                <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                                    <img src={url} alt={`Media ${idx}`} className="w-full h-24 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                media: prev.media.filter((_, i) => i !== idx)
                                                            }));
                                                        }}
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 bg-red-600 hover:bg-red-700 text-white rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CollapsibleSection>
                        </div>

                        {/* METAFIELDS */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <CollapsibleSection title="Custom Metafields" defaultOpen={false}>
                                <div className="mb-4">
                                    {Object.entries(formData.metafields).length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">No metafields added yet</p>
                                    ) : (
                                        <div className="space-y-3 mb-4">
                                            {Object.entries(formData.metafields).map(([key, value]) => {
                                                const mf = METAFIELD_NAMESPACES.find(m => m.key === key);
                                                return mf ? (
                                                    <MetafieldRow
                                                        key={key}
                                                        mf={mf}
                                                        value={value}
                                                        onUpdate={handleMetafieldUpdate}
                                                        onDelete={handleMetafieldDelete}
                                                    />
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>

                                {availableMetafields.length > 0 && (
                                    <div>
                                        <label className={labelClass}>Add Metafield</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={addingMetafield?.key || ''}
                                                onChange={(e) => {
                                                    const mf = METAFIELD_NAMESPACES.find(m => m.key === e.target.value);
                                                    setAddingMetafield(mf);
                                                }}
                                                className={inputClass}
                                            >
                                                <option value="">Select a metafield...</option>
                                                {availableMetafields.map(mf => (
                                                    <option key={mf.key} value={mf.key}>{mf.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (addingMetafield) {
                                                        handleAddMetafield(addingMetafield);
                                                    }
                                                }}
                                                disabled={!addingMetafield}
                                                className={`${buttonPrimaryClass} disabled:opacity-50`}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </CollapsibleSection>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div>
                        {/* Vendor Selection Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">Vendor</h3>
                            <SelectField
                                label="Select Vendor"
                                name="vendor_name"
                                value={formData.vendor_name}
                                options={vendors.map(v => v.name)}
                                onChange={handleInputChange}
                                error={errors.vendor_name}
                                required
                            />
                        </div>

                        {/* Status Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">Status</h3>
                            <SelectField
                                label="Status"
                                name="status"
                                value={formData.status}
                                options={['active', 'inactive', 'archived']}
                                onChange={handleInputChange}
                            />
                        </div>

                        {/* Compliance Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Compliance</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="compliance"
                                    checked={formData.compliance}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Compliance Check Passed</span>
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Mark as compliant with local regulations</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}