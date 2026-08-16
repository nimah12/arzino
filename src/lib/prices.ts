export type PriceItem = {
  id: string;
  title: string;
  price: string;
  change: number | null;
  changeAbs: number | null;
  updatedAt: string;
  /** Real per-minute samples from the server's live buffer, oldest → newest. */
  history?: LiveSample[];
  buyPrice?: string;
  sellPrice?: string;
  source?: string;
};

/** One real sample: unix time (ms) + price in Toman. */
export type LiveSample = {
  t: number;
  p: number;
};

export type PriceHistoryItem = {
  timestamp: string;
  price: number;
};

/** Canonical order + titles for the watchlist (icons resolve via AssetIcon). */
export const ITEM_META: Record<string, { title: string }> = {
  usd: { title: "دلار آمریکا" },
  eur: { title: "یورو" },
  gbp: { title: "پوند انگلیس" },
  aed: { title: "درهم امارات" },
  try: { title: "لیر ترکیه" },
  gold18: { title: "طلای ۱۸ عیار" },
  "gold-gr": { title: "طلای آب‌شده (مثقال)" },
  coin: { title: "سکه امامی" },
  "half-coin": { title: "نیم سکه" },
  tether: { title: "تتر (USDT)" },
  "coin-fardi": { title: "سکه فردایی" },
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
  "gold-gr": { en: "Melted Gold (Mithqal)" },
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
  if (raw == null || raw === "" || raw === "0" || raw === 0 || raw === undefined) return "—";
  const clean = String(raw).replace(/[^\d.-]/g, "");
  if (!clean || clean === "-") return "—";
  const n = parseFloat(clean);
  if (isNaN(n)) return "—";
  return toFaDigits(n.toLocaleString("en-US"));
}
