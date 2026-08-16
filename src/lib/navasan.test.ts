/**
 * Tests for the Navasan adapter (`navasan.ts`) — pure helpers used by the
 * 8h cache: unit scaling, number parsing (incl. Persian digits), symbol
 * fallback chains and newest-date picking.
 */
import { describe, expect, it } from "vitest";
import {
  findNavasanItem,
  navasanLatestDate,
  parseNavasanNumber,
  symbolScale,
  type NavasanItem,
} from "./navasan";

function item(value: string, overrides: Partial<NavasanItem> = {}): NavasanItem {
  return { value, change: 0, timestamp: 0, date: "1405-05-25 20:00:00", ...overrides };
}

describe("symbolScale", () => {
  it("scales thousand-Toman instruments by 1000", () => {
    for (const symbol of ["abshodeh", "sekkeh", "nim", "rob", "bahar", "gerami"]) {
      expect(symbolScale(symbol)).toBe(1000);
    }
  });

  it("returns 1 for Toman-denominated and unknown symbols", () => {
    expect(symbolScale("usd_sell")).toBe(1);
    expect(symbolScale("18ayar")).toBe(1);
    expect(symbolScale("usdt")).toBe(1);
    expect(symbolScale("unknown")).toBe(1);
  });
});

describe("parseNavasanNumber", () => {
  it("parses Latin-digit strings", () => {
    expect(parseNavasanNumber("186700")).toBe(186700);
    expect(parseNavasanNumber("19,052,130")).toBe(19052130);
  });

  it("parses Persian digits (including separators)", () => {
    expect(parseNavasanNumber("۱۸۶۷۰۰")).toBe(186700);
    expect(parseNavasanNumber("۱۹,۰۵۲,۱۳۰")).toBe(19052130);
    expect(parseNavasanNumber("۳,۹۰۰")).toBe(3900);
  });

  it("handles negative values in both digit sets", () => {
    expect(parseNavasanNumber("-15000")).toBe(-15000);
    expect(parseNavasanNumber("-۱۵۰۰۰")).toBe(-15000);
  });

  it("accepts plain numbers", () => {
    expect(parseNavasanNumber(186700)).toBe(186700);
    expect(parseNavasanNumber(0)).toBe(0);
  });

  it("returns null for empty, absent or unparseable values", () => {
    expect(parseNavasanNumber(null)).toBeNull();
    expect(parseNavasanNumber(undefined)).toBeNull();
    expect(parseNavasanNumber("")).toBeNull();
    expect(parseNavasanNumber("—")).toBeNull();
    expect(parseNavasanNumber("abc")).toBeNull();
  });
});

describe("findNavasanItem", () => {
  it("returns the primary symbol when present", () => {
    const items = { usd_sell: item("186700"), usd_buy: item("186300") };
    const found = findNavasanItem(items, "usd");
    expect(found?.symbol).toBe("usd_sell");
    expect(found?.item.value).toBe("186700");
  });

  it("falls back to the next symbol when the first is absent", () => {
    const items = { usd_farda_sell: item("187000") };
    const found = findNavasanItem(items, "usd");
    expect(found?.symbol).toBe("usd_farda_sell");
  });

  it("skips symbols whose value cannot be parsed", () => {
    const items = { usd_sell: item("—"), usd_buy: item("186300") };
    const found = findNavasanItem(items, "usd");
    expect(found?.symbol).toBe("usd_buy");
  });

  it("returns null when nothing is present or parseable", () => {
    expect(findNavasanItem({}, "usd")).toBeNull();
    expect(findNavasanItem({ usd_sell: item("—") }, "usd")).toBeNull();
  });

  it("returns null for unknown asset ids", () => {
    expect(findNavasanItem({}, "unknown-id")).toBeNull();
  });

  it("maps gold18 to the 18ayar symbol", () => {
    const items = { "18ayar": item("19052130") };
    expect(findNavasanItem(items, "gold18")?.symbol).toBe("18ayar");
  });
});

describe("navasanLatestDate", () => {
  it("picks the date of the sample with the newest timestamp", () => {
    const items = {
      a: item("1", { timestamp: 100, date: "1405-05-25 19:00:00" }),
      b: item("2", { timestamp: 200, date: "1405-05-25 20:00:00" }),
      c: item("3", { timestamp: 150, date: "1405-05-25 19:30:00" }),
    };
    expect(navasanLatestDate(items)).toBe("1405-05-25 20:00:00");
  });

  it("returns null for an empty snapshot", () => {
    expect(navasanLatestDate({})).toBeNull();
  });
});
