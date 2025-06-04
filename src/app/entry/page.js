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
    imageUrls: [],
};

// --- Styling Constants ---
// Base classes for a uniform look
const baseInputClassName = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3.5 text-sm peer";
// Classes for the floating label animation
const floatingLabelClassName = "absolute text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";
// A simpler, clean label for select elements
const selectLabelClassName = "block text-xs font-medium text-gray-500 mb-1";
const requiredStar = <span className="text-red-500 ml-1">*</span>;
const sectionTitleClassName = "text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-6";
const stepIndicatorClassName = "flex items-center px-4 py-3 rounded-lg transition-colors duration-150 ease-in-out";
const activeStepClassName = "bg-indigo-600 text-white shadow-md";
const inactiveStepClassName = "bg-gray-100 text-gray-700 hover:bg-gray-200";

const stepsInfo = [
    { number: 1, title: "Location & Specs" },
    { number: 2, title: "Commercials & Details" },
    { number: 3, title: "Media & Finalization" }
];


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
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        } else {
            setFormStatus({ message: 'Please complete all required fields in the current step.', type: 'error' });
            setTimeout(() => setFormStatus({ message: '', type: '' }), 3000);
        }
    };

    const prevStep = () => setCurrentStep(prev => prev - 1);

    const attemptStepNavigation = (targetStep) => {
        if (targetStep < currentStep) {
            setCurrentStep(targetStep);
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
            setFormStatus({ message: 'Please fix the errors before submitting.', type: 'error' });
            if (finalErrors.state || finalErrors.city || finalErrors.address) setCurrentStep(1);
            else if (finalErrors.minimumBookingDuration) setCurrentStep(2);
            else if (finalErrors.status) setCurrentStep(3);
            return;
        }

        setFormStatus({ message: 'Submitting...', type: 'loading' });
        try {
            const response = await fetch('/api/formdata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, imageUrls }),
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

    const renderError = (fieldName) => errors[fieldName] && <p className="text-red-500 text-xs mt-1">{errors[fieldName]}</p>;

    // Helper component for inputs with floating labels
    const FloatingLabelInput = ({ name, label, type = "text", required = false, ...props }) => (
        <div className="relative">
            <input
                type={type}
                id={name}
                name={name}
                className={baseInputClassName}
                value={formData[name]}
                onChange={handleInputChange}
                placeholder=" "
                {...props}
            />
            <label htmlFor={name} className={floatingLabelClassName}>
                {label} {required && requiredStar}
            </label>
            {renderError(name)}
        </div>
    );

    // Helper component for textareas with floating labels
    const FloatingLabelTextarea = ({ name, label, required = false, rows = 3, ...props }) => (
        <div className="relative">
            <textarea
                id={name}
                name={name}
                className={baseInputClassName}
                value={formData[name]}
                onChange={handleInputChange}
                placeholder=" "
                rows={rows}
                {...props}
            />
            <label htmlFor={name} className={floatingLabelClassName}>
                {label} {required && requiredStar}
            </label>
            {renderError(name)}
        </div>
    );


    return (
        <div className="w-full bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-lg md:flex">
                    {/* Sidebar */}
                    <div className="md:w-1/4 p-6 pt-10 border-r border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">Entry Steps</h2>
                        <div className="relative pl-4">
                            {stepsInfo.map((step, index) => (
                                <div key={step.number} className="flex items-start mb-2">
                                    <div className="flex flex-col items-center mr-4">
                                        <button
                                            onClick={() => attemptStepNavigation(step.number)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-150 ease-in-out
                                                ${currentStep === step.number ? 'bg-indigo-600 text-white' :
                                                    (currentStep > step.number ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')}
                                            `}
                                        >
                                            {step.number}
                                        </button>
                                        {index < stepsInfo.length - 1 && (
                                            <div className={`w-0.5 h-12 mt-1 ${currentStep > step.number ? 'bg-indigo-500' : 'bg-gray-200'}`}></div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => attemptStepNavigation(step.number)}
                                        className={`pt-1 text-left ${currentStep === step.number ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}
                                    >
                                        {step.title}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Form Content */}
                    <div className="md:w-3/4 p-6 sm:p-10">
                        {/* Form Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h1 className='text-2xl font-bold text-gray-800'>{stepsInfo.find(s => s.number === currentStep)?.title}</h1>
                            <p className='text-gray-500 text-sm'>Step {currentStep} of 3</p>
                        </div>

                        {/* Status Message */}
                        {formStatus.message && (
                            <div className={`p-3.5 mb-6 rounded-lg text-center text-sm ${formStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                                formStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`
                            }>
                                {formStatus.message}
                            </div>
                        )}

                        <form onSubmit={handleSave} noValidate>
                            {/* Step 1: Location & Core Specifications */}
                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className={sectionTitleClassName}>Geographical Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div className="md:col-span-2">
                                                <FloatingLabelTextarea name="address" label="Address" required />
                                            </div>
                                            <FloatingLabelInput name="landmark" label="Nearest Landmark" />
                                            <FloatingLabelInput name="city" label="City" required />
                                            <FloatingLabelInput name="state" label="State" required />

                                            <div className="md:col-span-2">
                                                <p className="block text-sm font-medium text-gray-700 mb-1">Pin Location on Map</p>
                                                <div className="mt-1 h-64 md:h-80 w-full rounded-lg overflow-hidden border border-gray-300">
                                                    <Map onMapClick={handleMapClick} clickLocation={clickLocation} />
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-4">
                                                    <input type="number" name="latitude" placeholder='Latitude' value={formData.latitude} onChange={handleInputChange} className={`${baseInputClassName} bg-gray-50`} readOnly />
                                                    <input type="number" name="longitude" placeholder='Longitude' value={formData.longitude} onChange={handleInputChange} className={`${baseInputClassName} bg-gray-50`} readOnly />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={sectionTitleClassName}>Hoarding Specifications</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div>
                                                <label className={selectLabelClassName}>Media Type</label>
                                                <select name="mediaType" value={formData.mediaType} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="hording">Hoarding</option>
                                                    <option value="busShelter">Bus Shelter</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={selectLabelClassName}>Hoarding Type</label>
                                                <select name="hordingType" value={formData.hordingType} onChange={handleInputChange} className={baseInputClassName}>
                                                    <option value="frontLit">Front-Lit</option>
                                                    <option value="backLit">Back-Lit</option>
                                                    <option value="led">LED</option>
                                                </select>
                                            </div>
                                            <FloatingLabelInput name="width" label="Width (ft)" type="number" />
                                            <FloatingLabelInput name="height" label="Height (ft)" type="number" />

                                            {formData.hordingType === 'led' && (
                                                <>
                                                    <FloatingLabelInput name="slotTime" label="Slot Time (e.g., 10s)" />
                                                    <FloatingLabelInput name="loopTime" label="Loop Time (e.g., 120s)" />
                                                    <div className="md:col-span-2">
                                                        <FloatingLabelInput name="displayHours" label="Display Hours (e.g., 6 AM - 10 PM)" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Commercials & Details */}
                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    {/* All sub-sections for Step 2 */}
                                </div>
                            )}

                            {/* Step 3: Media & Finalization */}
                            {currentStep === 3 && (
                                <div className="space-y-8">
                                    {/* All sub-sections for Step 3 */}
                                </div>
                            )}


                            {/* Navigation & Submission Buttons */}
                            <div className="mt-10 pt-6 border-t border-gray-200 flex justify-between items-center">
                                {/* ... Navigation buttons ... */}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}