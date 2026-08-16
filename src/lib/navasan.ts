/**
 * Navasan (نوسان) price webservice — the live source for Arzino.
 *
 * Free plan: 120 requests/month, so the app fetches at most 3 times a day
 * (once every 8 hours — see prices-server.ts).
 *
 * Endpoint: https://api.navasan.tech/latest/?api_key=...
 * Response: object keyed by symbol → { value, change, timestamp, date }.
 * Prices are Jalali date strings and Toman values.
 *
 * Unit quirk: currencies and طلای ۱۸ عیار are reported in Toman, but the
 * high-value instruments (سکه‌ها و مثقال طلای آب‌شده) are reported in
 * thousand-Toman (e.g. سکه امامی = 189000 → 189,000,000 Toman). The
 * PRICE_SCALE map converts them to Toman.
 */

const NAVASAN_API_URL = "https://api.navasan.tech/latest/";
const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY ?? "freeMmx0PZ5L3IsdxRQONjGOvScGury4";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type NavasanItem = {
  value: string;
  change: number | string;
  timestamp: number;
  date: string;
};

export type NavasanItems = Record<string, NavasanItem>;

export type NavasanError = "invalid-key" | "http" | "network" | "shape" | "empty";

export type NavasanResult =
  | { ok: true; items: NavasanItems }
  | { ok: false; error: NavasanError };

/** App item id → navasan symbols (first one with a price wins). */
const SYMBOL_MAP: Record<string, string[]> = {
  usd: ["usd_sell", "usd_farda_sell", "usd_buy"],
  eur: ["eur"],
  gbp: ["gbp"],
  aed: ["aed"],
  try: ["try"],
  gold18: ["18ayar"],
  "gold-gr": ["abshodeh"],
  coin: ["sekkeh"],
  "half-coin": ["nim"],
  tether: ["usdt"],
};

/** Symbol → multiplier to convert the API value to Toman. */
const PRICE_SCALE: Record<string, number> = {
  abshodeh: 1000,
  sekkeh: 1000,
  nim: 1000,
  rob: 1000,
  bahar: 1000,
  gerami: 1000,
};

export function symbolScale(symbol: string): number {
  return PRICE_SCALE[symbol] ?? 1;
}

export function findNavasanItem(
  items: NavasanItems,
  id: string
): { item: NavasanItem; symbol: string } | null {
  const symbols = SYMBOL_MAP[id];
  if (!symbols) return null;
  for (const symbol of symbols) {
    const item = items[symbol];
    if (item && parseNavasanNumber(item.value) != null) return { item, symbol };
  }
  return null;
}

/** Buy/sell rows for instruments that expose them (دلار for now). */
const BUY_SELL: Record<string, { buy?: string; sell?: string }> = {
  usd: { buy: "usd_buy", sell: "usd_sell" },
};

export function navasanBuySell(
  items: NavasanItems,
  id: string
): { buy?: string; sell?: string } {
  const conf = BUY_SELL[id];
  if (!conf) return {};
  return {
    buy: conf.buy && items[conf.buy] ? items[conf.buy].value : undefined,
    sell: conf.sell && items[conf.sell] ? items[conf.sell].value : undefined,
  };
}

export function parseNavasanNumber(value: string | number | undefined | null): number | null {
  if (value == null || value === "") return null;
  const latin = String(value).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const n = parseFloat(latin.replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

/** Newest update across all items — used for the "last update" indicator. */
export function navasanLatestDate(items: NavasanItems): string | null {
  let best: NavasanItem | null = null;
  for (const it of Object.values(items)) {
    if (!best || (it.timestamp || 0) > (best.timestamp || 0)) best = it;
  }
  return best?.date || null;
}

export async function fetchNavasanPrices(): Promise<NavasanResult> {
  try {
    const url = `${NAVASAN_API_URL}?api_key=${encodeURIComponent(NAVASAN_API_KEY)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    if (text.includes("Invalid api_key")) {
      console.warn("[navasan] invalid API key");
      return { ok: false, error: "invalid-key" };
    }
    if (!res.ok) {
      console.warn(`[navasan] HTTP ${res.status}`);
      return { ok: false, error: "http" };
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      console.warn("[navasan] unexpected response shape");
      return { ok: false, error: "shape" };
    }

    if (json && typeof json === "object" && !Array.isArray(json)) {
      const items: NavasanItems = {};
      for (const [key, val] of Object.entries(json as Record<string, unknown>)) {
        if (val && typeof val === "object" && "value" in (val as object)) {
          items[key] = val as NavasanItem;
        }
      }
      if (Object.keys(items).length === 0) return { ok: false, error: "empty" };
      return { ok: true, items };
    }

    console.warn("[navasan] unexpected response shape");
    return { ok: false, error: "shape" };
  } catch (e) {
    console.warn("[navasan] fetch error:", e);
    return { ok: false, error: "network" };
  }
}
