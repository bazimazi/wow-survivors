import { openCaptureSession } from "./capture-session.mjs";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("output/screenshots", { recursive: true });
const session = await openCaptureSession({ args: ["--disable-gpu"] });
const browser = session.browser;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(session.url);
  // This fixture is confined to this script's browser context.
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const save = freshSave();
    save.heroes.mage.level = 14;
    save.gold = 1200;
    save.professions = { tailoring: 125, leatherworking: 125 };
    save.materials.cloth = 80;
    save.materials.dust = 15;
    save.materials.silk_cloth = 80;
    save.materials.vision_dust = 15;
    save.reputation = { timbermaw: 550, thorium: 300, argent: 1200 };
    save.commission = { id: "timbermaw_survey", progress: 2 };
    save.totals.wins = 1;
    save.totals.kills = 120;
    persist(save);
  });
  await page.goto(`${session.url}#outposts`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "output/screenshots/outposts-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.locator('.outpost-choice[data-id="argent"]').click();
  await page.screenshot({
    path: "output/screenshots/argent-quartermaster.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.screenshot({
    path: "output/screenshots/camp-factions.png",
    animations: "disabled",
    fullPage: true,
  });
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Outposts", exact: true }).click();
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      page: document.documentElement.scrollWidth,
      nav: [...document.querySelectorAll(".nav-link")].map((el) => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return { x, y, width, height };
      }),
    }));
    assert.ok(dimensions.page <= width, `Overflow at ${width}px`);
    assert.ok(
      dimensions.nav.every((box) => box.x >= 0 && box.x + box.width <= width),
      `Navigation clips at ${width}px`,
    );
    if (width <= 760)
      assert.ok(
        dimensions.nav.every((box) => box.height >= 44),
        "Touch navigation targets are too small",
      );
    layout.push({ width, page: dimensions.page });
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: "output/screenshots/outposts-mobile-top.png",
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { screenshots: "output/screenshots", layout, browserErrors: errors },
      null,
      2,
    ),
  );
} finally {
  await session.close();
}
