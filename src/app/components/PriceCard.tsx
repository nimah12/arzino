"use client";

import { ASSET_TITLES, PriceItem, formatChange, toEnDigits } from "@/lib/prices";
import AssetIcon from "./AssetIcon";
import PriceChart from "./PriceChart";

interface PriceCardProps {
  item: PriceItem;
  locale: "fa" | "en";
  flashDir?: "up" | "down";
  flashTick?: number;
  animKey?: number;
  onOpenChart?: (id: string) => void;
}

/**
 * A single watchlist row: icon/name, price, buy/sell, 24h change,
 * an animated sparkline, and last-update time. Price digits follow the
 * active locale, the price cell briefly flashes green/red when the value
 * moves between refreshes, and clicking the sparkline opens the large
 * animated chart.
 */
export default function PriceCard({ item, locale, flashDir, flashTick, animKey, onOpenChart }: PriceCardProps) {
  const isUp = item.change != null && item.change > 0;
  const isDown = item.change != null && item.change < 0;
  const en = locale === "en";

  const title = en ? ASSET_TITLES[item.id]?.en ?? item.title : item.title;
  const price = en ? toEnDigits(item.price) : item.price;
  const buy =
    item.buyPrice && item.buyPrice !== "—" ? (en ? toEnDigits(item.buyPrice) : item.buyPrice) : null;
  const sell =
    item.sellPrice && item.sellPrice !== "—" ? (en ? toEnDigits(item.sellPrice) : item.sellPrice) : null;
  const flashClass = flashDir ? (flashDir === "up" ? "flash-up" : "flash-down") : "";

  return (
    <tr>
      <td>
        <div className="flex items-center gap-2.5 min-w-0">
          <AssetIcon name={item.id} size={17} className="shrink-0" title={title} />
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {title}
          </span>
        </div>
      </td>

      <td>
        <span
          key={flashTick ?? 0}
          className={`font-mono-data tabular-nums text-sm font-semibold ${flashClass}`}
          style={{ color: "var(--text-primary)", display: "inline-block", borderRadius: 4, padding: "0 2px" }}
        >
          {price}
        </span>
      </td>

      <td className="hidden sm:table-cell">
        {buy ? (
          <span className="font-mono-data tabular-nums text-xs" style={{ color: "var(--up)" }}>
            {buy}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>
        )}
      </td>

      <td className="hidden sm:table-cell">
        {sell ? (
          <span className="font-mono-data tabular-nums text-xs" style={{ color: "var(--down)" }}>
            {sell}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>
        )}
      </td>

      <td>
        {item.change != null ? (
          <span
            className="font-mono-data tabular-nums text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              color: isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-secondary)",
              background: isUp ? "var(--up-bg)" : isDown ? "var(--down-bg)" : "transparent",
            }}
          >
            <span aria-hidden="true" className="me-0.5">
              {isUp ? "▲" : isDown ? "▼" : ""}
            </span>
            {formatChange(item.change, locale)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>
        )}
      </td>

      <td className="hidden md:table-cell" style={{ width: 96 }}>
        <button
          type="button"
          className="chart-cell-btn"
          onClick={() => onOpenChart?.(item.id)}
          title={locale === "fa" ? "نمایش نمودار بزرگ" : "Open large chart"}
          aria-label={locale === "fa" ? `نمایش نمودار ${title}` : `Show ${title} chart`}
        >
          <PriceChart id={item.id} locale={locale} basePrice={item.price} change={item.change} history={item.history} animKey={animKey} />
        </button>
      </td>

      <td className="hidden lg:table-cell">
        <span className="font-mono-data tabular-nums text-xs" style={{ color: "var(--text-tertiary)" }}>
          {item.updatedAt || "—"}
        </span>
      </td>
    </tr>
  );
}
