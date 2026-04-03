"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import MapFilters from "@/components/dashboard/MapFilters";
import MapFilterDrawer from "@/components/dashboard/MapFilterDrawer";
import MapLegendCard from "@/components/dashboard/MapLegendCard";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, Loader2 } from "lucide-react";
import useDashboardAlerts from "@/hooks/useDashboardAlerts";
import { getUrgencyMeta, normalizeUrgencyLabel, URGENCY_LEVELS } from "@/lib/urgency";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [toasts, setToasts] = useState([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingAllCsv, setDownloadingAllCsv] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [filterLocation, setFilterLocation] = useState("");
  const [selectedUrgencyLabels, setSelectedUrgencyLabels] = useState([]);
  const [filterRequestType, setFilterRequestType] = useState("all");
  const [filterAcknowledgement, setFilterAcknowledgement] = useState("all");
  const [filterTimeWindow, setFilterTimeWindow] = useState("all");

  const [draftFilterLocation, setDraftFilterLocation] = useState("");
  const [draftSelectedUrgencyLabels, setDraftSelectedUrgencyLabels] = useState([]);
  const [draftFilterRequestType, setDraftFilterRequestType] = useState("all");
  const [draftFilterAcknowledgement, setDraftFilterAcknowledgement] = useState("all");
  const [draftFilterTimeWindow, setDraftFilterTimeWindow] = useState("all");

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

  const toggleUrgencyLabel = useCallback((label) => {
    const normalizedLabel = normalizeUrgencyLabel(label);
    if (!normalizedLabel) return;

    setDraftSelectedUrgencyLabels((previous) =>
      previous.includes(normalizedLabel)
        ? previous.filter((item) => item !== normalizedLabel)
        : [...previous, normalizedLabel]
    );
  }, []);

  const hasPendingFilterChanges = useMemo(() => {
    const appliedUrgency = [...selectedUrgencyLabels].sort().join("|");
    const draftUrgency = [...draftSelectedUrgencyLabels].sort().join("|");

    return (
      filterLocation !== draftFilterLocation ||
      filterRequestType !== draftFilterRequestType ||
      filterAcknowledgement !== draftFilterAcknowledgement ||
      filterTimeWindow !== draftFilterTimeWindow ||
      appliedUrgency !== draftUrgency
    );
  }, [
    selectedUrgencyLabels,
    draftSelectedUrgencyLabels,
    filterLocation,
    draftFilterLocation,
    filterRequestType,
    draftFilterRequestType,
    filterAcknowledgement,
    draftFilterAcknowledgement,
    filterTimeWindow,
    draftFilterTimeWindow,
  ]);

  const applyFilters = useCallback(() => {
    setFilterLocation(draftFilterLocation);
    setSelectedUrgencyLabels(draftSelectedUrgencyLabels);
    setFilterRequestType(draftFilterRequestType);
    setFilterAcknowledgement(draftFilterAcknowledgement);
    setFilterTimeWindow(draftFilterTimeWindow);
    pushToast("Filters applied", "success");
  }, [
    draftFilterLocation,
    draftSelectedUrgencyLabels,
    draftFilterRequestType,
    draftFilterAcknowledgement,
    draftFilterTimeWindow,
    pushToast,
  ]);

  const resetFilters = useCallback(() => {
    setDraftFilterLocation("");
    setDraftSelectedUrgencyLabels([]);
    setDraftFilterRequestType("all");
    setDraftFilterAcknowledgement("all");
    setDraftFilterTimeWindow("all");

    setFilterLocation("");
    setSelectedUrgencyLabels([]);
    setFilterRequestType("all");
    setFilterAcknowledgement("all");
    setFilterTimeWindow("all");
    pushToast("Filters reset", "info");
  }, [pushToast]);

  const matchesAdditionalFilters = useCallback((tweet) => {
    if (filterLocation && (tweet.location || "").toLowerCase() !== filterLocation.toLowerCase()) {
      return false;
    }

    if (filterRequestType !== "all" && (tweet.request_type || "") !== filterRequestType) return false;

    if (filterAcknowledgement === "acknowledged" && !tweet.is_acknowledged) return false;
    if (filterAcknowledgement === "unacknowledged" && tweet.is_acknowledged) return false;

    if (selectedUrgencyLabels.length > 0) {
      const { label } = getUrgencyMeta(tweet);
      if (!selectedUrgencyLabels.includes(label)) return false;
    }

    if (!isWithinTimeWindow(tweet)) return false;

    return true;
  }, [
    filterLocation,
    filterRequestType,
    filterAcknowledgement,
    selectedUrgencyLabels,
    isWithinTimeWindow,
  ]);

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
    allTweets,
    activeTweets,
    locations,
    requestTypes,
    allLocations,
    allRequestTypes,
  } = useDashboardAlerts({ user, onToast: pushToast });

  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (!matchesAdditionalFilters(t)) return false;
      return true;
    });
  }, [activeTweets, matchesAdditionalFilters]);

  const urgencyCounts = useMemo(() => {
    const baseCounts = URGENCY_LEVELS.reduce((accumulator, level) => {
      accumulator[level] = 0;
      return accumulator;
    }, {});

    mapTweets.forEach((tweet) => {
      const { label } = getUrgencyMeta(tweet);
      baseCounts[label] = (baseCounts[label] || 0) + 1;
    });

    return baseCounts;
  }, [mapTweets]);

  const triggerCsvDownload = useCallback(async (endpoint, fallbackFileName) => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to download CSV");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const fileNameMatch = disposition.match(/filename=\"?([^\"]+)\"?/i);
    const fileName = fileNameMatch?.[1] || fallbackFileName;

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
  }, []);

  const downloadCsv = useCallback(async () => {
    try {
      setDownloadingCsv(true);

      const searchParams = new URLSearchParams();
      if (filterLocation) searchParams.set("location", filterLocation);
      if (filterRequestType !== "all") searchParams.set("requestType", filterRequestType);
      if (filterAcknowledgement !== "all") {
        searchParams.set("acknowledgement", filterAcknowledgement);
      }
      if (filterTimeWindow !== "all") searchParams.set("timeWindow", filterTimeWindow);
      if (selectedUrgencyLabels.length > 0) {
        searchParams.set("urgencyLabels", selectedUrgencyLabels.join(","));
      }

      const endpoint = searchParams.toString()
        ? `/api/tweets/export?${searchParams.toString()}`
        : "/api/tweets/export";

      await triggerCsvDownload(endpoint, "alerts-filtered.csv");
      pushToast("Filtered CSV downloaded", "success");
    } catch (error) {
      pushToast(error.message || "CSV download failed", "error");
    } finally {
      setDownloadingCsv(false);
    }
  }, [
    pushToast,
    filterLocation,
    filterRequestType,
    filterAcknowledgement,
    filterTimeWindow,
    selectedUrgencyLabels,
    triggerCsvDownload,
  ]);

  const downloadAllTweetsCsv = useCallback(async () => {
    try {
      setDownloadingAllCsv(true);
      await triggerCsvDownload("/api/tweets/export?includeClosed=1", "alerts-all.csv");
      pushToast("Entire tweets CSV downloaded", "success");
    } catch (error) {
      pushToast(error.message || "CSV download failed", "error");
    } finally {
      setDownloadingAllCsv(false);
    }
  }, [pushToast, triggerCsvDownload]);

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

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 lg:flex-1 lg:min-h-0">
          <Card className="lg:col-span-6 overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="relative h-full w-full min-h-80 sm:min-h-115 md:min-h-140 lg:min-h-95">
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
                    tweets={mapTweets}
                    onResolve={handleResolve}
                    onClose={handleClose}
                    onAcknowledge={handleAcknowledge}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 rounded-md border border-sky-900 bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-sky-900 transition-colors"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </button>

                <MapLegendCard
                  counts={urgencyCounts}
                  totalVisible={mapTweets.length}
                  className="absolute top-3 right-3 z-30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 overflow-hidden min-h-70 md:min-h-80 lg:min-h-0">
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

        <Card className="min-h-80 lg:flex-1 lg:min-h-60 overflow-hidden">
          <CardContent className="p-0 h-full">
            {loadingData ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataListTable tweets={allTweets} locations={allLocations} requestTypes={allRequestTypes} />
            )}
          </CardContent>
        </Card>
      </div>

      <MapFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
      >
        <MapFilters
          locations={locations}
          filterLocation={draftFilterLocation}
          setFilterLocation={setDraftFilterLocation}
          selectedUrgencyLabels={draftSelectedUrgencyLabels}
          onToggleUrgencyLabel={toggleUrgencyLabel}
          filterRequestType={draftFilterRequestType}
          setFilterRequestType={setDraftFilterRequestType}
          requestTypes={requestTypes}
          filterAcknowledgement={draftFilterAcknowledgement}
          setFilterAcknowledgement={setDraftFilterAcknowledgement}
          filterTimeWindow={draftFilterTimeWindow}
          setFilterTimeWindow={setDraftFilterTimeWindow}
          onApplyFilters={applyFilters}
          hasPendingChanges={hasPendingFilterChanges}
          onReset={resetFilters}
          onDownloadCsv={downloadCsv}
          downloadingCsv={downloadingCsv}
          onDownloadAllCsv={downloadAllTweetsCsv}
          downloadingAllCsv={downloadingAllCsv}
        />
      </MapFilterDrawer>
    </div>
  );
}
