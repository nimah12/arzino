/**
 * Tests for `blendSeries` — the real-history + synthetic continuation used by
 * the chart when the live buffer has at least one real {t, p} sample.
 */
import { describe, expect, it } from "vitest";
import { blendSeries } from "./PriceChart";

describe("blendSeries", () => {
  it("keeps every real sample and appends a 14-point continuation", () => {
    const real = [186300, 186500, 186700];
    const series = blendSeries("usd", real, 186700);

    expect(series).toHaveLength(real.length + 14);
    expect(series[0]).toBe(186300); // first real point untouched
    expect(series[real.length - 1]).toBe(186700); // last real point untouched
  });

  it("works with a single real sample (buffer just started)", () => {
    const series = blendSeries("usd", [186700], 186700);
    expect(series).toHaveLength(15);
    expect(series[0]).toBe(186700);
  });

  it("converges the tail toward the current price and stays in a sane band", () => {
    const base = 19_052_130;
    const series = blendSeries("gold18", [19_050_000, 19_051_000, 19_052_000], base);

    const last = series[series.length - 1];
    expect(Math.abs(last - base) / base).toBeLessThan(0.01);
    for (const v of series) {
      expect(v).toBeGreaterThan(0);
      expect(Math.abs(v - base) / base).toBeLessThan(0.05);
    }
  });

  it("is deterministic for the same inputs and differs per asset", () => {
    const real = [186700];
    const a = blendSeries("usd", real, 186700);
    const b = blendSeries("usd", real, 186700);
    expect(a).toEqual(b);

    const other = blendSeries("tether", real, 186700);
    expect(other).not.toEqual(a);
  });

  it("blends {t,p} history the same way the chart extracts it", () => {
    const now = 1_750_000_000_000;
    const history = [
      { t: now - 120_000, p: 186500 },
      { t: now - 60_000, p: 186600 },
      { t: now, p: 186700 },
    ];
    const prices = history.map((s) => s.p); // what PriceChart's useMemo does
    const series = blendSeries("usd", prices, 186700);

    expect(series).toHaveLength(history.length + 14);
    expect(series[0]).toBe(186500);
  });
});
