"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import MapContainer from "@/components/dashboard/MapContainer";
import MapFilters from "@/components/dashboard/MapFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import useDashboardAlerts from "@/hooks/useDashboardAlerts";

export default function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [filterLocation, setFilterLocation] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);
  const {
    loadingData,
    loadError,
    showSoundPrompt,
    setShowSoundPrompt,
    enableSoundNotifications,
    handleResolve,
    handleClose,
    handleAcknowledge,
    activeTweets,
    locations,
  } = useDashboardAlerts({ user });

  const mapTweets = useMemo(() => {
    return activeTweets.filter((t) => {
      if (!t.coordinates) return false;
      if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
      if (filterUrgentOnly && ((t.urgency || "").toLowerCase() !== "urgent" || t.is_resolved)) return false;
      return true;
    });
  }, [activeTweets, filterLocation, filterUrgentOnly]);

  const urgentCount = mapTweets.filter((t) => (t.urgency || "").toLowerCase() === "urgent" && !t.is_resolved).length;
  const nonUrgentCount = mapTweets.filter((t) => (t.urgency || "").toLowerCase() === "non-urgent" && !t.is_resolved).length;
  const resolvedCount = mapTweets.filter((t) => t.is_resolved).length;

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

      <div className="flex-1 flex p-3 gap-3 overflow-hidden">
        {/* Full Map */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
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
          </CardContent>
        </Card>

        {/* Sidebar Filters */}
        <Card className="w-[200px] flex-shrink-0 overflow-y-auto hidden lg:block">
          <CardContent className="p-0">
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
    </div>
  );
}
