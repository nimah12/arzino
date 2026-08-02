import { getLiveHistory, liveChange, recordLivePrices } from "./live";

export type PriceItem = {
  id: string;
  title: string;
  icon: string;
  price: string;
  change: number | null;
  changeAbs: number | null;
  updatedAt: string;
  history?: number[];
  buyPrice?: string;
  sellPrice?: string;
  source?: string;
};

export type PriceHistoryItem = {
  timestamp: string;
  price: number;
};

const fallbackPrices: PriceItem[] = [
  { id: "usd", title: "دلار آمریکا", icon: "💵", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "eur", title: "یورو", icon: "💶", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "gbp", title: "پوند انگلیس", icon: "💷", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "aed", title: "درهم امارات", icon: "🇦🇪", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "try", title: "لیر ترکیه", icon: "🇹🇷", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "gold18", title: "طلای ۱۸ عیار", icon: "🥇", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "coin", title: "سکه امامی", icon: "🪙", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "half-coin", title: "نیم سکه", icon: "🪙", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "tether", title: "تتر (USDT)", icon: "💎", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "gold-gr", title: "طلا (گرمی)", icon: "✨", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "coin-fardi", title: "سکه فردایی", icon: "🏅", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
];

/** Canonical order + titles/icons for the watchlist. */
export const ITEM_META: Record<string, { title: string; icon: string }> = {
  usd: { title: "دلار آمریکا", icon: "💵" },
  eur: { title: "یورو", icon: "💶" },
  gbp: { title: "پوند انگلیس", icon: "💷" },
  aed: { title: "درهم امارات", icon: "🇦🇪" },
  try: { title: "لیر ترکیه", icon: "🇹🇷" },
  gold18: { title: "طلای ۱۸ عیار", icon: "🥇" },
  "gold-gr": { title: "طلا (گرمی)", icon: "✨" },
  coin: { title: "سکه امامی", icon: "🪙" },
  "half-coin": { title: "نیم سکه", icon: "🪙" },
  tether: { title: "تتر (USDT)", icon: "💎" },
  "coin-fardi": { title: "سکه فردایی", icon: "🏅" },
};

export const ITEM_ORDER = [
  "usd", "eur", "gbp", "aed", "try", "gold18",
  "gold-gr", "coin", "half-coin", "tether", "coin-fardi",
];

export function toFaDigits(input: string): string {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return input.replace(/[0-9]/g, (d) => faDigits[Number(d)]);
}

export function toEnDigits(input: string): string {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return input.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
}

/** Short bilingual display names used for the EN UI, overview cards and search. */
export const ASSET_TITLES: Record<string, { en: string }> = {
  usd: { en: "US Dollar" },
  eur: { en: "Euro" },
  gbp: { en: "British Pound" },
  aed: { en: "UAE Dirham" },
  try: { en: "Turkish Lira" },
  gold18: { en: "Gold 18k" },
  coin: { en: "Emami Coin" },
  "half-coin": { en: "Half Coin" },
  tether: { en: "Tether (USDT)" },
  "gold-gr": { en: "Gold (Gram)" },
  "coin-fardi": { en: "Fardi Coin" },
};

/** Formats a 24h change value for display: localized digits and separators. */
export function formatChange(change: number, locale: "fa" | "en"): string {
  const sign = change > 0 ? "+" : change < 0 ? (locale === "fa" ? "−" : "-") : "";
  const abs = Math.abs(change).toFixed(1);
  return locale === "fa"
    ? `${sign}${toFaDigits(abs).replace(".", "٫")}٪`
    : `${sign}${abs}%`;
}

export function formatPrice(raw: string | number | null | undefined): string {
  if (raw == null || raw === "" || raw === "0" || raw === undefined) return "—";
  const clean = String(raw).replace(/[^\d.-]/g, "");
  if (!clean || clean === "-") return "—";
  const n = parseFloat(clean);
  if (isNaN(n)) return "—";
  return toFaDigits(n.toLocaleString("en-US"));
}

function formatChangeAbs(n: number | null): number | null {
  if (n == null) return null;
  return Number(n.toFixed(0));
}

function computeChangeFromHistory(history: PriceHistoryItem[]): { change: number | null; changeAbs: number | null } {
  if (history.length < 2) return { change: null, changeAbs: null };
  const first = history[0].price;
  const last = history[history.length - 1].price;
  if (!first || isNaN(first) || isNaN(last)) return { change: null, changeAbs: null };
  const changeAbs = last - first;
  const change = (changeAbs / first) * 100;
  return { change: Number(change.toFixed(2)), changeAbs: formatChangeAbs(changeAbs) };
}

/** Enrich items with a real change % computed from the live buffer. */
async function enrichChanges(items: PriceItem[]): Promise<void> {
  const since24h = Date.now() - 24 * 3600_000;
  items.forEach((item) => {
    const series = getLiveHistory(item.id, since24h);
    const fromLive = liveChange(series);
    if (fromLive != null) {
      item.change = fromLive;
      const first = series[0].price;
      item.changeAbs = Number((series[series.length - 1].price - first).toFixed(0));
    }
  });
}

// Server-side cache: Telegram is hit at most once per minute.
let pricesCache: { data: PriceItem[]; at: number } | null = null;

export async function fetchPrices(): Promise<PriceItem[]> {
  if (pricesCache && Date.now() - pricesCache.at < 60_000) return pricesCache.data;

  try {
    const { fetchFromTelegram } = await import("./telegram");
    const tgData = await fetchFromTelegram();

    if (tgData) {
      const prices: PriceItem[] = [
        {
          id: "usd",
          title: "دلار فردایی تهران",
          icon: "💵",
          price: formatPrice(tgData.usdDeal || tgData.usdBuy),
          buyPrice: formatPrice(tgData.usdBuy),
          sellPrice: formatPrice(tgData.usdSell),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
        {
          id: "tether",
          title: "تتر (USDT)",
          icon: "💎",
          price: formatPrice(tgData.tetherSell || tgData.tetherBuy),
          buyPrice: formatPrice(tgData.tetherBuy),
          sellPrice: formatPrice(tgData.tetherSell),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
        {
          id: "gold18",
          title: "طلای ۱۸ عیار (آب‌شده)",
          icon: "🥇",
          price: formatPrice(tgData.goldMelted),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
        {
          id: "gold-gr",
          title: "طلا (گرمی)",
          icon: "✨",
          price: formatPrice(tgData.goldGram),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
        {
          id: "coin",
          title: "سکه امامی (حواله)",
          icon: "🪙",
          price: formatPrice(tgData.goldCoin),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
        {
          id: "coin-fardi",
          title: "سکه فردایی",
          icon: "🏅",
          price: formatPrice(tgData.goldCoinFardi),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp ? tgData.timestamp.slice(11, 16) : "",
          history: [],
          source: "telegram",
        },
      ];
      await enrichChanges(prices);
      return finalize(prices);
    }
  } catch (e) {
    console.warn("[prices] Telegram failed:", e);
  }

  console.warn("[prices] Telegram unavailable — using static fallback data");
  return fallbackPrices;
}

function finalize(items: PriceItem[]): PriceItem[] {
  recordLivePrices(items);
  pricesCache = { data: items, at: Date.now() };
  console.log(`[prices] source=telegram, items=${items.length}`);
  return items;
}

/**
 * History for an asset = points accumulated in the live buffer from the
 * app's own per-minute Telegram polling. Returns [] when there's genuinely
 * nothing — the charts are display-only, so this is currently unused but kept
 * for API compatibility.
 */
export async function fetchPriceHistory(id: string, hours: number = 24): Promise<PriceHistoryItem[]> {
  const since = Date.now() - hours * 3600_000;
  return getLiveHistory(id, since);
}