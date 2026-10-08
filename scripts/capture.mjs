import { openCaptureSession } from "./capture-session.mjs";
import { mkdir } from "node:fs/promises";
await mkdir("output/screenshots", { recursive: true });
const session = await openCaptureSession({ args: ["--disable-gpu"] });
const browser = session.browser;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(60_000);
  await page.goto(session.url);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "output/screenshots/camp-desktop.png",
    fullPage: true,
    animations: "disabled",
    timeout: 60_000,
  });
  for (const name of ["Talents", "Armory", "Professions", "Journal"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.screenshot({
      path: `output/screenshots/${name.toLowerCase()}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "output/screenshots/battlefield.png" });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "output/screenshots/pause.png" });
  await page.getByRole("button", { name: "Return to camp" }).click();
  await page.screenshot({ path: "output/screenshots/result.png" });
  await page.getByRole("button", { name: "Return to camp" }).click();
  for (const classId of ["hunter", "warlock", "druid"]) {
    await page.locator(`.class-card[data-id="${classId}"]`).click();
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await page.waitForTimeout(2000);
    if (classId === "druid") await page.keyboard.press("Space");
    await page.screenshot({
      path: `output/screenshots/${classId}-battlefield.png`,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Return to camp" }).click();
    await page.getByRole("button", { name: "Return to camp" }).click();
  }
  await page.locator('.class-card[data-id="mage"]').click();
  await page.waitForTimeout(3600);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/screenshots/camp-mobile.png",
    fullPage: true,
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(session.url);
  await mobile.getByRole("button", { name: "Begin Expedition" }).click();
  await mobile.waitForTimeout(2000);
  await mobile.screenshot({
    path: "output/screenshots/battlefield-mobile.png",
  });

  console.log("Screenshots saved to output/screenshots");
} finally {
  await session.close();
}
