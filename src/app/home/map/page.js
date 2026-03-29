"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import MapFilters from "@/components/dashboard/MapFilters";
import MapFilterDrawer from "@/components/dashboard/MapFilterDrawer";
import MapLegendCard from "@/components/dashboard/MapLegendCard";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, Loader2 } from "lucide-react";
import useDashboardAlerts from "@/hooks/useDashboardAlerts";

export default function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [toasts, setToasts] = useState([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [downloadingCsvType, setDownloadingCsvType] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [filterLocation, setFilterLocation] = useState("");
  const [filterMarkerType, setFilterMarkerType] = useState("all");
  const [filterRequestType, setFilterRequestType] = useState("all");
  const [filterAcknowledgement, setFilterAcknowledgement] = useState("all");
  const [filterTimeWindow, setFilterTimeWindow] = useState("all");

  const pushToast = useCallback((message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const isWithinTimeWindow = useCallback((tweet) => {
    if (filterTimeWindow === "all") return true;

    const createdAt = tweet.created_at || tweet.updated_at;
    if (!createdAt) return false;

    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return false;

    const diffMs = nowMs - parsed.getTime();
    const windowsInMs = {
      "24h": 24 * 60 * 60 * 1000,
      "72h": 72 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    return diffMs <= (windowsInMs[filterTimeWindow] || Number.MAX_SAFE_INTEGER);
  }, [filterTimeWindow, nowMs]);

  const matchesAdditionalFilters = useCallback((tweet) => {
    if (filterLocation && tweet.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
    if (filterRequestType !== "all" && (tweet.request_type || "") !== filterRequestType) return false;
    if (filterAcknowledgement === "acknowledged" && !tweet.is_acknowledged) return false;
    if (filterAcknowledgement === "unacknowledged" && tweet.is_acknowledged) return false;
    if (!isWithinTimeWindow(tweet)) return false;
    return true;
  }, [filterLocation, filterRequestType, filterAcknowledgement, isWithinTimeWindow]);

  const isTweetMatchingMarkerType = useCallback((tweet, markerType) => {
    const urgencyLower = (tweet.urgency || "").toLowerCase();
    const isResolved = Boolean(tweet.is_resolved) || urgencyLower === "resolved";

    if (markerType === "urgent") return urgencyLower === "urgent" && !isResolved;
    if (markerType === "non-urgent") return urgencyLower !== "urgent" && !isResolved;
    if (markerType === "resolved") return isResolved;
    return true;
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

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
      if (!matchesAdditionalFilters(t)) return false;
      if (!isTweetMatchingMarkerType(t, filterMarkerType)) return false;
      return true;
    });
  }, [activeTweets, matchesAdditionalFilters, filterMarkerType, isTweetMatchingMarkerType]);

  const locationScopedTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (!matchesAdditionalFilters(t)) return false;
      return true;
    });
  }, [activeTweets, matchesAdditionalFilters]);

  const urgentCount = useMemo(
    () => locationScopedTweets.filter((t) => isTweetMatchingMarkerType(t, "urgent")).length,
    [locationScopedTweets, isTweetMatchingMarkerType]
  );
  const nonUrgentCount = useMemo(
    () => locationScopedTweets.filter((t) => isTweetMatchingMarkerType(t, "non-urgent")).length,
    [locationScopedTweets, isTweetMatchingMarkerType]
  );
  const resolvedCount = useMemo(
    () => locationScopedTweets.filter((t) => isTweetMatchingMarkerType(t, "resolved")).length,
    [locationScopedTweets, isTweetMatchingMarkerType]
  );

  const downloadCsv = useCallback(
    async (markerType) => {
      try {
        setDownloadingCsvType(markerType);

        const response = await fetch(
          `/api/tweets/export?markerType=${encodeURIComponent(markerType)}`
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to download CSV");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const fileNameMatch = disposition.match(/filename=\"?([^\"]+)\"?/i);
        const fileName = fileNameMatch?.[1] || `alerts-${markerType}.csv`;

        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(objectUrl);

        pushToast(`CSV downloaded for ${markerType}`, "success");
      } catch (error) {
        pushToast(error.message || "CSV download failed", "error");
      } finally {
        setDownloadingCsvType("");
      }
    },
    [pushToast]
  );

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
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

      <div className="flex-1 flex p-3 gap-3 overflow-hidden">
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="relative h-full w-full min-h-95">
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
                  filterMarkerType={filterMarkerType}
                  filterRequestType={filterRequestType}
                  filterAcknowledgement={filterAcknowledgement}
                  filterTimeWindow={filterTimeWindow}
                  nowMs={nowMs}
                />
              )}

              {!loadingData && !loadError && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 rounded-md border border-sky-900 bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-sky-900 transition-colors lg:hidden"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                  </button>

                  <MapLegendCard
                    urgentCount={urgentCount}
                    nonUrgentCount={nonUrgentCount}
                    resolvedCount={resolvedCount}
                    totalVisible={mapTweets.length}
                    className="absolute top-3 right-3 z-30 lg:hidden"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="w-72 xl:w-80 shrink-0 overflow-y-auto hidden lg:block">
          <CardContent className="p-3 space-y-3">
            <MapLegendCard
              urgentCount={urgentCount}
              nonUrgentCount={nonUrgentCount}
              resolvedCount={resolvedCount}
              totalVisible={mapTweets.length}
            />

            <MapFilters
              locations={locations}
              filterLocation={filterLocation}
              setFilterLocation={setFilterLocation}
              filterMarkerType={filterMarkerType}
              setFilterMarkerType={setFilterMarkerType}
              filterRequestType={filterRequestType}
              setFilterRequestType={setFilterRequestType}
              requestTypes={requestTypes}
              filterAcknowledgement={filterAcknowledgement}
              setFilterAcknowledgement={setFilterAcknowledgement}
              filterTimeWindow={filterTimeWindow}
              setFilterTimeWindow={setFilterTimeWindow}
              visibleCount={mapTweets.length}
              totalWithCoordinates={activeTweets.filter((t) => t.coordinates).length}
              onReset={() => {
                setFilterLocation("");
                setFilterMarkerType("all");
                setFilterRequestType("all");
                setFilterAcknowledgement("all");
                setFilterTimeWindow("all");
              }}
              onDownloadCsv={downloadCsv}
              downloadingType={downloadingCsvType}
            />
          </CardContent>
        </Card>
      </div>

      <MapFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
      >
        <MapFilters
          locations={locations}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          filterMarkerType={filterMarkerType}
          setFilterMarkerType={setFilterMarkerType}
          filterRequestType={filterRequestType}
          setFilterRequestType={setFilterRequestType}
          requestTypes={requestTypes}
          filterAcknowledgement={filterAcknowledgement}
          setFilterAcknowledgement={setFilterAcknowledgement}
          filterTimeWindow={filterTimeWindow}
          setFilterTimeWindow={setFilterTimeWindow}
          visibleCount={mapTweets.length}
          totalWithCoordinates={activeTweets.filter((t) => t.coordinates).length}
          onReset={() => {
            setFilterLocation("");
            setFilterMarkerType("all");
            setFilterRequestType("all");
            setFilterAcknowledgement("all");
            setFilterTimeWindow("all");
          }}
          onDownloadCsv={downloadCsv}
          downloadingType={downloadingCsvType}
        />
      </MapFilterDrawer>
    </div>
  );
}
