"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  OverlayViewF,
  OverlayView,
  InfoWindowF,
} from "@react-google-maps/api";

const MAP_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAP_ZOOM = 5;

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
  filterUrgentOnly,
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
  const filteredTweets = tweets.filter((t) => {
    if (!t.coordinates) return false;
    if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
    if (filterUrgentOnly && t.urgency.toLowerCase() !== "urgent") return false;
    return true;
  });

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
          options={{ pixelOffset: new window.google.maps.Size(0, -20), maxWidth: 320 }}
        >
          <div className="p-2" style={{ minWidth: 240, maxWidth: 300, overflow: "visible" }}>
            <p className="text-sm text-slate-800 font-medium mb-2 leading-snug">
              {selectedTweet.tweet}
            </p>
            <div className="space-y-1 text-xs text-slate-600 mb-3">
              <p>
                <span className="font-semibold">Location:</span>{" "}
                {selectedTweet.location}
              </p>
              <p>
                <span className="font-semibold">Category:</span>{" "}
                {selectedTweet.request_type}
              </p>
              <p>
                <span className="font-semibold">Urgency:</span>{" "}
                <span
                  className={
                    selectedTweet.urgency.toLowerCase() === "urgent"
                      ? "text-red-600 font-bold"
                      : selectedTweet.urgency.toLowerCase() === "resolved"
                      ? "text-green-600 font-bold"
                      : "text-blue-600"
                  }
                >
                  {selectedTweet.urgency}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {selectedTweet.urgency.toLowerCase() === "urgent" && (
                <button
                  onClick={() => handleResolve(selectedTweet)}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors cursor-pointer"
                >
                  ✓ Resolved
                </button>
              )}
              <button
                onClick={() => handleClose(selectedTweet)}
                className="px-3 py-1.5 bg-slate-600 text-white text-xs rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
