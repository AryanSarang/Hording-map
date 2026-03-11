'use client';

export default function MetafieldSection({ vendorMetafields, values, onValuesChange }) {
    if (!Array.isArray(vendorMetafields) || vendorMetafields.length === 0) return null;

    function handleChange(id, value) {
        onValuesChange(prev => ({ ...prev, [id]: value }));
    }

    return (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: '0 0 12px 0' }}>Custom metafields</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {vendorMetafields.map((mf) => (
                    <div key={mf.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
                            {mf.name || mf.key}
                        </label>
                        <input
                            type="text"
                            value={values[mf.id] ?? ''}
                            onChange={(e) => handleChange(mf.id, e.target.value)}
                            placeholder={mf.key}
                            style={{
                                padding: '10px 12px',
                                border: '1px solid #1e293b',
                                borderRadius: 6,
                                background: '#0f1419',
                                color: '#e2e8f0',
                                fontSize: 13,
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
