/**
 * Tests for the shared display helpers in `prices.ts` (used by both the
 * server and the client): digit conversion, 24h change formatting and price
 * formatting with thousands separators.
 */
import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatPrice,
  ITEM_ORDER,
  toEnDigits,
  toFaDigits,
} from "./prices";

describe("digit conversion", () => {
  it("converts Latin digits to Persian", () => {
    expect(toFaDigits("186,700")).toBe("۱۸۶,۷۰۰");
    expect(toFaDigits("19,052,130")).toBe("۱۹,۰۵۲,۱۳۰");
  });

  it("converts Persian digits back to Latin", () => {
    expect(toEnDigits("۱۸۶,۷۰۰")).toBe("186,700");
  });

  it("round-trips", () => {
    expect(toEnDigits(toFaDigits("51,320"))).toBe("51,320");
  });
});

describe("formatChange", () => {
  it("formats positive change in Persian", () => {
    expect(formatChange(0.48, "fa")).toBe("+۰٫۵٪");
  });

  it("formats negative change in Persian with the minus sign", () => {
    expect(formatChange(-0.08, "fa")).toBe("−۰٫۱٪");
  });

  it("formats zero change without a sign", () => {
    expect(formatChange(0, "fa")).toBe("۰٫۰٪");
  });

  it("formats positive change in English", () => {
    expect(formatChange(0.48, "en")).toBe("+0.5%");
  });

  it("formats negative change in English", () => {
    expect(formatChange(-12.34, "en")).toBe("-12.3%");
  });
});

describe("formatPrice", () => {
  it("formats prices with thousands separators and Persian digits", () => {
    expect(formatPrice(186700)).toBe("۱۸۶,۷۰۰");
    expect(formatPrice("19052130")).toBe("۱۹,۰۵۲,۱۳۰");
    expect(formatPrice("82,530,000")).toBe("۸۲,۵۳۰,۰۰۰");
    expect(formatPrice(189000000)).toBe("۱۸۹,۰۰۰,۰۰۰");
  });

  it("returns an em dash for missing/empty values", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
    expect(formatPrice("")).toBe("—");
    expect(formatPrice("—")).toBe("—");
  });

  it("treats zero as no data (string and numeric)", () => {
    expect(formatPrice("0")).toBe("—");
    expect(formatPrice(0)).toBe("—");
  });
});

describe("ITEM_ORDER", () => {
  it("covers the canonical watchlist order", () => {
    expect(ITEM_ORDER).toEqual([
      "usd",
      "eur",
      "gbp",
      "aed",
      "try",
      "gold18",
      "gold-gr",
      "coin",
      "half-coin",
      "tether",
      "coin-fardi",
    ]);
  });
});
