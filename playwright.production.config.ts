import { defineConfig } from "@playwright/test";
import development from "./playwright.config";

// Exercise the emitted static site without depending on Vite's source-module server.
export default defineConfig({
  ...development,
  testDir: "./tests/production",
  webServer: {
    ...development.webServer,
    command: "node scripts/local-server.mjs --preview --test",
  },
});
