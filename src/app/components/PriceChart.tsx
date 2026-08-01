"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

interface PriceHistoryItem {
  timestamp: string;
  price: number;
}

interface PriceChartProps {
  id: string;
  hours?: number;
  className?: string;
}

export default function PriceChart({ id, hours = 24, className = "" }: PriceChartProps) {
  const [data, setData] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/history?id=${id}&hours=${hours}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            if (mounted) setData(json.data);
          }
        }
      } catch (e) {
        console.error("History fetch error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchHistory();
    return () => { mounted = false; };
  }, [id, hours]);

  if (loading || data.length < 2) {
    return (
      <div className={className} style={{ height: 60, width: "100%" }} aria-hidden="true" />
    );
  }

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)";
  const fillColor = isUp ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";

  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })),
    datasets: [
      {
        data: prices,
        borderColor: color,
        backgroundColor: fillColor,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        borderColor: "rgba(75, 85, 99, 0.5)",
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y.toLocaleString("fa-IR")} ریال`;
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    elements: {
      point: { radius: 0 },
    },
  };

  return (
    <div className={className} style={{ height: 60, width: "100%" }} aria-label={`نمودار تغییرات قیمت ${id} در ${hours} ساعت گذشته`}>
      <Line data={chartData} options={options} />
    </div>
  );
}