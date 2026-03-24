"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import useDashboardAlerts from "@/hooks/useDashboardAlerts";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [toasts, setToasts] = useState([]);
  const [mobileView, setMobileView] = useState("map"); // "map" or "chart" for mobile

  const [filterLocation, setFilterLocation] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  const pushToast = useCallback((message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);
  const {
    loadingData,
    loadError,
    showSoundPrompt,
    setShowSoundPrompt,
    enableSoundNotifications,
    handleResolve,
    handleClose,
    handleAcknowledge,
    activeTweets,
    locations,
    requestTypes,
  } = useDashboardAlerts({ user, onToast: pushToast });

  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterUrgentOnly && ((t.urgency || "").toLowerCase() !== "urgent" || t.is_resolved)) return false;
      return true;
    });
  }, [activeTweets, filterLocation, filterUrgentOnly]);

  const urgentCount = useMemo(
    () => mapTweets.filter((t) => (t.urgency || "").toLowerCase() === "urgent" && !t.is_resolved).length,
    [mapTweets]
  );
  const nonUrgentCount = useMemo(
    () => mapTweets.filter((t) => (t.urgency || "").toLowerCase() === "non-urgent" && !t.is_resolved).length,
    [mapTweets]
  );
  const resolvedCount = useMemo(() => mapTweets.filter((t) => t.is_resolved).length, [mapTweets]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      <Navbar />

      {showSoundPrompt && (
        <div className="mx-3 mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm flex items-center justify-between gap-3">
          <p className="text-amber-900">
            Enable sound notifications to allow looping audio on new urgent alerts.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSoundPrompt(false)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-xs"
            >
              Not now
            </button>
            <button
              onClick={enableSoundNotifications}
              className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs hover:bg-amber-700"
            >
              Enable Sound
            </button>
          </div>
        </div>
      )}

      <div className="fixed right-3 top-14 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md px-3 py-2 text-xs shadow-lg border ${
              toast.tone === "error"
                ? "bg-red-50 border-red-300 text-red-800"
                : toast.tone === "success"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-white border-slate-300 text-slate-800"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-10 gap-3 flex-1 min-h-0">
          <Card className="lg:col-span-6 overflow-hidden">
            <CardContent className="p-0 h-full flex">
              <div className="flex-1 min-w-0">
                {loadingData ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : loadError ? (
                  <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
                    {loadError}
                  </div>
                ) : (
                  <MapContainer
                    tweets={activeTweets}
                    onResolve={handleResolve}
                    onClose={handleClose}
                    onAcknowledge={handleAcknowledge}
                    filterLocation={filterLocation}
                    filterUrgentOnly={filterUrgentOnly}
                  />
                )}
              </div>
              <div className="w-45 border-l border-slate-200 bg-slate-50 shrink-0 overflow-y-auto hidden lg:block">
                <MapFilters
                  locations={locations}
                  filterLocation={filterLocation}
                  setFilterLocation={setFilterLocation}
                  filterUrgentOnly={filterUrgentOnly}
                  setFilterUrgentOnly={setFilterUrgentOnly}
                  onReset={() => {
                    setFilterLocation("");
                    setFilterUrgentOnly(false);
                  }}
                  urgentCount={urgentCount}
                  nonUrgentCount={nonUrgentCount}
                  resolvedCount={resolvedCount}
                  totalVisible={mapTweets.length}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 overflow-hidden">
            <CardContent className="p-4 h-full">
              {loadingData ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <AnalyticsChart tweets={activeTweets} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile/Tablet: Switching layout */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0 gap-2">
          {/* View Switcher Buttons */}
          <div className="flex gap-2 bg-white rounded-lg p-2 border border-slate-200 shrink-0">
            <button
              onClick={() => setMobileView("map")}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mobileView === "map"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setMobileView("chart")}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mobileView === "chart"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Chart View
            </button>
          </div>

          {/* Map View */}
          {mobileView === "map" && (
            <>
              <Card className="flex-1 overflow-hidden min-h-0">
                <CardContent className="p-0 h-full min-h-64 sm:min-h-96">
                  {loadingData ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : loadError ? (
                    <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
                      {loadError}
                    </div>
                  ) : (
                    <MapContainer
                      tweets={activeTweets}
                      onResolve={handleResolve}
                      onClose={handleClose}
                      onAcknowledge={handleAcknowledge}
                      filterLocation={filterLocation}
                      filterUrgentOnly={filterUrgentOnly}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Mobile Filters for Map */}
              <Card className="shrink-0">
                <CardContent className="p-2 max-h-40 overflow-y-auto">
                  <MapFilters
                    locations={locations}
                    filterLocation={filterLocation}
                    setFilterLocation={setFilterLocation}
                    filterUrgentOnly={filterUrgentOnly}
                    setFilterUrgentOnly={setFilterUrgentOnly}
                    onReset={() => {
                      setFilterLocation("");
                      setFilterUrgentOnly(false);
                    }}
                    urgentCount={urgentCount}
                    nonUrgentCount={nonUrgentCount}
                    resolvedCount={resolvedCount}
                    totalVisible={mapTweets.length}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Chart View */}
          {mobileView === "chart" && (
            <Card className="flex-1 overflow-hidden min-h-0">
              <CardContent className="p-4 h-full">
                {loadingData ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div style={{ height: "100%" }}>
                    <AnalyticsChart tweets={activeTweets} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data Table - Visible on all sizes */}
        <Card className="flex-1 min-h-45 sm:min-h-55 md:min-h-60 overflow-hidden">
          <CardContent className="p-0 h-full">
            {loadingData ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataListTable tweets={activeTweets} locations={locations} requestTypes={requestTypes} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
