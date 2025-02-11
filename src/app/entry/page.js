"use client"

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { CldUploadWidget, CldImage } from 'next-cloudinary';

const Map = dynamic(() => import('./EntryMap'), {
    ssr: false
});

export default function Page() {
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        mediaType: 'hording',
        landmark: '',
        width: '',
        height: '',
        type: 'fl',
        visibility: 'prime',
        rate: '',
        customers: '',
        traffic: 'ultra',
        condition: 'supreme',
        hordingType: 'frontLit',
        vendorName: '',
        pocName: '',
        ourRate: '',
        propertyCode: '',
        offers: '',
        description: '',
        slotTime: '',
        loopTime: '',
        displayHours: ''
    });

    const [clickLocation, setClickLocation] = useState(null);
    const [vendorOptions] = useState(["Option 1", "Option 2", "Option 3"]);
    const [pocOptions] = useState(["Option 1", "Option 2", "Option 3"]);
    const [isDropdownOpen1, setIsDropdownOpen1] = useState(false);
    const [isDropdownOpen2, setIsDropdownOpen2] = useState(false);
    const dropdownRef1 = useRef(null);
    const dropdownRef2 = useRef(null);
    const [imageUrls, setImageUrls] = useState([]);

    const handleOptionClick1 = (option) => {
        setFormData({
            ...formData,
            vendorName: option
        });
        setIsDropdownOpen1(false);
    };

    const handleOptionClick2 = (option) => {
        setFormData({
            ...formData,
            pocName: option
        });
        setIsDropdownOpen2(false);
    };

    const toggleDropdown1 = (e) => {
        e.preventDefault();
        setIsDropdownOpen1(!isDropdownOpen1);
    };

    const toggleDropdown2 = (e) => {
        e.preventDefault();
        setIsDropdownOpen2(!isDropdownOpen2);
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleMapClick = (lat, lng) => {
        setFormData({
            ...formData,
            latitude: lat,
            longitude: lng
        });
        setClickLocation({ lat, lng });
    };

    const handleDiscard = () => {
        setFormData({
            latitude: '',
            longitude: '',
            mediaType: 'hording',
            landmark: '',
            width: '',
            height: '',
            type: 'fl',
            visibility: 'prime',
            rate: '',
            customers: '',
            traffic: 'ultra',
            condition: 'supreme',
            hordingType: 'frontLit',
            vendorName: '',
            pocName: '',
            ourRate: '',
            propertyCode: '',
            offers: '',
            description: '',
            slotTime: '',
            loopTime: '',
            displayHours: ''
        });
        setClickLocation(null);
        setImageUrls([]);

        console.log("Form data discarded");
    };

    const handleRadioChange = (e) => {
        setFormData({
            ...formData,
            hordingType: e.target.value
        });
    };
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef1.current && !dropdownRef1.current.contains(event.target)) {
                setIsDropdownOpen1(false);
            }
            if (dropdownRef2.current && !dropdownRef2.current.contains(event.target)) {
                setIsDropdownOpen2(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const handleUpload = (result) => {
        if (result.event === 'success') {
            try {
                // Add the image URL to the state array
                setImageUrls((prevUrls) => [...prevUrls, result.info.secure_url]);
            } catch (error) {
                console.error("Error handling upload:", error);
            }
        }
    };

    const handleSave = async (e) => {
        const formDataWithImages = {
            ...formData,
            imageUrls // Add the image URLs to the form data
        };
        console.log("Form data saved:", formDataWithImages);
        // Send data to the server
        e.preventDefault();
        const response = await fetch('/api/formdata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formDataWithImages),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Form data submitted:', result);
        } else {
            console.error('Failed to submit form data', response);
        }
    };

    return (
        <div className="p-6 flex sm:flex-row flex-col items-start mx-auto shadow-md space-y-4 md:px-14">

            <form className="w-full space-y-4">
                <h1 className='text-2xl font-bold mb-5 md:px-14'>Hording Entry</h1>
                <div className="flex flex-wrap -mx-3 gap-y-4">
                    <div className='w-full md:w-1/2 md:px-14'>
                        <Map onMapClick={handleMapClick} clickLocation={clickLocation} />
                    </div>
                    <div className='w-full md:w-1/2 flex flex-wrap items-start justify-start gap-y-4 h-fit md:px-14'>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">

                            <div className="relative">
                                <select
                                    name="type"
                                    value={formData.mediaType}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="type"
                                >
                                    <option value="hording">Hoarding</option>
                                    <option value="busShelter">Bus Shelter</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="text"
                                name="landmark"
                                value={formData.landmark}
                                onChange={handleInputChange}
                                placeholder='Nearest Landmark'
                                className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                name="latitude"
                                placeholder='Latitude'
                                value={formData.latitude}
                                onChange={handleInputChange}
                                className="mt-1 block w-full text-black px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                placeholder='Longitude'
                                name="longitude"
                                value={formData.longitude}
                                onChange={handleInputChange}
                                className="mt-1 block w-full text-black px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                        </div>

                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                name="width"
                                value={formData.width}
                                onChange={handleInputChange}
                                placeholder='Width'
                                className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleInputChange}
                                placeholder='Height'
                                className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                name="rate"
                                placeholder='Rate per month'
                                value={formData.rate}
                                onChange={handleInputChange}
                                className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="number"
                                name="customers"
                                placeholder='Customer count'
                                value={formData.customers}
                                onChange={handleInputChange}
                                className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>



                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="visibility">
                                visibility
                            </label>
                            <div className="relative">
                                <select
                                    name="visibility"
                                    value={formData.visibility}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="visibility"
                                >
                                    <option value="prime">Prime</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="condition">
                                Condition
                            </label>
                            <div className="relative">
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="traffic"
                                >
                                    <option value="supreme">Supreme</option>
                                    <option value="great">Great</option>
                                    <option value="good">Good</option>
                                    <option value="average">Average</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder='Description'
                                className="mt-1 block resize-y max-h-24 min-h-10 w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <textarea
                                name="prevClientele"
                                value={formData.prevClientele}
                                onChange={handleInputChange}
                                placeholder='Previous Clientele'
                                className="mt-1 block resize-y max-h-24 min-h-10 w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>


                        <div className="w-full mb-6 md:mb-0">

                            <div className='flex justify-start gap-5'>
                                <div className="mb-[0.125rem] me-4 inline-block min-h-[1.5rem] px-3">
                                    <input
                                        className="relative "
                                        type="radio"
                                        name="hordingType"
                                        id="hordingType1"
                                        value="frontLit"
                                        checked={formData.hordingType === 'frontLit'}
                                        onChange={handleRadioChange}
                                    />
                                    <label
                                        className="mt-px inline-block ps-[0.15rem] hover:cursor-pointer"
                                        htmlFor="hordingType1"
                                    >Front-Lit</label>
                                </div>

                                <div className="mb-[0.125rem] me-4 inline-block min-h-[1.5rem] px-3">
                                    <input
                                        className="relative "
                                        type="radio"
                                        name="hordingType"
                                        id="hordingType2"
                                        value="backLit"
                                        checked={formData.hordingType === 'backLit'}
                                        onChange={handleRadioChange}
                                    />
                                    <label
                                        className="mt-px inline-block ps-[0.15rem] hover:cursor-pointer"
                                        htmlFor="hordingType2"
                                    >Back-Lit</label
                                    >
                                </div>
                                <div className="mb-[0.125rem] me-4 inline-block min-h-[1.5rem] px-3">
                                    <input
                                        className="relative"
                                        type="radio"
                                        name="hordingType"
                                        id="hordingType3"
                                        value="led"
                                        checked={formData.hordingType === 'led'}
                                        onChange={handleRadioChange}
                                    />
                                    <label
                                        className="mt-px inline-block ps-[0.15rem] hover:cursor-pointer"
                                        htmlFor="hordingType3"
                                    >LED</label
                                    >
                                </div>
                            </div>
                            {formData.hordingType === 'led' && (<div id='ledFields' className='flex justify-start flex-wrap gap-y-5 mt-3'>
                                <div className="w-full md:w-1/2 mb-6 md:mb-0 px-3">
                                    <textarea
                                        name="slotTime"
                                        value={formData.slotTime}
                                        onChange={handleInputChange}
                                        placeholder='Slot Time'
                                        className="mt-1 block resize-y max-h-24 min-h-10 w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-1/2 mb-6 md:mb-0 px-3">
                                    <textarea
                                        name="loopTime"
                                        value={formData.loopTime}
                                        onChange={handleInputChange}
                                        placeholder='Loop Time'
                                        className="mt-1 block resize-y max-h-24 min-h-10 w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-1/2 flex flex-col space-y-2 px-3">
                                    <input
                                        type="time"
                                        id="displayHours"
                                        name="displayHours"
                                        onChange={handleInputChange}
                                        className="w-60 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            )}
                        </div>


                        <div className="w-full mb-6 md:mb-0">

                            <div className='flex flex-wrap gap-y-5'>
                                {/* First Dropdown */}
                                <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0" ref={dropdownRef1}>

                                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" >
                                        Vendor Name
                                    </label>
                                    <div className="border relative border-gray-300 rounded-md shadow-sm">

                                        <button
                                            type="button"
                                            className="w-full px-4 py-2 text-left bg-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            onClick={toggleDropdown1}
                                        >
                                            {formData.vendorName || "Select an option"}
                                            <span className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </span>
                                        </button>
                                        {isDropdownOpen1 && (
                                            <div className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                                <ul>
                                                    {vendorOptions.map((option) => (
                                                        <li
                                                            key={option}
                                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => handleOptionClick1(option)}
                                                        >
                                                            {option}
                                                        </li>
                                                    ))}
                                                    <li className="px-4 py-2 hover:bg-gray-100">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="text"
                                                                placeholder="Enter your value"
                                                                className="flex-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                value={formData.vendorName}
                                                                onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                                                                onChange={(e) => {
                                                                    setFormData({
                                                                        ...formData,
                                                                        vendorName: e.target.value
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                </div>
                                {/* Second Dropdown */}
                                <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0" ref={dropdownRef2}>
                                    <div>
                                        <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" >
                                            POC Name
                                        </label>

                                        <div className="border relative border-gray-300 rounded-md shadow-sm">
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2 text-left bg-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                onClick={toggleDropdown2}
                                            >
                                                {formData.pocName || "Select an option"}
                                                <span className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                    </svg>
                                                </span>
                                            </button>
                                            {isDropdownOpen2 && (
                                                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                                    <ul>
                                                        {pocOptions.map((option) => (
                                                            <li
                                                                key={option}
                                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                                onClick={() => handleOptionClick2(option)}
                                                            >
                                                                {option}
                                                            </li>
                                                        ))}
                                                        <li className="px-4 py-2 hover:bg-gray-100">
                                                            <div className="flex items-center">

                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter your value"
                                                                    className="flex-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    value={formData.pocName}
                                                                    onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                                                                    onChange={(e) => {
                                                                        setFormData({
                                                                            ...formData,
                                                                            pocName: e.target.value
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2 mb-6 md:mb-0 px-3">
                                    <input
                                        type="text"
                                        name="ourRate"
                                        placeholder='Our Rate'
                                        value={formData.ourRate}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full text-black px-3 py-2  border border-gray-300 rounded-md shadow-sm sm:text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-1/2 mb-6 md:mb-0 px-3">
                                    <input
                                        type="text"
                                        name="propertyCode"
                                        placeholder='Property Code'
                                        value={formData.propertyCode}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full text-black px-3 py-2  border border-gray-300 rounded-md shadow-sm sm:text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                                    <textarea
                                        name="offers"
                                        value={formData.offers}
                                        onChange={handleInputChange}
                                        placeholder='Offers, Discounts, Negotiation Scope...'
                                        className="mt-1 block resize-y max-h-24 min-h-10 w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                                    <CldUploadWidget
                                        // cloudName={process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
                                        onSuccess={handleUpload}
                                        uploadPreset="hording-map"

                                    >
                                        {({ open }) => {
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => open()}
                                                    className="mt-1 block w-full text-black px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                >
                                                    Upload Images
                                                </button>
                                            )
                                        }}
                                    </CldUploadWidget>
                                    <div className="flex flex-wrap mt-2 max-h-24 overflow-y-scroll">
                                        {imageUrls.map((url, index) => (
                                            <div key={index} className="relative m-2">
                                                <img src={url} alt="Uploaded" className="w-20 h-20 object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="flex justify-start w-full space-x-4 mt-4">
                            <button
                                type="button"
                                onClick={handleDiscard}
                                className="px-4 py-2 border border-black text-black rounded-md shadow-sm hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Save
                            </button>
                        </div>

                    </div>
                </div>
            </form>

        </div>
    );
}

