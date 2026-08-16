/**
 * E2E test for the custom themed tooltip (src/app/components/Tooltip.tsx):
 *  - hover over an asset icon in the table shows a portal-rendered bubble
 *    with the localized asset name, styled with the theme background,
 *  - keyboard focus on the search input shows its localized tooltip,
 *  - touch tap shows the tooltip too,
 *  - the bubble is a direct child of <body> (never clipped by the table
 *    panel's overflow) and the sparkline column keeps its width.
 *
 * /api/prices is intercepted with fixed data so the test is self-contained.
 */
import { expect, test } from "@playwright/test";

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

async function setup(page: import("@playwright/test").Page, locale: "fa" | "en") {
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
  await page.addInitScript(({ l }) => {
    localStorage.setItem("arzino-theme", "dark");
    localStorage.setItem("arzino-locale", l);
  }, { l: locale });
  await page.goto("/");
}

const TITLES = {
  fa: { usd: "دلار آمریکا", search: "جستجوی دارایی...", themeLight: "حالت روشن" },
  en: { usd: "US Dollar", search: "Search assets...", themeLight: "Switch to light mode" },
} as const;

test("hovering the dollar icon puts the localized title in the DOM (fa/en)", async ({ browser }) => {
  for (const locale of ["fa", "en"] as const) {
    await test.step(`title-in-dom · locale=${locale}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await setup(page, locale);
      await expect(page.locator("tbody tr")).toHaveCount(2);

      const usdRow = page.locator("tbody tr", { hasText: TITLES[locale].usd });
      const icon = usdRow.locator("svg.lucide").first();
      const wrapper = usdRow.locator("span.tt").first();

      // Before hover: no native title attribute anywhere (custom tooltip
      // replaced it) and no tooltip bubble in the DOM yet.
      await expect(icon).not.toHaveAttribute("title", /.+/);
      await expect(wrapper).not.toHaveAttribute("title", /.+/);
      await expect(page.locator("body > .tt-bubble")).toHaveCount(0);

      await icon.hover();

      // The custom tooltip — the new "title" — appears in the DOM on hover,
      // carrying the localized asset name and role="tooltip".
      const bubble = page.locator("body > .tt-bubble");
      await expect(bubble).toHaveCount(1);
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveText(TITLES[locale].usd);
      await expect(bubble).toHaveAttribute("role", "tooltip");

      // …and still no native title attribute on the icon or its wrapper.
      await expect(icon).not.toHaveAttribute("title", /.+/);
      await expect(wrapper).not.toHaveAttribute("title", /.+/);

      await context.close();
    });
  }
});

test("tooltip shows on hover, keyboard focus and touch with themed styling", async ({ browser }) => {
  for (const locale of ["fa", "en"] as const) {
    await test.step(`hover+focus · locale=${locale}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await setup(page, locale);
      await expect(page.locator("tbody tr")).toHaveCount(2);

      const titles = TITLES[locale];
      const bubble = page.locator("body > .tt-bubble");

      // The sparkline column must keep its width (Tooltip wraps the button).
      const chartTd = page.locator("tbody tr").first().locator("td").nth(5);
      await expect.poll(() => chartTd.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(50);

      // 1) hover an asset icon in the table → themed bubble with the asset name
      const usdRow = page.locator("tbody tr", { hasText: titles.usd });
      const icon = usdRow.locator("svg.lucide").first();
      await icon.hover();
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveText(titles.usd);
      // portal-rendered (direct child of body) and styled with the panel bg
      const bg = await bubble.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).not.toBe("rgba(0, 0, 0, 0)");

      // move the mouse away so the icon tooltip hides
      await page.mouse.move(2, 2);
      await expect(bubble).toBeHidden();

      // 2) keyboard focus on the search input → its localized tooltip
      await page.locator(".search-input").focus();
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveText(titles.search);
      await page.locator(".search-input").blur();
      await expect(bubble).toBeHidden();

      // 3) hover the theme button (dark theme → "switch to light" label)
      await page.locator("header button.theme-btn").hover();
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveText(titles.themeLight);

      await context.close();
    });

    await test.step(`touch tap · locale=${locale}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      const page = await context.newPage();
      await setup(page, locale);
      await expect(page.locator("tbody tr")).toHaveCount(2);

      const usdRow = page.locator("tbody tr", { hasText: TITLES[locale].usd });
      const icon = usdRow.locator("svg.lucide").first();
      const box = await icon.boundingBox();
      expect(box).not.toBeNull();
      await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(page.locator("body > .tt-bubble")).toBeVisible();
      await expect(page.locator("body > .tt-bubble")).toHaveText(TITLES[locale].usd);

      await context.close();
    });
  }
});
