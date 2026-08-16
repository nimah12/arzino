/**
 * E2E test for the error states of the watchlist:
 *  - when the API reports an invalid key (`error: "invalid-key"`), the app
 *    shows a clear localized banner instead of silently rendering dashes,
 *  - the table falls back to static zero-price rows (price "0", change/buy/
 *    sell/time all "—") for every asset,
 *  - the same behavior applies to a generic upstream failure
 *    (`error: "network"` → dataUnavailable message).
 *
 * /api/prices is intercepted with a mocked error response so the test never
 * depends on the live Navasan API or the API key. Verified in fa + en.
 */
import { expect, test, type Page } from "@playwright/test";

/** Same ids/titles as the server-side fallback list in src/lib/prices-server.ts. */
const FALLBACK_ITEMS: { id: string; title: string }[] = [
  { id: "usd", title: "دلار آمریکا" },
  { id: "eur", title: "یورو" },
  { id: "gbp", title: "پوند انگلیس" },
  { id: "aed", title: "درهم امارات" },
  { id: "try", title: "لیر ترکیه" },
  { id: "gold18", title: "طلای ۱۸ عیار" },
  { id: "coin", title: "سکه امامی" },
  { id: "half-coin", title: "نیم سکه" },
  { id: "tether", title: "تتر (USDT)" },
  { id: "gold-gr", title: "طلای آب‌شده (مثقال)" },
  { id: "coin-fardi", title: "سکه فردایی" },
];

/** Banner texts per locale — partial regexes (matched via getByText). */
const BANNERS: Record<"fa" | "en", { invalidKey: RegExp; dataUnavailable: RegExp }> = {
  fa: {
    invalidKey: /کلید API نامعتبر است/,
    dataUnavailable: /دریافت قیمت‌های زنده ناموفق بود/,
  },
  en: {
    invalidKey: /Invalid API key/,
    dataUnavailable: /Couldn't fetch live prices/,
  },
};

/** Exact server fallback shape: zero prices, no change, no timestamps. */
function makeFallbackItems() {
  return FALLBACK_ITEMS.map(({ id, title }) => ({
    id,
    title,
    price: "0",
    change: null,
    changeAbs: null,
    updatedAt: "",
    history: [],
    source: "fallback",
  }));
}

/** Same envelope the real route returns, with the given upstream error. */
function makeErrorResponse(error: string): string {
  return JSON.stringify({
    success: true,
    data: makeFallbackItems(),
    dataTime: null,
    error,
    nextRefresh: Date.now() + 8 * 3_600_000,
    timestamp: new Date().toISOString(),
  });
}

/** The fallback table + overview cards: all 11 rows, every value a "—". */
async function expectFallbackTable(page: Page): Promise<void> {
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(11);

  // price "0" (both locales keep the Latin digit)
  await expect(rows.locator("td:nth-child(2)")).toHaveText(Array(11).fill("0"));
  // buy / sell / 24h change / last-update time — all "—"
  await expect(rows.locator("td:nth-child(3)")).toHaveText(Array(11).fill("—"));
  await expect(rows.locator("td:nth-child(4)")).toHaveText(Array(11).fill("—"));
  await expect(rows.locator("td:nth-child(5)")).toHaveText(Array(11).fill("—"));
  await expect(rows.locator("td:nth-child(7)")).toHaveText(Array(11).fill("—"));

  // overview cards render too, with "—" change
  await expect(page.locator(".overview-card")).toHaveCount(4);
  await expect(page.locator(".overview-change")).toHaveText(Array(4).fill("—"));
}

async function setupErrorPage(
  page: Page,
  locale: "fa" | "en",
  error: string
): Promise<void> {
  await page.route("**/api/prices", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: makeErrorResponse(error),
    })
  );
  await page.addInitScript(({ l }) => {
    localStorage.setItem("arzino-theme", "dark");
    localStorage.setItem("arzino-locale", l);
  }, { l: locale });
  await page.goto("/");
}

test("invalid API key shows the localized banner and a full fallback table", async ({ browser }) => {
  for (const locale of ["fa", "en"] as const) {
    await test.step(`invalid-key · locale=${locale}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await setupErrorPage(page, locale, "invalid-key");

      // Clear warning banner (TriangleAlert icon + localized message) instead of silent dashes
      await expect(page.getByText(BANNERS[locale].invalidKey)).toBeVisible();
      await expect(page.locator("svg.lucide-triangle-alert").first()).toBeVisible();

      // Table + overview cards all fall back to zero/— placeholders
      await expectFallbackTable(page);
      await page.screenshot({ path: `test-results/error-invalid-key-${locale}.png`, fullPage: true });

      await context.close();
    });
  }
});

test("generic upstream failure shows the dataUnavailable banner and the same fallback", async ({ browser }) => {
  for (const locale of ["fa", "en"] as const) {
    await test.step(`network-error · locale=${locale}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await setupErrorPage(page, locale, "network");

      await expect(page.getByText(BANNERS[locale].dataUnavailable)).toBeVisible();
      await expect(page.locator("svg.lucide-triangle-alert").first()).toBeVisible();

      await expectFallbackTable(page);
      await page.screenshot({ path: `test-results/error-network-${locale}.png`, fullPage: true });

      await context.close();
    });
  }
});
