import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  freshSave,
  SAVE_KEY,
  trainClassTechnique,
  prepareClassSpell,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { CLASS_MAP } from "../../src/content";
const card = (page: Page, id: string) =>
  page.locator(`.spellbook-card[data-spell="${id}"]`);
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready() {
  const s = freshSave();
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.gold = 1000;
  s.settings.sound = false;
  return s;
}
async function seed(page: Page, s: SaveData | object) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
async function clock(page: Page, path = "/#spellbook") {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.goto(path);
  await page.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function prepare(page: Page, id: string, replace?: string) {
  await card(page, id)
    .getByRole("button", { name: "Prepare for expedition" })
    .click();
  if (replace) await page.locator("#spellbook-replace").selectOption(replace);
  await page
    .getByRole("dialog")
    .locator('[data-action="confirm-prepare"]')
    .click();
}
async function field(page: Page, extra: string) {
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.nodes=[];this.landmarks=[];${extra};window.__spellbookGame=this;`,
      ),
    });
  });
}
async function begin(page: Page) {
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
}
const enemy =
  "{id:9000,x:90,y:0,type:'wolf',hp:2000,maxHp:2000,radius:14,speed:0,damage:0,elite:false,boss:false,slowUntil:0,slow:1,frozenUntil:0,flash:0,attackTimer:999,dead:false}";

test("trainer gates levels, reviews learning and charges once without changing preparation", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 4;
  await seed(page, s);
  await page.goto("/#spellbook");
  await expect(card(page, "frostnova")).toContainText(
    "Requires character level 5",
  );
  await expect(card(page, "flamestrike")).toContainText(
    "Requires character level 12",
  );
  await page.locator("#hero-switch").selectOption("warrior");
  await card(page, "rend")
    .getByRole("button", { name: "Learn technique · 40 G" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "keeps your current four",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect((await saved(page)).gold).toBe(1000);
  await card(page, "rend")
    .getByRole("button", { name: "Learn technique · 40 G" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Learn Rend · 40 G" })
    .click();
  const state = await saved(page);
  expect(state.gold).toBe(960);
  expect(state.heroes.warrior.spellbook.learned).toEqual(["rend"]);
  expect(state.heroes.warrior.spellbook.prepared).toEqual(
    CLASS_MAP.warrior.spells,
  );
  expect(state.heroes.mage.spellbook.learned).toEqual([]);
  await expect(
    card(page, "rend").getByRole("button", { name: "Prepare for expedition" }),
  ).toBeEnabled();
  await page.reload();
  await expect(card(page, "rend")).toContainText("LEARNED");
  expect((await saved(page)).gold).toBe(960);
});
test("free preparation reviews replacements, persists four slots, protects companions and restores defaults", async ({
  page,
}) => {
  const s = ready();
  s.selectedClass = "hunter";
  trainClassTechnique(s, "serpentsting");
  trainClassTechnique(s, "volley");
  await seed(page, s);
  await page.goto("/#spellbook");
  await card(page, "serpentsting")
    .getByRole("button", { name: "Prepare for expedition" })
    .click();
  await expect(page.locator("#spellbook-replace option")).toHaveCount(2);
  await expect(page.locator("#spellbook-replace")).toContainText("Multi-Shot");
  await expect(page.locator("#spellbook-replace")).not.toContainText(
    "Beast Companion",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep current preparation" })
    .click();
  await prepare(page, "serpentsting");
  await prepare(page, "volley", "multishot");
  await expect(page.locator(".spellbook-slot")).toHaveCount(4);
  await page.reload();
  const state = await saved(page);
  expect(state.heroes.hunter.spellbook.prepared).toEqual([
    "shot",
    "volley",
    "beast",
    "serpentsting",
  ]);
  expect(state.gold).toBe(840);
  await page.getByRole("button", { name: "Restore original four" }).click();
  expect((await saved(page)).heroes.hunter.spellbook.prepared).toEqual(
    CLASS_MAP.hunter.spells,
  );
  expect((await saved(page)).heroes.hunter.spellbook.learned).toEqual([
    "serpentsting",
    "volley",
  ]);
});
test("an omitted trial ability produces a warning in spellbook and camp without blocking preparation", async ({
  page,
}) => {
  const s = ready();
  trainClassTechnique(s, "frostnova");
  s.heroes.mage.classTrial.active = true;
  s.heroes.mage.classTrial.chapter = 1;
  await seed(page, s);
  await page.goto("/#spellbook");
  await prepare(page, "frostnova", "blizzard");
  await expect(page.locator(".spellbook-warning")).toContainText(
    "rank 3 Blizzard",
  );
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await expect(page.locator(".spellbook-camp")).toContainText("Frost Nova");
  await expect(
    page.locator(".spellbook-camp .spellbook-warning"),
  ).toContainText("rank 3 Blizzard");
  await page.getByRole("button", { name: /Visit class trainer/ }).click();
  await page.getByRole("button", { name: "Restore original four" }).click();
  await expect(page.locator(".spellbook-warning")).toHaveCount(0);
});
test("real expedition upgrades offer prepared techniques and Frost Nova damages and roots targets", async ({
  page,
}) => {
  const s = ready();
  trainClassTechnique(s, "frostnova");
  prepareClassSpell(s, "arcane", "frostnova");
  await seed(page, s);
  await field(
    page,
    `this.enemies=[${enemy}];this.boss=this.enemies[0];this.spells=this.preparedSpells.filter(id=>id!=='frostnova').map(id=>({id,rank:5,timer:999,orbitTimer:999}));this.xp=14`,
  );
  await clock(page);
  await begin(page);
  await page.clock.runFor(40);
  await expect(page.locator(".upgrade-card")).toHaveCount(3);
  await expect(
    page.locator('[data-action="upgrade"][data-id="frostnova"]'),
  ).toBeVisible();
  await page.locator('[data-action="upgrade"][data-id="frostnova"]').click();
  await page.clock.runFor(200);
  const result = await page.evaluate(() => {
    const g = (window as any).__spellbookGame;
    return {
      ids: g.spells.map((s: any) => s.id),
      damage: g.damageBySpell.frostnova,
      hp: g.enemies[0].hp,
      root: g.enemies[0].frozenUntil,
      time: g.time,
      prepared: g.preparedSpells,
    };
  });
  expect(result.ids).toContain("frostnova");
  expect(result.damage).toBeGreaterThan(0);
  expect(result.root).toBeGreaterThan(result.time);
  expect(result.hp).toBeLessThan(2000);
  expect(result.prepared).not.toContain("arcane");
  await expect(page.locator(".run-spell")).toHaveCount(4);
  await expect(page.locator("#spell-loadout")).toContainText("Frost Nova");
});
test("periodic damage and healing visibly advance, pause and return without consuming supplies", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = ready();
  s.selectedClass = "priest";
  trainClassTechnique(s, "renew");
  trainClassTechnique(s, "holyfire");
  prepareClassSpell(s, CLASS_MAP.priest.spells[2], "renew");
  prepareClassSpell(s, CLASS_MAP.priest.spells[3], "holyfire");
  await seed(page, s);
  await field(
    page,
    `this.enemies=[${enemy}];this.boss=this.enemies[0];this.player.hp=25;this.spells=this.preparedSpells.map(id=>({id,rank:1,timer:['renew','holyfire'].includes(id)?0:999,orbitTimer:999}))`,
  );
  await clock(page);
  await begin(page);
  await page.clock.runFor(2200);
  const before = await page.evaluate(() => {
    const g = (window as any).__spellbookGame;
    return {
      healing: g.totalHealing,
      damage: g.damageBySpell.holyfire,
      time: g.time,
      hp: g.player.hp,
      dots: Object.keys(g.enemies[0].dots || {}),
    };
  });
  expect(before.healing).toBeGreaterThan(0);
  expect(before.damage).toBeGreaterThan(18);
  expect(before.dots).toContain("holyfire");
  await page.keyboard.press("Escape");
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => (window as any).__spellbookGame.time)).toBe(
    before.time,
  );
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await page.clock.runFor(2100);
  expect(
    await page.evaluate(() => (window as any).__spellbookGame.totalHealing),
  ).toBeGreaterThan(before.healing);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  const state = await saved(page);
  expect(state.supplies.potions).toBe(s.supplies.potions);
  expect(state.heroes.priest.spellbook.prepared).toEqual(
    s.heroes.priest.spellbook.prepared,
  );
  expect(state.history).toHaveLength(1);
  expect(errors).toEqual([]);
});
test("old saves retain core preparation and malformed imported trainer entries are repaired", async ({
  page,
}) => {
  const s = ready(),
    raw = JSON.parse(JSON.stringify(s));
  delete raw.heroes.mage.spellbook;
  raw.heroes.hunter.spellbook = {
    learned: ["volley", "rend", "constructor", "volley"],
    prepared: ["volley", "rend", "volley", "trap"],
  };
  await seed(page, raw);
  await page.goto("/#spellbook");
  await expect(page.locator(".spellbook-slot")).toHaveCount(4);
  await expect(page.locator(".spellbook-mentor")).toContainText("0 / 2");
  await page.locator("#hero-switch").selectOption("hunter");
  const h = (await saved(page)).heroes.hunter;
  expect(h.spellbook.learned).toEqual(["volley"]);
  expect(h.spellbook.prepared).toContain("shot");
  expect(h.spellbook.prepared).toContain("beast");
  expect(new Set(h.spellbook.prepared).size).toBe(4);
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await expect(page.locator("#spell-loadout")).toContainText("Volley");
  await expect(page.locator(".run-spell.unlearned")).toHaveCount(2);
});
test("spellbook cards, eight destinations and review dialogs fit six viewport widths with usable controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, ready());
  await page.goto("/#spellbook");
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".nav-link")).toHaveCount(8);
    await expect(page.locator(".spellbook-card")).toHaveCount(6);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    for (const button of await page
      .locator(".spellbook-card button, .spellbook-preparation button")
      .all()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await card(page, "frostnova")
      .getByRole("button", { name: "Learn technique · 40 G" })
      .click();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
});
test("dense periodic combat renders finite effects and damage with bounded CPU work", async ({
  page,
}) => {
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts"),
      { ZONES } = await import("/src/content.ts"),
      { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:1280px;height:720px;position:fixed;inset:0;";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "priest",
      zone: ZONES[0],
      stats: {
        ...heroStats(freshSave(), "priest"),
        health: 10000,
        regen: 0,
        crit: 0,
      },
      professions: {},
      characterLevel: 21,
      spellbook: {
        learned: ["renew", "holyfire"],
        prepared: ["smite", "pain", "renew", "holyfire"],
      },
      seed: 123,
    });
    const template = g.enemies[0];
    g.enemies = Array.from({ length: 400 }, (_, i) => ({
      ...template,
      id: i,
      x: Math.cos(i * 2.4) * (100 + (i % 480)),
      y: Math.sin(i * 2.4) * (100 + (i % 280)),
      hp: 2000,
      maxHp: 2000,
      speed: 0,
      damage: 0,
      attackTimer: 999,
      dots: {
        holyfire: {
          damage: 9,
          interval: 2,
          timer: 0.25,
          ticksLeft: 4,
          totalTicks: 4,
        },
      },
    }));
    g.boss = g.enemies[0];
    g.player.hp = 100;
    g.spells = [{ id: "renew", rank: 1, timer: 0, orbitTimer: 0 }];
    const r = new GameRenderer(canvas, g),
      artLoaded = await r.ready(),
      costs = [];
    for (let i = 0; i < 122; i++) {
      await new Promise(requestAnimationFrame);
      const start = performance.now();
      g.update(1 / 60);
      r.render();
      costs.push(performance.now() - start);
    }
    costs.sort((a, b) => a - b);
    return {
      artLoaded,
      enemies: g.enemies.length,
      damage: g.damageBySpell.holyfire,
      healing: g.totalHealing,
      maximumEffects: Math.max(
        ...g.enemies.map((e) => Object.keys(e.dots || {}).length),
      ),
      averageMs: Number(
        (costs.reduce((a, b) => a + b) / costs.length).toFixed(2),
      ),
      p95Ms: Number(costs[Math.floor(costs.length * 0.95)].toFixed(2)),
    };
  });
  expect(metrics.artLoaded).toBe(true);
  expect(metrics.enemies).toBe(400);
  expect(metrics.damage).toBe(3600);
  expect(metrics.maximumEffects).toBe(1);
  expect(metrics.healing).toBeGreaterThan(0);
  expect(metrics.averageMs).toBeLessThan(100);
  console.log("Periodic scene CPU measurements:", JSON.stringify(metrics));
});
