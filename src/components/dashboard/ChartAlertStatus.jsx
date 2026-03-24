"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ChartAlertStatus({ tweets }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const chartData = useMemo(() => {
    let active = 0;
    let resolved = 0;
    let closed = 0;
    let acknowledged = 0;

    tweets.forEach((t) => {
      if (t.is_closed) {
        closed++;
      } else if (t.is_resolved) {
        resolved++;
      } else if (t.is_acknowledged) {
        acknowledged++;
      } else {
        active++;
      }
    });

    return {
      labels: ["Active", "Acknowledged", "Resolved", "Closed"],
      datasets: [
        {
          data: [active, acknowledged, resolved, closed],
          backgroundColor: [
            "rgba(239, 68, 68, 0.8)",
            "rgba(234, 179, 8, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(100, 116, 139, 0.8)",
          ],
          borderColor: [
            "rgba(239, 68, 68, 1)",
            "rgba(234, 179, 8, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(100, 116, 139, 1)",
          ],
          borderWidth: 2,
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
        position: isMobile ? "bottom" : "right",
        labels: {
          font: { size: isMobile ? 11 : 12, weight: "500" },
          color: "#64748b",
          padding: isMobile ? 10 : 15,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: isMobile ? 10 : 12,
        },
      },
      title: {
        display: true,
        text: "Alert Status Distribution",
        font: { size: isMobile ? 13 : 14, weight: "600" },
        color: "#1e293b",
        padding: { bottom: 12 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 11 },
        bodyFont: { size: 10 },
        cornerRadius: 6,
        padding: 8,
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const value = ctx.parsed || 0;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Pie data={chartData} options={options} />
    </div>
  );
}
