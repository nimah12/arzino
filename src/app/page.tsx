"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import type { PriceItem } from "@/lib/prices";
import PriceCard from "./components/PriceCard";
import {
  formatJalaliDateTime,
  formatJalaliDateLong,
  formatGregorianDateTime,
  formatGregorianDateLong,
  toEnDigits,
  toFaDigits,
} from "@/lib/jalali";

type Locale = "fa" | "en";

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

const translations: Record<Locale, Record<string, string>> = {
  fa: {
    appName: "ارزینو",
    subtitle: "قیمت لحظه‌ای ارز، طلا و سکه",
    persianDate: "تاریخ شمسی",
    persianTime: "ساعت شمسی",
    gregorianDate: "تاریخ میلادی",
    gregorianTime: "ساعت میلادی",
    lastTelegram: "آخرین پیام قیمت در تلگرام:",
    loading: "در حال بارگذاری قیمت‌ها...",
    refreshing: "در حال به‌روزرسانی...",
    refresh: "رفرش",
    lastUpdate: "آخرین به‌روزرسانی:",
    retry: "تلاش مجدد",
    errorFetch: "خطا در دریافت قیمت‌ها. دوباره تلاش کنید.",
    noData: "هیچ داده‌ای برای نمایش وجود ندارد.",
    dataSource: "منبع داده:",
    builtWith: "ساخته شده با",
    langFA: "فارسی",
    langEN: "English",
    title: "ارزینو | قیمت لحظه‌ای ارز، طلا و سکه",
    change24h: "تغییرات ۲۴ ساعته",
    toman: "تومان",
    buy: "خرید",
    sell: "فروش",
    chart: "نمودار",
  },
  en: {
    appName: "Arzino",
    subtitle: "Live Currency, Gold & Coin Prices",
    persianDate: "Persian Date",
    persianTime: "Persian Time",
    gregorianDate: "Gregorian Date",
    gregorianTime: "Gregorian Time",
    lastTelegram: "Latest Telegram Price Update:",
    loading: "Loading prices...",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    lastUpdate: "Last updated:",
    retry: "Retry",
    errorFetch: "Failed to fetch prices. Please try again.",
    noData: "No data available.",
    dataSource: "Data source:",
    builtWith: "Built with",
    langFA: "فارسی",
    langEN: "English",
    title: "Arzino | Live Currency, Gold & Coin Prices",
    change24h: "24h Change",
    toman: "Toman",
    buy: "Buy",
    sell: "Sell",
    chart: "Chart",
  },
};

// Helper to format numbers based on locale
function formatNumber(value: string, locale: Locale): string {
  if (locale === "en") {
    return toEnDigits(value);
  }
  return value; // Already in Persian digits from formatPrice
}

export default function Home() {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telTime, setTelTime] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("fa");
  const [mounted, setMounted] = useState(false);

  const t = (key: string) => translations[locale][key] || key;

  // Update document direction and language on locale change
  useEffect(() => {
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = locale === "fa" ? "fa" : "en";
  }, [locale]);

  const loadPrices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPrices(json.data);
        setLastFetch(new Date());
        const tgItem = json.data[0];
        if (tgItem?.updatedAt) {
          setTelTime(tgItem.updatedAt);
        }
      } else {
        throw new Error("Invalid data format");
      }
    } catch (err) {
      setError(t("errorFetch"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 60_000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  const [now, setNow] = useState(new Date());

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

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="shimmer animate-pulse rounded-xl w-64 h-8" />
      </main>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="fixed inset-0 -z-10" aria-hidden="true">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float"
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "-3s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "-1.5s" }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text">
                  {t("appName")}
                </h1>
                <p className="text-gray-400 text-sm mt-1">{t("subtitle")}</p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocale("fa")}
                className={`lang-btn ${locale === "fa" ? "lang-btn-active" : "lang-btn-inactive"}`}
                aria-pressed={locale === "fa"}
              >
                {t("langFA")}
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`lang-btn ${locale === "en" ? "lang-btn-active" : "lang-btn-inactive"}`}
                aria-pressed={locale === "en"}
              >
                {t("langEN")}
              </button>
            </div>
          </header>

          {/* Date & Time Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-slide-up delay-1">
            <DateTimeCard
              label={t("persianDate")}
              value={locale === "fa" ? jalaliNowLong : gregorianNowLong}
              icon={<CalendarIcon />}
              className={locale === "fa" ? "font-persian" : "font-english"}
            />
            <DateTimeCard
              label={t("persianTime")}
              value={locale === "fa" ? jalaliNow : gregorianNow}
              icon={<ClockIcon />}
              className={locale === "fa" ? "font-persian tabular-nums" : "font-english tabular-nums"}
            />
            <DateTimeCard
              label={t("gregorianDate")}
              value={locale === "fa" ? gregorianNowLong : jalaliNowLong}
              icon={<CalendarIcon />}
              className={locale === "fa" ? "font-english" : "font-persian"}
            />
            <DateTimeCard
              label={t("gregorianTime")}
              value={locale === "fa" ? gregorianNow : jalaliNow}
              icon={<ClockIcon />}
              className={locale === "fa" ? "font-english tabular-nums" : "font-persian tabular-nums"}
            />
          </div>

          {/* Telegram timestamp */}
          {telTime && (
            <div className="mb-6 p-3 glass rounded-xl text-center text-xs text-gray-400 animate-slide-up delay-2">
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                </svg>
                {t("lastTelegram")} <span className="tabular-nums text-emerald-400">{formatNumber(telTime, locale)}</span>
              </span>
            </div>
          )}

          {/* Status bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-slide-up delay-3">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              {lastFetch && (
                <>
                  {t("lastUpdate")}{" "}
                  {lastFetch.toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </>
              )}
              {loading && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {t("refreshing")}
                </span>
              )}
            </div>
            <button
              onClick={loadPrices}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              <svg
                width="16"
                height="16"
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
              <span>{loading ? t("refreshing") : t("refresh")}</span>
            </button>
          </div>

          {/* Error toast */}
          {error && (
            <div className="mb-6 p-4 glass-strong rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 animate-slide-down toast-enter">
              <div className="flex items-center justify-between gap-4">
                <span>{error}</span>
                <button
                  onClick={loadPrices}
                  className="btn-ghost text-sm"
                >
                  {t("retry")}
                </button>
              </div>
            </div>
          )}

          {/* Price Grid */}
          {loading && prices.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {[...Array(6)].map((_, i) => (
                <PriceCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {prices.map((item) => (
                <PriceCard key={item.id} item={item} locale={locale} />
              ))}
              {prices.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-gray-500 glass rounded-2xl">
                  {t("noData")}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-800/50 animate-fade-in delay-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-500">
              <p className="flex items-center gap-2">
                {t("dataSource")}{" "}
                <a href="https://t.me/se_pz" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline transition-colors flex items-center gap-1">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                  </svg>
                  @se_pz
                </a>
              </p>
              <p className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {t("builtWith")}{" "}
                <span className="text-gray-300">Next.js</span>
                <span className="text-gray-500">+</span>
                <span className="text-gray-300">TypeScript</span>
                <span className="text-gray-500">+</span>
                <span className="text-gray-300">Tailwind CSS</span>
              </p>
              <p className="flex items-center justify-center sm:justify-end">
                <a href="https://github.com/nimah12/arzino" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-colors group">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="group-hover:text-emerald-400 transition-colors">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  github.com/nimah12/arzino
                </a>
              </p>
            </div>
          </footer>
        </div>
      </main>
    </LocaleContext.Provider>
  );
}

// Date/Time Card Component
function DateTimeCard({ label, value, icon: Icon, className = "" }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass p-4 rounded-2xl ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-500">{Icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-medium text-white">{value}</div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Skeleton for loading state
function PriceCardSkeleton() {
  return (
    <div className="glass p-5 rounded-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl shimmer" />
        <div className="flex-1">
          <div className="h-5 w-3/4 shimmer rounded" />
          <div className="h-3 w-1/2 shimmer rounded mt-1" />
        </div>
      </div>
      <div className="h-10 w-full shimmer rounded-xl" />
      <div className="flex gap-2">
        <div className="flex-1 h-20 shimmer rounded-lg" />
        <div className="flex-1 h-20 shimmer rounded-lg" />
      </div>
    </div>
  );
}