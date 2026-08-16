/**
 * Unit tests for the 8-hour price cache (`prices-server.ts`).
 *
 * The Navasan network call is mocked (no real API requests), the cache file
 * is redirected into a temp directory via `process.chdir`, and time is
 * controlled with a `Date.now` spy so the 8h window can be advanced
 * deterministically. Each test gets a fresh module instance (and therefore
 * fresh cache state) through `vi.resetModules()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NavasanItem, NavasanResult } from "./navasan";

const PROJECT_ROOT = process.cwd();
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

// Hoisted so the mock factory (registered before the test runs) can reach it.
const mocks = vi.hoisted(() => ({
  fetchNavasanPrices: vi.fn<(items?: Record<string, NavasanItem>) => NavasanResult | Promise<NavasanResult>>(),
}));

vi.mock("./navasan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./navasan")>();
  return {
    ...actual,
    // Only the network call is mocked; the pure helpers (symbol mapping,
    // unit scaling, date picking) stay real so the tests exercise them.
    fetchNavasanPrices: mocks.fetchNavasanPrices,
  };
});

let tmpDir: string;
let nowMs: number;

/** Fixed baseline so 8h-window math is exact and reproducible. */
const T0 = 1_750_000_000_000;

function advance(ms: number): void {
  nowMs += ms;
}

/** A full Navasan snapshot covering every tracked asset. */
function navasanItems(
  overrides: Record<string, Partial<NavasanItem>> = {}
): Record<string, NavasanItem> {
  const base: Record<string, NavasanItem> = {
    usd_sell: { value: "186700", change: 900, timestamp: 1, date: "1405-05-25 20:00:00" },
    usd_buy: { value: "186300", change: 900, timestamp: 1, date: "1405-05-25 20:00:00" },
    eur: { value: "215960", change: 1040, timestamp: 2, date: "1405-05-25 20:00:05" },
    gbp: { value: "252540", change: 1230, timestamp: 3, date: "1405-05-25 20:00:10" },
    aed: { value: "51320", change: 220, timestamp: 4, date: "1405-05-25 20:00:15" },
    try: { value: "3900", change: 20, timestamp: 5, date: "1405-05-25 20:00:20" },
    "18ayar": { value: "19052130", change: -15000, timestamp: 6, date: "1405-05-25 20:00:25" },
    abshodeh: { value: "82530", change: -7000, timestamp: 7, date: "1405-05-25 20:00:30" },
    sekkeh: { value: "189000", change: 0, timestamp: 8, date: "1405-05-25 20:00:35" },
    nim: { value: "96500", change: 0, timestamp: 9, date: "1405-05-25 20:00:40" },
    usdt: { value: "185800", change: 600, timestamp: 10, date: "1405-05-25 20:00:45" },
  };
  for (const [symbol, patch] of Object.entries(overrides)) {
    base[symbol] = { ...base[symbol], ...patch };
  }
  return base;
}

async function loadPricesModule() {
  return await import("./prices-server");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arzino-test-"));
  process.chdir(tmpDir);
  nowMs = T0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  mocks.fetchNavasanPrices.mockReset();
  vi.resetModules();
});

afterEach(() => {
  process.chdir(PROJECT_ROOT);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("fetchPrices — 8h cache", () => {
  it("fetches from Navasan once, maps units/scales, and sets metadata", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });
    const mod = await loadPricesModule();

    const prices = await mod.fetchPrices();

    expect(prices).toHaveLength(10);
    const usd = prices.find((p) => p.id === "usd")!;
    expect(usd.price).toBe("۱۸۶,۷۰۰");
    expect(usd.buyPrice).toBe("۱۸۶,۳۰۰");
    expect(usd.change).toBeCloseTo(0.48, 1);
    // thousand-Toman instruments are scaled ×1000
    expect(prices.find((p) => p.id === "gold18")!.price).toBe("۱۹,۰۵۲,۱۳۰");
    expect(prices.find((p) => p.id === "gold-gr")!.price).toBe("۸۲,۵۳۰,۰۰۰");
    expect(prices.find((p) => p.id === "coin")!.price).toBe("۱۸۹,۰۰۰,۰۰۰");
    expect(prices.find((p) => p.id === "half-coin")!.price).toBe("۹۶,۵۰۰,۰۰۰");

    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
    // newest timestamp across the snapshot wins
    expect(mod.getDataTime()).toBe("1405-05-25 20:00:45");
    expect(mod.getDataError()).toBeNull();
    // next refresh is exactly 8h after the fetch
    expect(mod.getNextRefreshAt()).toBe(T0 + EIGHT_HOURS_MS);
  });

  it("serves from cache inside the 8h window without another upstream call, and grows live history", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });
    const mod = await loadPricesModule();

    await mod.fetchPrices();
    const first = (await mod.fetchPrices()).find((p) => p.id === "usd")!;
    expect(first.history).toHaveLength(1);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // a minute later the poll records a heartbeat, still no upstream call
    advance(60_000);
    const second = (await mod.fetchPrices()).find((p) => p.id === "usd")!;
    expect(second.history).toHaveLength(2);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
    expect(second.price).toBe("۱۸۶,۷۰۰");
  });

  it("refetches from Navasan after the 8h window expires", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });
    const mod = await loadPricesModule();

    await mod.fetchPrices();
    advance(EIGHT_HOURS_MS + 1_000);

    const prices = await mod.fetchPrices();
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(2);
    expect(prices.find((p) => p.id === "usd")!.source).toBe("navasan");
    expect(mod.getNextRefreshAt()).toBe(T0 + EIGHT_HOURS_MS + 1_000 + EIGHT_HOURS_MS);
  });

  it("throttles failures too: invalid key → fallback, and retries only after 8h", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: false, error: "invalid-key" });
    const mod = await loadPricesModule();

    const first = await mod.fetchPrices();
    expect(first.every((p) => p.price === "0")).toBe(true);
    expect(mod.getDataError()).toBe("invalid-key");
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // an immediate retry is blocked by the throttle
    const again = await mod.fetchPrices();
    expect(again.every((p) => p.price === "0")).toBe(true);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // after 8h the next poll retries and recovers
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });
    advance(EIGHT_HOURS_MS + 1_000);
    const recovered = await mod.fetchPrices();
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(2);
    expect(recovered.find((p) => p.id === "usd")!.price).toBe("۱۸۶,۷۰۰");
    expect(mod.getDataError()).toBeNull();
  });
});

describe("fetchPrices — disk persistence (restart survival)", () => {
  it("restores prices and live history from disk without an extra upstream call", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });

    // First "server run": fetch once, then let the buffer grow to 2 samples.
    let mod = await loadPricesModule();
    await mod.fetchPrices();
    advance(60_000);
    await mod.fetchPrices();
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // "Restart": fresh module instance in the same working directory.
    vi.resetModules();
    mod = await loadPricesModule();
    const prices = await mod.fetchPrices();

    // No upstream call after restart — everything came from disk.
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
    const usd = prices.find((p) => p.id === "usd")!;
    expect(usd.price).toBe("۱۸۶,۷۰۰");
    expect(usd.history).toHaveLength(2);
    expect(mod.getDataTime()).toBe("1405-05-25 20:00:45");

    // The restored history keeps growing on subsequent polls.
    advance(60_000);
    const usdAfter = (await mod.fetchPrices()).find((p) => p.id === "usd")!;
    expect(usdAfter.history).toHaveLength(3);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
  });
});
