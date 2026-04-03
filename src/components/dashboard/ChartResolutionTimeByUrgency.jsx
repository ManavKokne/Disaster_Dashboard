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
import { getUrgencyMeta, URGENCY_COLORS, URGENCY_LEVELS } from "@/lib/urgency";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getDurationHours(start, end) {
  const startMs = new Date(start || "").getTime();
  const endMs = new Date(end || "").getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }

  return (endMs - startMs) / (1000 * 60 * 60);
}

function toMedian(values) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export default function ChartResolutionTimeByUrgency({ tweets }) {
  const chartData = useMemo(() => {
    const grouped = URGENCY_LEVELS.reduce((accumulator, level) => {
      accumulator[level] = [];
      return accumulator;
    }, {});

    tweets.forEach((tweet) => {
      if (!tweet.is_resolved) return;

      const durationHours = getDurationHours(tweet.created_at, tweet.resolved_at);
      if (!Number.isFinite(durationHours)) return;

      const { label } = getUrgencyMeta(tweet);
      grouped[label].push(durationHours);
    });

    const avgValues = URGENCY_LEVELS.map((level) => {
      const entries = grouped[level];
      if (!entries.length) return 0;
      return entries.reduce((sum, value) => sum + value, 0) / entries.length;
    });

    const medianValues = URGENCY_LEVELS.map((level) => toMedian(grouped[level]));

    return {
      labels: URGENCY_LEVELS,
      datasets: [
        {
          label: "Avg Hours",
          data: avgValues,
          backgroundColor: URGENCY_LEVELS.map((level) => `${URGENCY_COLORS[level]}cc`),
          borderColor: URGENCY_LEVELS.map((level) => URGENCY_COLORS[level]),
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Median Hours",
          data: medianValues,
          backgroundColor: "rgba(30, 41, 59, 0.35)",
          borderColor: "rgba(30, 41, 59, 0.95)",
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
        text: "Resolution Time by Urgency",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toFixed(2)}h`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          maxRotation: 25,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value) => `${value}h`,
        },
        title: {
          display: true,
          text: "Hours",
          color: "#64748b",
          font: { size: 12 },
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
