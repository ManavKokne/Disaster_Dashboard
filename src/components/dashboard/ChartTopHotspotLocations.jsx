"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getUrgencyMeta } from "@/lib/urgency";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ChartTopHotspotLocations({ tweets }) {
  const chartData = useMemo(() => {
    const grouped = {};

    tweets.forEach((tweet) => {
      const location = (tweet.location || "Unknown").trim() || "Unknown";

      if (!grouped[location]) {
        grouped[location] = {
          active: 0,
          urgentActive: 0,
        };
      }

      const isActive = !tweet.is_closed;
      const isUrgentActive =
        isActive && !tweet.is_resolved && getUrgencyMeta(tweet).label === "urgent";

      if (isActive) grouped[location].active += 1;
      if (isUrgentActive) grouped[location].urgentActive += 1;
    });

    const rows = Object.entries(grouped)
      .map(([location, counts]) => ({ location, ...counts }))
      .filter((row) => row.active > 0)
      .sort((a, b) => {
        if (b.active !== a.active) return b.active - a.active;
        return b.urgentActive - a.urgentActive;
      })
      .slice(0, 10);

    return {
      labels: rows.map((row) => row.location),
      datasets: [
        {
          label: "Active Alerts",
          data: rows.map((row) => row.active),
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Urgent Active",
          data: rows.map((row) => row.urgentActive),
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [tweets]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          font: { size: 11 },
          color: "#64748b",
          padding: 10,
        },
      },
      title: {
        display: true,
        text: "Top Hotspot Locations",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          precision: 0,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      {chartData.labels.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
          No hotspot location data available
        </div>
      )}
    </div>
  );
}
