"use client";

import { useId, useMemo } from "react";

interface PriceChartProps {
  id: string;
  className?: string;
  locale?: "fa" | "en";
  height?: number;
  /** Current real price (formatted) — used only to scale the display curve. */
  basePrice?: string | null;
  /** Changes every minute → the draw animation replays (live feel). */
  animKey?: number;
}

const W = 120;
const H = 40;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toNumLocalized(s: string): number | null {
  const latin = s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  const n = parseFloat(latin.replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic smooth display series around the asset's current price. */
function genSeries(id: string, base: number): number[] {
  const rand = mulberry32(hashSeed(id) ^ 0x9e3779b9);
  const trend = rand() - 0.5;
  const n = 48;
  const amp = base * 0.012;
  const pts: number[] = [];
  let v = base * (0.996 + rand() * 0.008);
  for (let i = 0; i < n; i++) {
    v += (trend * base) / n + (rand() - 0.5) * amp;
    pts.push(Math.max(base * 0.9, v));
  }
  return pts;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Display-only animated chart (per user request — no real history API).
 * Renders a smooth deterministic curve around the asset's current price:
 * the line draws itself on, the area fades in, and the end point pulses.
 * The animation replays every minute via `animKey`.
 */
export default function PriceChart({
  id,
  className = "",
  locale = "fa",
  height = 32,
  basePrice = null,
  animKey = 0,
}: PriceChartProps) {
  const gradId = useId().replace(/[^a-zA-Z0-9]/g, "") + "-g";

  const series = useMemo(() => {
    const base = basePrice ? toNumLocalized(basePrice) : null;
    return genSeries(id, base ?? 100);
  }, [id, basePrice]);

  const isUp = series[series.length - 1] >= series[0];
  const colorVar = isUp ? "var(--up)" : "var(--down)";

  const min = Math.min(...series);
  const max = Math.max(...series);
  const pad = 3;
  const pts = series.map((v, i) => ({
    x: (i / (series.length - 1)) * W,
    y: H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2),
  }));
  const lineD = smoothPath(pts);
  const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(2)} ${H} L ${pts[0].x.toFixed(2)} ${H} Z`;
  const last = pts[pts.length - 1];
  const showDetail = height >= 150;

  return (
    <div
      className={className}
      style={{ height, width: "100%", position: "relative" }}
      role="img"
      aria-label={locale === "fa" ? `نمودار ${id}` : `${id} chart`}
    >
      <svg
        key={animKey}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: colorVar, stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: colorVar, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {showDetail &&
          [0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={H * f}
              y2={H * f}
              stroke="var(--border)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        <path d={areaD} fill={`url(#${gradId})`} className="chart-area" />
        <path
          d={lineD}
          fill="none"
          stroke={colorVar}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          pathLength={1}
          className="chart-line"
        />
        <circle cx={last.x} cy={last.y} r={2.2} fill={colorVar} className="chart-end-dot" />
        <circle
          cx={last.x}
          cy={last.y}
          r={5}
          fill="none"
          stroke={colorVar}
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
          className="chart-end-halo"
        />
      </svg>
    </div>
  );
}
