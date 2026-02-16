'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './hordings.module.css';

const MEDIA_TYPES = ['Digital Screens', 'Hoarding', 'Bus Shelter', 'Wall Wrap', 'Kiosk', 'Transit', 'Neon Sign', 'Other'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

export default function HordingsPage() {
    const [hordings, setHordings] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [filters, setFilters] = useState({ status: '', city: '', mediaType: '', vendorId: '' });
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    useEffect(() => {
        fetchOwners();
    }, []);
    useEffect(() => {
        fetchHordings();
    }, [filters]);

    async function fetchOwners() {
        try {
            const res = await fetch('/api/owners');
            const data = await res.json();
            if (data.success) setOwners(data.data || []);
        } catch (e) {
            console.error('Failed to fetch owners:', e);
        }
    }

    async function fetchHordings() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.city) params.set('city', filters.city);
            if (filters.mediaType) params.set('mediaType', filters.mediaType);
            if (filters.vendorId) params.set('vendorId', filters.vendorId);
            const res = await fetch(`/api/vendors/hordings?${params}`);
            const data = await res.json();

            if (data.success) {
                setHordings(data.data || []);
                setSelected(new Set());
            } else {
                setError(data.error || 'Failed to fetch hordings');
            }
        } catch (err) {
            console.error('Error fetching hordings:', err);
            setError('Error fetching hordings');
        } finally {
            setLoading(false);
        }
    }

    function toggleSelect(id) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selected.size === filteredHordings.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredHordings.map((h) => h.id)));
        }
    }

    const filteredHordings = hordings;

    async function deleteHording(id) {
        if (!confirm('Are you sure you want to delete this hording?')) return;
        try {
            const res = await fetch(`/api/vendors/hordings/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHordings(hordings.filter((h) => h.id !== id));
                setSelected((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } else {
                alert('Failed to delete hording');
            }
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error deleting hording');
        }
    }

    async function bulkDelete() {
        if (selected.size === 0) return;
        if (!confirm(`Delete ${selected.size} selected hording(s)?`)) return;
        let ok = 0;
        for (const id of selected) {
            try {
                const res = await fetch(`/api/vendors/hordings/${id}`, { method: 'DELETE' });
                if (res.ok) ok++;
            } catch (e) { }
        }
        setSelected(new Set());
        fetchHordings();
        alert(`Deleted ${ok} hording(s).`);
    }

    function exportSelected() {
        const ids = selected.size > 0 ? Array.from(selected).join(',') : '';
        window.open(`/api/vendors/hordings/export${ids ? `?ids=${ids}` : ''}`, '_blank', 'noopener');
    }

    async function handleImport(e) {
        e.preventDefault();
        if (!importFile) {
            setImportResult({ success: false, error: 'Please select a CSV file' });
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const fd = new FormData();
            fd.append('file', importFile);
            const res = await fetch('/api/vendors/hordings/import', {
                method: 'POST',
                body: fd,
            });
            const data = await res.json();
            setImportResult(data);
            if (data.success && data.imported > 0) {
                setImportFile(null);
                fetchHordings();
            }
        } catch (err) {
            setImportResult({ success: false, error: err.message });
        } finally {
            setImporting(false);
        }
    }

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Hordings</h1>
                <div className={styles.topbarActions}>
                    <button
                        type="button"
                        className={styles.importBtn}
                        onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}
                    >
                        Import
                    </button>
                    <button
                        type="button"
                        className={styles.exportBtn}
                        onClick={exportSelected}
                        disabled={loading}
                    >
                        Export {selected.size > 0 ? `(${selected.size})` : 'All'}
                    </button>
                    <Link href="/vendor/hordings/new" className={styles.createBtn}>
                        + Create Hording
                    </Link>
                </div>
            </div>

            <div className={styles.content}>
                {error && <div className={styles.error}>{error}</div>}

                {/* Filters */}
                <div className={styles.filtersBar}>
                    <div className={styles.filterGroup}>
                        <label>Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">All</option>
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>City</label>
                        <input
                            type="text"
                            placeholder="Filter by city"
                            value={filters.city}
                            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Media Type</label>
                        <select
                            value={filters.mediaType}
                            onChange={(e) => setFilters((f) => ({ ...f, mediaType: e.target.value }))}
                        >
                            <option value="">All</option>
                            {MEDIA_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Owner (Vendor)</label>
                        <select
                            value={filters.vendorId}
                            onChange={(e) => setFilters((f) => ({ ...f, vendorId: e.target.value }))}
                        >
                            <option value="">All</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                    {(filters.status || filters.city || filters.mediaType || filters.vendorId) && (
                        <button
                            type="button"
                            className={styles.clearFiltersBtn}
                            onClick={() => setFilters({ status: '', city: '', mediaType: '', vendorId: '' })}
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Bulk actions */}
                {selected.size > 0 && (
                    <div className={styles.bulkBar}>
                        <span>{selected.size} selected</span>
                        <button type="button" className={styles.bulkExportBtn} onClick={exportSelected}>
                            Export
                        </button>
                        <button type="button" className={styles.bulkDeleteBtn} onClick={bulkDelete}>
                            Delete
                        </button>
                        <button type="button" className={styles.bulkDeselectBtn} onClick={() => setSelected(new Set())}>
                            Deselect all
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className={styles.loading}>Loading hordings...</div>
                ) : filteredHordings.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>📭</div>
                        <p>No hordings found</p>
                        <Link href="/vendor/hordings/new" className={styles.createLink}>
                            Create your first hording
                        </Link>
                    </div>
                ) : (
                    <div className={styles.section}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.checkTh}>
                                            <input
                                                type="checkbox"
                                                checked={filteredHordings.length > 0 && selected.size === filteredHordings.length}
                                                onChange={toggleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>City</th>
                                        <th>Type</th>
                                        <th>Owner</th>
                                        <th>Rate</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHordings.map((hording) => (
                                        <tr key={hording.id}>
                                            <td className={styles.checkTd}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(hording.id)}
                                                    onChange={() => toggleSelect(hording.id)}
                                                    aria-label={`Select hording ${hording.id}`}
                                                />
                                            </td>
                                            <td className={styles.nameTd}>
                                                {hording.landmark || hording.address || `Hording #${hording.id}`}
                                            </td>
                                            <td>{hording.city || 'N/A'}</td>
                                            <td>{hording.media_type || 'N/A'}</td>
                                            <td>{hording.vendor?.name || '—'}</td>
                                            <td>₹{hording.monthly_rental?.toLocaleString() || '0'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[`badge-${hording.status}`] || styles.badgeActive}`}>
                                                    {hording.status}
                                                </span>
                                            </td>
                                            <td className={styles.actions}>
                                                <Link href={`/vendor/hordings/${hording.id}`} className={styles.actionBtn}>
                                                    Edit
                                                </Link>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.danger}`}
                                                    onClick={() => deleteHording(hording.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className={styles.modalOverlay} onClick={() => setShowImport(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Import Hordings from CSV</h2>
                            <button type="button" className={styles.modalClose} onClick={() => setShowImport(false)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.importHint}>
                                Use the correct CSV format. Download the template to ensure your file matches.
                            </p>
                            <a
                                href="/api/vendors/hordings/import-template"
                                download
                                className={styles.templateLink}
                            >
                                Download CSV template
                            </a>

                            <form onSubmit={handleImport} className={styles.importForm}>
                                <div className={styles.formGroup}>
                                    <label>CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    />
                                </div>

                                {importResult && (
                                    <div className={importResult.success ? styles.importSuccess : styles.error}>
                                        {importResult.success ? (
                                            <p>{importResult.message}</p>
                                        ) : (
                                            <p>{importResult.error}</p>
                                        )}
                                        {importResult.rowErrors && importResult.rowErrors.length > 0 && (
                                            <div className={styles.rowErrors}>
                                                <strong>Row errors:</strong>
                                                <ul>
                                                    {importResult.rowErrors.map((re, i) => (
                                                        <li key={i}>
                                                            Row {re.row}: {re.errors.join('; ')}
                                                            {re.preview && ` (${re.preview})`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.submitBtn} disabled={importing}>
                                        {importing ? 'Importing...' : 'Import'}
                                    </button>
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowImport(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
