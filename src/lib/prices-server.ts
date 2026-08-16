/**
 * Server-only price fetching. Kept separate from `prices.ts` so the client
 * bundle never touches Node's `fs`/`path`.
 *
 * Data comes from the Navasan free webservice at most 3 times a day (once
 * every 8 hours). Both the fetched snapshot AND the throttle state are
 * persisted to `var/arzino-cache.json`, so a server restart doesn't burn an
 * extra upstream call.
 */
import { promises as fs } from "fs";
import path from "path";
import { recordLivePrices } from "./live";
import type { NavasanError } from "./navasan";
import {
  formatPrice,
  ITEM_META,
  ITEM_ORDER,
  type PriceItem,
} from "./prices";

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
  { id: "gold-gr", title: "طلای آب‌شده (مثقال)", icon: "✨", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
  { id: "coin-fardi", title: "سکه فردایی", icon: "🏅", price: "0", change: null, changeAbs: null, updatedAt: "", history: [], source: "fallback" },
];

/**
 * Server-side cache: the Navasan free tier is hit at most 3 times a day
 * (once every 8 hours). Failures are also throttled to that cadence so a
 * bad key can't hammer the upstream and get itself banned.
 */
const REFRESH_MS = 8 * 60 * 60 * 1000;
let pricesCache: { data: PriceItem[]; at: number } | null = null;
let lastAttemptAt = 0;

// Exact last-update timestamp from the Navasan response (`date` field,
// e.g. "1405-05-25 19:00:18"), kept in sync with the snapshot.
let dataTimeCache: string | null = null;

// Why live data is unavailable right now (e.g. "invalid-key"), or null.
let dataErrorCache: NavasanError | null = null;

// ---------------------------------------------------------------------------
// Disk persistence: the cache window (8h / 3 requests a day) must survive a
// server restart, otherwise the first request after restart would burn an
// extra upstream call. State is persisted to var/arzino-cache.json on every
// upstream attempt (success or failure) and rehydrated lazily on first use.
// ---------------------------------------------------------------------------

const CACHE_FILE = path.join(process.cwd(), "var", "arzino-cache.json");

const CACHE_VERSION = 2;
const CACHE_SOURCE = "navasan";

type PersistedState = {
  version: number;
  source: string;
  prices: PriceItem[];
  cachedAt: number;
  lastAttemptAt: number;
  dataTime: string | null;
  dataError: NavasanError | null;
};

let stateLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadState(): Promise<void> {
  if (stateLoaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await fs.readFile(CACHE_FILE, "utf8");
        const saved = JSON.parse(raw) as PersistedState;
        if (saved && saved.version === CACHE_VERSION && saved.source === CACHE_SOURCE) {
          if (Array.isArray(saved.prices) && typeof saved.cachedAt === "number") {
            pricesCache = { data: saved.prices, at: saved.cachedAt };
          }
          if (typeof saved.lastAttemptAt === "number") lastAttemptAt = saved.lastAttemptAt;
          if (typeof saved.dataTime === "string" || saved.dataTime === null) dataTimeCache = saved.dataTime;
          if (typeof saved.dataError === "string" || saved.dataError === null) dataErrorCache = saved.dataError as NavasanError | null;
          console.log(`[prices] restored cache from disk (items=${saved.prices?.length ?? 0})`);
        }
      } catch {
        // No cache file yet (first run) or corrupt — start fresh.
      } finally {
        stateLoaded = true;
      }
    })();
  }
  return loadPromise;
}

async function persistState(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const state: PersistedState = {
      version: CACHE_VERSION,
      source: CACHE_SOURCE,
      prices: pricesCache?.data ?? [],
      cachedAt: pricesCache?.at ?? 0,
      lastAttemptAt,
      dataTime: dataTimeCache,
      dataError: dataErrorCache,
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(state), "utf8");
  } catch (e) {
    console.warn("[prices] failed to persist cache:", e);
  }
}

export async function fetchPrices(): Promise<PriceItem[]> {
  await loadState();
  const now = Date.now();
  if (pricesCache && now - pricesCache.at < REFRESH_MS) return pricesCache.data;
  if (now - lastAttemptAt < REFRESH_MS) return fallbackPrices;

  lastAttemptAt = now;
  try {
    const {
      fetchNavasanPrices,
      findNavasanItem,
      navasanBuySell,
      navasanLatestDate,
      parseNavasanNumber,
      symbolScale,
    } = await import("./navasan");
    const result = await fetchNavasanPrices();

    if (result.ok && Object.keys(result.items).length > 0) {
      const prices: PriceItem[] = [];
      for (const id of ITEM_ORDER) {
        const meta = ITEM_META[id];
        if (!meta) continue;
        const found = findNavasanItem(result.items, id);
        if (!found) continue;
        const { item, symbol } = found;
        const scale = symbolScale(symbol);
        const raw = parseNavasanNumber(item.value);
        const price = raw == null ? null : raw * scale;
        if (price == null || price <= 0) continue;

        const rawChange = parseNavasanNumber(item.change);
        const prev = raw != null && rawChange != null ? raw - rawChange : null;
        const changePercent =
          rawChange != null && prev != null && prev > 0
            ? Number(((rawChange / prev) * 100).toFixed(2))
            : null;

        const bs = navasanBuySell(result.items, id);
        const buyRaw = bs.buy ? parseNavasanNumber(bs.buy) : null;
        const sellRaw = bs.sell ? parseNavasanNumber(bs.sell) : null;

        prices.push({
          id,
          title: meta.title,
          icon: meta.icon,
          price: formatPrice(price),
          change: changePercent,
          changeAbs: rawChange != null ? Math.round(rawChange * scale) : null,
          updatedAt: (item.date || "").slice(11, 16),
          history: [],
          buyPrice: buyRaw != null ? formatPrice(buyRaw * scale) : undefined,
          sellPrice: sellRaw != null ? formatPrice(sellRaw * scale) : undefined,
          source: "navasan",
        });
      }
      if (prices.length > 0) return finalize(prices, navasanLatestDate(result.items));
    }

    // No usable data — record why, clear any stale snapshot time, fall back.
    dataTimeCache = null;
    dataErrorCache = result.ok ? "empty" : result.error;
    console.warn("[prices] Navasan unavailable — using static fallback data");
    await persistState();
    return fallbackPrices;
  } catch (e) {
    console.warn("[prices] Navasan failed:", e);
    dataTimeCache = null;
    dataErrorCache = "network";
    await persistState();
    return fallbackPrices;
  }
}

/** The exact time Navasan last updated the data ("1405-05-25 19:00:18"), or null. */
export function getDataTime(): string | null {
  return dataTimeCache;
}

/** Why live data is unavailable (e.g. "invalid-key"), or null when it's fine. */
export function getDataError(): NavasanError | null {
  return dataErrorCache;
}

/** When the current data expires / the next upstream fetch happens (unix ms). */
export function getNextRefreshAt(): number | null {
  const base = pricesCache ? pricesCache.at : lastAttemptAt;
  if (!base) return null;
  const next = base + REFRESH_MS;
  return next > Date.now() ? next : null;
}

async function finalize(items: PriceItem[], dataTime: string | null): Promise<PriceItem[]> {
  recordLivePrices(items);
  pricesCache = { data: items, at: Date.now() };
  dataTimeCache = dataTime;
  dataErrorCache = null;
  await persistState();
  console.log(`[prices] source=navasan, items=${items.length}`);
  return items;
}
