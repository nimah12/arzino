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

/** Canonical order + titles/icons for the watchlist. */
export const ITEM_META: Record<string, { title: string; icon: string }> = {
  usd: { title: "دلار آمریکا", icon: "💵" },
  eur: { title: "یورو", icon: "💶" },
  gbp: { title: "پوند انگلیس", icon: "💷" },
  aed: { title: "درهم امارات", icon: "🇦🇪" },
  try: { title: "لیر ترکیه", icon: "🇹🇷" },
  gold18: { title: "طلای ۱۸ عیار", icon: "🥇" },
  "gold-gr": { title: "طلای آب‌شده (مثقال)", icon: "✨" },
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
  if (raw == null || raw === "" || raw === "0" || raw === undefined) return "—";
  const clean = String(raw).replace(/[^\d.-]/g, "");
  if (!clean || clean === "-") return "—";
  const n = parseFloat(clean);
  if (isNaN(n)) return "—";
  return toFaDigits(n.toLocaleString("en-US"));
}
