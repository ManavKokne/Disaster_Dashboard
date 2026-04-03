"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/dashboard/Navbar";
import ChartRequestType from "@/components/dashboard/ChartRequestType";
import ChartAlertTimeline from "@/components/dashboard/ChartAlertTimeline";
import ChartAlertStatus from "@/components/dashboard/ChartAlertStatus";
import ChartUrgencyDistribution from "@/components/dashboard/ChartUrgencyDistribution";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getUrgencyMeta } from "@/lib/urgency";

export default function ChartsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timelineMode, setTimelineMode] = useState("cumulative");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/tweets?includeClosed=1");
        if (!response.ok) {
          throw new Error("Failed to fetch tweets");
        }
        const data = await response.json();
        setTweets(data.tweets || []);
        setError("");
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load chart data");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  const activeCount = tweets.filter((t) => !t.is_closed).length;
  const urgentActiveCount = tweets.filter(
    (tweet) => getUrgencyMeta(tweet).label === "urgent" && !tweet.is_closed && !tweet.is_resolved
  ).length;
  const resolvedCount = tweets.filter((t) => t.is_resolved && !t.is_closed).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Analytics Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Live operational intelligence for alerts, urgency, and response trends
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-w-24">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Alerts</p>
                <p className="text-sm font-semibold text-slate-800">{tweets.length}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 min-w-24">
                <p className="text-[10px] uppercase tracking-wide text-red-500">Urgent Active</p>
                <p className="text-sm font-semibold text-red-700">{urgentActiveCount}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 min-w-24">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600">Resolved</p>
                <p className="text-sm font-semibold text-emerald-700">{resolvedCount}</p>
              </div>
            </div>
          </div>

          {tweets.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-2">
              {activeCount} of {tweets.length} alerts are currently active
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
            {error}
          </div>
        ) : tweets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            No data available
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="w-full relative h-80 md:h-87.5 xl:h-90">
                  <ChartRequestType tweets={tweets} />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="w-full relative h-80 md:h-87.5 xl:h-90">
                  <div className="absolute top-1 right-1 z-20">
                    <Select
                      value={timelineMode}
                      onChange={(e) => setTimelineMode(e.target.value)}
                      className="w-44 sm:w-52 h-8 text-xs bg-white/95 border-slate-300 shadow-sm"
                    >
                      <option value="cumulative">Timeline: Cumulative</option>
                      <option value="24h">Timeline: Last 24 Hours</option>
                    </Select>
                  </div>
                  <ChartAlertTimeline tweets={tweets} mode={timelineMode} />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="w-full relative h-80 md:h-87.5 xl:h-90">
                  <ChartAlertStatus tweets={tweets} />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4 h-full">
                <div className="w-full relative h-80 md:h-87.5 xl:h-90">
                  <ChartUrgencyDistribution tweets={tweets} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
