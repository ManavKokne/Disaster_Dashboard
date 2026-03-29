"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ChartAlertTimeline({ tweets, mode = "cumulative" }) {
  const chartData = useMemo(() => {
    if (!tweets.length) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const timestampedTweets = tweets
      .filter((t) => Boolean(t.created_at))
      .map((t) => ({ ...t, parsedTime: new Date(t.created_at) }))
      .filter((t) => !Number.isNaN(t.parsedTime.getTime()));

    if (timestampedTweets.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    if (mode === "24h") {
      const now = new Date();
      const hourlyBuckets = [];

      for (let i = 23; i >= 0; i -= 1) {
        const bucketTime = new Date(now.getTime() - i * 60 * 60 * 1000);
        bucketTime.setMinutes(0, 0, 0);
        hourlyBuckets.push(bucketTime);
      }

      const counts = new Array(24).fill(0);
      const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      timestampedTweets.forEach((t) => {
        if (t.parsedTime < windowStart || t.parsedTime > now) return;
        const hoursAgo = Math.floor((now.getTime() - t.parsedTime.getTime()) / (60 * 60 * 1000));
        const index = 23 - hoursAgo;
        if (index >= 0 && index < 24) {
          counts[index] += 1;
        }
      });

      const labels = hourlyBuckets.map((bucket) =>
        bucket.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );

      return {
        labels,
        datasets: [
          {
            label: "Alerts Per Hour",
            data: counts,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#fff",
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
          },
        ],
      };
    }

    const sortedTweets = [...timestampedTweets].sort(
      (a, b) => a.parsedTime - b.parsedTime
    );

    const dateMap = new Map();
    sortedTweets.forEach((t) => {
      const date = t.parsedTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    const labels = Array.from(dateMap.keys());
    const cumulative = [];
    let total = 0;
    labels.forEach((label) => {
      total += dateMap.get(label) || 0;
      cumulative.push(total);
    });

    return {
      labels,
      datasets: [
        {
          label: "Cumulative Alerts",
          data: cumulative,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [mode, tweets]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          font: { size: 12 },
          color: "#64748b",
          padding: 12,
        },
      },
      title: {
        display: true,
        text:
          mode === "24h"
            ? "Alert Timeline (Last 24 Hours)"
            : "Alert Timeline (Cumulative)",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { top: 8, bottom: 12 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        cornerRadius: 6,
        padding: 10,
        callbacks: {
          label: (ctx) =>
            mode === "24h"
              ? `Hourly alerts: ${ctx.parsed.y}`
              : `Total: ${ctx.parsed.y} alerts`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          precision: 0,
          stepSize: 1,
          callback: (value) => {
            const numeric = Number(value);
            return Number.isInteger(numeric) ? numeric : "";
          },
        },
        title: {
          display: true,
          text: mode === "24h" ? "Alerts / Hour" : "Cumulative Count",
          color: "#64748b",
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      {chartData.labels.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          No timeline data available
        </div>
      )}
    </div>
  );
}
