/**
 * BrsApi client — the new price source for Arzino.
 *
 * Free gold/currency webservice (1500 requests/day on the free tier, so the
 * app only calls it once every 8 hours = 3 times a day, see prices.ts).
 *
 * Endpoint: https://Api.BrsApi.ir/Market/Gold_Currency.php?key=...
 *
 * The free endpoint returns one object per instrument with fields like:
 *   { date, time, time_unix, symbol, name_en, name, price,
 *     change_value, change_percent, unit }
 */

const BRS_API_URL = "https://Api.BrsApi.ir/Market/Gold_Currency.php";
const BRS_API_KEY = process.env.BRS_API_KEY ?? "freeMmx0PZ5L3IsdxRQONjGOvScGury4";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type BrsPriceItem = {
  date?: string;
  time?: string;
  time_unix?: number;
  symbol?: string;
  name_en?: string;
  name?: string;
  price?: number | string;
  change_value?: number | string;
  change_percent?: number | string;
  unit?: string;
};

/** Normalize a price that may come as number, "97,005,000", or Persian digits. */
export function parseBrsNumber(value: number | string | undefined | null): number | null {
  if (value == null || value === "") return null;
  const latin = String(value).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const n = parseFloat(latin.replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

/** BrsApi quotes some instruments in Rial and others in Toman — convert to Toman. */
export function toToman(item: BrsPriceItem, value: number | null): number | null {
  if (value == null) return null;
  const unit = (item.unit || "").trim();
  if (unit.includes("ریال")) return Math.round(value / 10);
  return value;
}

/**
 * Map a BrsApi instrument to one of the app's item ids. Resolution order:
 * 1. exact `symbol` match, 2. Persian/English name match, 3. leftover gold
 * instruments (so gold-gr never goes empty when the API renames its gold rows).
 */
const SYMBOL_CANDIDATES: Record<string, string[]> = {
  usd: ["USD", "USD_IRR", "IRR_USD", "US_DOLLAR"],
  eur: ["EUR"],
  gbp: ["GBP"],
  aed: ["AED"],
  try: ["TRY"],
  gold18: ["GOLD_18", "GOLD18", "IR_GOLD_18", "18_AYAR", "GOLD_18_AYAR"],
  "gold-gr": ["GOLD_MELTED", "MELTED", "ABSHODEH", "GOLD_ABSHODEH", "GOLD_24", "GOLD24", "IR_GOLD_24"],
  coin: ["IR_COIN_EMAMI", "COIN_EMAMI", "SEKKEH_EMAMI", "EMAMI"],
  "half-coin": ["IR_COIN_NIM", "COIN_NIM", "NIM_SEKKEH", "SEKKEH_NIM", "HALF_COIN"],
  tether: ["USDT", "TETHER"],
};

const NAME_PATTERNS: Record<string, RegExp[]> = {
  usd: [/^دلار$/, /دلار\s*(آمریکا|امریکا)/, /US\s*Dollar/i],
  eur: [/یورو/, /Euro/i],
  gbp: [/پوند\s*انگلیس/, /British\s*Pound/i, /^پوند$/],
  aed: [/درهم\s*امارات/, /UAE\s*Dirham/i, /^درهم$/],
  try: [/لیر\s*ترکیه/, /Turkish\s*Lira/i, /^لیر$/],
  gold18: [/طلای?\s*18\s*عیار/, /طلای?\s*۱۸\s*عیار/, /Gold\s*18/i],
  "gold-gr": [/آبشده|ابشده/, /Melted/i, /طلای?\s*24\s*عیار/, /طلای?\s*۲۴\s*عیار/, /Gold\s*24/i],
  coin: [/سکه\s*امامی/, /Emami/i],
  "half-coin": [/نیم\s*سکه/, /Half\s*Coin/i, /^نیم$/],
  tether: [/تتر/, /Tether/i, /USDT/i],
};

/** Symbols/names that must NOT be treated as generic gold for gold-gr. */
const GOLD_SPECIFIC = [
  ...SYMBOL_CANDIDATES.gold18,
  ...NAME_PATTERNS.gold18.map((r) => r.source),
];

function isGoldItem(item: BrsPriceItem): boolean {
  const symbol = (item.symbol || "").toUpperCase();
  const name = `${item.name || ""} ${item.name_en || ""}`;
  if (/GOLD|MELTED|ABSHODEH|AYAR|طلا|طلای|مثقال/i.test(symbol + name)) return true;
  return false;
}

/** Find the BrsApi instrument backing one of the app's item ids. */
export function findBrsItem(items: BrsPriceItem[], id: string): BrsPriceItem | null {
  // 1) exact symbol match
  const candidates = SYMBOL_CANDIDATES[id];
  if (candidates) {
    const wanted = new Set(candidates.map((s) => s.toUpperCase()));
    const bySymbol = items.find((it) => wanted.has((it.symbol || "").toUpperCase()));
    if (bySymbol) return bySymbol;
  }

  // 2) name match
  const patterns = NAME_PATTERNS[id];
  if (patterns) {
    const byName = items.find((it) => {
      const text = `${it.name || ""} ${it.name_en || ""}`;
      return patterns.some((p) => p.test(text));
    });
    if (byName) return byName;
  }

  // 3) any leftover gold instrument → gold-gr (safe fallback for renamed rows)
  if (id === "gold-gr") {
    return items.find((it) => isGoldItem(it) && !GOLD_SPECIFIC.some((s) => (it.symbol || "").toUpperCase().includes(s))) ?? null;
  }

  return null;
}

/** Fetch all instruments from the free gold/currency webservice. */
export async function fetchBrsPrices(): Promise<BrsPriceItem[] | null> {
  try {
    const url = `${BRS_API_URL}?key=${encodeURIComponent(BRS_API_KEY)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[brsapi] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    // The free endpoint returns a flat array; be tolerant of a wrapped shape.
    if (Array.isArray(json)) return json as BrsPriceItem[];
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      for (const key of ["data", "items", "result", "results"]) {
        if (Array.isArray(obj[key])) return obj[key] as BrsPriceItem[];
      }
    }
    console.warn("[brsapi] unexpected response shape");
    return null;
  } catch (e) {
    console.warn("[brsapi] fetch error:", e);
    return null;
  }
}
