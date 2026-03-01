"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import FilterDrawer from "@/components/dashboard/FilterDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Tweet state - local copy for mutations (resolve/close)
  const [tweets, setTweets] = useState([]);
  const [closedIds, setClosedIds] = useState(new Set());

  // Map filter state
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMarker, setFilterMarker] = useState("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch data with SWR for fast, cached loading
  const { data, error, isLoading } = useSWR("/api/tweets", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Sync SWR data to local state
  useEffect(() => {
    if (data?.tweets) {
      setTweets(data.tweets);
    }
  }, [data]);

  // Send email alert
  const sendAlert = useCallback(async (type, tweetData) => {
    try {
      await fetch("/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, tweetData }),
      });
    } catch (err) {
      console.error("Failed to send alert:", err);
    }
  }, []);

  // Handle resolve: change urgency to "Resolved"
  const handleResolve = useCallback(
    (tweetId) => {
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, urgency: "Resolved" } : t
        )
      );
      const tweet = tweets.find((t) => t.id === tweetId);
      if (tweet) {
        sendAlert("resolved", tweet);
      }
    },
    [tweets, sendAlert]
  );

  // Handle close: remove marker from map
  const handleClose = useCallback(
    (tweetId) => {
      setClosedIds((prev) => new Set([...prev, tweetId]));
      const tweet = tweets.find((t) => t.id === tweetId);
      if (tweet) {
        sendAlert("closed", tweet);
      }
    },
    [tweets, sendAlert]
  );

  // Active tweets (excluding closed ones)
  const activeTweets = useMemo(
    () => tweets.filter((t) => !closedIds.has(t.id)),
    [tweets, closedIds]
  );

  // Extract unique locations and request types for filters
  const locations = useMemo(() => {
    const set = new Set(activeTweets.map((t) => t.location).filter(Boolean));
    return [...set].sort();
  }, [activeTweets]);

  const requestTypes = useMemo(() => {
    const set = new Set(activeTweets.map((t) => t.request_type).filter(Boolean));
    return [...set].sort();
  }, [activeTweets]);

  // Map tweets filtered for MapContainer
  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterMarker !== "all" && t.urgency.toLowerCase() !== filterMarker.toLowerCase()) return false;
      return true;
    });
  }, [activeTweets, filterLocation, filterMarker]);

  const urgentCount = useMemo(
    () => mapTweets.filter((t) => t.urgency.toLowerCase() === "urgent").length,
    [mapTweets]
  );
  const nonUrgentCount = useMemo(
    () => mapTweets.filter((t) => t.urgency.toLowerCase() === "non-urgent").length,
    [mapTweets]
  );
  const resolvedCount = useMemo(
    () => mapTweets.filter((t) => t.urgency.toLowerCase() === "resolved").length,
    [mapTweets]
  );

  // Loading & auth guard
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
        {/* Top Section: Map + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 min-h-[320px] lg:min-h-[360px]">
          {/* Map (cols 1-6) */}
          <Card className="lg:col-span-6 overflow-hidden relative">
            {/* Filter Button - overlays map top-left */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="absolute top-2 left-2 z-10 h-8 text-sm gap-1.5 bg-blue-500 text-white border-2 border-black shadow-lg hover:bg-blue-600 backdrop-blur-sm font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>

            {/* Legend overlay - top right */}
            <div className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span></span>
                  <span className="text-xs text-slate-600">Urgent ({urgentCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
                  <span className="text-xs text-slate-600">Non-Urgent ({nonUrgentCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                  <span className="text-xs text-slate-600">Resolved ({resolvedCount})</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5">Showing {mapTweets.length} markers</p>
            </div>

            <CardContent className="p-0 h-full min-h-[280px]">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : error ? (
                <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
                  Failed to load data
                </div>
              ) : (
                <MapContainer
                  tweets={activeTweets}
                  onResolve={handleResolve}
                  onClose={handleClose}
                  filterLocation={filterLocation}
                  filterMarker={filterMarker}
                />
              )}
            </CardContent>
          </Card>

          {/* Chart (cols 7-10) */}
          <Card className="lg:col-span-4 overflow-hidden">
            <CardContent className="p-4 h-full min-h-[240px]">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <AnalyticsChart tweets={activeTweets} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Data Table */}
        <Card className="min-h-[240px] overflow-hidden">
          <CardContent className="p-0 h-full">
            {isLoading ? (
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

      {/* Filter Drawer */}
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
