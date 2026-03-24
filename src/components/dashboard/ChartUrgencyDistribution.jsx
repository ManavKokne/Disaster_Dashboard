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

export default function ChartUrgencyDistribution({ tweets }) {
  const chartData = useMemo(() => {
    // Group by request type and urgency
    const requestTypeMap = {};

    tweets.forEach((t) => {
      const type = t.request_type || "Unknown";
      const urgency = (t.urgency || "non-urgent").toLowerCase();

      if (!requestTypeMap[type]) {
        requestTypeMap[type] = { urgent: 0, "non-urgent": 0 };
      }

      if (urgency === "urgent") {
        requestTypeMap[type].urgent++;
      } else {
        requestTypeMap[type]["non-urgent"]++;
      }
    });

    const labels = Object.keys(requestTypeMap).sort();

    return {
      labels,
      datasets: [
        {
          label: "Urgent",
          data: labels.map((l) => requestTypeMap[l].urgent),
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Non-Urgent",
          data: labels.map((l) => requestTypeMap[l]["non-urgent"]),
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
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
          font: { size: 12 },
          color: "#64748b",
          padding: 15,
        },
      },
      title: {
        display: true,
        text: "Urgency Level by Request Type",
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
    scales: {
      x: {
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
      <Bar data={chartData} options={options} />
    </div>
  );
}
