import { openCaptureSession } from "./capture-session.mjs";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("output/screenshots", { recursive: true });
const session = await openCaptureSession();
const browser = session.browser;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(session.url);
  await page.evaluate(async () => {
    const { freshSave, persist, trainRiding, purchaseTravel, selectTravel } =
      await import("/src/progression.ts");
    const s = freshSave();
    s.gold = 5000;
    s.settings.sound = false;
    for (const h of Object.values(s.heroes)) {
      h.level = 20;
      h.classTrial = { chapter: 3, active: false, progress: {} };
    }
    trainRiding(s);
    trainRiding(s);
    purchaseTravel(s, "horse");
    purchaseTravel(s, "swift_horse");
    selectTravel(s, "swift_horse");
    persist(s);
  });
  await page.goto(`${session.url}#stable`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "output/screenshots/stable-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of [
      "Stable",
      "Expedition",
      "Journal",
      "Armory",
      "Professions",
      "Outposts",
      "Talents",
    ]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      if (view === "Stable")
        await page.locator(".stable-catalog summary").click();
      const result = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        nav: [...document.querySelectorAll(".nav-link")].map(
          (e) => e.getBoundingClientRect().height,
        ),
      }));
      assert.ok(
        result.width <= width,
        `${view} overflows ${width}px: ${result.width}`,
      );
      if (width <= 760)
        assert.ok(
          result.nav.every((h) => h >= 44),
          `Small nav targets at ${width}`,
        );
      layout.push({ width, view, page: result.width });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Stable", exact: true }).click();
  await page.locator("#hero-switch").selectOption("druid");
  await page.screenshot({
    path: "output/screenshots/stable-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator('[data-travel="travel_form"]')
    .getByRole("button", { name: "Learn form · 40 G" })
    .click();
  await page.screenshot({
    path: "output/screenshots/travel-review-mobile.png",
    animations: "disabled",
  });
  for (const b of await page
    .locator(".stable-review .modal-actions button")
    .all())
    assert.ok((await b.boundingBox()).height >= 44);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#hero-switch").selectOption("paladin");
  await page.screenshot({
    path: "output/screenshots/class-steed-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  // Render a deterministic travel scene for each original silhouette through the real renderer.
  await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts");
    const { freshSave, heroStats } = await import("/src/progression.ts"),
      { ZONES } = await import("/src/content.ts");
    const { TRAVEL_OPTIONS } = await import("/src/travel.ts");
    const canvas = document.createElement("canvas");
    canvas.id = "travel-gallery";
    canvas.style = "width:1100px;height:700px";
    document.querySelector("main").replaceChildren(canvas);
    const c = canvas.getContext("2d");
    canvas.width = 1100;
    canvas.height = 700;
    c.fillStyle = "#18251e";
    c.fillRect(0, 0, 1100, 700);
    for (const t of TRAVEL_OPTIONS.filter((t) => t.rank !== 2)) {
      const classId =
        t.classId ||
        {
          Human: "mage",
          Dwarf: "hunter",
          Orc: "shaman",
          "Night Elf": "druid",
          Undead: "warlock",
        }[t.race];
      const g = new GameEngine({
        classId,
        zone: ZONES[0],
        stats: heroStats(freshSave(), classId),
        professions: {},
        travelId: t.id,
        seed: 7,
      });
      g.enemies = [];
      g.nodes = [];
      g.landmarks = [];
      g.travel.active = true;
      const off = document.createElement("canvas"),
        r = new GameRenderer(off, g);
      off.width = r.width = 320;
      off.height = r.height = 180;
      g.setViewport(320, 180);
      await r.ready();
      r.render();
      const x = 30 + (t.sprite % 3) * 360,
        y = 25 + Math.floor(t.sprite / 3) * 220;
      c.drawImage(off, 0, 0, off.width, off.height, x, y, 320, 180);
      c.fillStyle = "#dbc592";
      c.font = "14px Georgia";
      c.fillText(t.name, x + 20, y + 202);
    }
  });
  await page
    .locator("#travel-gallery")
    .screenshot({ path: "output/screenshots/travel-battlefield-gallery.png" });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ layout, errors }, null, 2));
} finally {
  await session.close();
}
