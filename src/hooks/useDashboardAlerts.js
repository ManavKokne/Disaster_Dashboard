"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUrgencyMeta } from "@/lib/urgency";

const POLL_INTERVAL_MS = 5000;
const SOUND_SESSION_KEY = "dashboard_sound_notifications_enabled";
const ALERT_SOUND_SRC =
  process.env.NEXT_PUBLIC_ALERT_SOUND_PATH || "/sounds/alert.mp3";

function hasPendingUrgentAlerts(rows) {
  return rows.some(
    (item) =>
      getUrgencyMeta(item).label === "urgent" &&
      !item.is_closed &&
      !item.is_resolved &&
      !item.is_acknowledged
  );
}

export default function useDashboardAlerts({ user, onToast } = {}) {
  const [tweets, setTweets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const firstFetchDoneRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const alertAudioRef = useRef(null);
  const resolveTimeoutsRef = useRef(new Map());

  const notify = useCallback(
    (message, tone = "info") => {
      if (typeof onToast === "function") {
        onToast(message, tone);
      }
    },
    [onToast]
  );

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
    } catch (error) {
      console.error("Failed to send alert:", error);
    }
  }, []);

  const stopAlertAudio = useCallback(() => {
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
  }, []);

  const ensureAudioElement = useCallback(() => {
    if (!alertAudioRef.current) {
      const audio = new Audio(ALERT_SOUND_SRC);
      audio.loop = true;
      alertAudioRef.current = audio;
    }
    return alertAudioRef.current;
  }, []);

  const playAlertAudio = useCallback(() => {
    if (!soundEnabled) return;
    const audio = ensureAudioElement();
    audio.play().catch(() => setShowSoundPrompt(true));
  }, [ensureAudioElement, soundEnabled]);

  const enableSoundNotifications = useCallback(async () => {
    try {
      const audio = ensureAudioElement();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      setSoundEnabled(true);
      sessionStorage.setItem(SOUND_SESSION_KEY, "true");
      setShowSoundPrompt(false);
      notify("Sound notifications enabled", "success");
    } catch {
      notify("Browser blocked audio. Click again to allow sound.", "error");
      setShowSoundPrompt(true);
    }
  }, [ensureAudioElement, notify]);

  const updateTweet = useCallback(async (id, action) => {
    const response = await fetch("/api/tweets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Status update failed");
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const poll = async () => {
      try {
        const response = await fetch("/api/tweets?includeClosed=1");
        if (!response.ok) {
          throw new Error("Failed to fetch tweets");
        }

        const payload = await response.json();
        const incoming = payload.tweets || [];

        if (!isMounted) return;

        if (!firstFetchDoneRef.current) {
          firstFetchDoneRef.current = true;
          setTweets(incoming);
          incoming.forEach((item) => seenIdsRef.current.add(item.id));
          setLoadingData(false);
          setLoadError("");
          return;
        }

        const newRecords = incoming.filter(
          (item) => !seenIdsRef.current.has(item.id)
        );

        // Replace local list with server state so tweets auto-closed on backend disappear without reload.
        setTweets(incoming);
        incoming.forEach((item) => seenIdsRef.current.add(item.id));

        const newUrgent = newRecords.filter(
          (item) =>
            getUrgencyMeta(item).label === "urgent" &&
            !item.is_resolved &&
            !item.is_closed
        );

        if (newUrgent.length > 0) {
          newUrgent.forEach((tweet) => {
            sendAlert("urgent", tweet);
            notify(`New urgent alert: ${tweet.location}`, "error");
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
  }, [notify, playAlertAudio, sendAlert, user]);

  useEffect(() => {
    const timeoutMap = resolveTimeoutsRef.current;
    return () => {
      stopAlertAudio();
      timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.clear();
    };
  }, [stopAlertAudio]);

  useEffect(() => {
    if (!soundEnabled) return;
    if (hasPendingUrgentAlerts(tweets)) {
      playAlertAudio();
    } else {
      stopAlertAudio();
    }
  }, [playAlertAudio, soundEnabled, stopAlertAudio, tweets]);

  const handleResolve = useCallback(
    async (tweetId) => {
      const tweet = tweets.find((item) => item.id === tweetId);
      setTweets((previous) =>
        previous.map((item) =>
          item.id === tweetId ? { ...item, is_resolved: true } : item
        )
      );

      try {
        await updateTweet(tweetId, "resolve");

        if (tweet) {
          sendAlert("resolved", tweet);
        }

        notify("Alert marked as resolved", "success");

        const timeoutId = setTimeout(async () => {
          let closedTweet = null;
          setTweets((previous) => {
            closedTweet = previous.find((item) => item.id === tweetId) || tweet;
            return previous.filter((item) => item.id !== tweetId);
          });

          try {
            await updateTweet(tweetId, "close");

            if (closedTweet) {
              sendAlert("closed", closedTweet);
            }

            notify("Resolved alert auto-closed after 5 minutes", "info");
          } catch (error) {
            console.error("Auto-close fallback failed:", error);
          }
        }, 5 * 60 * 1000);

        const existing = resolveTimeoutsRef.current.get(tweetId);
        if (existing) {
          clearTimeout(existing);
        }
        resolveTimeoutsRef.current.set(tweetId, timeoutId);
      } catch (error) {
        console.error("Resolve failed:", error);
        notify("Failed to mark alert as resolved", "error");
      }
    },
    [notify, sendAlert, tweets, updateTweet]
  );

  const handleClose = useCallback(
    async (tweetId) => {
      const tweet = tweets.find((item) => item.id === tweetId);
      setTweets((previous) => previous.filter((item) => item.id !== tweetId));

      const timeoutId = resolveTimeoutsRef.current.get(tweetId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        resolveTimeoutsRef.current.delete(tweetId);
      }

      try {
        await updateTweet(tweetId, "close");
        if (tweet) {
          sendAlert("closed", tweet);
        }
      } catch (error) {
        console.error("Close failed:", error);
        notify("Failed to close alert", "error");
      }
    },
    [notify, sendAlert, tweets, updateTweet]
  );

  const handleAcknowledge = useCallback(
    async (tweetId) => {
      setTweets((previous) =>
        previous.map((item) =>
          item.id === tweetId ? { ...item, is_acknowledged: true } : item
        )
      );
      
      try {
        await updateTweet(tweetId, "acknowledge");
        notify("Alert acknowledged", "success");
      } catch (error) {
        console.error("Acknowledge failed:", error);
        notify("Failed to acknowledge alert", "error");
        // Revert the optimistic update
        setTweets((previous) =>
          previous.map((item) =>
            item.id === tweetId ? { ...item, is_acknowledged: false } : item
          )
        );
      }
    },
    [notify, updateTweet]
  );

  const activeTweets = useMemo(
    () => tweets.filter((item) => !item.is_closed),
    [tweets]
  );

  const locations = useMemo(() => {
    const locationSet = new Set(activeTweets.map((item) => item.location).filter(Boolean));
    return Array.from(locationSet).sort();
  }, [activeTweets]);

  const requestTypes = useMemo(() => {
    const requestTypeSet = new Set(
      activeTweets.map((item) => item.request_type).filter(Boolean)
    );
    return Array.from(requestTypeSet).sort();
  }, [activeTweets]);

  const allLocations = useMemo(() => {
    const locationSet = new Set(tweets.map((item) => item.location).filter(Boolean));
    return Array.from(locationSet).sort();
  }, [tweets]);

  const allRequestTypes = useMemo(() => {
    const requestTypeSet = new Set(tweets.map((item) => item.request_type).filter(Boolean));
    return Array.from(requestTypeSet).sort();
  }, [tweets]);

  return {
    loadingData,
    loadError,
    showSoundPrompt,
    setShowSoundPrompt,
    enableSoundNotifications,
    handleResolve,
    handleClose,
    handleAcknowledge,
    allTweets: tweets,
    activeTweets,
    locations,
    requestTypes,
    allLocations,
    allRequestTypes,
  };
}
