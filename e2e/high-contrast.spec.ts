/**
 * Verifies the high-contrast theme tokens (src/app/theme.css):
 *  - with `prefers-contrast: more` emulated (Playwright's media emulation),
 *    --accent and --gold resolve to their high-contrast values in BOTH
 *    themes, for the overview-card labels and the header gradient line,
 *  - without the emulation the regular values apply (covered here with a
 *    quick check and pinned exactly in header-colors.spec.ts).
 */
import { expect, test } from "@playwright/test";

/** High-contrast resolved values (from theme.css). */
const HC = {
  dark: {
    accent: "rgb(138, 180, 255)",
    gold: "rgb(255, 215, 94)",
    gradient: "linear-gradient(90deg, rgb(138, 180, 255), rgb(255, 215, 94))",
  },
  light: {
    accent: "rgb(29, 78, 216)",
    gold: "rgb(107, 76, 0)",
    gradient: "linear-gradient(90deg, rgb(29, 78, 216), rgb(107, 76, 0))",
  },
} as const;

/** Regular (non-HC) resolved values — must NOT apply under more-contrast. */
const BASE = {
  dark: { accent: "rgb(76, 141, 255)", gold: "rgb(201, 162, 39)" },
  light: { accent: "rgb(47, 111, 228)", gold: "rgb(184, 134, 11)" },
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

async function setup(page: import("@playwright/test").Page, theme: "dark" | "light", contrast: "more" | "no-preference") {
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
  await page.emulateMedia({ contrast });
  await page.goto("/");
}

test("high-contrast mode swaps accent/gold tokens in both themes", async ({ browser }) => {
  for (const theme of ["dark", "light"] as const) {
    await test.step(`theme=${theme}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await setup(page, theme, "more");
      await expect(page.locator("tbody tr")).toHaveCount(2);

      // the emulation actually took effect
      expect(await page.evaluate(() => matchMedia("(prefers-contrast: more)").matches)).toBe(true);

      const hc = HC[theme];
      const base = BASE[theme];
      const color = (locator: ReturnType<typeof page.locator>) =>
        locator.evaluate((el) => getComputedStyle(el).color);

      const usdLabel = page.locator(".overview-card", { hasText: "دلار آمریکا" }).locator(".overview-label");
      const goldLabel = page.locator(".overview-card", { hasText: "طلای ۱۸ عیار" }).locator(".overview-label");
      const thead = page.locator("thead tr");

      // high-contrast values are applied…
      await expect.poll(() => color(usdLabel)).toBe(hc.accent);
      await expect.poll(() => color(goldLabel)).toBe(hc.gold);
      await expect.poll(() => thead.evaluate((el) => getComputedStyle(el).borderImageSource)).toBe(hc.gradient);
      // …and the regular values are NOT
      await expect.poll(() => color(usdLabel)).not.toBe(base.accent);
      await expect.poll(() => color(goldLabel)).not.toBe(base.gold);

      // without the media emulation the regular tokens apply (sanity)
      await page.emulateMedia({ contrast: "no-preference" });
      await expect.poll(() => color(usdLabel)).toBe(base.accent);
      await expect.poll(() => color(goldLabel)).toBe(base.gold);

      await context.close();
    });
  }
});
