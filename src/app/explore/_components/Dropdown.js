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

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  allowSearch = true,
  searchPlaceholder = "Search...",
  debounceMs = 200,
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: "100%" });

  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = String(debouncedQuery || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label || ""} ${o.sublabel || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, debouncedQuery]);

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
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  const menu = (
    <div
      ref={menuRef}
      className={`z-[2000] mt-2 w-full rounded-xl border border-gray-700 bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden ${menuClassName}`}
      role="listbox"
      style={{
        position: "fixed",
        top: menuStyle.top,
        left: menuStyle.left,
        width: menuStyle.width,
      }}
    >
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

      <div className="max-h-64 overflow-y-auto no-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400">No matches</div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`w-full text-left px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-900 transition-colors flex items-start gap-2 ${isSelected ? "bg-gray-900/70" : ""
                  }`}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border ${isSelected
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
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
        <span className="min-w-0 text-left truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {open ? createPortal(menu, document.body) : null}
    </div>
  );
}

