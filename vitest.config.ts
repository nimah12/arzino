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
  },
});
