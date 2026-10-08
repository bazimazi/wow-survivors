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
  // This context has its own save; the player's browser and progression are untouched.
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const s = freshSave();
    s.selectedClass = "warrior";
    s.heroes.warrior.level = 10;
    s.selectedZone = "deadmines";
    s.clearedZones = ["westfall"];
    s.totals.kills = 120;
    s.totals.wins = 1;
    s.settings.sound = false;
    persist(s);
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.getByText("Preview dungeon equipment", { exact: true }).click();
  await expectReady(page);
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["Expedition", "Journal"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      if (view === "Expedition")
        await page
          .getByText("Preview dungeon equipment", { exact: true })
          .click();
      const result = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        nav: [...document.querySelectorAll(".nav-link")].map(
          (el) => el.getBoundingClientRect().height,
        ),
      }));
      assert.ok(result.page <= width, `${view} overflow at ${width}px`);
      if (width <= 480) {
        assert.equal(result.nav.length, 7);
        assert.ok(result.nav.every((height) => height >= 44));
      }
      layout.push({ width, view, page: result.page });
    }
  }
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByText("Preview dungeon equipment", { exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "output/screenshots/deadmines-camp-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "output/screenshots/deadmines-camp-mobile.png",
  });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { layout, browserErrors: errors, screenshots: "output/screenshots" },
      null,
      2,
    ),
  );
} finally {
  await session.close();
}

async function expectReady(page) {
  assert.equal(await page.locator(".dungeon-route li").count(), 3);
  assert.equal(await page.locator(".zone-option").count(), 5);
  assert.ok(
    await page.getByRole("button", { name: "Begin Dungeon" }).isEnabled(),
  );
}
