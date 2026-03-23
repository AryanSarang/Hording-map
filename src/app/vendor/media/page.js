'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './media.module.css';

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

export default function MediaPage() {
    const [items, setItems] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [filters, setFilters] = useState({ status: '', city: '', mediaType: '', vendorId: '' });
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [deletingBulk, setDeletingBulk] = useState(false);

    useEffect(() => { fetchOwners(); }, []);
    useEffect(() => { fetchItems(); }, [filters]);

    async function fetchOwners() {
        try {
            const res = await fetch('/api/owners');
            const data = await res.json();
            if (data.success) setOwners(data.data || []);
        } catch (e) { console.error(e); }
    }

    async function fetchItems() {
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
                setItems(data.data || []);
                setSelected(new Set());
            } else setError(data.error || 'Failed to fetch media');
        } catch (err) {
            setError('Error fetching media');
        } finally {
            setLoading(false);
        }
    }

    function toggleSelect(id) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selected.size === items.length) setSelected(new Set());
        else setSelected(new Set(items.map((h) => h.id)));
    }

    async function deleteItem(id) {
        if (!confirm('Are you sure you want to delete this media?')) return;
        try {
            const res = await fetch(`/api/vendors/hordings/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setItems(items.filter((h) => h.id !== id));
                setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
            } else alert('Failed to delete');
        } catch (err) { alert('Error deleting'); }
    }

    async function bulkDelete() {
        const idList = Array.from(selected);
        if (idList.length === 0 || deletingBulk) return;
        if (!confirm(`Delete ${idList.length} selected item(s)?`)) return;
        setDeletingBulk(true);
        try {
            const res = await fetch('/api/vendors/hordings/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idList }),
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                alert(data.error || 'Bulk delete failed');
                return;
            }
            setSelected(new Set());
            await fetchItems();
            alert(`Deleted ${data.deleted || 0} item(s).`);
        } catch (e) {
            alert('Error deleting selected media');
        } finally {
            setDeletingBulk(false);
        }
    }

    async function exportSelected() {
        const idList = selected.size > 0 ? Array.from(selected) : [];
        setExporting(true);
        setError(null);
        try {
            // POST with ids in body when exporting selection (avoids URL length limit with 100+ UUIDs)
            const res = idList.length > 0
                ? await fetch('/api/vendors/hordings/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idList }),
                    credentials: 'include',
                })
                : await fetch('/api/vendors/hordings/export', { credentials: 'include' });

            const contentType = res.headers.get('content-type') || '';
            if (!res.ok) {
                let err = 'Export failed';
                try {
                    if (contentType.includes('application/json')) {
                        const data = await res.json();
                        err = data.error || err;
                    } else {
                        err = await res.text() || err;
                    }
                } catch (_) { /* use default */ }
                setError(err);
                console.error('Export failed:', res.status, err);
                return;
            }
            const blob = await res.blob();
            const disposition = res.headers.get('content-disposition');
            const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] || `media-export-${new Date().toISOString().slice(0, 10)}.csv`;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch (err) {
            const msg = err?.message || 'Export failed';
            setError(msg);
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    }

    async function handleImport(e) {
        e.preventDefault();
        if (!importFile) { setImportResult({ success: false, error: 'Please select a CSV file' }); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const fd = new FormData();
            fd.append('file', importFile);
            const res = await fetch('/api/vendors/hordings/import', { method: 'POST', body: fd });
            const data = await res.json();
            setImportResult(data);
            if (data.success && data.imported > 0) { setImportFile(null); fetchItems(); }
        } catch (err) { setImportResult({ success: false, error: err.message }); }
        finally { setImporting(false); }
    }

    return (
        <>
            <div className={styles.topbar}>
                <h1 className={styles.title}>Media</h1>
                <div className={styles.topbarActions}>
                    <button type="button" className={styles.importBtn} onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}>Import</button>
                    <button type="button" className={styles.exportBtn} onClick={exportSelected} disabled={loading || exporting}>{exporting ? 'Exporting...' : `Export ${selected.size > 0 ? `(${selected.size})` : 'All'}`}</button>
                    <Link href="/vendor/media/new" className={styles.createBtn}>+ Create Media</Link>
                </div>
            </div>

            <div className={styles.content}>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.filtersBar}>
                    <div className={styles.filterGroup}><label>Status</label>
                        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                            <option value="">All</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterGroup}><label>City</label>
                        <input type="text" placeholder="Filter by city" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className={styles.filterGroup}><label>Media Type</label>
                        <select value={filters.mediaType} onChange={(e) => setFilters((f) => ({ ...f, mediaType: e.target.value }))}>
                            <option value="">All</option>
                            {MEDIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterGroup}><label>Owner (Vendor)</label>
                        <select value={filters.vendorId} onChange={(e) => setFilters((f) => ({ ...f, vendorId: e.target.value }))}>
                            <option value="">All</option>
                            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    {(filters.status || filters.city || filters.mediaType || filters.vendorId) && (
                        <button type="button" className={styles.clearFiltersBtn} onClick={() => setFilters({ status: '', city: '', mediaType: '', vendorId: '' })}>Clear filters</button>
                    )}
                </div>

                {selected.size > 0 && (
                    <div className={styles.bulkBar}>
                        <span>{selected.size} selected</span>
                        <button type="button" className={styles.bulkExportBtn} onClick={exportSelected} disabled={exporting}>{exporting ? 'Exporting...' : 'Export'}</button>
                        <button type="button" className={styles.bulkDeleteBtn} onClick={bulkDelete} disabled={deletingBulk}>{deletingBulk ? 'Deleting...' : 'Delete'}</button>
                        <button type="button" className={styles.bulkDeselectBtn} onClick={() => setSelected(new Set())} disabled={deletingBulk}>Deselect all</button>
                    </div>
                )}

                {loading ? <div className={styles.loading}>Loading media...</div> : items.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>📭</div>
                        <p>No media found</p>
                        <Link href="/vendor/media/new" className={styles.createLink}>Create your first media</Link>
                    </div>
                ) : (
                    <div className={styles.section}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.checkTh}><input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleSelectAll} aria-label="Select all" /></th>
                                        <th>Name</th><th>City</th><th>Type</th><th>Variants</th><th>Options</th><th>Owner</th><th>Rate</th><th>Status</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr key={row.id}>
                                            <td className={styles.checkTd}><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} aria-label={`Select ${row.id}`} /></td>
                                            <td className={styles.nameTd}>{row.landmark || row.address || `Media #${row.id}`}</td>
                                            <td>{row.city || 'N/A'}</td>
                                            <td>{row.media_type || 'N/A'}</td>
                                            <td>{row.variant_count || 0}</td>
                                            <td>{[row.option1_name, row.option2_name, row.option3_name].filter(Boolean).join(' / ') || '—'}</td>
                                            <td>{row.vendor?.name || '—'}</td>
                                            <td>₹{row.monthly_rental?.toLocaleString() || '0'}</td>
                                            <td><span className={`${styles.badge} ${styles[`badge-${row.status}`] || styles.badgeActive}`}>{row.status}</span></td>
                                            <td className={styles.actions}>
                                                <Link href={`/vendor/media/${row.id}`} className={styles.actionBtn}>Edit</Link>
                                                <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => deleteItem(row.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showImport && (
                <div className={styles.modalOverlay} onClick={() => setShowImport(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Import Media from CSV</h2>
                            <button type="button" className={styles.modalClose} onClick={() => setShowImport(false)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.importHint}>Use the correct CSV format. Download the template to ensure your file matches.</p>
                            <a href="/api/vendors/hordings/import-template" download className={styles.templateLink}>Download CSV template</a>
                            <form onSubmit={handleImport} className={styles.importForm}>
                                <div className={styles.formGroup}><label>CSV File</label><input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} /></div>
                                {importResult && (
                                    <div className={importResult.success ? styles.importSuccess : styles.error}>
                                        <p>{importResult.success ? importResult.message : importResult.error}</p>
                                        {importResult.rowErrors?.length > 0 && (
                                            <div className={styles.rowErrors}><strong>Row errors:</strong>
                                                <ul>{importResult.rowErrors.map((re, i) => <li key={i}>Row {re.row}: {re.errors.join('; ')}{re.preview && ` (${re.preview})`}</li>)}</ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.submitBtn} disabled={importing}>{importing ? 'Importing...' : 'Import'}</button>
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowImport(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
