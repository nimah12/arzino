/**
 * E2E test for the page-wide uniform palette toggle:
 *  - default (colored): asset icons and overview-card labels use the per-asset
 *    colors (currencies → --accent, gold → --gold), and the table headers
 *    «دارایی»/«روند» are accent/gold with the accent→gold gradient line,
 *  - uniform mode: icons, card labels AND the table headers all revert to
 *    neutral tokens (--text-secondary for icons/labels, --text-tertiary for
 *    headers) and the header gradient line disappears,
 *  - toggling back restores the colored palette.
 *
 * Verified in both themes. /api/prices is intercepted with fixed data.
 */
import { expect, test } from "@playwright/test";

const THEME_COLORS = {
  dark: {
    accent: [76, 141, 255],
    gold: [201, 162, 39],
    textSecondary: [132, 141, 156],
    textTertiary: [86, 95, 112],
  },
  light: {
    accent: [47, 111, 228],
    gold: [184, 134, 11],
    textSecondary: [86, 97, 114],
    textTertiary: [139, 148, 163],
  },
} as const;

function makeItems() {
  const now = Date.now();
  return [
    {
      id: "usd",
      title: "دلار آمریکا",
      price: "۱۸۶,۷۰۰",
      change: 0.48,
      changeAbs: 900,
      updatedAt: "20:00",
      history: [{ t: now - 60_000, p: 186300 }, { t: now, p: 186700 }],
      source: "test",
    },
    {
      id: "gold18",
      title: "طلای ۱۸ عیار",
      price: "۱۹,۰۴۰,۵۸۰",
      change: -0.08,
      changeAbs: -15200,
      updatedAt: "20:00",
      history: [{ t: now - 60_000, p: 19052130 }, { t: now, p: 19040580 }],
      source: "test",
    },
  ];
}

function parseRgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`cannot parse color: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

test("uniform toggle reverts icons, card labels and headers to neutral, and back", async ({ browser }) => {
  for (const theme of ["dark", "light"] as const) {
    await test.step(`theme=${theme}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route("**/api/prices", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: makeItems(),
            dataTime: "1405-05-25 20:00:00",
            error: null,
            nextRefresh: Date.now() + 8 * 3_600_000,
            timestamp: new Date().toISOString(),
          }),
        })
      );
      await page.addInitScript(({ t }) => {
        localStorage.setItem("arzino-theme", t);
        localStorage.setItem("arzino-locale", "fa");
      }, { t: theme });
      await page.goto("/");
      await expect(page.locator("tbody tr")).toHaveCount(2);

      const c = THEME_COLORS[theme];
      const usdRow = page.locator("tbody tr", { hasText: "دلار آمریکا" });
      const usdIcon = usdRow.locator("svg.lucide").first();
      const usdLabel = page.locator(".overview-card", { hasText: "دلار آمریکا" }).locator(".overview-label");
      const goldRow = page.locator("tbody tr", { hasText: "طلای ۱۸ عیار" });
      const goldIcon = goldRow.locator("svg.lucide").first();
      const assetHeader = page.locator("thead th").nth(0);
      const trendHeader = page.locator("thead th").nth(5);
      const toggle = page.locator("button.uniform-btn");
      const gradientSource = () =>
        page.locator("thead tr").evaluate((el) => getComputedStyle(el).borderImageSource);

      // ---- colored defaults ----
      await expect(usdIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(usdLabel.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(goldIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.gold);
      await expect(assetHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(trendHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.gold);
      await expect.poll(gradientSource).toContain("linear-gradient");

      // ---- uniform mode ----
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(usdIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.textSecondary);
      await expect(usdLabel.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.textSecondary);
      await expect(goldIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.textSecondary);
      await expect(assetHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.textTertiary);
      await expect(trendHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.textTertiary);
      // header gradient line loses the accent/gold colors (neutral border)
      await expect.poll(gradientSource).not.toContain(c.accent.join(", "));
      await expect.poll(gradientSource).not.toContain(c.gold.join(", "));

      // ---- back to colored ----
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await expect(usdIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(usdLabel.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(goldIcon.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.gold);
      await expect(assetHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.accent);
      await expect(trendHeader.evaluate((el) => getComputedStyle(el).color).then(parseRgb)).resolves.toEqual(c.gold);
      await expect.poll(gradientSource).toContain(c.accent.join(", "));
      await expect.poll(gradientSource).toContain(c.gold.join(", "));

      await context.close();
    });
  }
});
