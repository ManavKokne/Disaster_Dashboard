"use client";

import { X } from "lucide-react";

export default function MapFilterDrawer({
  isOpen,
  onClose,
  title = "Map Filters",
  children,
}) {
  return (
    <div
      className={`fixed inset-0 z-110 transition-opacity duration-300 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close filter drawer overlay"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/20"
      />

      <aside
        className={`absolute right-0 top-0 h-screen w-[86vw] max-w-md border-l border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Map filters drawer"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[calc(100%-53px)] overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
