/**
 * Pins the exact computed values of the palette in BOTH themes:
 *  - overview-card label colors: currencies → --accent, gold instruments → --gold,
 *  - the table header's accent→gold gradient line (border-image) and its
 *    hairline slice.
 *
 * Unlike uniform.spec (which compares colors to the tokens), this test asserts
 * the literal resolved RGB values, so a wrong theme token or a broken
 * border-image gets caught even if both sides change together.
 * /api/prices is intercepted with fixed data.
 */
import { expect, test } from "@playwright/test";

/** Resolved RGB values of --accent / --gold per theme (from globals.css). */
const THEME = {
  dark: {
    accent: "rgb(76, 141, 255)",
    gold: "rgb(201, 162, 39)",
    gradient: "linear-gradient(90deg, rgb(76, 141, 255), rgb(201, 162, 39))",
  },
  light: {
    accent: "rgb(47, 111, 228)",
    gold: "rgb(184, 134, 11)",
    gradient: "linear-gradient(90deg, rgb(47, 111, 228), rgb(184, 134, 11))",
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
      id: "tether",
      title: "تتر (USDT)",
      price: "۱۸۶,۳۰۰",
      change: 0.3,
      changeAbs: 500,
      updatedAt: "20:00",
      history: [],
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

test("computed card-label colors and header gradient match the theme tokens (both themes)", async ({ browser }) => {
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
      await expect(page.locator("tbody tr")).toHaveCount(3);
      if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);

      const exp = THEME[theme];
      const color = (locator: ReturnType<typeof page.locator>) =>
        locator.evaluate((el) => getComputedStyle(el).color);

      // Overview-card labels: currencies → accent, gold instrument → gold
      const usdLabel = page.locator(".overview-card", { hasText: "دلار آمریکا" }).locator(".overview-label");
      const tetherLabel = page.locator(".overview-card", { hasText: "تتر (USDT)" }).locator(".overview-label");
      const goldLabel = page.locator(".overview-card", { hasText: "طلای ۱۸ عیار" }).locator(".overview-label");
      await expect.poll(() => color(usdLabel)).toBe(exp.accent);
      await expect.poll(() => color(tetherLabel)).toBe(exp.accent);
      await expect.poll(() => color(goldLabel)).toBe(exp.gold);

      // Header gradient line: exact computed border-image + hairline slice
      const thead = page.locator("thead tr");
      await expect.poll(() => thead.evaluate((el) => getComputedStyle(el).borderImageSource)).toBe(exp.gradient);
      await expect.poll(() => thead.evaluate((el) => getComputedStyle(el).borderImageSlice)).toBe("1");

      await context.close();
    });
  }
});
