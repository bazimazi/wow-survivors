import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:5176",
  layouts = [];
try {
  await page.goto(base);
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const s = freshSave();
    s.settings.sound = false;
    s.heroes.mage.level = 20;
    s.clearedZones = [
      "westfall",
      "tirisfal",
      "deadmines",
      "ragefire",
      "shadowfang",
    ];
    s.totals.kills = 2000;
    s.totals.wins = 3;
    s.totals.dungeonWins = 3;
    s.selectedZone = "duskwood";
    persist(s);
  });
  await page.reload();
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const m = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      destinations: document.querySelectorAll(".zone-option").length,
      landmarks: document.querySelectorAll(".duskwood-landmarks li").length,
      nav: document.querySelectorAll(".nav-link").length,
    }));
    if (
      m.width !== m.scroll ||
      m.destinations !== 7 ||
      m.landmarks !== 6 ||
      m.nav !== 8
    )
      throw Error(JSON.stringify(m));
    layouts.push({ scene: "camp", ...m });
    await page.screenshot({
      path: `output/screenshots/duskwood-camp-${width}.png`,
      fullPage: true,
    });
  }
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    if (!body.includes(marker)) throw Error("Missing test-page fixture marker");
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.xpNeeded=1e9;this.player.hp=10000;this.player.maxHp=10000;window.__duskwoodGame=this;`,
      ),
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await page.evaluate(() => {
    const g = window.__duskwoodGame;
    g.time = 539.999;
    g.update(1 / 60);
    const b = g.boss;
    g.enemies = [b];
    Object.assign(b, {
      x: 220,
      y: 0,
      speed: 0,
      attackTimer: 0,
      hp: b.maxHp * 0.49,
    });
    g.bossState.attackIndex = 1;
    g.update(1 / 60);
    b.attackTimer = 100;
  });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    window.__duskwoodGame.paused = true;
  });
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const m = await page.locator("#boss-hud").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        width: innerWidth,
        left: r.left,
        right: r.right,
        scroll: document.documentElement.scrollWidth,
        label: document.querySelector("#boss-name").textContent,
        phase: document.querySelector("#boss-phase").textContent,
        explorationHidden:
          getComputedStyle(document.querySelector(".world-hud")).display ===
          "none",
        travelHidden:
          getComputedStyle(document.querySelector("#travel-button")).display ===
          "none",
      };
    });
    if (
      m.left < 0 ||
      m.right > width ||
      m.scroll !== width ||
      m.label !== "Stitches" ||
      m.phase !== "ENRAGED" ||
      !m.explorationHidden ||
      !m.travelHidden
    )
      throw Error(JSON.stringify(m));
    layouts.push({ scene: "boss", ...m });
    await page.screenshot({
      path: `output/screenshots/duskwood-boss-${width}.png`,
    });
  }
  await page.goto(base);
  await page.setViewportSize({ width: 1000, height: 820 });
  await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts"),
      { DUSKWOOD_ZONE, DUSKWOOD_SPRITES } = await import("/src/duskwood.ts"),
      { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 820;
    canvas.style.cssText = "width:1000px;height:820px;position:fixed;inset:0";
    document.body.replaceChildren(canvas);
    const g = new GameEngine({
        classId: "mage",
        zone: DUSKWOOD_ZONE,
        stats: heroStats(freshSave()),
        professions: {},
        characterLevel: 20,
      }),
      r = new GameRenderer(canvas, g);
    if (!(await r.ready())) throw Error("Atlas decode failed");
    const c = canvas.getContext("2d");
    c.fillStyle = "#202b32";
    c.fillRect(0, 0, 1000, 820);
    c.fillStyle = "#d5c59d";
    c.font = "24px Georgia";
    c.fillText("DUSKWOOD · CREATURE SILHOUETTES", 32, 43);
    Object.entries(DUSKWOOD_SPRITES).forEach(([type, index]) => {
      const x = 166 + (index % 3) * 333,
        y = 170 + Math.floor(index / 3) * 240;
      r.sprite(r.duskwoodAtlas, index, 3, x, y, index === 8 ? 180 : 140);
      c.fillStyle = "#d3d9cb";
      c.font = "15px sans-serif";
      c.textAlign = "center";
      c.fillText(type.replaceAll("dusk_", "").replaceAll("_", " "), x, y + 80);
      if (index !== 8) r.sprite(r.duskwoodAtlas, index, 3, x + 90, y + 50, 68);
    });
  });
  await page.screenshot({ path: "output/screenshots/duskwood-creatures.png" });
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    "output/duskwood-layout-0.16.json",
    JSON.stringify({ layouts, errors }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ layouts: layouts.length, errors }));
} finally {
  await browser.close();
}
