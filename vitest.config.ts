import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Match the Next.js tsconfig path alias so route files can be imported
    // directly in integration tests.
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", ".claude/**", "out/**", "build/**"],
    coverage: {
      provider: "v8",
      // Enforce a floor for the core logic only; UI components are covered by
      // the Playwright e2e tests instead. theme.ts is a client-only UI hook
      // (its dark-class/localStorage behavior is asserted by the e2e suite),
      // so it's deliberately excluded from the unit-coverage gate.
      include: ["src/lib/**"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/**/*.spec.ts",
        "src/lib/**/*.integration.test.ts",
        "src/lib/theme.ts",
      ],
      reporter: ["text", "html"],
      // Set just under the current measured values so CI passes today but any
      // new src/lib code without tests fails the build.
      thresholds: {
        lines: 80,
        functions: 90,
        branches: 70,
        statements: 78,
      },
    },
  },
});
