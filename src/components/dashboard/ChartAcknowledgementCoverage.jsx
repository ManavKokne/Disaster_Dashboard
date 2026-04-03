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

export default function ChartAcknowledgementCoverage({ tweets }) {
  const chartData = useMemo(() => {
    const grouped = URGENCY_LEVELS.reduce((accumulator, level) => {
      accumulator[level] = {
        acknowledged: 0,
        unacknowledged: 0,
      };
      return accumulator;
    }, {});

    tweets.forEach((tweet) => {
      if (tweet.is_closed || tweet.is_resolved) return;

      const { label } = getUrgencyMeta(tweet);
      const key = tweet.is_acknowledged ? "acknowledged" : "unacknowledged";
      grouped[label][key] += 1;
    });

    return {
      labels: URGENCY_LEVELS,
      datasets: [
        {
          label: "Acknowledged",
          data: URGENCY_LEVELS.map((level) => grouped[level].acknowledged),
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          borderRadius: 4,
          stack: "coverage",
        },
        {
          label: "Unacknowledged",
          data: URGENCY_LEVELS.map((level) => grouped[level].unacknowledged),
          backgroundColor: URGENCY_LEVELS.map((level) => `${URGENCY_COLORS[level]}bb`),
          borderColor: URGENCY_LEVELS.map((level) => URGENCY_COLORS[level]),
          borderWidth: 1,
          borderRadius: 4,
          stack: "coverage",
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
        text: "Acknowledgement Coverage by Urgency",
        font: { size: 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          maxRotation: 25,
          minRotation: 0,
        },
      },
      y: {
        stacked: true,
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
