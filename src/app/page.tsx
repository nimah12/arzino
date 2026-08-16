"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ASSET_TITLES,
  formatChange,
  toEnDigits,
  toFaDigits,
  type PriceItem,
} from "@/lib/prices";
import PriceCard from "./components/PriceCard";
import PriceChart from "./components/PriceChart";
import { useTheme } from "@/lib/theme";
import {
  formatJalaliDateTime,
  formatJalaliDateLong,
  formatGregorianDateTime,
  formatGregorianDateLong,
} from "@/lib/jalali";

type Locale = "fa" | "en";

const translations: Record<Locale, Record<string, string>> = {
  fa: {
    appName: "ارزینو",
    subtitle: "قیمت لحظه‌ای ارز، طلا و سکه",
    loading: "در حال بارگذاری قیمت‌ها...",
    refreshing: "در حال به‌روزرسانی...",
    refresh: "رفرش",
    lastUpdate: "آخرین به‌روزرسانی",
    retry: "تلاش مجدد",
    errorFetch: "خطا در دریافت قیمت‌ها. دوباره تلاش کنید.",
    apiKeyInvalid: "کلید API نامعتبر است — لطفاً کلید را بررسی یا به‌روزرسانی کنید. (تلاش مجدد هر ۸ ساعت)",
    dataUnavailable: "دریافت قیمت‌های زنده ناموفق بود؛ قیمت‌ها موقتاً در دسترس نیستند. (تلاش مجدد هر ۸ ساعت)",
    noData: "هیچ داده‌ای برای نمایش وجود ندارد.",
    nextUpdate: "بروزرسانی بعدی:",
    refreshUseless: "قیمت‌ها هر ۸ ساعت به‌روز می‌شوند؛ رفرش زودتر از موعد، دادهٔ جدیدی نمی‌آورد.",
    noResults: "دارایی‌ای با این نام پیدا نشد.",
    dataSource: "منبع داده:",
    langFA: "فارسی",
    langEN: "English",
    colName: "دارایی",
    colPrice: "قیمت",
    colBuy: "خرید",
    colSell: "فروش",
    colChange: "تغییر ۲۴س",
    colChart: "روند",
    colUpdated: "زمان",
    live: "زنده",
    market: "بازار",
    search: "جستجوی دارایی...",
    themeToDark: "حالت تیره",
    themeToLight: "حالت روشن",
    assets: "دارایی",
    close: "بستن",
    liveChart: "نمودار لحظه‌ای",
    updatesEveryMin: "به‌روزرسانی قیمت‌ها هر ۸ ساعت",
    unitToman: "تومان",
    unitNote: "واحد قیمت: تومان",
  },
  en: {
    appName: "Arzino",
    subtitle: "Live Currency, Gold & Coin Prices",
    loading: "Loading prices...",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    lastUpdate: "Last update",
    retry: "Retry",
    errorFetch: "Failed to fetch prices. Please try again.",
    apiKeyInvalid: "Invalid API key — please check or update the key. (Retries every 8 hours)",
    dataUnavailable: "Couldn't fetch live prices; they're temporarily unavailable. (Retries every 8 hours)",
    noData: "No data available.",
    nextUpdate: "Next update:",
    refreshUseless: "Prices update every 8 hours; refreshing early won't bring new data.",
    noResults: "No assets match your search.",
    dataSource: "Source:",
    langFA: "فارسی",
    langEN: "English",
    colName: "Asset",
    colPrice: "Price",
    colBuy: "Buy",
    colSell: "Sell",
    colChange: "24h",
    colChart: "Trend",
    colUpdated: "Time",
    live: "Live",
    market: "Market",
    search: "Search assets...",
    themeToDark: "Switch to dark mode",
    themeToLight: "Switch to light mode",
    assets: "assets",
    close: "Close",
    liveChart: "Live chart",
    updatesEveryMin: "Prices update every 8 hours",
    unitToman: "Toman",
    unitNote: "Prices in Toman",
  },
};

const OVERVIEW_IDS = ["usd", "tether", "gold18", "coin"];

function toNum(s: string): number | null {
  const n = parseFloat(String(s).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function formatCountdown(ms: number, locale: Locale): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return locale === "fa" ? toFaDigits(text) : text;
}

function OverviewCard({ item, locale }: { item: PriceItem; locale: Locale }) {
  const en = locale === "en";
  const title = en ? ASSET_TITLES[item.id]?.en ?? item.title : item.title;
  const price = en ? toEnDigits(item.price) : item.price;
  const change = item.change;
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  return (
    <div className="overview-card">
      <span className="overview-label flex items-center gap-1.5">
        <span aria-hidden="true">{item.icon}</span>
        <span className="truncate">{title}</span>
      </span>
      <span className="overview-price font-mono-data tabular-nums" style={{ color: "var(--text-primary)" }}>
        {price}
      </span>
      <span
        className="overview-change font-mono-data tabular-nums"
        style={{ color: isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-tertiary)" }}
      >
        {change != null ? `${isUp ? "▲" : isDown ? "▼" : ""} ${formatChange(change, locale)}` : "—"}
      </span>
    </div>
  );
}

function ChartModal({
  id,
  basePrice,
  locale,
  onClose,
}: {
  id: string;
  basePrice?: string | null;
  locale: Locale;
  onClose: () => void;
}) {
  const t = (key: string) => translations[locale][key] || key;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("liveChart")}
    >
      <div className="modal-panel">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("liveChart")}
          </h3>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label={t("close")}
            title={t("close")}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <PriceChart id={id} locale={locale} height={260} basePrice={basePrice} />
        <p className="mt-3 text-xs flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: "var(--up)" }} />
          {t("updatesEveryMin")}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [dataTime, setDataTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [nextRefresh, setNextRefresh] = useState<number | null>(null);
  const [refreshHint, setRefreshHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "fa";
    const stored = localStorage.getItem("arzino-locale");
    return stored === "en" || stored === "fa" ? stored : "fa";
  });
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [flashes, setFlashes] = useState<Record<string, { dir: "up" | "down"; tick: number }>>({});
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const prevPricesRef = useRef<Record<string, string>>({});
  const tickRef = useRef(0);
  const { theme, toggleTheme } = useTheme();

  const t = (key: string) => translations[locale][key] || key;

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

  // Clear, localized explanation shown instead of silent "—" rows.
  const sourceErrorMessage =
    sourceError != null
      ? sourceError === "invalid-key"
        ? t("apiKeyInvalid")
        : t("dataUnavailable")
      : null;

  // Countdown to the next 8h data refresh (updates with the minute tick).
  const remaining = nextRefresh != null ? nextRefresh - now.getTime() : null;
  const countdownLabel = remaining != null && remaining > 0 ? formatCountdown(remaining, locale) : null;

  // Refreshing sooner than the 8h window is pointless — say so instead of fetching.
  const handleRefresh = () => {
    if (nextRefresh != null && nextRefresh > now.getTime()) {
      const cd = formatCountdown(nextRefresh - now.getTime(), locale);
      setRefreshHint(`${t("refreshUseless")} (${t("nextUpdate")} ${cd})`);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setRefreshHint(null), 6000);
      return;
    }
    loadPrices();
  };

  // Prefer the API's own last-update time; fall back to the client fetch time.
  const lastUpdateLabel =
    dataTime != null
      ? locale === "fa"
        ? toFaDigits(dataTime)
        : toEnDigits(dataTime)
      : lastFetch
        ? lastFetch.toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "—";

  useEffect(() => {
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = locale === "fa" ? "fa" : "en";
    try {
      localStorage.setItem("arzino-locale", locale);
    } catch {}
  }, [locale]);

  const loadPrices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const next: PriceItem[] = json.data;
        const prev = prevPricesRef.current;
        const nextFlashes: Record<string, { dir: "up" | "down"; tick: number }> = {};
        for (const item of next) {
          const oldP = toNum(prev[item.id] ?? "");
          const newP = toNum(item.price);
          if (oldP != null && newP != null && newP !== oldP) {
            nextFlashes[item.id] = {
              dir: newP > oldP ? "up" : "down",
              tick: ++tickRef.current,
            };
          }
        }
        prevPricesRef.current = Object.fromEntries(next.map((i) => [i.id, i.price]));
        setFlashes(nextFlashes);
        setPrices(next);
        setLastFetch(new Date());
        // Exact last-update time from the Navasan response (e.g. "1405-05-25 19:00:39").
        setDataTime(typeof json.dataTime === "string" ? json.dataTime : null);
        // Why live data is unavailable ("invalid-key" | "http" | "network" | "empty"), if any.
        setSourceError(typeof json.error === "string" ? json.error : null);
        // When the 8h window expires / the next upstream fetch happens.
        setNextRefresh(typeof json.nextRefresh === "number" ? json.nextRefresh : null);
      } else {
        throw new Error("Invalid data format");
      }
    } catch {
      setError(t("errorFetch"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 60_000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const jalaliNow = formatJalaliDateTime(now);
  const jalaliNowLong = formatJalaliDateLong(now);
  const gregorianNow = formatGregorianDateTime(now);
  const gregorianNowLong = formatGregorianDateLong(now);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered =
    normalizedQuery === ""
      ? prices
      : prices.filter((item) => {
          const fa = item.title.toLowerCase();
          const en = ASSET_TITLES[item.id]?.en.toLowerCase() ?? "";
          return fa.includes(normalizedQuery) || en.includes(normalizedQuery);
        });

  const modalItem = selectedChart ? prices.find((p) => p.id === selectedChart) : null;
  const animKey = now.getTime();

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="shimmer rounded w-56 h-6" />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}
            >
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m19 9-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                {t("appName")}
              </h1>
              <p className="text-xs leading-none mt-1" style={{ color: "var(--text-tertiary)" }}>{t("subtitle")}</p>
            </div>
            <span
              className="hidden sm:flex items-center gap-1.5 text-[11px] px-2 py-1 rounded"
              style={{ background: "var(--up-bg)", color: "var(--up)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: "var(--up)" }} />
              {t("live")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("themeToLight") : t("themeToDark")}
              title={theme === "dark" ? t("themeToLight") : t("themeToDark")}
            >
              {theme === "dark" ? (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <div className="seg-control" role="group" aria-label={locale === "fa" ? "انتخاب زبان" : "Language"}>
              <button
                onClick={() => setLocale("fa")}
                className={`seg-btn ${locale === "fa" ? "seg-btn-active" : ""}`}
                aria-pressed={locale === "fa"}
              >
                {t("langFA")}
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`seg-btn ${locale === "en" ? "seg-btn-active" : ""}`}
                aria-pressed={locale === "en"}
              >
                {t("langEN")}
              </button>
            </div>
          </div>
        </header>

        {/* Compact meta bar: dates, refresh status */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono-data tabular-nums">
            <span className={locale === "fa" ? "font-persian" : "font-english"}>
              {locale === "fa" ? jalaliNowLong : gregorianNowLong}
            </span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span>{locale === "fa" ? jalaliNow : gregorianNow}</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span className="font-english">{locale === "fa" ? gregorianNowLong : jalaliNowLong}</span>
          </div>
          <div className="flex items-center gap-3">
            {(lastFetch || dataTime) && (
              <span>
                {t("lastUpdate")}:{" "}
                <span className="font-mono-data tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {lastUpdateLabel}
                </span>
              </span>
            )}
            {refreshHint ? (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{refreshHint}</span>
            ) : countdownLabel ? (
              <span className="font-mono-data tabular-nums text-xs" style={{ color: "var(--text-tertiary)" }}>
                {t("nextUpdate")} {countdownLabel}
              </span>
            ) : null}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn-ghost text-xs flex items-center gap-1.5"
              title={t("refreshUseless")}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={loading ? "animate-spin" : ""}
                viewBox="0 0 24 24"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {loading ? t("refreshing") : t("refresh")}
            </button>
          </div>
        </div>

        {/* Error toast */}
        {error && (
          <div
            className="mb-4 p-3 rounded text-sm flex items-center justify-between gap-4"
            style={{ background: "var(--down-bg)", border: "1px solid rgba(229,72,77,0.3)", color: "var(--down)" }}
          >
            <span className="flex items-center gap-2">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </span>
            <button onClick={loadPrices} className="btn-ghost text-xs">
              {t("retry")}
            </button>
          </div>
        )}

        {/* Live-source warning: invalid key or upstream failure (instead of silent dashes) */}
        {sourceErrorMessage && (
          <div
            className="mb-4 p-3 rounded text-sm flex items-center gap-2"
            style={{ background: "var(--down-bg)", border: "1px solid rgba(229,72,77,0.3)", color: "var(--down)" }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {sourceErrorMessage}
          </div>
        )}

        {/* Market overview cards */}
        {prices.length > 0 && (
          <section className="overview-grid mb-5 animate-fade-in" aria-label={t("market")}>
            {OVERVIEW_IDS.map((id) => {
              const item = prices.find((p) => p.id === id);
              return item ? <OverviewCard key={id} item={item} locale={locale} /> : null;
            })}
          </section>
        )}

        {/* Section header: title + search */}
        <div className="section-header">
          <h2 className="section-title">
            {t("market")}{" "}
            <span className="font-mono-data tabular-nums" style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>
              ({filtered.length} {filtered.length === 1 ? (locale === "fa" ? t("assets") : "asset") : t("assets")})
            </span>
            <span
              className="font-mono-data tabular-nums ms-2 px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
            >
              {t("unitNote")}
            </span>
          </h2>
          <div className="search-wrap">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
          </div>
        </div>

        {/* Watchlist table */}
        <div className="panel overflow-x-auto animate-fade-in">
          {loading && prices.length === 0 ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 shimmer rounded" />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("colName")}</th>
                  <th>
                    {t("colPrice")}{" "}
                    <span className="font-mono-data" style={{ color: "var(--text-tertiary)" }}>({t("unitToman")})</span>
                  </th>
                  <th className="hidden sm:table-cell">{t("colBuy")}</th>
                  <th className="hidden sm:table-cell">{t("colSell")}</th>
                  <th>{t("colChange")}</th>
                  <th className="hidden md:table-cell">{t("colChart")}</th>
                  <th className="hidden lg:table-cell">{t("colUpdated")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const flash = flashes[item.id];
                  return (
                    <PriceCard
                      key={item.id}
                      item={item}
                      locale={locale}
                      flashDir={flash?.dir}
                      flashTick={flash?.tick}
                      animKey={animKey}
                      onOpenChart={setSelectedChart}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {prices.length === 0 ? t("noData") : t("noResults")}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-tertiary)" }}>
          <p className="flex items-center gap-1.5">
            {t("unitNote")} · {t("lastUpdate")}:{" "}
            <span className="font-mono-data tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {lastUpdateLabel}
            </span>
          </p>
          <a href="https://github.com/nimah12/arzino" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--text-tertiary)" }}>
            github.com/nimah12/arzino
          </a>
        </footer>
      </div>

      {/* Live chart modal */}
      {modalItem && selectedChart && (
        <ChartModal
          id={selectedChart}
          basePrice={modalItem.price}
          locale={locale}
          onClose={() => setSelectedChart(null)}
        />
      )}
    </main>
  );
}
