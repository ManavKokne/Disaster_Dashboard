"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import FilterDrawer from "@/components/dashboard/FilterDrawer";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import useDashboardAlerts from "@/hooks/useDashboardAlerts";

function getMarkerType(tweet) {
  if (tweet?.is_resolved) return "resolved";
  return (tweet?.urgency || "").toLowerCase();
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [toasts, setToasts] = useState([]);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMarker, setFilterMarker] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    return activeTweets.filter((tweet) => {
      if (!tweet.coordinates) return false;
      if (
        filterLocation &&
        (tweet.location || "").toLowerCase() !== filterLocation.toLowerCase()
      ) {
        return false;
      }
      if (filterMarker !== "all" && getMarkerType(tweet) !== filterMarker) {
        return false;
      }
      return true;
    });
  }, [activeTweets, filterLocation, filterMarker]);

  const urgentCount = useMemo(
    () => mapTweets.filter((tweet) => getMarkerType(tweet) === "urgent").length,
    [mapTweets]
  );

  const nonUrgentCount = useMemo(
    () => mapTweets.filter((tweet) => getMarkerType(tweet) === "non-urgent").length,
    [mapTweets]
  );

  const resolvedCount = useMemo(
    () => mapTweets.filter((tweet) => getMarkerType(tweet) === "resolved").length,
    [mapTweets]
  );

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 flex-1 min-h-0">
          <Card className="lg:col-span-6 overflow-hidden relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="absolute top-2 left-2 z-10 h-8 text-sm gap-1.5 bg-blue-500 text-white border-2 border-black shadow-lg hover:bg-blue-600 backdrop-blur-sm font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>

            <CardContent className="p-0 h-full min-h-[280px]">
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
                  filterMarker={filterMarker}
                />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 overflow-hidden">
            <CardContent className="p-4 h-full min-h-[240px]">
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

        <div className="lg:hidden">
          <Card>
            <CardContent className="p-2">
              <MapFilters
                locations={locations}
                filterLocation={filterLocation}
                setFilterLocation={setFilterLocation}
                filterMarker={filterMarker}
                setFilterMarker={setFilterMarker}
                onReset={() => {
                  setFilterLocation("");
                  setFilterMarker("all");
                }}
                urgentCount={urgentCount}
                nonUrgentCount={nonUrgentCount}
                resolvedCount={resolvedCount}
                totalVisible={mapTweets.length}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[240px] overflow-hidden">
          <CardContent className="p-0 h-full">
            {loadingData ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataListTable
                tweets={activeTweets}
                locations={locations}
                requestTypes={requestTypes}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <FilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        filterLocation={filterLocation}
        setFilterLocation={setFilterLocation}
        filterMarker={filterMarker}
        setFilterMarker={setFilterMarker}
        onReset={() => {
          setFilterLocation("");
          setFilterMarker("all");
        }}
        tweets={activeTweets}
      />
    </div>
  );
}
