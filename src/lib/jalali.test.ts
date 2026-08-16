/**
 * Tests for the Solar Hijri (Jalali) calendar utilities. Dates are built with
 * local-time components (new Date(y, m, ...)) so the results are deterministic
 * regardless of the machine's timezone.
 */
import { describe, expect, it } from "vitest";
import {
  formatGregorianDateLong,
  formatGregorianDateTime,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatTimeSpan,
  gregorianToJalali,
  toEnDigits,
  toFaDigits,
} from "./jalali";

describe("digit conversion", () => {
  it("converts Latin digits to Persian", () => {
    expect(toFaDigits("1405")).toBe("۱۴۰۵");
    expect(toFaDigits("186,700")).toBe("۱۸۶,۷۰۰");
    expect(toFaDigits("20:30:14")).toBe("۲۰:۳۰:۱۴");
  });

  it("accepts numbers for toFaDigits", () => {
    expect(toFaDigits(1405)).toBe("۱۴۰۵");
    expect(toFaDigits(0)).toBe("۰");
  });

  it("converts Persian digits back to Latin", () => {
    expect(toEnDigits("۱۴۰۵")).toBe("1405");
    expect(toEnDigits("۱۸۶,۷۰۰")).toBe("186,700");
  });

  it("round-trips both ways", () => {
    expect(toEnDigits(toFaDigits("2026/08/16"))).toBe("2026/08/16");
  });
});

describe("gregorianToJalali — well-known dates", () => {
  it("converts Nowruz 1403 (2024-03-20) to 1 Farvardin", () => {
    expect(gregorianToJalali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 });
  });

  it("converts the day before Nowruz to the last day of 1402 (non-leap)", () => {
    expect(gregorianToJalali(2024, 3, 19)).toEqual({ jy: 1402, jm: 12, jd: 29 });
  });

  it("converts 2026-08-16 to 25 Mordad 1405 (current app date)", () => {
    expect(gregorianToJalali(2026, 8, 16)).toEqual({ jy: 1405, jm: 5, jd: 25 });
  });

  it("converts the Islamic Revolution date (1979-02-11) to 22 Bahman 1357", () => {
    expect(gregorianToJalali(1979, 2, 11)).toEqual({ jy: 1357, jm: 11, jd: 22 });
  });

  it("converts the start of Mehr (2023-09-23) to 1 Mehr 1402", () => {
    expect(gregorianToJalali(2023, 9, 23)).toEqual({ jy: 1402, jm: 7, jd: 1 });
  });
});

describe("formatting", () => {
  it("formats a Jalali date + time with Persian digits", () => {
    expect(formatJalaliDateTime(new Date(2026, 7, 16, 20, 30, 14))).toBe(
      "۱۴۰۵/۰۵/۲۵ - ۲۰:۳۰:۱۴"
    );
  });

  it("formats a long Jalali date with weekday and month name", () => {
    // 2026-08-16 is a Sunday
    expect(formatJalaliDateLong(new Date(2026, 7, 16))).toBe("یکشنبه ۲۵ مرداد ۱۴۰۵");
  });

  it("formats a Gregorian date + time", () => {
    expect(formatGregorianDateTime(new Date(2026, 7, 16, 20, 30, 14))).toBe(
      "2026/08/16 - 20:30:14"
    );
  });

  it("formats a long Gregorian date in English", () => {
    expect(formatGregorianDateLong(new Date(2026, 7, 16))).toBe(
      "Sunday August 16, 2026"
    );
  });
});

describe("formatTimeSpan", () => {
  it("handles under-a-minute spans", () => {
    expect(formatTimeSpan(0, "fa")).toBe("کمتر از یک دقیقه");
    expect(formatTimeSpan(59_999, "en")).toBe("under a minute");
  });

  it("formats minutes in Persian and English", () => {
    expect(formatTimeSpan(60_000, "fa")).toBe("۱ دقیقهٔ گذشته");
    expect(formatTimeSpan(59 * 60_000, "fa")).toBe("۵۹ دقیقهٔ گذشته");
    expect(formatTimeSpan(5 * 60_000, "en")).toBe("last 5 min");
  });

  it("formats hours (with and without minutes)", () => {
    expect(formatTimeSpan(60 * 60_000, "fa")).toBe("۱ ساعت گذشته");
    expect(formatTimeSpan(3 * 3_600_000, "fa")).toBe("۳ ساعت گذشته");
    expect(formatTimeSpan(90 * 60_000, "fa")).toBe("۱ ساعت و ۳۰ دقیقه گذشته");
    expect(formatTimeSpan(2 * 3_600_000, "en")).toBe("last 2 hr");
    expect(formatTimeSpan(90 * 60_000, "en")).toBe("last 1h 30m");
  });

  it("formats days (with singular/plural in English)", () => {
    expect(formatTimeSpan(25 * 3_600_000, "fa")).toBe("۱ روز گذشته");
    expect(formatTimeSpan(25 * 3_600_000, "en")).toBe("last 1 day");
    expect(formatTimeSpan(50 * 3_600_000, "en")).toBe("last 2 days");
  });

  it("never returns a negative span", () => {
    expect(formatTimeSpan(-5_000, "fa")).toBe("کمتر از یک دقیقه");
    expect(formatTimeSpan(-5_000, "en")).toBe("under a minute");
  });
});
