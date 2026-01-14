'use client';

import { useState } from 'react';
import styles from './MetafieldSection.module.css';

export default function MetafieldSection({
    definitions = [],
    metafields = [],
    onMetafieldsChange,
}) {
    const [selectedDefinition, setSelectedDefinition] = useState('');
    const [showValues, setShowValues] = useState(true);

    function handleAddMetafield() {
        if (!selectedDefinition) return;

        const def = definitions.find(d => d.id === parseInt(selectedDefinition));
        if (!def) return;

        const newMetafield = {
            key: def.key,
            value: '',
            type: def.type,
            label: def.label,
        };

        const updated = [...metafields, newMetafield];
        onMetafieldsChange(updated);
        setSelectedDefinition('');
    }

    function handleRemoveMetafield(key) {
        const updated = metafields.filter(mf => mf.key !== key);
        onMetafieldsChange(updated);
    }

    function handleValueChange(key, value) {
        const updated = metafields.map(mf =>
            mf.key === key ? { ...mf, value } : mf
        );
        onMetafieldsChange(updated);
    }

    const usedKeys = metafields.map(mf => mf.key);
    const availableDefinitions = definitions.filter(d => !usedKeys.includes(d.key));

    return (
        <div className={styles.section}>
            <div className={styles.header}>
                <h3>Metafields</h3>
                <button
                    type="button"
                    onClick={() => setShowValues(!showValues)}
                    className={styles.toggleBtn}
                >
                    {showValues ? 'Hide' : 'Show'} Values
                </button>
            </div>

            {showValues && (
                <>
                    <div className={styles.addSection}>
                        <select
                            value={selectedDefinition}
                            onChange={(e) => setSelectedDefinition(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">Select a metafield to add...</option>
                            {availableDefinitions.map(def => (
                                <option key={def.id} value={def.id}>
                                    {def.label} ({def.type})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddMetafield}
                            disabled={!selectedDefinition}
                            className={styles.addBtn}
                        >
                            Add
                        </button>
                    </div>

                    {metafields.length === 0 ? (
                        <p className={styles.empty}>No metafields added yet</p>
                    ) : (
                        <div className={styles.list}>
                            {metafields.map((mf) => (
                                <div key={mf.key} className={styles.item}>
                                    <div className={styles.itemHeader}>
                                        <label>{mf.label || mf.key}</label>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMetafield(mf.key)}
                                            className={styles.removeBtn}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {mf.type === 'checkbox' ? (
                                        <input
                                            type="checkbox"
                                            checked={mf.value === 'true' || mf.value === true}
                                            onChange={(e) => handleValueChange(mf.key, e.target.checked ? 'true' : 'false')}
                                            className={styles.input}
                                        />
                                    ) : mf.type === 'textarea' ? (
                                        <textarea
                                            value={mf.value}
                                            onChange={(e) => handleValueChange(mf.key, e.target.value)}
                                            className={styles.textarea}
                                            rows={3}
                                        />
                                    ) : mf.type === 'number' ? (
                                        <input
                                            type="number"
                                            value={mf.value}
                                            onChange={(e) => handleValueChange(mf.key, e.target.value)}
                                            className={styles.input}
                                        />
                                    ) : mf.type === 'date' ? (
                                        <input
                                            type="date"
                                            value={mf.value}
                                            onChange={(e) => handleValueChange(mf.key, e.target.value)}
                                            className={styles.input}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={mf.value}
                                            onChange={(e) => handleValueChange(mf.key, e.target.value)}
                                            className={styles.input}
                                            placeholder={`Enter ${mf.label || mf.key}`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
