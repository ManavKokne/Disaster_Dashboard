"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Tweet state - local copy for mutations (resolve/close)
  const [tweets, setTweets] = useState([]);
  const [closedIds, setClosedIds] = useState(new Set());

  // Map filter state
  const [filterLocation, setFilterLocation] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

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

  // Map marker counts
  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterUrgentOnly && t.urgency.toLowerCase() !== "urgent") return false;
      return true;
    });
  }, [activeTweets, filterLocation, filterUrgentOnly]);

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
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Top Section: Map + Filters/Legend + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 flex-1 min-h-0">
          {/* Map (cols 1-6) */}
          <Card className="lg:col-span-6 overflow-hidden">
            <CardContent className="p-0 h-full flex">
              {/* Map */}
              <div className="flex-1 min-w-0">
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
                    filterUrgentOnly={filterUrgentOnly}
                  />
                )}
              </div>
              {/* Filters & Legend sidebar */}
              <div className="w-[180px] border-l border-slate-200 bg-slate-50 flex-shrink-0 overflow-y-auto hidden lg:block">
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

          {/* Chart (cols 7-10) */}
          <Card className="lg:col-span-4 overflow-hidden">
            <CardContent className="p-4 h-full">
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

        {/* Mobile Filters (visible on smaller screens) */}
        <div className="lg:hidden">
          <Card>
            <CardContent className="p-2">
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
        </div>

        {/* Bottom Section: Data Table */}
        <Card className="flex-1 min-h-[240px] overflow-hidden">
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
    </div>
  );
}
