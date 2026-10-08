import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "node scripts/local-server.mjs --test",
    wait: {
      stdout:
        /WOW_SURVIVORS_URL=(?<playwright_test_base_url>http:\/\/127\.0\.0\.1:\d+\/)/,
    },
    stdout: "pipe",
    timeout: 30_000,
  },
  reporter: "list",
});
