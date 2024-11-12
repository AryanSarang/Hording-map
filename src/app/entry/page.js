"use client"

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./EntryMap'), {
    ssr: false
});

export default function Page() {
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        width: '',
        height: '',
        type: 'fl',
        visiblity: 'prime',
        rate: '',
        customers: '',
        traffic: 'ultra',
        condition: 'supreme'
    });

    const [clickLocation, setClickLocation] = useState(null);

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
    const handleSave = () => {
        console.log("Form data saved:", formData);
    };

    const handleDiscard = () => {
        setFormData({
            latitude: '',
            longitude: '',
            width: '',
            height: '',
            type: '',
            visiblity: '',
            rate: '',
            customers: '',
            traffic: '',
            condition: ''
        });
        setClickLocation(null);
        console.log("Form data discarded");
    };
    return (
        <div className="p-6 flex sm:flex-row flex-col items-start mx-auto shadow-md space-y-4 md:px-14">

            <form className="w-full space-y-4">
                <h1 className='text-2xl font-bold mb-5 md:px-14'>Hording Entry</h1>
                <div className="flex flex-wrap -mx-3 gap-y-4">
                    <div className='w-full md:w-1/2 md:px-14'>
                        <Map onMapClick={handleMapClick} clickLocation={clickLocation} />
                    </div>
                    <div className='w-full md:w-1/2 flex flex-wrap items-start justify-evenly gap-y-4 h-fit md:px-14'>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="text"
                                name="latitude"
                                placeholder='Latitude'
                                value={formData.latitude}
                                readOnly
                                className="mt-1 block w-full text-black px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <input
                                type="text"
                                placeholder='Longitude'
                                name="longitude"
                                value={formData.longitude}
                                readOnly
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
                            <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="type">
                                Type
                            </label>
                            <div className="relative">
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="type"
                                >
                                    <option value="fl">FL</option>
                                    <option value="nl">NL</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                            <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="visiblity">
                                Visiblity
                            </label>
                            <div className="relative">
                                <select
                                    name="visiblity"
                                    value={formData.visiblity}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="visiblity"
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
                            <label className="block  tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="traffic">
                                Traffic
                            </label>
                            <div className="relative">
                                <select
                                    name="traffic"
                                    value={formData.traffic}
                                    onChange={handleInputChange}
                                    className="block appearance-none w-full border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    id="traffic"
                                >
                                    <option value="ultra">Ultra</option>
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

