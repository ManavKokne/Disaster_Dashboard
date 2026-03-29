"use client";

export default function MapLegendCard({
  urgentCount,
  nonUrgentCount,
  resolvedCount,
  totalVisible,
  className = "",
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-md ${className}`}>
      <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
        Legend
      </h4>
      <div className="space-y-1.5">
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
      <p className="text-[10px] text-slate-400 mt-1.5">Showing {totalVisible} markers on map</p>
    </div>
  );
}
