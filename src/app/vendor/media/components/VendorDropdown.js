'use client';

import { useState, useEffect } from 'react';

export default function VendorDropdown({ value, onChange, placeholder = 'Select owner' }) {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPhone, setCreatePhone] = useState('');
    const [createError, setCreateError] = useState(null);

    useEffect(() => {
        fetch('/api/owners')
            .then(r => r.json())
            .then(d => {
                if (d.success) setOwners(d.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    async function handleCreate(e) {
        e?.preventDefault?.();
        setCreateError(null);
        if (!createName?.trim()) {
            setCreateError('Name is required');
            return;
        }
        try {
            const res = await fetch('/api/owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                    contactEmail: createEmail.trim() || null,
                    contactPhone: createPhone.trim() || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setOwners(prev => [...prev, data.data]);
                onChange(data.data.id);
                setShowCreate(false);
                setCreateName('');
                setCreateEmail('');
                setCreatePhone('');
            } else {
                setCreateError(data.error || 'Failed to create');
            }
        } catch (err) {
            setCreateError('Failed to create owner');
        }
    }

    if (loading) return <select disabled><option>Loading...</option></select>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid #1e293b',
                        borderRadius: 6,
                        background: '#0f1419',
                        color: '#e2e8f0',
                        minWidth: 200,
                        fontSize: 13,
                    }}
                >
                    <option value="">{placeholder}</option>
                    {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setShowCreate(!showCreate)}
                    style={{
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#94a3b8',
                        fontSize: 12,
                        cursor: 'pointer',
                    }}
                >
                    {showCreate ? 'Cancel' : '+ New owner'}
                </button>
            </div>
            {showCreate && (
                <div
                    role="group"
                    aria-label="Create new owner"
                    style={{
                        padding: 12,
                        background: '#131922',
                        border: '1px solid #1e293b',
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    {createError && <div style={{ color: '#f87171', fontSize: 12 }}>{createError}</div>}
                    <input
                        type="text"
                        placeholder="Owner name *"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        aria-required
                        style={{ padding: '8px 10px', border: '1px solid #1e293b', borderRadius: 6, background: '#0f1419', color: '#e2e8f0', fontSize: 13 }}
                    />
                    <input
                        type="email"
                        placeholder="Contact email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        style={{ padding: '8px 10px', border: '1px solid #1e293b', borderRadius: 6, background: '#0f1419', color: '#e2e8f0', fontSize: 13 }}
                    />
                    <input
                        type="text"
                        placeholder="Contact phone"
                        value={createPhone}
                        onChange={(e) => setCreatePhone(e.target.value)}
                        style={{ padding: '8px 10px', border: '1px solid #1e293b', borderRadius: 6, background: '#0f1419', color: '#e2e8f0', fontSize: 13 }}
                    />
                    <button
                        type="button"
                        onClick={handleCreate}
                        style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Create owner
                    </button>
                </div>
            )}
        </div>
    );
}
