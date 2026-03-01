"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tweets, setTweets] = useState([]);
  const [closedIds, setClosedIds] = useState(new Set());
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMarker, setFilterMarker] = useState("all");

  const { data, error, isLoading } = useSWR("/api/tweets", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (data?.tweets) {
      setTweets(data.tweets);
    }
  }, [data]);

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

  const handleResolve = useCallback(
    (tweetId) => {
      setTweets((prev) =>
        prev.map((t) => (t.id === tweetId ? { ...t, urgency: "Resolved" } : t))
      );
      const tweet = tweets.find((t) => t.id === tweetId);
      if (tweet) sendAlert("resolved", tweet);
    },
    [tweets, sendAlert]
  );

  const handleClose = useCallback(
    (tweetId) => {
      setClosedIds((prev) => new Set([...prev, tweetId]));
      const tweet = tweets.find((t) => t.id === tweetId);
      if (tweet) sendAlert("closed", tweet);
    },
    [tweets, sendAlert]
  );

  const activeTweets = useMemo(
    () => tweets.filter((t) => !closedIds.has(t.id)),
    [tweets, closedIds]
  );

  const locations = useMemo(() => {
    const set = new Set(activeTweets.map((t) => t.location).filter(Boolean));
    return [...set].sort();
  }, [activeTweets]);

  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterMarker !== "all" && t.urgency.toLowerCase() !== filterMarker.toLowerCase()) return false;
      return true;
    });
  }, [activeTweets, filterLocation, filterMarker]);

  const urgentCount = mapTweets.filter((t) => t.urgency.toLowerCase() === "urgent").length;
  const nonUrgentCount = mapTweets.filter((t) => t.urgency.toLowerCase() === "non-urgent").length;
  const resolvedCount = mapTweets.filter((t) => t.urgency.toLowerCase() === "resolved").length;

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

      <div className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-y-auto">
        {/* Map - constrained height */}
        <Card className="flex-1 overflow-hidden min-h-[300px] max-h-[60vh] lg:max-h-none">
          <CardContent className="p-0 h-full">
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

        {/* Sidebar: Legend + Filters */}
        <Card className="w-full lg:w-[220px] flex-shrink-0 overflow-y-auto">
          <CardContent className="p-0">
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
    </div>
  );
}
