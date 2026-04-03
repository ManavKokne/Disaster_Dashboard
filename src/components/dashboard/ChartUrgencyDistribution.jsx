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

export default function ChartUrgencyDistribution({ tweets }) {
  const chartData = useMemo(() => {
    const requestTypeMap = {};

    tweets.forEach((t) => {
      const type = t.request_type || "Unknown";
      const urgencyLabel = getUrgencyMeta(t).label;

      if (!requestTypeMap[type]) {
        requestTypeMap[type] = URGENCY_LEVELS.reduce((accumulator, level) => {
          accumulator[level] = 0;
          return accumulator;
        }, {});
      }

      requestTypeMap[type][urgencyLabel] = (requestTypeMap[type][urgencyLabel] || 0) + 1;
    });

    const labels = Object.keys(requestTypeMap).sort();

    return {
      labels,
      datasets: URGENCY_LEVELS.map((level) => ({
        label: level,
        data: labels.map((requestType) => requestTypeMap[requestType][level] || 0),
        backgroundColor: `${URGENCY_COLORS[level]}cc`,
        borderColor: URGENCY_COLORS[level],
        borderWidth: 1,
        borderRadius: 4,
      })),
    };
  }, [tweets]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    scales: {
      x: {
        stacked: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          beginAtZero: true,
          stepSize: 1,
        },
        title: {
          display: true,
          text: "Number of Alerts",
          color: "#64748b",
          font: { size: 12 },
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
        },
      },
    },
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
        text: "Urgency Label Distribution by Request Type",
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
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x}`,
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
