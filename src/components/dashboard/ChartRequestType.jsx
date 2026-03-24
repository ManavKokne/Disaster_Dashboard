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

const COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(34, 197, 94, 0.8)",
  "rgba(234, 179, 8, 0.8)",
  "rgba(168, 85, 247, 0.8)",
  "rgba(249, 115, 22, 0.8)",
  "rgba(20, 184, 166, 0.8)",
];

const BORDER_COLORS = [
  "rgba(59, 130, 246, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(34, 197, 94, 1)",
  "rgba(234, 179, 8, 1)",
  "rgba(168, 85, 247, 1)",
  "rgba(249, 115, 22, 1)",
  "rgba(20, 184, 166, 1)",
];

export default function ChartRequestType({ tweets }) {
  const chartData = useMemo(() => {
    const countMap = {};
    tweets.forEach((t) => {
      const type = t.request_type || "Unknown";
      countMap[type] = (countMap[type] || 0) + 1;
    });

    const labels = Object.keys(countMap).sort();
    const data = labels.map((l) => countMap[l]);

    return {
      labels,
      datasets: [
        {
          label: "Alert Count",
          data,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: labels.map((_, i) => BORDER_COLORS[i % BORDER_COLORS.length]),
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
        text: "Alerts by Request Type",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 12 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        cornerRadius: 6,
        padding: 10,
        callbacks: {
          label: (ctx) => `Count: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          beginAtZero: true,
        },
        title: {
          display: true,
          text: "Number of Alerts",
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
