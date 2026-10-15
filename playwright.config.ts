import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/ui",
  use: { headless: true, viewport: { width: 900, height: 720 } },
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:8789",
    reuseExistingServer: false,
    env: { PORT: "8789" },
  },
});
