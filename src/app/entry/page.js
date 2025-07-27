"use client"

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CldUploadWidget } from 'next-cloudinary';
import { State, City } from 'country-state-city';
import CreatableSelect from 'react-select/creatable';

const Map = dynamic(() => import('./EntryMap'), {
    ssr: false
});

const initialFormData = {
    latitude: '', longitude: '', state: 'MH', city: 'Mumbai', address: '', landmark: '',
    mediaType: 'hording', width: '', height: '', hordingType: 'frontLit',
    visibility: 'prime', condition: 'supreme', rate: '', ourRate: '',
    paymentTerms: '', minimumBookingDuration: '', vendorName: '', pocName: '',
    previousClientele: '', slotTime: '', loopTime: '', displayHours: '',
    propertyCode: '', offers: '', description: '', dwellTime: '',
    compliance: false, status: 'pending',
};

// --- STYLING CONSTANTS (Updated for new design) ---
const baseInputClassName = "block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-transparent shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-0 text-sm peer py-2.5 px-3.5";
const floatingLabelClassName = "absolute text-gray-500 dark:text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-800 px-2 peer-focus:px-2 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";
const selectLabelClassName = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1";
const sectionTitleClassName = "text-lg font-semibold text-gray-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-700 pb-2 mb-6";
const stepsInfo = [{ number: 1, title: "Location & Specs" }, { number: 2, title: "Commercials & Details" }, { number: 3, title: "Media & Finalization" }];

const getCustomSelectStyles = (isDarkMode = true) => ({
    control: (base, state) => ({ ...base, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: state.isFocused ? '#818cf8' : (isDarkMode ? '#475569' : '#d1d5db'), borderRadius: '0.5rem', padding: '0.125rem', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, }),
    input: (base) => ({ ...base, color: isDarkMode ? '#f1f5f9' : '#0f172a' }),
    singleValue: (base) => ({ ...base, color: isDarkMode ? '#f1f5f9' : '#0f172a' }),
    menu: (base) => ({ ...base, backgroundColor: isDarkMode ? '#334155' : 'white', borderRadius: '0.5rem' }),
    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? (isDarkMode ? '#4f46e5' : '#e0e7ff') : 'transparent', color: isDarkMode ? '#f1f5f9' : '#111827', borderRadius: '0.375rem', margin: '0 4px', width: 'calc(100% - 8px)', '&:active': { backgroundColor: isDarkMode ? '#4338ca' : '#c7d2fe' }, }),
    placeholder: (base) => ({ ...base, color: isDarkMode ? '#94a3b8' : '#6b7280' }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({ ...base, color: state.isFocused ? (isDarkMode ? '#f1f5f9' : '#4f46e5') : (isDarkMode ? '#94a3b8' : '#6b7280'), '&:hover': { color: isDarkMode ? '#f1f5f9' : '#4f46e5' } }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
});

const FloatingLabelInput = ({ name, label, type = "text", value, onChange, error }) => (<div className="relative"> <input type={type} id={name} name={name} className={baseInputClassName} value={value} onChange={onChange} placeholder=" " /> <label htmlFor={name} className={floatingLabelClassName}>{label}</label> {error && <p className="text-red-500 text-xs mt-1">{error}</p>} </div>);
const FloatingLabelTextarea = ({ name, label, value, onChange, error, rows = 3 }) => (<div className="relative"> <textarea id={name} name={name} className={baseInputClassName} value={value} onChange={onChange} placeholder=" " rows={rows} /> <label htmlFor={name} className={floatingLabelClassName}>{label}</label> {error && <p className="text-red-500 text-xs mt-1">{error}</p>} </div>);

export default function Page() {
    const [formData, setFormData] = useState(initialFormData);
    const [clickLocation, setClickLocation] = useState(null);
    const [imageUrls, setImageUrls] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    const [errors, setErrors] = useState({});
    const [formStatus, setFormStatus] = useState({ message: '', type: '' });
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [vendorOptions, setVendorOptions] = useState([]);
    const [isLoadingVendors, setIsLoadingVendors] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        try { setStates(State.getStatesOfCountry('IN') || []); } catch (e) { console.error("Failed to load states", e); setStates([]); }

        fetch('/api/vendors')
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                if (Array.isArray(data)) {
                    setVendorOptions(data.map(v => ({ value: v.name, label: v.name })));
                }
            })
            .catch(e => console.error("Failed to fetch vendors", e))
            .finally(() => setIsLoadingVendors(false));
    }, []);

    useEffect(() => {
        if (formData.state) { setCities(City.getCitiesOfState('IN', formData.state) || []); }
        else { setCities([]); }
    }, [formData.state]);

    const resetForm = () => {
        setFormData(initialFormData);
        setImageUrls([]);
        setClickLocation(null);
        setErrors({});
        setCurrentStep(1);
        setFormStatus({ message: '', type: '' });
    };

    const handleStateChange = (e) => { setFormData(prev => ({ ...prev, state: e.target.value, city: '' })); if (errors.state || errors.city) { setErrors(prev => ({ ...prev, state: null, city: null })); } };
    const handleInputChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); if (errors[name]) { setErrors(prev => ({ ...prev, [name]: null })); } };
    const handleVendorChange = (newValue, actionMeta) => {
        let vendorName = '';
        if (actionMeta.action === 'create-option' && newValue) {
            vendorName = newValue.value;
            setVendorOptions(prev => [...prev, newValue]);
        } else {
            vendorName = newValue ? newValue.value : '';
        }
        setFormData(prev => ({ ...prev, vendorName: vendorName }));
    };
    const handleMapClick = useCallback((lat, lng) => { setFormData(prev => ({ ...prev, latitude: lat, longitude: lng })); setClickLocation({ lat, lng }); }, []);
    const validateStep = (stepToValidate) => {
        const newErrors = {};
        const step = stepToValidate || currentStep;
        if (step === 1) {
            if (!formData.state) newErrors.state = 'State is required.';
            if (!formData.city) newErrors.city = 'City is required.';
            if (!formData.address.trim()) newErrors.address = 'Location description is required.';
        } else if (step === 2) {
            if (!formData.minimumBookingDuration.trim()) newErrors.minimumBookingDuration = 'Minimum booking duration is required.';
        } else if (step === 3) {
            if (!formData.status) newErrors.status = 'Site status is required.';
        }
        setErrors(prev => ({ ...prev, ...newErrors }));
        return Object.keys(newErrors).length === 0;
    };
    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
            setFormStatus({ message: '', type: '' });
        } else {
            setFormStatus({ message: 'Please complete all required fields.', type: 'error' });
            setTimeout(() => setFormStatus({ message: '', type: '' }), 3000);
        }
    };
    const prevStep = () => { setCurrentStep(prev => prev - 1); setFormStatus({ message: '', type: '' }); };
    const attemptStepNavigation = (targetStep) => {
        if (targetStep < currentStep) { setCurrentStep(targetStep); return; }
        for (let i = 1; i < targetStep; i++) {
            if (!validateStep(i)) {
                setFormStatus({ message: `Please complete Step ${i} first.`, type: 'error' });
                setTimeout(() => setFormStatus({ message: '', type: '' }), 3000);
                setCurrentStep(i);
                return;
            }
        }
        setCurrentStep(targetStep);
    };
    const handleSave = async (e) => {
        e.preventDefault();
        let allValid = true;
        const finalErrors = {};
        if (!formData.state) { finalErrors.state = 'State is required.'; allValid = false; }
        if (!formData.city) { finalErrors.city = 'City is required.'; allValid = false; }
        if (!formData.address.trim()) { finalErrors.address = 'Location description is required.'; allValid = false; }
        if (!formData.minimumBookingDuration.trim()) { finalErrors.minimumBookingDuration = 'Minimum booking duration is required.'; allValid = false; }
        if (!formData.status) { finalErrors.status = 'Site status is required.'; allValid = false; }
        if (!allValid) {
            setErrors(finalErrors);
            setFormStatus({ message: 'Please fix all errors before submitting.', type: 'error' });
            if (finalErrors.state || finalErrors.city || finalErrors.address) setCurrentStep(1);
            else if (finalErrors.minimumBookingDuration) setCurrentStep(2);
            else if (finalErrors.status) setCurrentStep(3);
            return;
        }
        setFormStatus({ message: 'Submitting...', type: 'loading' });
        try {
            const submissionData = { ...formData, imageUrls: imageUrls };
            const response = await fetch('/api/formdata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData), });
            if (response.ok) {
                setFormStatus({ message: 'Hoarding entry saved successfully!', type: 'success' });
                resetForm();
                setTimeout(() => setFormStatus({ message: '', type: '' }), 5000);
            } else {
                const errorData = await response.json();
                setFormStatus({ message: `Failed to submit: ${errorData.message || errorData.error || 'Unknown server error.'}`, type: 'error' });
            }
        } catch (error) {
            setFormStatus({ message: 'An unexpected error occurred. Please try again.', type: 'error' });
        }
    };
    const handleUpload = (result) => { if (result.event === 'success') { setImageUrls(prev => [...prev, result.info.secure_url]); } };
    const renderError = (fieldName) => errors[fieldName] && <p className="text-red-500 text-xs mt-1">{errors[fieldName]}</p>;

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg md:flex">
                    <div className="md:w-1/4 p-6 pt-10 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-l-lg">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-8 text-center">Entry Steps</h2>
                        <div className="relative pl-4">{stepsInfo.map((step, index) => (<div key={step.number} className="flex items-start mb-2"><div className="flex flex-col items-center mr-4"><button onClick={() => attemptStepNavigation(step.number)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-150 ease-in-out ${currentStep === step.number ? 'bg-indigo-600 text-white dark:bg-indigo-500' : (currentStep > step.number ? 'bg-green-500 text-white dark:bg-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600')}`}>{step.number}</button>{index < stepsInfo.length - 1 && (<div className={`w-0.5 h-12 mt-1 ${currentStep > step.number ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-200 dark:bg-slate-600'}`}></div>)}</div><button onClick={() => attemptStepNavigation(step.number)} className={`pt-1 text-left ${currentStep === step.number ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-slate-300'}`}>{step.title}</button></div>))}</div>
                    </div>
                    <div className="md:w-3/4 p-6 sm:p-10">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className='text-2xl font-bold text-gray-800 dark:text-slate-100'>{stepsInfo.find(s => s.number === currentStep)?.title}</h1>
                            <p className='text-gray-500 dark:text-slate-400 text-sm'>Step {currentStep} of 3</p>
                        </div>
                        {formStatus.message && (<div className={`p-3.5 mb-6 rounded-lg text-center text-sm ${formStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-700 dark:text-green-100 dark:border-green-600' : formStatus.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-700 dark:text-red-100 dark:border-red-600' : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-600'}`}>{formStatus.message}</div>)}
                        <form onSubmit={handleSave} noValidate>
                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className={sectionTitleClassName}>Geographical Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div><label htmlFor="state" className={selectLabelClassName}>State</label><select name="state" value={formData.state} onChange={handleStateChange} className={baseInputClassName}><option value="">Select a State</option>{states.map(state => (<option key={state.isoCode} value={state.isoCode}>{state.name}</option>))}</select>{renderError('state')}</div>
                                            <div><label htmlFor="city" className={selectLabelClassName}>City</label><select name="city" value={formData.city} onChange={handleInputChange} className={baseInputClassName} disabled={!formData.state || cities.length === 0}><option value="">Select a City</option>{cities.map(city => (<option key={city.name} value={city.name}>{city.name}</option>))}</select>{renderError('city')}</div>
                                            <div className="md:col-span-2"><FloatingLabelTextarea name="address" label="Location Description" value={formData.address} onChange={handleInputChange} error={errors.address} /></div>
                                            <FloatingLabelInput name="landmark" label="Nearest Landmark" value={formData.landmark} onChange={handleInputChange} error={errors.landmark} />
                                            <div className="md:col-span-2"><p className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pin Location on Map</p><div className="mt-1 h-64 md:h-80 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600"><Map onMapClick={handleMapClick} clickLocation={clickLocation} /></div><div className="mt-2 grid grid-cols-2 gap-4"><input type="number" readOnly placeholder='Latitude' value={formData.latitude} className={`${baseInputClassName} bg-gray-100 dark:bg-slate-600`} /><input type="number" readOnly placeholder='Longitude' value={formData.longitude} className={`${baseInputClassName} bg-gray-100 dark:bg-slate-600`} /></div></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Hoarding Specifications</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div> <label htmlFor="mediaType" className={selectLabelClassName}>Media Type</label> <select name="mediaType" value={formData.mediaType} onChange={handleInputChange} className={baseInputClassName}> <option value="hording">Hoarding</option> <option value="busShelter">Bus Shelter</option> <option value="other">Other</option> </select> </div>
                                            <div> <label htmlFor="hordingType" className={selectLabelClassName}>Hoarding Type</label> <select name="hordingType" value={formData.hordingType} onChange={handleInputChange} className={baseInputClassName}> <option value="frontLit">Front-Lit</option> <option value="backLit">Back-Lit</option> <option value="led">LED</option> </select> </div>
                                            <FloatingLabelInput name="width" label="Width (ft)" type="number" value={formData.width} onChange={handleInputChange} error={errors.width} />
                                            <FloatingLabelInput name="height" label="Height (ft)" type="number" value={formData.height} onChange={handleInputChange} error={errors.height} />
                                            {formData.hordingType === 'led' && (<> <FloatingLabelInput name="slotTime" label="Slot Time (e.g., 10s)" value={formData.slotTime} onChange={handleInputChange} error={errors.slotTime} /> <FloatingLabelInput name="loopTime" label="Loop Time (e.g., 120s)" value={formData.loopTime} onChange={handleInputChange} error={errors.loopTime} /> <div className="md:col-span-2"> <FloatingLabelInput name="displayHours" label="Display Hours (e.g., 6 AM - 10 PM)" value={formData.displayHours} onChange={handleInputChange} error={errors.displayHours} /> </div> </>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className={sectionTitleClassName}>Pricing & Booking</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <FloatingLabelInput name="rate" label="Rate (per month)" type="number" value={formData.rate} onChange={handleInputChange} error={errors.rate} />
                                            <FloatingLabelInput name="ourRate" label="Our Rate (per month)" type="number" value={formData.ourRate} onChange={handleInputChange} error={errors.ourRate} />
                                            <FloatingLabelInput name="minimumBookingDuration" label="Min. Booking Duration" value={formData.minimumBookingDuration} onChange={handleInputChange} error={errors.minimumBookingDuration} />
                                            <div className="md:col-span-2"><FloatingLabelTextarea name="paymentTerms" label="Payment Terms/Cycle" value={formData.paymentTerms} onChange={handleInputChange} error={errors.paymentTerms} /></div>
                                            <div className="md:col-span-2"><FloatingLabelTextarea name="offers" label="Offers, Discounts, Negotiation Scope" value={formData.offers} onChange={handleInputChange} error={errors.offers} /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Site Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div> <label htmlFor="visibility" className={selectLabelClassName}>Visibility</label> <select name="visibility" value={formData.visibility} onChange={handleInputChange} className={baseInputClassName}> <option value="prime">Prime</option> <option value="high">High</option> <option value="medium">Medium</option> <option value="low">Low</option> </select> </div>
                                            <div> <label htmlFor="condition" className={selectLabelClassName}>Quality</label> <select name="condition" value={formData.condition} onChange={handleInputChange} className={baseInputClassName}> <option value="supreme">Supreme</option> <option value="great">Great</option> <option value="good">Good</option> <option value="average">Average</option> </select> </div>
                                            <FloatingLabelInput name="dwellTime" label="Dwell Time" value={formData.dwellTime} onChange={handleInputChange} error={errors.dwellTime} />
                                            <div className="md:col-span-2"> <FloatingLabelTextarea name="description" label="Description" value={formData.description} onChange={handleInputChange} error={errors.description} /> </div>
                                            <div className="md:col-span-2"> <FloatingLabelTextarea name="previousClientele" label="Previous Clientele" value={formData.previousClientele} onChange={handleInputChange} error={errors.previousClientele} /> </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Vendor Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div className="md:col-span-2">
                                                <label className={selectLabelClassName}>Vendor Name</label>
                                                {isClient ? (
                                                    <CreatableSelect
                                                        isClearable
                                                        isSearchable
                                                        isLoading={isLoadingVendors}
                                                        onChange={handleVendorChange}
                                                        options={vendorOptions}
                                                        value={vendorOptions.find(option => option.value === formData.vendorName)}
                                                        placeholder="Select or type to add a vendor"
                                                        styles={getCustomSelectStyles(true)}
                                                        menuPortalTarget={document.body}
                                                        menuPosition={'fixed'}
                                                    />
                                                ) : (
                                                    <div className={`${baseInputClassName} flex items-center text-slate-400`}>Loading vendors...</div>
                                                )}
                                            </div>
                                            <FloatingLabelInput name="pocName" label="POC Name" value={formData.pocName} onChange={handleInputChange} error={errors.pocName} />
                                            <FloatingLabelInput name="propertyCode" label="Property Code" value={formData.propertyCode} onChange={handleInputChange} error={errors.propertyCode} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {currentStep === 3 && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className={sectionTitleClassName}>Media Upload</h3>
                                        <div>
                                            <p className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hoarding Images</p>
                                            <div className="mt-1 p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-center">
                                                <CldUploadWidget onSuccess={handleUpload} uploadPreset="hording-map" options={{ sources: ['local', 'url', 'camera'], multiple: true }}>{({ open }) => <button type="button" onClick={() => open()} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Click to Upload Images</button>}</CldUploadWidget>
                                                {imageUrls.length > 0 && (<div className="flex flex-wrap justify-center mt-4 gap-4"> {imageUrls.map((url, index) => (<div key={index} className="relative"> <img src={url} alt={`Uploaded ${index + 1}`} className="w-24 h-24 object-cover rounded-lg shadow-md" /> </div>))} </div>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Status & Compliance</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <label htmlFor="status" className={selectLabelClassName}>Site Status</label>
                                                <select name="status" value={formData.status} onChange={handleInputChange} className={baseInputClassName}><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
                                                {renderError('status')}
                                            </div>
                                            <div className="flex items-start pt-2">
                                                <div className="flex items-center h-5"> <input id="compliance" name="compliance" type="checkbox" checked={formData.compliance} onChange={handleInputChange} className="focus:ring-indigo-500 dark:focus:ring-indigo-400 h-4 w-4 text-indigo-600 dark:text-indigo-500 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700" /> </div>
                                                <div className="ml-3 text-sm">
                                                    <label htmlFor="compliance" className="font-medium text-gray-700 dark:text-slate-200">Compliance Verified</label>
                                                    <p className="text-gray-500 dark:text-slate-400 text-xs">Check if all legal/regulatory compliance is complete.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                                <div> {currentStep > 1 && (<button type="button" onClick={prevStep} className="px-6 py-2.5 border border-gray-400 dark:border-slate-500 text-gray-700 dark:text-slate-300 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700">Previous</button>)} </div>
                                <div> {currentStep < 3 && (<button type="button" onClick={nextStep} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg shadow-sm">Next</button>)} {currentStep === 3 && (<button type="submit" className="px-6 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg shadow-sm disabled:opacity-70" disabled={formStatus.type === 'loading'}>{formStatus.type === 'loading' ? 'Saving...' : 'Save Hoarding Entry'}</button>)} </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
