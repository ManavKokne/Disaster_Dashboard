"use client";

import { useEffect, useRef } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  X,
  Filter,
  MapPin,
  Download,
  RotateCcw,
  FileDown,
} from "lucide-react";

const MARKER_OPTIONS = [
  { value: "all", label: "All Markers" },
  { value: "urgent", label: "Urgent Only" },
  { value: "non-urgent", label: "Non-Urgent Only" },
  { value: "resolved", label: "Resolved Only" },
];

const DOWNLOAD_OPTIONS = [
  { value: "all", label: "All Data" },
  { value: "urgent", label: "Urgent Only" },
  { value: "non-urgent", label: "Non-Urgent Only" },
  { value: "resolved", label: "Resolved Only" },
];

export default function FilterDrawer({
  isOpen,
  onClose,
  locations,
  filterLocation,
  setFilterLocation,
  filterMarker,
  setFilterMarker,
  onReset,
  tweets = [],
}) {
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Convert tweets to CSV and trigger download
  const handleDownload = (filterType) => {
    let filtered = tweets;
    if (filterType !== "all") {
      filtered = tweets.filter(
        (t) => t.urgency.toLowerCase() === filterType.toLowerCase()
      );
    }

    if (filtered.length === 0) {
      alert("No data available for the selected filter.");
      return;
    }

    const headers = ["id", "tweet", "location", "request_type", "urgency"];
    const csvRows = [
      headers.join(","),
      ...filtered.map((t) =>
        headers
          .map((h) => {
            const val = t[h] ?? "";
            // Escape commas and quotes in CSV
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `disaster_data_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-800">
              Filters & Download
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Location Filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">
                Location
              </label>
            </div>
            <Select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="h-9 text-sm"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>

          {/* Marker Filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {/* <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500 border border-white" />
              </div> */}
              <label className="text-sm font-medium text-slate-700">
                Marker Type
              </label>
            </div>
            <div className="space-y-1.5">
              {MARKER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filterMarker === opt.value
                      ? "bg-slate-100 border border-slate-300"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="markerFilter"
                    value={opt.value}
                    checked={filterMarker === opt.value}
                    onChange={(e) => setFilterMarker(e.target.value)}
                    className="accent-slate-700"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                  {opt.value === "urgent" && (
                    <span className="ml-auto w-2.5 h-2.5 rounded-full bg-red-500" />
                  )}
                  {opt.value === "non-urgent" && (
                    <span className="ml-auto w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                  {opt.value === "resolved" && (
                    <span className="ml-auto w-2.5 h-2.5 rounded-full bg-green-500" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200" />

          {/* Download Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-4 w-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">
                Download Data
              </label>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Export disaster data as CSV. Date range filter coming soon.
            </p>
            <div className="space-y-2">
              {DOWNLOAD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(opt.value)}
                  className="w-full justify-start h-9 text-sm text-slate-600 hover:text-slate-800"
                >
                  <FileDown className="h-3.5 w-3.5 mr-2" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-9 text-sm text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset All Filters
          </Button>
        </div>
      </div>
    </>
  );
}
