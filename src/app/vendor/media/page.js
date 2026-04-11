'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import styles from './media.module.css';

const MEDIA_TYPES = ['Bus Shelter', 'Digital Screens', 'Cinema Screen', 'Residential', 'Corporate', 'Corporate Coffee Machines', 'Croma Stores', 'ATM', 'other'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];
const PAGE_SIZE = 50;

export default function MediaPage() {
    const router = useRouter();
    const headerCheckboxRef = useRef(null);
    const [items, setItems] = useState([]);
    const [owners, setOwners] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
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
    const [selectingAllFilter, setSelectingAllFilter] = useState(false);

    useEffect(() => { fetchOwners(); }, []);
    useEffect(() => {
        setPage(1);
    }, [filters.city]);
    useEffect(() => {
        setSelected(new Set());
    }, [filters.status, filters.city, filters.mediaType, filters.vendorId]);
    useEffect(() => { fetchItems(); }, [filters.status, filters.city, filters.mediaType, filters.vendorId, page]);

    const allOnPageSelected = items.length > 0 && items.every((h) => selected.has(h.id));
    const someOnPageSelected = items.some((h) => selected.has(h.id));

    useEffect(() => {
        const el = headerCheckboxRef.current;
        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
    }, [someOnPageSelected, allOnPageSelected, items]);

    function patchFilters(patch) {
        setFilters((f) => ({ ...f, ...patch }));
        setPage(1);
    }

    async function fetchOwners() {
        try {
            const res = await fetch('/api/owners', { credentials: 'include' });
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
            params.set('page', String(page));
            params.set('pageSize', String(PAGE_SIZE));
            const res = await fetch(`/api/vendors/hordings?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setItems(data.data || []);
                setPagination({
                    total: typeof data.total === 'number' ? data.total : (data.data || []).length,
                    totalPages: typeof data.totalPages === 'number' ? data.totalPages : 1,
                });
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
        setSelected((prev) => {
            const next = new Set(prev);
            if (allOnPageSelected) {
                items.forEach((h) => next.delete(h.id));
            } else {
                items.forEach((h) => next.add(h.id));
            }
            return next;
        });
    }

    function buildFilterSearchParams() {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.city) params.set('city', filters.city);
        if (filters.mediaType) params.set('mediaType', filters.mediaType);
        if (filters.vendorId) params.set('vendorId', filters.vendorId);
        return params;
    }

    async function selectAllMatchingFilters() {
        if (selectingAllFilter) return;
        setSelectingAllFilter(true);
        try {
            const params = buildFilterSearchParams();
            params.set('idsOnly', '1');
            const res = await fetch(`/api/vendors/hordings?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error || 'Could not load matching media');
                return;
            }
            setSelected(new Set(data.ids || []));
        } catch (e) {
            alert('Could not load matching media');
        } finally {
            setSelectingAllFilter(false);
        }
    }

    function openRow(id) {
        router.push(`/vendor/media/${id}`);
    }

    function onRowKeyDown(e, id) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openRow(id);
        }
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
        if (!(importFile.name || '').toLowerCase().endsWith('.csv')) {
            setImportResult({ success: false, error: 'Import accepts .csv only' }); return;
        }
        setImporting(true);
        setImportResult(null);

        const runImport = async (replaceExisting) => {
            const fd = new FormData();
            fd.append('file', importFile);
            fd.append('replaceExisting', replaceExisting ? 'true' : 'false');
            const res = await fetch('/api/vendors/hordings/import', { method: 'POST', body: fd });
            const data = await res.json();
            return { res, data };
        };

        try {
            let { res, data } = await runImport(false);
            if (res.status === 409 && data?.requiresConfirmation) {
                const ok = confirm(`${data.error}\n\nDo you want to replace existing duplicates and continue import?`);
                if (ok) {
                    ({ res, data } = await runImport(true));
                }
            }
            setImportResult(data);
            if (data.success && data.imported > 0) { setImportFile(null); fetchItems(); }
        } catch (err) { setImportResult({ success: false, error: err.message }); }
        finally { setImporting(false); }
    }

    return (
        <>
            <div className={`${styles.topbar} ${styles.listTopbar}`}>
                <h1 className={styles.title}>Media</h1>
                <div className={styles.topbarActions}>
                    <button type="button" className={styles.importBtn} onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}>Import</button>
                    <button type="button" className={styles.exportBtn} onClick={exportSelected} disabled={loading || exporting}>{exporting ? 'Exporting...' : `Export ${selected.size > 0 ? `(${selected.size})` : 'All'}`}</button>
                    <Link href="/vendor/media/new" className={styles.createBtn}>+ Create Media</Link>
                </div>
            </div>

            <div className={`${styles.content} ${styles.listContent}`}>
                {error && <div className={styles.error}>{error}</div>}
                <div className={`${styles.filtersBar} ${styles.listFiltersBar}`}>
                    <div className={styles.filterGroup}><label>Status</label>
                        <select value={filters.status} onChange={(e) => patchFilters({ status: e.target.value })}>
                            <option value="">All</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterGroup}><label>City</label>
                        <input
                            type="text"
                            placeholder="Filter by city"
                            value={filters.city}
                            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                        />
                    </div>
                    <div className={styles.filterGroup}><label>Media Type</label>
                        <select value={filters.mediaType} onChange={(e) => patchFilters({ mediaType: e.target.value })}>
                            <option value="">All</option>
                            {MEDIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterGroup}><label>Owner (Vendor)</label>
                        <select value={filters.vendorId} onChange={(e) => patchFilters({ vendorId: e.target.value })}>
                            <option value="">All</option>
                            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <button
                        type="button"
                        className={styles.clearFiltersBtn}
                        disabled={!(filters.status || filters.city || filters.mediaType || filters.vendorId)}
                        onClick={() => {
                            setFilters({ status: '', city: '', mediaType: '', vendorId: '' });
                            setPage(1);
                        }}
                    >
                        Clear filters
                    </button>
                </div>

                {selected.size > 0 && (
                    <div className={`${styles.bulkBar} ${styles.listBulkBar}`}>
                        <span className={styles.bulkCount}>{selected.size} selected</span>
                        <div className={styles.bulkActions}>
                            <button type="button" className={styles.bulkExportBtn} onClick={exportSelected} disabled={exporting}>{exporting ? 'Exporting...' : 'Export'}</button>
                            <button type="button" className={styles.bulkDeleteBtn} onClick={bulkDelete} disabled={deletingBulk}>{deletingBulk ? 'Deleting...' : 'Delete'}</button>
                            <button type="button" className={styles.bulkDeselectBtn} onClick={() => setSelected(new Set())} disabled={deletingBulk}>Deselect all</button>
                            <button
                                type="button"
                                className={styles.selectAllFilterLink}
                                onClick={selectAllMatchingFilters}
                                disabled={selectingAllFilter || deletingBulk}
                            >
                                {selectingAllFilter ? 'Loading…' : 'Select all that matches filter'}
                            </button>
                        </div>
                    </div>
                )}

                {loading ? <div className={styles.loading}>Loading media...</div> : items.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <Inbox size={24} />
                        </div>
                        <p>No media found</p>
                        <Link href="/vendor/media/new" className={styles.createLink}>Create your first media</Link>
                    </div>
                ) : (
                    <div className={`${styles.section} ${styles.listSection}`}>
                        <div className={`${styles.tableWrapper} ${styles.listTableWrapper}`}>
                            <table className={`${styles.table} ${styles.listTable}`}>
                                <colgroup>
                                    <col className={styles.colCheck} />
                                    <col className={styles.colName} />
                                    <col className={styles.colCity} />
                                    <col className={styles.colType} />
                                    <col className={styles.colNum} />
                                    <col className={styles.colOptions} />
                                    <col className={styles.colOwner} />
                                    <col className={styles.colRate} />
                                    <col className={styles.colStatus} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className={styles.checkTh} scope="col">
                                            <label className={styles.checkboxWrap}>
                                                <input
                                                    ref={headerCheckboxRef}
                                                    type="checkbox"
                                                    className={styles.checkboxInput}
                                                    checked={allOnPageSelected}
                                                    onChange={toggleSelectAll}
                                                    aria-label="Select all on this page"
                                                />
                                            </label>
                                        </th>
                                        <th>Name</th><th>City</th><th>Type</th><th>Variants</th><th>Options</th><th>Owner</th><th>Rate</th><th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={styles.dataRow}
                                            tabIndex={0}
                                            onClick={() => openRow(row.id)}
                                            onKeyDown={(e) => onRowKeyDown(e, row.id)}
                                        >
                                            <td
                                                className={styles.checkTd}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            >
                                                <label className={styles.checkboxWrap}>
                                                    <input
                                                        type="checkbox"
                                                        className={styles.checkboxInput}
                                                        checked={selected.has(row.id)}
                                                        onChange={() => toggleSelect(row.id)}
                                                        aria-label={`Select ${row.title || row.landmark || row.address || row.id}`}
                                                    />
                                                </label>
                                            </td>
                                            <td className={styles.nameTd}>{row.title || row.landmark || row.address || `Media #${row.id}`}</td>
                                            <td>{row.city || 'N/A'}</td>
                                            <td>{row.media_type || 'N/A'}</td>
                                            <td>{row.variant_count || 0}</td>
                                            <td>{[row.option1_name, row.option2_name, row.option3_name].filter(Boolean).join(' / ') || '—'}</td>
                                            <td>{row.vendor?.name || '—'}</td>
                                            <td>₹{row.monthly_rental?.toLocaleString() || '0'}</td>
                                            <td><span className={`${styles.badge} ${styles[`badge-${row.status}`] || styles.badgeActive}`}>{row.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className={`${styles.paginationBar} ${styles.listPaginationBar}`}>
                                <span className={styles.paginationInfo}>
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}
                                </span>
                                <div className={styles.paginationControls}>
                                    <button
                                        type="button"
                                        className={styles.paginationBtn}
                                        disabled={page <= 1 || loading}
                                        onClick={() => setPage(1)}
                                    >
                                        First
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.paginationBtn}
                                        disabled={page <= 1 || loading}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </button>
                                    <span className={styles.paginationPage}>
                                        Page {page} / {pagination.totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.paginationBtn}
                                        disabled={page >= pagination.totalPages || loading}
                                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                    >
                                        Next
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.paginationBtn}
                                        disabled={page >= pagination.totalPages || loading}
                                        onClick={() => setPage(pagination.totalPages)}
                                    >
                                        Last
                                    </button>
                                </div>
                            </div>
                        )}
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
                            <p className={styles.importHint}>
                                <strong>Required columns</strong> in the header: <code>title</code> (or <code>media_title</code>), <code>city</code>, <code>state</code>, <code>address</code>, <code>latitude</code>, <code>longitude</code>, <code>poc_name</code>, <code>poc_number</code>, <code>minimum_booking_duration</code>, <code>media_type</code>, <code>status</code>, and <code>vendor_name</code> or <code>vendor_id</code>. On each <strong>parent</strong> row these must be non-empty (no default for status or min. booking). <code>title</code> is stored as the media display title (not inferred from address). Unified: add metafields, <code>pricing_rules_json</code> on the first row per media; variant rows leave parent cells blank. <code>handle</code> and <code>id</code> optional on create. Rows that fail validation are skipped with row-level errors; the rest import.
                            </p>
                            <a href="/api/vendors/hordings/import-template" download className={styles.templateLink}>Download template (Shopify-style CSV)</a>
                            {' · '}
                            <a href="/api/vendors/hordings/import-template?format=legacy" download className={styles.templateLink}>Legacy flat CSV template</a>
                            <form onSubmit={handleImport} className={styles.importForm}>
                                <div className={styles.formGroup}>
                                    <label>CSV file</label>
                                    <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                                </div>
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
