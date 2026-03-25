"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "primary"
  onConfirm,
  onCancel,
  loading = false,
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onCancel?.();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onConfirm?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const confirmBtn =
    variant === "primary"
      ? "bg-green-600 hover:bg-green-500 text-black"
      : "bg-red-600 hover:bg-red-500 text-white";

  return (
    <div className="fixed inset-0 z-[5000]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => onCancel?.()}
      />

      <div className="absolute inset-0 flex items-end justify-end p-4 sm:items-center sm:justify-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0f1115] shadow-2xl sm:max-w-md">
          <div className="flex items-start justify-between gap-3 border-b border-gray-800 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{title}</p>
              {description ? (
                <p className="mt-1 text-xs font-normal text-gray-400 leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-800 bg-black/20 text-gray-300 hover:text-white hover:border-gray-700"
              aria-label="Close dialog"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => onCancel?.()}
              disabled={loading}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-normal text-gray-200 hover:border-gray-500 disabled:opacity-60"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.()}
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-xs font-normal disabled:opacity-60 ${confirmBtn}`}
            >
              {loading ? "Working..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

