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
  // Pixel-snapshot comparison (toHaveScreenshot): disable CSS animations so
  // the chart draw / pulsing dots settle at their end state (deterministic),
  // hide the caret, and allow a small pixel ratio for cross-platform AA
  // differences (one baseline set, generated on Windows/Edge, compared with
  // Linux/Chromium in CI). Real visual regressions move far more than 3%.
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
    },
  },
  // One committed baseline per modal combo (no per-project/per-platform
  // suffix) so the same files are compared on every OS.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  // CI runs against the production bundle (built in a dedicated workflow
  // step before this job's tests); local runs keep using the dev server and
  // reuse an already-running one (e.g. for the live preview).
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
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
