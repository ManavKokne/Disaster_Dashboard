"use client";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

export default function MapFilters({
  locations,
  filterLocation,
  setFilterLocation,
  filterUrgentOnly,
  setFilterUrgentOnly,
  onReset,
  urgentCount,
  nonUrgentCount,
  resolvedCount,
  totalVisible,
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Legend */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Legend
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-40 absolute -inset-0.5 urgent-ping" />
              <div className="w-3 h-3 rounded-full bg-red-600 border border-white relative z-10" />
            </div>
            <span className="text-xs text-slate-600">Urgent ({urgentCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
            <span className="text-xs text-slate-600">Non-Urgent ({nonUrgentCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
            <span className="text-xs text-slate-600">Resolved ({resolvedCount})</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Showing {totalVisible} markers on map
        </p>
      </div>

      {/* Map Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Filters
        </h4>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Location</label>
            <Select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="h-7 text-xs mt-0.5"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgentOnly"
              checked={filterUrgentOnly}
              onChange={(e) => setFilterUrgentOnly(e.target.checked)}
              className="rounded border-slate-300 accent-red-500"
            />
            <label htmlFor="urgentOnly" className="text-xs text-slate-600 cursor-pointer">
              Show urgent only
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-7 text-xs text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
