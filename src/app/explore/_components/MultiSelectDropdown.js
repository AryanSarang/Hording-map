"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

function useDebouncedValue(value, delayMs) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

/** Multi-select list with checkboxes; empty `values` means “all” (no restriction). */
export default function MultiSelectDropdown({
    values = [],
    onChange,
    options,
    placeholder = "All",
    /** When set, first row selects every option; click again clears to none (same as “all” for filters). */
    allLabel,
    allowSearch = true,
    searchPlaceholder = "Search...",
    debounceMs = 200,
    disabled = false,
    className = "",
    buttonClassName = "",
}) {
    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    /**
     * `placement` flips the menu above the button when there is more room upward than downward
     * (prevents the list from being clipped when the trigger sits near the viewport bottom).
     * `maxHeight` lets the menu shrink to fit the remaining space so its contents stay scrollable.
     */
    const [menuStyle, setMenuStyle] = useState({
        top: "auto",
        bottom: "auto",
        left: 0,
        width: "100%",
        maxHeight: 400,
        placement: "bottom",
    });

    const set = useMemo(() => new Set((values || []).map(String)), [values]);
    const debouncedQuery = useDebouncedValue(query, debounceMs);

    const filteredOptions = useMemo(() => {
        const q = String(debouncedQuery || "").trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => {
            const hay = `${o.label || ""} ${o.sublabel || ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [options, debouncedQuery]);

    const allSelected = useMemo(() => {
        if (!options?.length) return false;
        return options.every((o) => set.has(String(o.value)));
    }, [options, set]);

    const summary = useMemo(() => {
        if (allLabel && allSelected) return allLabel;
        const v = values || [];
        if (v.length === 0) return null;
        const byVal = new Map(options.map((o) => [String(o.value), o.label]));
        if (v.length === 1) return byVal.get(String(v[0])) || String(v[0]);
        if (v.length === 2) {
            return [byVal.get(String(v[0])), byVal.get(String(v[1]))].filter(Boolean).join(", ");
        }
        const first = byVal.get(String(v[0])) || v[0];
        return `${first} +${v.length - 1} more`;
    }, [allLabel, allSelected, values, options]);

    function toggleSelectAll() {
        const allVals = options.map((o) => o.value);
        if (allVals.length === 0) return;
        const every = allVals.every((v) => set.has(String(v)));
        if (every) onChange?.([]);
        else onChange?.([...allVals]);
    }

    useEffect(() => {
        function onDocMouseDown(e) {
            if (!rootRef.current) return;
            const isInRoot = rootRef.current.contains(e.target);
            const isInMenu = menuRef.current?.contains?.(e.target);
            if (!isInRoot && !isInMenu) setOpen(false);
        }
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, []);

    useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        const btn = buttonRef.current;
        if (!btn) return;

        function reposition() {
            const r = btn.getBoundingClientRect();
            const vh = window.innerHeight;
            const GAP = 8;
            const MAX_H = 400;
            const MIN_H = 160;
            const spaceBelow = vh - r.bottom - GAP;
            const spaceAbove = r.top - GAP;
            const flipUp = spaceBelow < MIN_H && spaceAbove > spaceBelow;
            const avail = flipUp ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(MIN_H, Math.min(MAX_H, avail));
            /**
             * When flipping up we pin the menu's *bottom* edge to just above the trigger
             * (using the `bottom` CSS property). Anchoring via `top = r.top - GAP - maxHeight`
             * would leave an empty gap above the button whenever the menu content is shorter
             * than maxHeight, because the menu auto-shrinks to content but `top` assumes full height.
             */
            setMenuStyle({
                top: flipUp ? "auto" : r.bottom + GAP,
                bottom: flipUp ? vh - r.top + GAP : "auto",
                left: r.left,
                width: r.width,
                maxHeight,
                placement: flipUp ? "top" : "bottom",
            });
        }

        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [open]);

    function toggle(val) {
        const key = String(val);
        const next = new Set(set);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onChange?.(Array.from(next));
    }

    function clearAll() {
        onChange?.([]);
        setOpen(false);
    }

    const menu = (
        <div
            ref={menuRef}
            className="z-[2000] w-full rounded-xl border border-gray-700 bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
            role="listbox"
            style={{
                position: "fixed",
                top: menuStyle.top,
                bottom: menuStyle.bottom,
                left: menuStyle.left,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
            }}
        >
            {values?.length > 0 && (
                <div className="px-2 py-2 border-b border-gray-800 flex justify-end">
                    <button
                        type="button"
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-green-400"
                        onClick={clearAll}
                    >
                        Clear
                    </button>
                </div>
            )}
            {allowSearch && (
                <div className="p-2 border-b border-gray-800">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-green-500"
                            autoFocus
                        />
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {allLabel && options.length > 1 ? (
                    <button
                        type="button"
                        className={`w-full text-left px-3 py-2 border-b border-gray-800 hover:bg-gray-900 transition-colors flex items-start gap-2 ${allSelected ? "bg-gray-900/70" : ""
                            }`}
                        onClick={(e) => {
                            e.preventDefault();
                            toggleSelectAll();
                        }}
                        role="option"
                        aria-selected={allSelected}
                    >
                        <span
                            className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border shrink-0 ${allSelected
                                ? "border-green-500/60 bg-green-500/15 text-green-300"
                                : "border-gray-700 text-transparent"
                                }`}
                        >
                            <Check size={14} />
                        </span>
                        <span className="min-w-0">
                            <div className="text-xs font-bold text-green-400/90 truncate">{allLabel}</div>
                        </span>
                    </button>
                ) : null}
                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-gray-400">No matches</div>
                ) : (
                    filteredOptions.map((opt) => {
                        const isSelected = set.has(String(opt.value));
                        return (
                            <button
                                key={String(opt.value)}
                                type="button"
                                className={`w-full text-left px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-900 transition-colors flex items-start gap-2 ${isSelected ? "bg-gray-900/70" : ""
                                    }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggle(opt.value);
                                }}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <span
                                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border shrink-0 ${isSelected
                                        ? "border-green-500/60 bg-green-500/15 text-green-300"
                                        : "border-gray-700 text-transparent"
                                        }`}
                                >
                                    <Check size={14} />
                                </span>
                                <span className="min-w-0">
                                    <div className="text-xs font-normal text-white truncate">
                                        {opt.label}
                                    </div>
                                    {opt.sublabel ? (
                                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                            {opt.sublabel}
                                        </div>
                                    ) : null}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-green-500 flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${buttonClassName}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="min-w-0 text-left truncate text-xs">
                    {summary || placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open ? createPortal(menu, document.body) : null}
        </div>
    );
}
