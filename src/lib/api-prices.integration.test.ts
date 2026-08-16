/**
 * Integration tests for `GET /api/prices` using supertest against the real
 * Next route handler (NextResponse included). The Navasan network call is
 * mocked, the cache file is redirected into a temp dir, and `Date.now` is
 * controlled so the 8h window is deterministic.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import type { NavasanItem } from "./navasan";

const PROJECT_ROOT = process.cwd();
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

const mocks = vi.hoisted(() => ({
  fetchNavasanPrices: vi.fn<(items?: Record<string, NavasanItem>) => unknown>(),
}));

vi.mock("./navasan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./navasan")>();
  return {
    ...actual,
    fetchNavasanPrices: mocks.fetchNavasanPrices,
  };
});

let tmpDir: string;
let nowMs: number;
const T0 = 1_750_000_000_000;

type GetRoute = typeof import("@/app/api/prices/route").GET;
let GET: GetRoute;

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

// Exposes the real route handler over HTTP for supertest.
let server: http.Server;
beforeAll(() => {
  server = http.createServer((req, res) => {
    GET()
      .then(async (response) => {
        res.statusCode = response.status;
        for (const [key, value] of response.headers.entries()) res.setHeader(key, value);
        res.end(await response.text());
      })
      .catch((err) => {
        res.statusCode = 500;
        res.end(String(err));
      });
  });
});

afterAll(() => server.close());

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arzino-int-"));
  process.chdir(tmpDir);
  nowMs = T0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  mocks.fetchNavasanPrices.mockReset();
  vi.resetModules();
  const route = await import("@/app/api/prices/route");
  GET = route.GET;
});

afterEach(() => {
  process.chdir(PROJECT_ROOT);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("GET /api/prices — integration", () => {
  it("returns the full JSON shape on success", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });

    const res = await request(server).get("/api/prices");

    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { id: string; price: string; history: unknown[] }[];
      dataTime: string;
      error: string | null;
      nextRefresh: number;
      timestamp: string;
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(10);
    expect(body.data.find((i) => i.id === "usd")!.price).toBe("۱۸۶,۷۰۰");
    expect(typeof body.dataTime).toBe("string");
    expect(body.dataTime).toBe("1405-05-25 20:00:45");
    expect(body.error).toBeNull();
    expect(typeof body.nextRefresh).toBe("number");
    expect(body.nextRefresh).toBe(T0 + EIGHT_HOURS_MS);
    expect(typeof body.timestamp).toBe("string");
    // every asset carries its real live-history array
    for (const item of body.data) expect(Array.isArray(item.history)).toBe(true);
  });

  it("reports invalid-key and serves fallback data, still with a nextRefresh", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: false, error: "invalid-key" });

    const res = await request(server).get("/api/prices");

    expect(res.status).toBe(200);
    const body = res.body as {
      data: { price: string }[];
      dataTime: string | null;
      error: string | null;
      nextRefresh: number;
    };
    expect(body.error).toBe("invalid-key");
    expect(body.dataTime).toBeNull();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((i) => i.price === "0")).toBe(true);
    expect(typeof body.nextRefresh).toBe("number");
    expect(body.nextRefresh).toBe(T0 + EIGHT_HOURS_MS);
  });

  it("reports network errors and serves fallback data over HTTP, throttled inside the window", async () => {
    // the upstream fetch itself throws — the catch path sets error="network"
    mocks.fetchNavasanPrices.mockRejectedValue(new Error("fetch failed (ECONNREFUSED)"));

    const res = await request(server).get("/api/prices");

    expect(res.status).toBe(200);
    const body = res.body as {
      data: { price: string }[];
      dataTime: string | null;
      error: string | null;
      nextRefresh: number;
    };
    expect(body.error).toBe("network");
    expect(body.dataTime).toBeNull();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((i) => i.price === "0")).toBe(true);
    expect(body.nextRefresh).toBe(T0 + EIGHT_HOURS_MS);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // a second request inside the 8h window does NOT retry the broken
    // upstream — it keeps serving fallback with the same error
    const second = await request(server).get("/api/prices");
    expect(second.status).toBe(200);
    expect(second.body.error).toBe("network");
    expect(second.body.data.every((i: { price: string }) => i.price === "0")).toBe(true);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
  });

  it("serves cached data inside the 8h window with a single upstream call", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });

    const first = await request(server).get("/api/prices");
    expect(first.status).toBe(200);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
    expect(String(first.headers["cache-control"])).toContain("s-maxage=60");

    const second = await request(server).get("/api/prices");
    expect(second.status).toBe(200);
    expect(second.body.dataTime).toBe("1405-05-25 20:00:45");
    // still no second upstream call — served from the 8h cache
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);
  });

  it("refetches after the 8h window expires and serves the updated mock prices", async () => {
    mocks.fetchNavasanPrices.mockResolvedValue({ ok: true, items: navasanItems() });

    // first fetch inside the window — cached with the initial prices
    const first = await request(server).get("/api/prices");
    expect(first.status).toBe(200);
    expect(first.body.data.find((i: { id: string }) => i.id === "usd")!.price).toBe("۱۸۶,۷۰۰");
    expect(first.body.dataTime).toBe("1405-05-25 20:00:45");
    expect(first.body.nextRefresh).toBe(T0 + EIGHT_HOURS_MS);
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(1);

    // advance time past the 8h window and change the upstream prices
    nowMs = T0 + EIGHT_HOURS_MS + 60_000;
    mocks.fetchNavasanPrices.mockResolvedValue({
      ok: true,
      items: navasanItems({
        usd_sell: { value: "190000", change: 3300 },
        usdt: { value: "186100", change: 300, timestamp: 11, date: "1405-05-26 08:00:00" },
      }),
    });

    const second = await request(server).get("/api/prices");
    expect(second.status).toBe(200);
    // the API refetched upstream and now serves the new prices + new dataTime
    expect(second.body.data.find((i: { id: string }) => i.id === "usd")!.price).toBe("۱۹۰,۰۰۰");
    expect(second.body.data.find((i: { id: string }) => i.id === "tether")!.price).toBe("۱۸۶,۱۰۰");
    expect(second.body.dataTime).toBe("1405-05-26 08:00:00");
    expect(mocks.fetchNavasanPrices).toHaveBeenCalledTimes(2);
    // the new 8h window is anchored to the refetch time
    expect(second.body.nextRefresh).toBe(nowMs + EIGHT_HOURS_MS);
  });
});
