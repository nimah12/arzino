"use client";

import { useState } from "react";
import { PriceItem } from "@/lib/prices";
import PriceChart from "./PriceChart";

interface PriceCardProps {
  item: PriceItem;
  locale: "fa" | "en";
}

const labels = {
  fa: {
    buy: "خرید",
    sell: "فروش",
    toman: "تومان",
    change24h: "تغییرات ۲۴ ساعته",
  },
  en: {
    buy: "Buy",
    sell: "Sell",
    toman: "Toman",
    change24h: "24h Change",
  },
};

export default function PriceCard({ item, locale }: PriceCardProps) {
  const isUp = item.change != null && item.change > 0;
  const isDown = item.change != null && item.change < 0;
  const [showChart, setShowChart] = useState(false);
  const hasBuySell = item.buyPrice || item.sellPrice;
  const t = labels[locale];

  return (
    <div className="price-card glass p-5 rounded-2xl group relative overflow-hidden">
      {/* Header with icon and title */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 flex items-center justify-center">
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium truncate text-sm">
              {item.title}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setShowChart(!showChart)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white group-hover:text-emerald-400"
          aria-label={locale === "fa" ? (showChart ? "مخفی کردن نمودار" : "نمایش نمودار") : (showChart ? "Hide chart" : "Show chart")}
          aria-expanded={showChart}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m19 9-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Price main */}
      <div className="text-right mb-3">
        <p className="text-2xl font-bold text-white tabular-nums">
          {item.price}
        </p>
        <p className="text-xs text-gray-500">{t.toman}</p>
      </div>

      {/* Buy / Sell prices */}
      {hasBuySell && (
        <div className="flex justify-between gap-2 text-xs mb-4">
          {item.buyPrice && item.buyPrice !== "—" && (
            <div className="glass-strong rounded-lg p-2.5 flex-1">
              <span className="text-gray-400 block">{t.buy}</span>
              <span className="tabular-nums text-emerald-400 font-medium">{item.buyPrice}</span>
            </div>
          )}
          {item.sellPrice && item.sellPrice !== "—" && (
            <div className="glass-strong rounded-lg p-2.5 flex-1">
              <span className="text-gray-400 block">{t.sell}</span>
              <span className="tabular-nums text-rose-400 font-medium">{item.sellPrice}</span>
            </div>
          )}
        </div>
      )}

      {/* Change badge */}
      {item.change != null && (
        <div className="flex items-center justify-end mb-4">
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isUp
                ? "bg-emerald-500/20 text-emerald-400"
                : isDown
                ? "bg-rose-500/20 text-rose-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {isUp && (
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 14l5-5 5 5z" />
              </svg>
            )}
            {isDown && (
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            )}
            <span className="tabular-nums">
              {item.change > 0 ? "+" : ""}{item.change.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Chart section */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showChart ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="pt-3 border-t border-gray-800/50">
          <PriceChart id={item.id} hours={24} className="w-full" />
          <p className="text-xs text-gray-400 text-center mt-2">
            {t.change24h}
          </p>
        </div>
      </div>

      {/* Time */}
      {item.updatedAt && (
        <div className="mt-4 pt-3 border-t border-gray-800/50 text-xs text-gray-500 tabular-nums">
          {item.updatedAt}
        </div>
      )}
    </div>
  );
}