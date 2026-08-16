import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3000",
    // Local runs use the already-installed Microsoft Edge — Playwright's
    // browser CDN is geo-blocked in some regions. CI downloads its own
    // Chromium via `npx playwright install --with-deps chromium`.
    channel: process.env.CI ? undefined : "msedge",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
