import { openCaptureSession } from "./capture-session.mjs";
import fs from "node:fs/promises";
const session = await openCaptureSession({ headless: true });
const browser = session.browser;
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    base = session.url,
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.evaluate(async () => {
    const { freshSave, persist } = await import("/src/progression.ts");
    const s = freshSave();
    for (const h of Object.values(s.heroes)) h.level = 15;
    s.selectedZone = "shadowfang";
    s.clearedZones = ["elwynn", "westfall", "tirisfal", "ragefire"];
    s.settings.sound = false;
    s.supplies.bombs = 8;
    s.totals.kills = 200;
    s.totals.runs = 3;
    s.totals.wins = 1;
    s.totals.bestTime = 360;
    persist(s);
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const layouts = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      destinations: document.querySelectorAll(".zone-option").length,
      nav: document.querySelectorAll(".nav-link").length,
      minimumDestinationHeight: Math.min(
        ...[...document.querySelectorAll(".zone-option")].map(
          (e) => e.getBoundingClientRect().height,
        ),
      ),
    }));
    if (
      metrics.scroll !== width ||
      metrics.destinations !== 6 ||
      metrics.nav !== 8 ||
      metrics.minimumDestinationHeight < 44
    )
      throw Error(JSON.stringify(metrics));
    layouts.push(metrics);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `output/screenshots/shadowfang-camp-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
  }
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    if (!body.includes(marker))
      throw Error("Constructor fixture marker missing");
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.xpNeeded=1e9;this.enemies=[];this.spells=[];this.pets=[];this.player.hp=10000;this.player.maxHp=10000;window.__shadowfangCapture=this;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.reload();
  await page.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  for (let stage = 0; stage < 4; stage++) {
    await page.getByRole("button", { name: "Begin Dungeon" }).click();
    await page.evaluate((stage) => {
      const g = window.__shadowfangCapture;
      g.dungeonStageIndex = stage;
      g.dungeonStageTime = g.dungeonStage.duration - 0.001;
      g.update(1 / 60);
      const b = g.boss;
      g.enemies = [b];
      Object.assign(b, { x: 100, y: 0, speed: 0, attackTimer: 0 });
      b.hp = b.maxHp * 0.49;
      g.bossState.attackIndex = stage === 3 ? 1 : 0;
      g.update(1 / 60);
    }, stage);
    await page.clock.runFor(120);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth !== innerWidth,
      )
    )
      throw Error("Guardian HUD overflow");
    await page.screenshot({
      path: `output/screenshots/shadowfang-guardian-${stage + 1}-mobile.png`,
      animations: "disabled",
    });
    await page.evaluate((stage) => {
      const g = window.__shadowfangCapture;
      g.hazards = [];
      g.bossState.attackIndex = stage === 3 ? 0 : 1;
      g.boss.attackTimer = 0;
      g.update(1 / 60);
    }, stage);
    await page.clock.runFor(120);
    await page.screenshot({
      path: `output/screenshots/shadowfang-pattern-${stage + 1}-mobile.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Return to camp", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Return to camp", exact: true })
      .click();
  }
  // Check all nine actual measured crops through the public production renderer.
  await page.setViewportSize({ width: 1200, height: 950 });
  const art = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts"),
      { ZONES } = await import("/src/content.ts"),
      { freshSave, heroStats } = await import("/src/progression.ts"),
      { SHADOWFANG_SPRITES } = await import("/src/shadowfang.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:1200px;height:950px;z-index:99999";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES.find((z) => z.id === "shadowfang"),
      stats: heroStats(freshSave()),
      professions: {},
      seed: 1,
    });
    for (let i = 0; i < 20 && !g.enemies.length; i++) g.update(0.05);
    const template = g.enemies[0];
    if (!template) throw Error("No real creature template");
    g.dungeonStageIndex = 3;
    g.player.x = 0;
    g.player.y = 10000;
    g.spells = [];
    g.pets = [];
    g.enemies = Object.keys(SHADOWFANG_SPRITES).map((type, i) => ({
      ...template,
      id: 500 + i,
      type,
      x: ((i % 3) - 1) * 300 + 130,
      y: 10000 + (Math.floor(i / 3) - 1) * 250,
      elite: true,
      hp: 1000,
      maxHp: 1000,
      speed: 0,
    }));
    const r = new GameRenderer(canvas, g),
      loaded = await r.ready();
    r.render();
    const c = canvas.getContext("2d");
    c.font = "18px Georgia";
    c.textAlign = "center";
    c.fillStyle = "#eee4d2";
    for (const e of g.enemies)
      c.fillText(
        e.type.replaceAll("_", " "),
        600 + e.x,
        475 + e.y - g.player.y + 34,
      );
    return {
      loaded,
      creatures: g.enemies.length,
      atlas: "shadowfang-sprites.png",
      rows: [0, 395, 820, 1254],
      columns: [
        [0, 418, 836, 1254],
        [0, 418, 880, 1254],
        [0, 418, 900, 1254],
      ],
    };
  });
  if (!art.loaded || art.creatures !== 9) throw Error(JSON.stringify(art));
  await page.screenshot({
    path: "output/screenshots/shadowfang-sprite-crops.png",
    animations: "disabled",
  });
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    "output/shadowfang-layout-0.14.json",
    JSON.stringify({ layouts, art, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      widths: layouts.length,
      phoneGuardians: 4,
      phonePatterns: 8,
      art,
      errors,
    }),
  );
} finally {
  await session.close();
}
