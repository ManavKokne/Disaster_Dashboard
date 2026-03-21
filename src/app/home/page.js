"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import DataListTable from "@/components/dashboard/DataListTable";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 5000;
const SOUND_SESSION_KEY = "dashboard_sound_notifications_enabled";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tweets, setTweets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [filterLocation, setFilterLocation] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  const lastFetchedRef = useRef("");
  const firstFetchDoneRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const alertAudioRef = useRef(null);
  const resolveTimeoutsRef = useRef(new Map());

  const pushToast = useCallback((message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const stopAlertAudio = useCallback(() => {
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
  }, []);

  const playAlertAudio = useCallback(() => {
    if (!soundEnabled) return;
    if (!alertAudioRef.current) {
      const audio = new Audio("/sounds/alert.mp3");
      audio.loop = true;
      alertAudioRef.current = audio;
    }
    alertAudioRef.current.play().catch(() => setShowSoundPrompt(true));
  }, [soundEnabled]);

  const enableSoundNotifications = useCallback(async () => {
    try {
      if (!alertAudioRef.current) {
        const audio = new Audio("/sounds/alert.mp3");
        audio.loop = true;
        alertAudioRef.current = audio;
      }
      await alertAudioRef.current.play();
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
      setSoundEnabled(true);
      sessionStorage.setItem(SOUND_SESSION_KEY, "true");
      setShowSoundPrompt(false);
      pushToast("Sound notifications enabled", "success");
    } catch {
      pushToast("Browser blocked audio. Click again to allow sound.", "error");
    }
  }, [pushToast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const enabled = sessionStorage.getItem(SOUND_SESSION_KEY) === "true";
    setSoundEnabled(enabled);
    setShowSoundPrompt(!enabled);
  }, [user]);

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

  const updateTweet = useCallback(async (id, action) => {
    const res = await fetch("/api/tweets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Status update failed");
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const updateLastFetched = (rows) => {
      if (!rows?.length) return;
      for (const row of rows) {
        if (row.timestamp && (!lastFetchedRef.current || row.timestamp > lastFetchedRef.current)) {
          lastFetchedRef.current = row.timestamp;
        }
      }
    };

    const mergeTweets = (prev, incoming) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      incoming.forEach((item) => {
        map.set(item.id, item);
      });
      return Array.from(map.values());
    };

    const poll = async () => {
      try {
        const sinceQuery = lastFetchedRef.current
          ? `?since=${encodeURIComponent(lastFetchedRef.current)}`
          : "";
        const res = await fetch(`/api/tweets${sinceQuery}`);
        if (!res.ok) throw new Error("Failed to fetch tweets");

        const payload = await res.json();
        const incoming = payload.tweets || [];

        if (!isMounted) return;

        if (!firstFetchDoneRef.current) {
          firstFetchDoneRef.current = true;
          setTweets(incoming);
          incoming.forEach((item) => seenIdsRef.current.add(item.id));
          updateLastFetched(incoming);
          setLoadingData(false);
          setLoadError("");
          return;
        }

        const newRecords = incoming.filter((item) => !seenIdsRef.current.has(item.id));

        if (incoming.length > 0) {
          setTweets((prev) => mergeTweets(prev, incoming));
          incoming.forEach((item) => seenIdsRef.current.add(item.id));
          updateLastFetched(incoming);
        }

        const newUrgent = newRecords.filter(
          (item) => (item.urgency || "").toLowerCase() === "urgent" && !item.is_resolved && !item.is_closed
        );

        if (newUrgent.length > 0) {
          newUrgent.forEach((tweet) => {
            sendAlert("urgent", tweet);
            pushToast(`New urgent alert: ${tweet.location}`, "error");
          });
          playAlertAudio();
        }

        setLoadError("");
      } catch (error) {
        if (!isMounted) return;
        console.error("Polling failed:", error);
        setLoadError("Failed to load data");
        setLoadingData(false);
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [playAlertAudio, pushToast, sendAlert, user]);

  useEffect(() => {
    const timeoutMap = resolveTimeoutsRef.current;
    return () => {
      stopAlertAudio();
      timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.clear();
    };
  }, [stopAlertAudio]);

  const handleResolve = useCallback(
    async (tweetId) => {
      const tweet = tweets.find((t) => t.id === tweetId);
      setTweets((prev) =>
        prev.map((t) => (t.id === tweetId ? { ...t, is_resolved: true } : t))
      );

      try {
        await updateTweet(tweetId, "resolve");
        if (tweet) sendAlert("resolved", tweet);
        pushToast("Alert marked as resolved", "success");

        const timeoutId = setTimeout(async () => {
          try {
            await updateTweet(tweetId, "close");
            setTweets((prev) => prev.filter((t) => t.id !== tweetId));
            pushToast("Resolved alert auto-closed after 5 minutes", "info");
          } catch (error) {
            console.error("Auto-close fallback failed:", error);
          }
        }, 5 * 60 * 1000);

        const existing = resolveTimeoutsRef.current.get(tweetId);
        if (existing) clearTimeout(existing);
        resolveTimeoutsRef.current.set(tweetId, timeoutId);
      } catch (error) {
        console.error("Resolve failed:", error);
        pushToast("Failed to mark alert as resolved", "error");
      }
    },
    [pushToast, sendAlert, tweets, updateTweet]
  );

  const handleClose = useCallback(
    async (tweetId) => {
      const tweet = tweets.find((t) => t.id === tweetId);
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      stopAlertAudio();

      const timeoutId = resolveTimeoutsRef.current.get(tweetId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        resolveTimeoutsRef.current.delete(tweetId);
      }

      try {
        await updateTweet(tweetId, "close");
        if (tweet) sendAlert("closed", tweet);
      } catch (error) {
        console.error("Close failed:", error);
        pushToast("Failed to close alert", "error");
      }
    },
    [pushToast, sendAlert, stopAlertAudio, tweets, updateTweet]
  );

  const handleAcknowledge = useCallback(() => {
    stopAlertAudio();
    pushToast("Alert sound muted", "info");
  }, [pushToast, stopAlertAudio]);

  const activeTweets = useMemo(() => tweets.filter((t) => !t.is_closed), [tweets]);

  const locations = useMemo(() => {
    const set = new Set(activeTweets.map((t) => t.location).filter(Boolean));
    return [...set].sort();
  }, [activeTweets]);

  const requestTypes = useMemo(() => {
    const set = new Set(activeTweets.map((t) => t.request_type).filter(Boolean));
    return [...set].sort();
  }, [activeTweets]);

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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 flex-1 min-h-0">
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

        <Card className="flex-1 min-h-[240px] overflow-hidden">
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
