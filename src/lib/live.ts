import type { PriceHistoryItem } from "./prices";

// One point per minute per asset, keep 24h of live samples in memory.
const MAX_POINTS = 60 * 24;

const buffer = new Map<string, PriceHistoryItem[]>();

const FA = "۰۱۲۳۴۵۶۷۸۹";

export function recordLivePrices(items: { id: string; price: string }[]): void {
  const now = Date.now();
  for (const item of items) {
    // Prices arrive formatted with Persian digits — normalize before parsing.
    const latin = String(item.price).replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)));
    const num = parseFloat(latin.replace(/[^\d.-]/g, ""));
    if (isNaN(num) || num <= 0) continue;
    const series = buffer.get(item.id) ?? [];
    const last = series[series.length - 1];
    const lastTime = last ? new Date(last.timestamp).getTime() : 0;
    // Skip when nothing changed within the same minute; otherwise append
    // (a heartbeat so flat markets still advance the chart once per minute).
    if (last && last.price === num && now - lastTime < 60_000) continue;
    series.push({ timestamp: new Date(now).toISOString(), price: num });
    if (series.length > MAX_POINTS) series.shift();
    buffer.set(item.id, series);
  }
}

export function getLiveHistory(id: string, since?: number): PriceHistoryItem[] {
  const series = buffer.get(id) ?? [];
  if (!since) return series;
  return series.filter((p) => new Date(p.timestamp).getTime() >= since);
}

export function liveChange(series: PriceHistoryItem[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].price;
  if (!first) return null;
  return Number((((series[series.length - 1].price - first) / first) * 100).toFixed(2));
}
