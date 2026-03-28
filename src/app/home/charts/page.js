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
        const response = await fetch("/api/tweets");
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-lg font-bold text-slate-800">Analytics Dashboard</h1>
          <div className="flex items-center gap-3">
            <Select
              value={timelineMode}
              onChange={(e) => setTimelineMode(e.target.value)}
              className="w-52 h-8 text-xs"
            >
              <option value="cumulative">Timeline: Cumulative</option>
              <option value="24h">Timeline: Last 24 Hours</option>
            </Select>
            {tweets.length > 0 && (
              <span className="text-xs text-slate-500">
                {tweets.filter((t) => !t.is_closed).length} of {tweets.length} active alerts
              </span>
            )}
          </div>
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
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
            {/* Request Type Chart */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 h-full">
                <div className="w-full h-full relative" style={{ minHeight: "400px" }}>
                  <ChartRequestType tweets={tweets} />
                </div>
              </CardContent>
            </Card>

            {/* Alert Timeline Chart */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 h-full">
                <div className="w-full h-full relative" style={{ minHeight: "400px" }}>
                  <ChartAlertTimeline tweets={tweets} mode={timelineMode} />
                </div>
              </CardContent>
            </Card>

            {/* Alert Status Chart */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 h-full">
                <div className="w-full h-full relative" style={{ minHeight: "400px" }}>
                  <ChartAlertStatus tweets={tweets} />
                </div>
              </CardContent>
            </Card>

            {/* Urgency Distribution Chart */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 h-full">
                <div className="w-full h-full relative" style={{ minHeight: "400px" }}>
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
