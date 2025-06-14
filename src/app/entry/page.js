"use client"

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { CldUploadWidget } from 'next-cloudinary';

const Map = dynamic(() => import('./EntryMap'), {
    ssr: false
});

const initialFormData = {
    latitude: '',
    longitude: '',
    state: '',
    city: '',
    address: '',
    landmark: '',
    mediaType: 'hording',
    width: '',
    height: '',
    hordingType: 'frontLit',
    visibility: 'prime',
    condition: 'supreme',
    rate: '',
    ourRate: '',
    paymentTerms: '',
    minimumBookingDuration: '',
    vendorName: '',
    pocName: '',
    previousClientele: '',
    slotTime: '',
    loopTime: '',
    displayHours: '',
    propertyCode: '',
    offers: '',
    description: '',
    dwellTime: '',
    compliance: false,
    status: 'pending',
};

// --- Styling Constants ---

const baseInputClassName = "block w-full rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-transparent shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-0 text-sm peer py-2.5 px-3.5";
const floatingLabelClassName = "absolute text-gray-500 dark:text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-800 px-2 peer-focus:px-2 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";
const selectLabelClassName = "block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1";
const sectionTitleClassName = "text-lg font-semibold text-gray-800 dark:text-slate-100 border-b border-gray-200 dark:border-slate-700 pb-2 mb-6";

const stepsInfo = [
    { number: 1, title: "Location & Specs" },
    { number: 2, title: "Commercials & Details" },
    { number: 3, title: "Media & Finalization" }
];

// CORRECTED: Helper components moved OUTSIDE the main Page component.
// They now receive value, onChange, and error as props to function correctly.
const FloatingLabelInput = ({ name, label, type = "text", value, onChange, error }) => (
    <div className="relative">
        <input
            type={type}
            id={name}
            name={name}
            className={baseInputClassName}
            value={value}
            onChange={onChange}
            placeholder=" "
        />
        <label htmlFor={name} className={floatingLabelClassName}>{label}</label>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const FloatingLabelTextarea = ({ name, label, value, onChange, error, rows = 3 }) => (
    <div className="relative">
        <textarea
            id={name}
            name={name}
            className={baseInputClassName}
            value={value}
            onChange={onChange}
            placeholder=" "
            rows={rows}
        />
        <label htmlFor={name} className={floatingLabelClassName}>{label}</label>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);


export default function Page() {
    const [formData, setFormData] = useState(initialFormData);
    const [clickLocation, setClickLocation] = useState(null);
    const [imageUrls, setImageUrls] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    const [errors, setErrors] = useState({});
    const [formStatus, setFormStatus] = useState({ message: '', type: '' });

    const resetForm = () => {
        setFormData(initialFormData);
        setImageUrls([]);
        setClickLocation(null);
        setErrors({});
        setCurrentStep(1);
        setFormStatus({ message: '', type: '' });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleMapClick = (lat, lng) => {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setClickLocation({ lat, lng });
    };

    const validateStep = (stepToValidate) => {
        const newErrors = {};
        const step = stepToValidate || currentStep;
        if (step === 1) {
            if (!formData.state.trim()) newErrors.state = 'State is required.';
            if (!formData.city.trim()) newErrors.city = 'City is required.';
            if (!formData.address.trim()) newErrors.address = 'Address is required.';
        } else if (step === 2) {
            if (!formData.minimumBookingDuration.trim()) newErrors.minimumBookingDuration = 'Minimum booking duration is required.';
        } else if (step === 3) {
            if (!formData.status.trim()) newErrors.status = 'Site status is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
        }

        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
            setFormStatus({ message: '', type: '' });
        } else {
            setFormStatus({ message: 'Please complete all required fields in the current step.', type: 'error' });
            setTimeout(() => setFormStatus({ message: '', type: '' }), 3000);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        setFormStatus({ message: '', type: '' });
    };

    const attemptStepNavigation = (targetStep) => {
        if (targetStep < currentStep) {
            setCurrentStep(targetStep);
            setFormStatus({ message: '', type: '' });
            return;
        }
        for (let i = 1; i < targetStep; i++) {
            if (!validateStep(i)) {
                setFormStatus({ message: `Please complete Step ${i} first.`, type: 'error' });
                setTimeout(() => setFormStatus({ message: '', type: '' }), 3000);
                setCurrentStep(i);
                return;
            }
        }
        setCurrentStep(targetStep);
        setFormStatus({ message: '', type: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        let allValid = true;
        const finalErrors = {};
        if (!formData.state.trim()) { finalErrors.state = 'State is required.'; allValid = false; }
        if (!formData.city.trim()) { finalErrors.city = 'City is required.'; allValid = false; }
        if (!formData.address.trim()) { finalErrors.address = 'Address is required.'; allValid = false; }
        if (!formData.minimumBookingDuration.trim()) { finalErrors.minimumBookingDuration = 'Minimum booking duration is required.'; allValid = false; }
        if (!formData.status.trim()) { finalErrors.status = 'Site status is required.'; allValid = false; }

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
            const response = await fetch('/api/formdata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
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

    const handleUpload = (result) => {
        if (result.event === 'success') {
            setImageUrls(prev => [...prev, result.info.secure_url]);
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg md:flex">
                    {/* Sidebar */}
                    <div className="md:w-1/4 p-6 pt-10 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-l-lg">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-8 text-center">Entry Steps</h2>
                        <div className="relative pl-4">
                            {stepsInfo.map((step, index) => (
                                <div key={step.number} className="flex items-start mb-2">
                                    <div className="flex flex-col items-center mr-4">
                                        <button
                                            onClick={() => attemptStepNavigation(step.number)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-150 ease-in-out
                                                ${currentStep === step.number ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white' :
                                                    (currentStep > step.number ? 'bg-green-500 text-white dark:bg-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600')}
                                            `}
                                        >
                                            {step.number}
                                        </button>
                                        {index < stepsInfo.length - 1 && (
                                            <div className={`w-0.5 h-12 mt-1 ${currentStep > step.number ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-200 dark:bg-slate-600'}`}></div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => attemptStepNavigation(step.number)}
                                        className={`pt-1 text-left ${currentStep === step.number ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-slate-300'}`}
                                    >
                                        {step.title}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Form Content */}
                    <div className="md:w-3/4 p-6 sm:p-10">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className='text-2xl font-bold text-gray-800 dark:text-slate-100'>{stepsInfo.find(s => s.number === currentStep)?.title}</h1>
                            <p className='text-gray-500 dark:text-slate-400 text-sm'>Step {currentStep} of 3</p>
                        </div>

                        {formStatus.message && (
                            <div className={`p-3.5 mb-6 rounded-lg text-center text-sm ${formStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-700 dark:text-green-100 dark:border-green-600' :
                                formStatus.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-700 dark:text-red-100 dark:border-red-600' :
                                    'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-600'}`
                            }>
                                {formStatus.message}
                            </div>
                        )}

                        <form onSubmit={handleSave} noValidate>
                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className={sectionTitleClassName}>Geographical Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="address" label="Address" value={formData.address} onChange={handleInputChange} error={errors.address} />
                                            </div>
                                            <FloatingLabelInput name="landmark" label="Nearest Landmark" value={formData.landmark} onChange={handleInputChange} error={errors.landmark} />
                                            <FloatingLabelInput name="city" label="City" value={formData.city} onChange={handleInputChange} error={errors.city} />
                                            <FloatingLabelInput name="state" label="State" value={formData.state} onChange={handleInputChange} error={errors.state} />
                                            <div className="md:col-span-2">
                                                <p className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pin Location on Map</p>
                                                <div className="mt-1 h-64 md:h-80 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600">
                                                    <Map onMapClick={handleMapClick} clickLocation={clickLocation} />
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-4">
                                                    <input type="number" name="latitude" placeholder='Latitude' value={formData.latitude} className={`${baseInputClassName} bg-gray-100 dark:bg-slate-600`} readOnly />
                                                    <input type="number" name="longitude" placeholder='Longitude' value={formData.longitude} className={`${baseInputClassName} bg-gray-100 dark:bg-slate-600`} readOnly />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Hoarding Specifications</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div>
                                                <label htmlFor="mediaType" className={selectLabelClassName}>Media Type</label>
                                                <select name="mediaType" value={formData.mediaType} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="hording">Hoarding</option>
                                                    <option value="busShelter">Bus Shelter</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="hordingType" className={selectLabelClassName}>Hoarding Type</label>
                                                <select name="hordingType" value={formData.hordingType} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="frontLit">Front-Lit</option>
                                                    <option value="backLit">Back-Lit</option>
                                                    <option value="led">LED</option>
                                                </select>
                                            </div>
                                            <FloatingLabelInput name="width" label="Width (ft)" type="number" value={formData.width} onChange={handleInputChange} error={errors.width} />
                                            <FloatingLabelInput name="height" label="Height (ft)" type="number" value={formData.height} onChange={handleInputChange} error={errors.height} />
                                            {formData.hordingType === 'led' && (
                                                <>
                                                    <FloatingLabelInput name="slotTime" label="Slot Time (e.g., 10s)" value={formData.slotTime} onChange={handleInputChange} error={errors.slotTime} />
                                                    <FloatingLabelInput name="loopTime" label="Loop Time (e.g., 120s)" value={formData.loopTime} onChange={handleInputChange} error={errors.loopTime} />
                                                    <div className="md:col-span-2">
                                                        <FloatingLabelInput name="displayHours" label="Display Hours (e.g., 6 AM - 10 PM)" value={formData.displayHours} onChange={handleInputChange} error={errors.displayHours} />
                                                    </div>
                                                </>
                                            )}
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
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="paymentTerms" label="Payment Terms/Cycle" value={formData.paymentTerms} onChange={handleInputChange} error={errors.paymentTerms} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="offers" label="Offers, Discounts, Negotiation Scope" value={formData.offers} onChange={handleInputChange} error={errors.offers} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Site Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div>
                                                <label htmlFor="visibility" className={selectLabelClassName}>Visibility</label>
                                                <select name="visibility" value={formData.visibility} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="prime">Prime</option>
                                                    <option value="high">High</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="low">Low</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="condition" className={selectLabelClassName}>Condition</label>
                                                <select name="condition" value={formData.condition} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="supreme">Supreme</option>
                                                    <option value="great">Great</option>
                                                    <option value="good">Good</option>
                                                    <option value="average">Average</option>
                                                </select>
                                            </div>
                                            <FloatingLabelInput name="dwellTime" label="Dwell Time" value={formData.dwellTime} onChange={handleInputChange} error={errors.dwellTime} />
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="description" label="Description" value={formData.description} onChange={handleInputChange} error={errors.description} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="previousClientele" label="Previous Clientele" value={formData.previousClientele} onChange={handleInputChange} error={errors.previousClientele} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Vendor Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <FloatingLabelInput name="vendorName" label="Vendor Name" value={formData.vendorName} onChange={handleInputChange} error={errors.vendorName} />
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
                                                <CldUploadWidget onSuccess={handleUpload} uploadPreset="hording-map" options={{ sources: ['local', 'url', 'camera'], multiple: true }}>
                                                    {({ open }) => <button type="button" onClick={() => open()} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Click to Upload Images</button>}
                                                </CldUploadWidget>
                                                {imageUrls.length > 0 && (
                                                    <div className="flex flex-wrap justify-center mt-4 gap-4">
                                                        {imageUrls.map((url, index) => (
                                                            <div key={index} className="relative">
                                                                <img src={url} alt={`Uploaded ${index + 1}`} className="w-24 h-24 object-cover rounded-lg shadow-md" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Status & Compliance</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <label htmlFor="status" className={selectLabelClassName}>Site Status</label>
                                                <select name="status" value={formData.status} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="pending">Pending</option>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                                            </div>
                                            <div className="flex items-start pt-2">
                                                <div className="flex items-center h-5">
                                                    <input id="compliance" name="compliance" type="checkbox" checked={formData.compliance} onChange={handleInputChange} className="focus:ring-indigo-500 dark:focus:ring-indigo-400 h-4 w-4 text-indigo-600 dark:text-indigo-500 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700" />
                                                </div>
                                                <div className="ml-3 text-sm">
                                                    <label htmlFor="compliance" className="font-medium text-gray-700 dark:text-slate-200">Compliance Verified</label>
                                                    <p className="text-gray-500 dark:text-slate-400 text-xs">Check if all legal/regulatory compliance is complete.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation & Submission Buttons */}
                            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    {currentStep > 1 && (
                                        <button type="button" onClick={prevStep} className="px-6 py-2.5 border border-gray-400 dark:border-slate-500 text-gray-700 dark:text-slate-300 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                            Previous
                                        </button>
                                    )}
                                </div>
                                <div>
                                    {currentStep < 3 && (
                                        <button type="button" onClick={nextStep} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                            Next
                                        </button>
                                    )}
                                    {currentStep === 3 && (
                                        <button type="submit" className="px-6 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70" disabled={formStatus.type === 'loading'}>
                                            {formStatus.type === 'loading' ? 'Saving...' : 'Save Hoarding Entry'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}