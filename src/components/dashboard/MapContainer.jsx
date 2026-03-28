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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full border-2 border-white"
        style={{ background: "#3b82f6", boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}
      />
    </div>
  );
}

function ResolvedMarker({ onClick }) {
  return (
    <div
      className="cursor-pointer"
      style={{ transform: "translate(-7px, -7px)", willChange: "auto" }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full border-2 border-white"
        style={{ background: "#22c55e", boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}
      />
    </div>
  );
}

function getMarkerType(tweet) {
  if (tweet?.is_resolved) return "resolved";
  return (tweet?.urgency || "").toLowerCase();
}

export default function MapContainer({
  tweets,
  onResolve,
  onClose,
  onAcknowledge,
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

  const filteredTweets = useMemo(() => {
    const filtered = tweets.filter((tweet) => {
      if (!tweet.coordinates) return false;
      if (
        filterLocation &&
        (tweet.location || "").toLowerCase() !== filterLocation.toLowerCase()
      ) {
        return false;
      }
      if (filterMarker !== "all" && getMarkerType(tweet) !== filterMarker) {
        return false;
      }
      return true;
    });

    return jitterCoordinates(filtered);
  }, [tweets, filterLocation, filterMarker]);

  const selectedTweet = useMemo(
    () =>
      selectedTweetId
        ? filteredTweets.find((tweet) => tweet.id === selectedTweetId)
        : null,
    [filteredTweets, selectedTweetId]
  );

  const hideInfoWindowCloseButton = useCallback(() => {
    requestAnimationFrame(() => {
      const closeButtons = document.querySelectorAll(
        ".gm-style-iw button.gm-ui-hover-effect"
      );
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
        const markerType = getMarkerType(tweet);
        return (
          <OverlayViewF
            key={tweet.id}
            position={tweet.coordinates}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            {markerType === "resolved" ? (
              <ResolvedMarker onClick={() => setSelectedTweetId(tweet.id)} />
            ) : markerType === "urgent" ? (
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
          onDomReady={hideInfoWindowCloseButton}
          options={{
            pixelOffset: new window.google.maps.Size(0, -20),
            maxWidth: 360,
          }}
        >
          <div style={{ minWidth: 260, maxWidth: 320, overflow: "visible" }}>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                <h4 className="text-sm font-semibold text-slate-800">Incident Alert</h4>
                <p className="text-[11px] text-slate-500">Operator Action Panel</p>
              </div>

              <div className="px-3 py-2.5 space-y-2">
                <p className="text-sm text-slate-800 font-medium leading-snug">
                  {selectedTweet.tweet || selectedTweet.content}
                </p>

                <div className="grid grid-cols-[70px_1fr] gap-y-1 text-xs">
                  <span className="font-semibold text-slate-600">Location</span>
                  <span className="text-slate-700">{selectedTweet.location}</span>

                  <span className="font-semibold text-slate-600">Category</span>
                  <span className="text-slate-700">
                    {selectedTweet.request_type || "N/A"}
                  </span>

                  <span className="font-semibold text-slate-600">Urgency</span>
                  <span
                    className={
                      getMarkerType(selectedTweet) === "urgent"
                        ? "text-red-600 font-semibold"
                        : getMarkerType(selectedTweet) === "resolved"
                        ? "text-green-600 font-semibold"
                        : "text-blue-600 font-semibold"
                    }
                  >
                    {getMarkerType(selectedTweet) === "resolved"
                      ? "resolved"
                      : selectedTweet.urgency}
                  </span>
                </div>
              </div>

              <div className="px-3 py-2.5 border-t border-slate-200 flex flex-wrap gap-2 rounded-b-lg bg-white">
                {getMarkerType(selectedTweet) !== "resolved" && (
                  <button
                    onClick={() => onResolve?.(selectedTweet.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Resolved
                  </button>
                )}

                {getMarkerType(selectedTweet) === "urgent" &&
                  !selectedTweet.is_acknowledged && (
                    <button
                      onClick={() => onAcknowledge?.(selectedTweet.id)}
                      className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-md hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  )}

                <button
                  onClick={() => {
                    onClose?.(selectedTweet.id);
                    setSelectedTweetId(null);
                  }}
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
