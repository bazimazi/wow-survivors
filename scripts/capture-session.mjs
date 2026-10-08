import { chromium } from "@playwright/test";
import { startLocalServer } from "./local-server.mjs";

/** Each capture owns an isolated browser and, by default, its own free-port server. */
export async function openCaptureSession(options = {}) {
  const external = process.env.WOW_SURVIVORS_URL;
  if (external && !/^https?:$/.test(new URL(external).protocol))
    throw new Error("WOW_SURVIVORS_URL must be an HTTP or HTTPS URL.");
  const server = external ? null : await startLocalServer();
  try {
    const browser = await chromium.launch(options);
    const url = external || server.url;
    console.log(`Capture server: ${url}`);
    return {
      browser,
      url,
      close: async () => {
        try {
          await browser.close();
        } finally {
          await server?.close();
        }
      },
    };
  } catch (error) {
    await server?.close();
    throw error;
  }
}
