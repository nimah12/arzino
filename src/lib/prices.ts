import { recordLivePrices } from "./live";

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

/**
 * Server-side cache: the BrsApi free tier is hit at most 3 times a day
 * (once every 8 hours). Failures are also throttled to that cadence so a
 * bad key can't hammer the upstream and get itself banned.
 */
const REFRESH_MS = 8 * 60 * 60 * 1000;
let pricesCache: { data: PriceItem[]; at: number } | null = null;
let lastAttemptAt = 0;

export async function fetchPrices(): Promise<PriceItem[]> {
  const now = Date.now();
  if (pricesCache && now - pricesCache.at < REFRESH_MS) return pricesCache.data;
  if (now - lastAttemptAt < REFRESH_MS) return fallbackPrices;

  lastAttemptAt = now;
  try {
    const { fetchBrsPrices, findBrsItem, parseBrsNumber, toToman } = await import("./brsapi");
    const apiItems = await fetchBrsPrices();

    if (apiItems && apiItems.length > 0) {
      const prices: PriceItem[] = [];
      for (const id of ITEM_ORDER) {
        const meta = ITEM_META[id];
        if (!meta) continue;
        const src = findBrsItem(apiItems, id);
        if (!src) continue;
        const price = toToman(src, parseBrsNumber(src.price));
        if (price == null || price <= 0) continue;
        prices.push({
          id,
          title: meta.title,
          icon: meta.icon,
          price: formatPrice(price),
          change: parseBrsNumber(src.change_percent),
          changeAbs: toToman(src, parseBrsNumber(src.change_value)),
          updatedAt: src.time || "",
          history: [],
          source: "brsapi",
        });
      }
      if (prices.length > 0) return finalize(prices);
    }
  } catch (e) {
    console.warn("[prices] BrsApi failed:", e);
  }

  console.warn("[prices] BrsApi unavailable — using static fallback data");
  return fallbackPrices;
}

function finalize(items: PriceItem[]): PriceItem[] {
  recordLivePrices(items);
  pricesCache = { data: items, at: Date.now() };
  console.log(`[prices] source=brsapi, items=${items.length}`);
  return items;
}
