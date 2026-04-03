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

function getCreatedAtMs(tweet) {
  const raw = tweet.created_at || tweet.updated_at || tweet.timestamp;
  const parsed = new Date(raw || "").getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ChartAlertAgingBuckets({ tweets }) {
  const chartData = useMemo(() => {
    const now = Date.now();
    const buckets = {
      "0-1h": 0,
      "1-6h": 0,
      "6-24h": 0,
      "24h+": 0,
    };

    tweets.forEach((tweet) => {
      if (tweet.is_closed || tweet.is_resolved) return;

      const createdAtMs = getCreatedAtMs(tweet);
      if (!Number.isFinite(createdAtMs)) return;

      const ageHours = (now - createdAtMs) / (1000 * 60 * 60);

      if (ageHours < 1) {
        buckets["0-1h"] += 1;
      } else if (ageHours < 6) {
        buckets["1-6h"] += 1;
      } else if (ageHours < 24) {
        buckets["6-24h"] += 1;
      } else {
        buckets["24h+"] += 1;
      }
    });

    const labels = Object.keys(buckets);

    return {
      labels,
      datasets: [
        {
          label: "Active Alerts",
          data: labels.map((label) => buckets[label]),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(234, 179, 8, 0.8)",
            "rgba(249, 115, 22, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
            "rgba(234, 179, 8, 1)",
            "rgba(249, 115, 22, 1)",
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [tweets]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Active Alert Aging Buckets",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        callbacks: {
          label: (ctx) => `Alerts: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
