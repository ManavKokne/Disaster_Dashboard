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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getDurationHours(start, end) {
  const startMs = new Date(start || "").getTime();
  const endMs = new Date(end || "").getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }

  return (endMs - startMs) / (1000 * 60 * 60);
}

export default function ChartClosureTimeByRequestType({ tweets }) {
  const chartData = useMemo(() => {
    const grouped = {};

    tweets.forEach((tweet) => {
      if (!tweet.is_closed) return;

      const durationHours = getDurationHours(tweet.created_at, tweet.closed_at);
      if (!Number.isFinite(durationHours)) return;

      const type = tweet.request_type || "Unknown";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(durationHours);
    });

    const rows = Object.entries(grouped)
      .map(([type, values]) => {
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return { type, average };
      })
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    return {
      labels: rows.map((row) => row.type),
      datasets: [
        {
          label: "Avg Closure Hours",
          data: rows.map((row) => row.average),
          backgroundColor: "rgba(14, 116, 144, 0.75)",
          borderColor: "rgba(14, 116, 144, 1)",
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
        display: false,
      },
      title: {
        display: true,
        text: "Closure Time by Request Type",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        callbacks: {
          label: (ctx) => `Avg: ${Number(ctx.parsed.x || 0).toFixed(2)}h`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value) => `${value}h`,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
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
          No closure timing data available
        </div>
      )}
    </div>
  );
}
