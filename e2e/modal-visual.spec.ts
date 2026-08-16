/**
 * Visual test for the watchlist and the large chart modal:
 *  - the chart line color matches the 24h change badge (▲ green / ▼ red),
 *  - asset icon and overview-card label colors follow the theme
 *    (gold instruments → --gold, currencies → --accent),
 *  - verified in BOTH themes (dark/light) × BOTH locales (fa/en),
 *  - a full-page screenshot of the watchlist (header, overview cards, table)
 *    and a modal screenshot are captured for every combination.
 *
 * /api/prices is intercepted with fixed data so the test never depends on
 * the live Navasan API or the API key.
 */
import { expect, test, type Locator } from "@playwright/test";

/** Theme token values from globals.css (resolved RGB). */
const THEME_COLORS = {
  dark: {
    up: [31, 166, 125], // --up    #1fa67d
    down: [229, 72, 77], // --down  #e5484d
    gold: [201, 162, 39], // --gold  #c9a227
    accent: [76, 141, 255], // --accent #4c8dff
  },
  light: {
    up: [13, 155, 114], // --up    #0d9b72
    down: [217, 48, 54], // --down  #d93036
    gold: [184, 134, 11], // --gold  #b8860b
    accent: [47, 111, 228], // --accent #2f6fe4
  },
} as const;

/** Localized asset titles used to locate rows/cards per locale. */
const TITLES = {
  fa: { usd: "دلار آمریکا", gold: "طلای ۱۸ عیار", tether: "تتر (USDT)" },
  en: { usd: "US Dollar", gold: "Gold 18k", tether: "Tether (USDT)" },
} as const;

/** Fixed snapshot served instead of the real API. */
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
      history: [
        { t: now - 60_000, p: 186300 },
        { t: now, p: 186700 },
      ],
      buyPrice: "۱۸۶,۳۰۰",
      sellPrice: "۱۸۶,۷۰۰",
      source: "test",
    },
    {
      id: "gold18",
      title: "طلای ۱۸ عیار",
      price: "۱۹,۰۴۰,۵۸۰",
      change: -0.08,
      changeAbs: -15200,
      updatedAt: "20:00",
      history: [
        { t: now - 60_000, p: 19052130 },
        { t: now, p: 19040580 },
      ],
      source: "test",
    },
    {
      id: "tether",
      title: "تتر (USDT)",
      price: "۱۸۶,۳۰۰",
      change: 0.3,
      changeAbs: 500,
      updatedAt: "20:00",
      history: [],
      source: "test",
    },
  ];
}

function parseRgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`cannot parse color: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

async function colorOf(locator: Locator, prop: "color" | "stroke"): Promise<[number, number, number]> {
  const value = await locator.evaluate((el, p) => getComputedStyle(el)[p], prop);
  return parseRgb(String(value));
}

test("chart line matches the change badge and colors follow the theme (both locales)", async ({ browser }) => {
  for (const theme of ["dark", "light"] as const) {
    for (const locale of ["fa", "en"] as const) {
      await test.step(`theme=${theme} locale=${locale}`, async () => {
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

        await page.addInitScript(
          ({ t, l }) => {
            localStorage.setItem("arzino-theme", t);
            localStorage.setItem("arzino-locale", l);
          },
          { t: theme, l: locale }
        );

        await page.goto("/");
        await expect(page.locator("tbody tr")).toHaveCount(3);
        // the theme actually applied
        if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);

        const c = THEME_COLORS[theme];
        const titles = TITLES[locale];

        // USD — positive change: green line must equal the green badge; accent icon
        const usdRow = page.locator("tbody tr", { hasText: titles.usd });
        await expect(await colorOf(usdRow.locator(".chart-line"), "stroke")).toEqual(c.up);
        await expect(await colorOf(usdRow.locator("span", { hasText: /[٪%]/ }).first(), "color")).toEqual(c.up);
        await expect(await colorOf(usdRow.locator("svg.lucide").first(), "color")).toEqual(c.accent);

        // Gold 18 — negative change: red line must equal the red badge; gold icon
        const goldRow = page.locator("tbody tr", { hasText: titles.gold });
        await expect(await colorOf(goldRow.locator(".chart-line"), "stroke")).toEqual(c.down);
        await expect(await colorOf(goldRow.locator("span", { hasText: /[٪%]/ }).first(), "color")).toEqual(c.down);
        await expect(await colorOf(goldRow.locator("svg.lucide").first(), "color")).toEqual(c.gold);

        // Overview cards: labels harmonize with the icon colors
        const usdCard = page.locator(".overview-card", { hasText: titles.usd });
        await expect(await colorOf(usdCard.locator(".overview-label"), "color")).toEqual(c.accent);
        const goldCard = page.locator(".overview-card", { hasText: titles.gold });
        await expect(await colorOf(goldCard.locator(".overview-label"), "color")).toEqual(c.gold);

        // Full-page screenshot: header, meta bar, overview cards, table, footer
        await page.screenshot({ path: `test-results/full-${theme}-${locale}.png`, fullPage: true });

        // Open the large modal and verify the line color there too
        await goldRow.locator(".chart-cell-btn").click();
        const modal = page.locator(".modal-panel");
        await expect(modal).toBeVisible();
        await expect(modal.locator(".chart-line")).toBeVisible();
        await expect(await colorOf(modal.locator(".chart-line"), "stroke")).toEqual(c.down);

        // Pixel-perfect snapshot vs. the committed baseline (e2e/modal-visual.spec.ts-snapshots/).
        // Regenerate with: npx playwright test --update-snapshots
        await expect(modal).toHaveScreenshot(`modal-${theme}-${locale}.png`, { animations: "disabled" });

        await modal.screenshot({ path: `test-results/modal-${theme}-${locale}.png` });
        await context.close();
      });
    }
  }
});
