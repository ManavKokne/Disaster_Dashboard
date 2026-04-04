"use client";

import { useState } from "react";
import { URGENCY_COLORS, URGENCY_LEVELS } from "@/lib/urgency";

const RESOLVED_MARKER_COLOR = "#22c55e";

export default function MapLegendCard({
  counts = {},
  totalVisible,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`rounded-lg border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-md ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={isExpanded}
        aria-label="Toggle legend"
      >
        <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
          Legend
        </h4>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          {totalVisible} markers
          <span
            className={`inline-block transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          >
            v
          </span>
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="space-y-1.5 mt-1.5">
            {URGENCY_LEVELS.map((level) => (
              <div key={level} className="flex items-center gap-2">
                {level === "urgent" ? (
                  <div className="relative">
                    <div
                      className="w-3 h-3 rounded-full opacity-40 absolute -inset-0.5 urgent-ping"
                      style={{ backgroundColor: URGENCY_COLORS[level] }}
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white relative z-10"
                      style={{ backgroundColor: URGENCY_COLORS[level] }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: URGENCY_COLORS[level] }}
                  />
                )}
                <span className="text-xs text-slate-600 capitalize">
                  {level} ({counts[level] || 0})
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: RESOLVED_MARKER_COLOR }}
              />
              <span className="text-xs text-slate-600">resolved ({counts.resolved || 0})</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Showing {totalVisible} markers on map</p>
        </>
      )}
    </div>
  );
}
