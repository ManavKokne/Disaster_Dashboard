"use client";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter, RotateCcw } from "lucide-react";
import { URGENCY_COLORS, URGENCY_LEVELS } from "@/lib/urgency";

export default function MapFilters({
  locations,
  filterLocation,
  setFilterLocation,
  selectedUrgencyLabels,
  onToggleUrgencyLabel,
  filterRequestType,
  setFilterRequestType,
  requestTypes,
  filterAcknowledgement,
  setFilterAcknowledgement,
  filterTimeWindow,
  setFilterTimeWindow,
  onApplyFilters,
  hasPendingChanges,
  onReset,
  onDownloadCsv,
  downloadingCsv,
  onDownloadAllCsv,
  downloadingAllCsv,
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
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
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">
              Urgency Levels
            </label>
            <div className="mt-1 grid grid-cols-1 gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-2">
              {URGENCY_LEVELS.map((level) => {
                const checked = selectedUrgencyLabels.includes(level);
                return (
                  <label
                    key={level}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300"
                      checked={checked}
                      onChange={() => onToggleUrgencyLabel(level)}
                    />
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: URGENCY_COLORS[level] }}
                    />
                    <span className="capitalize">{level}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Request Type</label>
            <Select
              value={filterRequestType}
              onChange={(e) => setFilterRequestType(e.target.value)}
              className="h-7 text-xs mt-0.5"
            >
              <option value="all">All Request Types</option>
              {(requestTypes || []).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Acknowledgement</label>
            <Select
              value={filterAcknowledgement}
              onChange={(e) => setFilterAcknowledgement(e.target.value)}
              className="h-7 text-xs mt-0.5"
            >
              <option value="all">All</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="unacknowledged">Unacknowledged</option>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Time Window</label>
            <Select
              value={filterTimeWindow}
              onChange={(e) => setFilterTimeWindow(e.target.value)}
              className="h-7 text-xs mt-0.5"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="72h">Last 72 Hours</option>
              <option value="7d">Last 7 Days</option>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={onApplyFilters}
            disabled={!hasPendingChanges}
            className="w-full h-7 text-xs"
          >
            Apply Filters
          </Button>
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

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Download className="h-3 w-3" /> CSV Download
        </h4>
        <p className="text-[11px] text-slate-500 mb-2">
          Download the currently filtered dataset as CSV.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadCsv}
          disabled={downloadingCsv || downloadingAllCsv}
          className="w-full justify-start"
        >
          {downloadingCsv ? "Downloading..." : "Download Filtered CSV"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadAllCsv}
          disabled={downloadingCsv || downloadingAllCsv}
          className="w-full justify-start mt-2"
        >
          {downloadingAllCsv ? "Downloading..." : "Download Entire Tweets CSV"}
        </Button>
      </div>
    </div>
  );
}
