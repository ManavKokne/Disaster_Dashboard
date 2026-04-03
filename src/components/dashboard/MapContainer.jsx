"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  OverlayViewF,
  OverlayView,
  InfoWindowF,
} from "@react-google-maps/api";
import { getUrgencyMeta } from "@/lib/urgency";

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

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

function displayOrNA(value) {
  if (value == null || value === "") return "N/A";
  return value;
}

function getUrgencyLabelClasses(label) {
  if (label === "urgent") return "border-red-200 bg-red-50 text-red-700";
  if (label === "semi-urgent") return "border-orange-200 bg-orange-50 text-orange-700";
  if (label === "potentially urgent") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function SeverityMarker({ onClick, color, isBlinking, isResolved }) {
  return (
    <div
      className="cursor-pointer"
      style={{ transform: "translate(-10px, -10px)" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isBlinking && (
          <div
            className="absolute inset-0 rounded-full opacity-40 urgent-ping"
            style={{ backgroundColor: color }}
          />
        )}
        <div
          className={`relative w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg z-10 ${
            isResolved ? "opacity-70" : "opacity-100"
          }`}
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function MapContainer({
  tweets,
  onResolve,
  onClose,
  onAcknowledge,
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

  const filteredTweets = useMemo(
    () => tweets.filter((tweet) => Boolean(tweet.coordinates)),
    [tweets]
  );

  const selectedTweet = useMemo(
    () => (selectedTweetId ? filteredTweets.find((tweet) => tweet.id === selectedTweetId) : null),
    [selectedTweetId, filteredTweets]
  );
  const selectedUrgencyMeta = useMemo(
    () => (selectedTweet ? getUrgencyMeta(selectedTweet) : null),
    [selectedTweet]
  );

  const handleResolve = (tweet) => {
    const confirmed = window.confirm("Are you sure you want to mark this alert as Resolved?");
    if (!confirmed) return;
    onResolve(tweet.id);
    // Keep info window open so user sees it changed to Resolved
  };

  const handleClose = (tweet) => {
    const confirmed = window.confirm("Are you sure you want to Close this alert?");
    if (!confirmed) return;
    onClose(tweet.id);
    setSelectedTweetId(null);
  };

  const hideInfoWindowCloseButton = useCallback(() => {
    requestAnimationFrame(() => {
      const closeButtons = document.querySelectorAll(".gm-style-iw button.gm-ui-hover-effect");
      closeButtons.forEach((button) => {
        button.style.display = "none";
        button.setAttribute("aria-hidden", "true");
        button.setAttribute("tabindex", "-1");
      });
    });
  }, []);

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
        const urgencyMeta = getUrgencyMeta(tweet);
        const isResolved = Boolean(tweet.is_resolved);

        return (
          <OverlayViewF
            key={tweet.id}
            position={tweet.coordinates}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <SeverityMarker
              onClick={() => setSelectedTweetId(tweet.id)}
              color={urgencyMeta.color}
              isBlinking={urgencyMeta.isBlinking && !isResolved && !tweet.is_closed}
              isResolved={isResolved}
            />
          </OverlayViewF>
        );
      })}

      {selectedTweet && selectedTweet.coordinates && (
        <InfoWindowF
          position={selectedTweet.coordinates}
          onCloseClick={() => setSelectedTweetId(null)}
          onDomReady={hideInfoWindowCloseButton}
          options={{ pixelOffset: new window.google.maps.Size(0, -20), maxWidth: 320 }}
        >
          <div style={{ minWidth: 260, maxWidth: 320, overflow: "visible" }}>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                <h4 className="text-sm font-semibold text-slate-800">Incident Alert</h4>
                <p className="text-[11px] text-slate-500">Operator Action Panel</p>
              </div>

              <div className="px-3 py-2.5 space-y-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Full Content
                  </p>
                  <p className="text-sm text-slate-800 font-medium leading-snug whitespace-pre-wrap break-words">
                    {displayOrNA(selectedTweet.content || selectedTweet.tweet)}
                  </p>
                </div>

                <div className="grid grid-cols-[70px_1fr] gap-y-1 text-xs">
                  <span className="font-semibold text-slate-600">ID</span>
                  <span className="text-slate-700">{displayOrNA(selectedTweet.id)}</span>

                  <span className="font-semibold text-slate-600">Location</span>
                  <span className="text-slate-700">{displayOrNA(selectedTweet.location)}</span>

                  <span className="font-semibold text-slate-600">Category</span>
                  <span className="text-slate-700">{displayOrNA(selectedTweet.request_type)}</span>

                  <span className="font-semibold text-slate-600">Urgency</span>
                  <span className="text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${getUrgencyLabelClasses(
                        selectedUrgencyMeta?.label
                      )}`}
                    >
                      {displayOrNA(selectedUrgencyMeta?.label)}
                    </span>
                  </span>

                  <span className="font-semibold text-slate-600">Score</span>
                  <span className="text-slate-700">
                    {Number.isFinite(selectedUrgencyMeta?.score)
                      ? selectedUrgencyMeta.score.toFixed(2)
                      : "N/A"}
                  </span>

                  <span className="font-semibold text-slate-600">Created</span>
                  <span className="text-slate-700">{formatDateTime(selectedTweet.created_at)}</span>

                  <span className="font-semibold text-slate-600">Updated</span>
                  <span className="text-slate-700">{formatDateTime(selectedTweet.updated_at)}</span>

                  <span className="font-semibold text-slate-600">Resolved</span>
                  <span className="text-slate-700">{formatDateTime(selectedTweet.resolved_at)}</span>

                  <span className="font-semibold text-slate-600">Closed</span>
                  <span className="text-slate-700">{formatDateTime(selectedTweet.closed_at)}</span>
                </div>
              </div>

              <div className="px-3 py-2.5 border-t border-slate-200 flex flex-wrap gap-2 rounded-b-lg bg-white">
                {!selectedTweet.is_resolved && (
                  <button
                    onClick={() => handleResolve(selectedTweet)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Resolved
                  </button>
                )}

                {selectedUrgencyMeta?.label === "urgent" && !selectedTweet.is_resolved && !selectedTweet.is_acknowledged && (
                  <button
                    onClick={() => onAcknowledge?.(selectedTweet.id)}
                    className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-md hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}

                <button
                  onClick={() => handleClose(selectedTweet)}
                  className="px-3 py-1.5 bg-slate-600 text-white text-xs rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
