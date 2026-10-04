import { chromium } from "playwright";
import fs from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await fs.mkdir("output/screenshots", { recursive: true });
try {
  await page.goto("http://127.0.0.1:5176");
  // This browser context is isolated from the player's save.
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const { RESOURCE_FAMILIES, RESOURCE_IDS } =
      await import("/src/resources.ts");
    const s = freshSave();
    s.heroes.mage.level = 20;
    s.professions = { herbalism: 225, mining: 125 };
    s.secondary.fishing = 150;
    s.training = { herbalism: 4, mining: 3, fishing: 3 };
    s.gold = 850;
    s.settings.sound = false;
    for (const f of RESOURCE_FAMILIES)
      RESOURCE_IDS[f].forEach((id, i) => (s.materials[id] = (4 - i) * 12));
    persist(s);
  });
  await page.goto("http://127.0.0.1:5176/#professions");
  await page.reload();
  await page.locator(".resource-store").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      rows: document.querySelectorAll(".resource-grade").length,
    }));
    if (metrics.width !== metrics.scroll || metrics.rows !== 24)
      throw new Error(JSON.stringify(metrics));
    layout.push(metrics);
    if (width === 390) {
      await page
        .locator(".resource-store")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.screenshot({
        path: "output/screenshots/material-storage-camp-mobile.png",
        animations: "disabled",
      });
    }
  }
  await page.locator(".resource-store").screenshot({
    path: "output/screenshots/material-storage-desktop.png",
    animations: "disabled",
  });
  await page
    .getByText("Region survey and practice guide", { exact: true })
    .click();
  await page.locator(".resource-field-guide").screenshot({
    path: "output/screenshots/resource-field-guide.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.keyboard.press("g");
  await page.getByRole("button", { name: "Ore", exact: true }).click();
  await page.locator("#fieldwork-panel").waitFor();
  await page.screenshot({
    path: "output/screenshots/gathering-compass-desktop.png",
    animations: "disabled",
  });

  await page.goto("http://127.0.0.1:5176");
  await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts");
    const { freshSave, heroStats } = await import("/src/progression.ts"),
      { ZONES } = await import("/src/content.ts");
    const { materialFor } = await import("/src/resources.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "width:1440px;height:1000px;position:fixed;inset:0;z-index:999;background:#15251b";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[2],
      stats: heroStats(freshSave()),
      professions: { herbalism: 225, mining: 225 },
      fishingSkill: 225,
      characterLevel: 20,
      seed: 19,
    });
    g.enemies = [];
    g.spells = [];
    g.landmarks = [];
    g.gatheringOpen = true;
    g.nodes = ["herbs", "ore", "fish"].flatMap((family, row) =>
      [1, 2, 3, 4].map((tier, col) => ({
        id: row * 4 + col,
        kind: materialFor(family, tier),
        x: (col - 1.5) * 200,
        y: row * 130 - 150,
        depleted: false,
      })),
    );
    const r = new GameRenderer(canvas, g);
    if (!(await r.ready())) throw new Error("Art did not decode");
    r.render();
    const c = r.ctx;
    c.fillStyle = "#dfceab";
    c.font = "28px Georgia";
    c.textAlign = "center";
    c.fillText("FIELD SURVEY / FOUR RESOURCE GRADES", 720, 80);
    c.font = "15px Georgia";
    for (const n of g.nodes) {
      const { MATERIALS } = await import("/src/resources.ts");
      c.fillText(MATERIALS[n.kind].name, 720 + n.x, 500 + n.y + 57);
    }
  });
  await page.screenshot({
    path: "output/screenshots/resource-nodes-gallery.png",
    animations: "disabled",
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ layout, errors, captures: 5 }));
} finally {
  await browser.close();
}
