"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  OverlayViewF,
  OverlayView,
  InfoWindowF,
} from "@react-google-maps/api";
import { jitterCoordinates } from "@/lib/coordinate-jitter";

const MAP_CENTER = { lat: 22.5, lng: 82.0 };
const MAP_ZOOM = 5;

// India bounds
const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.7,
  west: 68.7,
  east: 97.4,
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  restriction: {
    latLngBounds: INDIA_BOUNDS,
    strictBounds: false,
  },
  minZoom: 4,
};

function UrgentMarker({ onClick }) {
  return (
    <div
      className="cursor-pointer"
      style={{ transform: "translate(-12px, -12px)" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-40 urgent-ping" />
        <div className="relative w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-lg z-10" />
      </div>
    </div>
  );
}

function NonUrgentMarker({ onClick }) {
  return (
    <div
      className="cursor-pointer"
      style={{ transform: "translate(-7px, -7px)", willChange: "auto" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="w-[14px] h-[14px] rounded-full border-2 border-white" style={{ background: "#3b82f6", boxShadow: "0 0 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function ResolvedMarker({ onClick }) {
  return (
    <div
      className="cursor-pointer"
      style={{ transform: "translate(-7px, -7px)", willChange: "auto" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="w-[14px] h-[14px] rounded-full border-2 border-white" style={{ background: "#22c55e", boxShadow: "0 0 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

export default function MapContainer({
  tweets,
  onResolve,
  onClose,
  filterLocation,
  filterMarker = "all",
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selectedTweetId, setSelectedTweetId] = useState(null);
  const mapRef = useRef(null);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Filter tweets for map display
  const filteredTweets = useMemo(() => {
    const filtered = tweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterMarker !== "all" && t.urgency.toLowerCase() !== filterMarker.toLowerCase()) return false;
      return true;
    });
    return jitterCoordinates(filtered);
  }, [tweets, filterLocation, filterMarker]);

  // Derive selectedTweet from the live tweets array so it stays in sync after resolve
  const selectedTweet = useMemo(
    () => (selectedTweetId ? filteredTweets.find((t) => t.id === selectedTweetId) : null),
    [selectedTweetId, filteredTweets]
  );

  const handleResolve = (tweet) => {
    onResolve(tweet.id);
    // Keep info window open so user sees it changed to Resolved
  };

  const handleClose = (tweet) => {
    onClose(tweet.id);
    setSelectedTweetId(null);
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
        <div className="text-slate-400 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={() => setSelectedTweetId(null)}
    >
      {filteredTweets.map((tweet) => {
        const urgencyLower = tweet.urgency.toLowerCase();
        const isUrgent = urgencyLower === "urgent";
        const isResolved = urgencyLower === "resolved";
        return (
          <OverlayViewF
            key={tweet.id}
            position={tweet.coordinates}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            {isResolved ? (
              <ResolvedMarker onClick={() => setSelectedTweetId(tweet.id)} />
            ) : isUrgent ? (
              <UrgentMarker onClick={() => setSelectedTweetId(tweet.id)} />
            ) : (
              <NonUrgentMarker onClick={() => setSelectedTweetId(tweet.id)} />
            )}
          </OverlayViewF>
        );
      })}

      {selectedTweet && selectedTweet.coordinates && (
        <InfoWindowF
          position={selectedTweet.coordinates}
          onCloseClick={() => setSelectedTweetId(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -20), maxWidth: 360 }}
        >
          <div style={{ minWidth: 260, maxWidth: 330, overflow: "visible", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            {/* Urgency badge header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  color: "#fff",
                  background:
                    selectedTweet.urgency.toLowerCase() === "urgent"
                      ? "#dc2626"
                      : selectedTweet.urgency.toLowerCase() === "resolved"
                      ? "#16a34a"
                      : "#2563eb",
                }}
              >
                <span style={{ fontSize: 10 }}>
                  {selectedTweet.urgency.toLowerCase() === "urgent"
                    ? "\u26A0"
                    : selectedTweet.urgency.toLowerCase() === "resolved"
                    ? "\u2714"
                    : "\u25CF"}
                </span>
                {selectedTweet.urgency}
              </span>
            </div>

            {/* Tweet text */}
            <p style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", lineHeight: 1.5, margin: "0 0 12px 0" }}>
              {selectedTweet.tweet}
            </p>

            {/* Meta grid */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12, color: "#475569", marginBottom: 14 }}>
              <span style={{ fontWeight: 600, color: "#64748b" }}>Location</span>
              <span>{selectedTweet.location}</span>
              <span style={{ fontWeight: 600, color: "#64748b" }}>Category</span>
              <span>{selectedTweet.request_type}</span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#e2e8f0", margin: "0 0 12px 0" }} />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {selectedTweet.urgency.toLowerCase() === "urgent" && (
                <button
                  onClick={() => handleResolve(selectedTweet)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 14px",
                    background: "#16a34a",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#15803d")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#16a34a")}
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => handleClose(selectedTweet)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 14px",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              >
                Close
              </button>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
