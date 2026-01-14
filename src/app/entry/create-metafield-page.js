'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function CreateMetafieldPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        label: '',
        key: '',
        value_type: 'string',
        example_value: '',
        display_order: 0,
        is_multiple: false,
    });

    // Auto-generate key from label
    const generateKey = (label) => {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    };

    const handleLabelChange = (e) => {
        const label = e.target.value;
        setFormData(prev => ({
            ...prev,
            label,
            key: generateKey(label)
        }));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        if (!formData.label.trim()) {
            setError('Label is required');
            return false;
        }
        if (!formData.key.trim()) {
            setError('Key is required');
            return false;
        }
        if (!/^[a-z_]+$/.test(formData.key)) {
            setError('Key must contain only lowercase letters and underscores');
            return false;
        }
        if (!formData.value_type) {
            setError('Value type is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/metafield-definitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create definition');
            }

            setSuccess('Metafield definition created successfully!');
            setTimeout(() => {
                router.push('/admin/metafields');
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Create Metafield Definition
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Define a new custom field for hordings
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 dark:text-green-300">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg p-6 space-y-6">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Label (Display Name) <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            name="label"
                            value={formData.label}
                            onChange={handleLabelChange}
                            placeholder="e.g., Traffic Pattern, Peak Hours"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            This is what users will see in the hording editor
                        </p>
                    </div>

                    {/* Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Key (Identifier) <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            name="key"
                            value={formData.key}
                            onChange={handleInputChange}
                            placeholder="e.g., traffic_pattern"
                            pattern="^[a-z_]+$"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Auto-generated from label. Use lowercase letters and underscores only. Used in database.
                        </p>
                    </div>

                    {/* Value Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Data Type <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="value_type"
                            value={formData.value_type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="string">String (Text)</option>
                            <option value="number">Number (Integer)</option>
                            <option value="date">Date (YYYY-MM-DD)</option>
                            <option value="boolean">Boolean (True/False)</option>
                            <option value="json">JSON (Advanced Objects)</option>
                        </select>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Determines how the field will be displayed and validated in the editor
                        </p>
                    </div>

                    {/* Example Value */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Example Value (Optional)
                        </label>
                        <textarea
                            name="example_value"
                            value={formData.example_value}
                            onChange={handleInputChange}
                            placeholder="e.g., Morning 6-9am, Evening 6-9pm"
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Help text shown to users filling out the hording form
                        </p>
                    </div>

                    {/* Display Order */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Display Order
                        </label>
                        <input
                            type="number"
                            name="display_order"
                            value={formData.display_order}
                            onChange={handleInputChange}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Order in which this field appears in the hording editor (0 = first)
                        </p>
                    </div>

                    {/* Is Multiple */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_multiple"
                                checked={formData.is_multiple}
                                onChange={handleInputChange}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Allow Multiple Values
                            </span>
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            If checked, users can add multiple values for this field
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                        >
                            {loading ? 'Creating...' : 'Create Definition'}
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">💡 What is a Metafield?</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                        A metafield is a custom field that you define for hordings. Once created, it will appear in the hording editor
                        where vendors can fill in specific information. For example, you might create a "Traffic Pattern" field to
                        capture when the location gets the most foot traffic.
                    </p>
                </div>
            </div>
        </div>
    );
}