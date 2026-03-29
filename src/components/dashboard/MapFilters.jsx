"use client";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter, RotateCcw } from "lucide-react";

export default function MapFilters({
  locations,
  filterLocation,
  setFilterLocation,
  filterMarkerType,
  setFilterMarkerType,
  filterRequestType,
  setFilterRequestType,
  requestTypes,
  filterAcknowledgement,
  setFilterAcknowledgement,
  filterTimeWindow,
  setFilterTimeWindow,
  onReset,
  onDownloadCsv,
  downloadingType,
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
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Marker Type</label>
            <Select
              value={filterMarkerType}
              onChange={(e) => setFilterMarkerType(e.target.value)}
              className="h-7 text-xs mt-0.5"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="non-urgent">Non-Urgent</option>
              <option value="resolved">Resolved</option>
            </Select>
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
          Download directly from SQL by urgency type.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadCsv("all")}
            disabled={downloadingType === "all"}
            className="justify-start"
          >
            {downloadingType === "all" ? "Downloading..." : "Download All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadCsv("urgent")}
            disabled={downloadingType === "urgent"}
            className="justify-start"
          >
            {downloadingType === "urgent" ? "Downloading..." : "Download Urgent"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadCsv("non-urgent")}
            disabled={downloadingType === "non-urgent"}
            className="justify-start"
          >
            {downloadingType === "non-urgent" ? "Downloading..." : "Download Non-Urgent"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadCsv("resolved")}
            disabled={downloadingType === "resolved"}
            className="justify-start"
          >
            {downloadingType === "resolved" ? "Downloading..." : "Download Resolved"}
          </Button>
        </div>
      </div>
    </div>
  );
}
