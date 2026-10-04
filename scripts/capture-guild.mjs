import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await fs.mkdir("output/screenshots", { recursive: true });
try {
  await page.goto("http://127.0.0.1:5176");
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const s = freshSave();
    s.heroes.mage.level = 20;
    s.gold = 850;
    s.settings.sound = false;
    s.professions = { mining: 300, engineering: 150 };
    s.training = {
      mining: 4,
      engineering: 3,
      firstaid: 4,
      cooking: 4,
      fishing: 3,
    };
    s.secondary = { firstaid: 300, cooking: 225, fishing: 150 };
    s.professionSpecializations.engineering = "gnomish";
    s.professionQuests.mining = {
      chapter: 3,
      attempt: "capture-mining",
      progress: { gathered: 16, crafts: 0, uses: 0 },
    };
    s.professionQuests.engineering = {
      chapter: 2,
      attempt: "capture-engineering",
      progress: { gathered: 0, crafts: 2, uses: 1 },
    };
    s.professionQuests.cooking = {
      chapter: 3,
      attempt: "capture-cooking",
      progress: { gathered: 0, crafts: 2, uses: 1 },
    };
    s.professionQuests.fishing = {
      chapter: 2,
      attempt: "capture-fishing",
      progress: { gathered: 4, crafts: 0, uses: 0 },
    };
    s.professionQuests.firstaid.chapter = 4;
    s.inventory.push("mastery_firstaid");
    for (const id of Object.keys(s.materials)) s.materials[id] = 24;
    persist(s);
  });
  await page.goto("http://127.0.0.1:5176/#professions");
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      cards: document.querySelectorAll(".guild-card").length,
    }));
    if (metrics.width !== metrics.scroll || metrics.cards !== 5)
      throw new Error(JSON.stringify(metrics));
    layout.push(metrics);
    if (width === 390) {
      await page
        .locator(".profession-guild")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.screenshot({
        path: "output/screenshots/guild-workbench-mobile.png",
        animations: "disabled",
      });
    }
  }
  await page.locator(".profession-guild").screenshot({
    path: "output/screenshots/guild-workbench-desktop.png",
    animations: "disabled",
  });
  await page
    .locator('[data-guild-trade="mining"] [data-action="review-guild-claim"]')
    .click();
  await page.screenshot({
    path: "output/screenshots/guild-turn-in-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/screenshots/guild-turn-in-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Keep working" }).click();
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.screenshot({
    path: "output/screenshots/guild-camp-mobile.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.keyboard.press("Escape");
  await page.locator(".guild-status summary").click();
  await page.screenshot({
    path: "output/screenshots/guild-pause-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/screenshots/guild-pause-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.screenshot({
    path: "output/screenshots/guild-result-mobile.png",
    animations: "disabled",
  });
  if (errors.length) throw new Error(errors.join("\n"));
  await fs.writeFile(
    "output/guild-layout-0.11.json",
    JSON.stringify({ layout, errors }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ layout, errors }));
} finally {
  await browser.close();
}
