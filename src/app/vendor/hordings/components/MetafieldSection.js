// app/vendor/hordings/components/MetafieldSection.js
// Shows all vendor metafields as inputs - values filled when creating/editing hording
'use client';

import { useState } from 'react';
import styles from './MetafieldSection.module.css';

export default function MetafieldSection({
    vendorMetafields = [],
    values = {},
    onValuesChange,
}) {
    const [showValues, setShowValues] = useState(true);

    function handleValueChange(vendorMetafieldId, value) {
        onValuesChange?.({ ...values, [vendorMetafieldId]: value });
    }

    if (vendorMetafields.length === 0) return null;

    return (
        <div className={styles.section}>
            <div className={styles.header}>
                <h3>Custom Metafields</h3>
                <button
                    type="button"
                    onClick={() => setShowValues(!showValues)}
                    className={styles.toggleBtn}
                >
                    {showValues ? 'Hide' : 'Show'} Values
                </button>
            </div>

            {showValues && (
                <div className={styles.list}>
                    {vendorMetafields.map((mf) => {
                        const def = mf.metafield_definitions;
                        const valueType = def?.value_type || mf.value_type || 'string';
                        const value = values[mf.id] ?? '';

                        return (
                            <div key={mf.id} className={styles.item}>
                                <div className={styles.itemHeader}>
                                    <label>{mf.name}</label>
                                </div>

                                {valueType === 'boolean' ? (
                                    <input
                                        type="checkbox"
                                        checked={value === 'true' || value === true}
                                        onChange={(e) => handleValueChange(mf.id, e.target.checked ? 'true' : 'false')}
                                        className={styles.input}
                                    />
                                ) : valueType === 'rich_text' ? (
                                    <textarea
                                        value={value}
                                        onChange={(e) => handleValueChange(mf.id, e.target.value)}
                                        className={styles.textarea}
                                        rows={3}
                                        placeholder={`Enter ${mf.name}`}
                                    />
                                ) : valueType === 'single_select' ? (
                                    <select
                                        value={value}
                                        onChange={(e) => handleValueChange(mf.id, e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Select...</option>
                                        {(Array.isArray(mf.options) ? mf.options : []).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : valueType === 'number' || valueType === 'integer' ? (
                                    <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => handleValueChange(mf.id, e.target.value)}
                                        className={styles.input}
                                        placeholder={`Enter ${mf.name}`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => handleValueChange(mf.id, e.target.value)}
                                        className={styles.input}
                                        placeholder={`Enter ${mf.name}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
