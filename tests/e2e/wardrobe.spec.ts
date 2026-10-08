import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, equip, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
const gear = (p: Page, id: string) => p.locator(`[data-gear-id="${id}"]`);
const discovery = (p: Page, id: string) =>
  p.locator(`[data-wardrobe-id="${id}"]`);
const saved = (p: Page) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.gold = 3000;
  for (const h of Object.values(s.heroes)) h.level = 18;
  for (const key of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[key] = 100;
  return s;
}
async function seed(p: Page, s: SaveData) {
  await p.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
async function open(p: Page) {
  await p.getByRole("button", { name: /Plan your next discovery/ }).click();
}
async function field(p: Page, extra: string) {
  await p.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\n${extra};window.__wardrobeGame=this;`,
      ),
    });
  });
}
async function clock(p: Page) {
  await p.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await p.goto("/#camp");
  await p.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function returnHome(p: Page) {
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Return to camp", exact: true }).click();
  await p.getByRole("button", { name: "Return to camp", exact: true }).click();
}

test("legacy loadouts retain gear, expose sixteen slots and link empty cloak equipment to its guide", async ({
  page,
}) => {
  const s = ready(),
    before = structuredClone(s.heroes.mage.equipment);
  await seed(page, s);
  await page.goto("/#armory");
  await expect(page.locator(".loadout-slot")).toHaveCount(16);
  await expect(page.locator("#wardrobe-catalog")).toBeHidden();
  await page.getByRole("button", { name: "Browse cloak", exact: true }).click();
  await expect(page.locator("#bag-slot")).toHaveValue("back");
  await expect(page.locator("#wardrobe-slot")).toHaveValue("back");
  await expect(page.locator(".wardrobe-card")).toHaveCount(14);
  await expect(page.locator(".bag-empty")).toBeVisible();
  await expect(discovery(page, "trailwatch_cloak")).toContainText(
    "Elwynn Forest",
  );
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment).toEqual(before);
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await expect(page.locator(".equipment-socket")).toHaveCount(16);
});
test("guide filters the current catalog by source and armor and shows exact resource and expedition gates", async ({
  page,
}) => {
  const s = freshSave();
  s.settings.sound = false;
  await seed(page, s);
  await page.goto("/#armory");
  await open(page);
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  await expect(page.locator(".wardrobe-card")).toHaveCount(222);
  await page.locator("#wardrobe-source").selectOption("craft");
  await expect(page.locator(".wardrobe-card")).toHaveCount(72);
  await expect(discovery(page, "spellweave_shoulders")).toContainText(
    "Skill 125",
  );
  await expect(discovery(page, "spellweave_shoulders")).toContainText(
    "12 Silk Cloth",
  );
  await expect(discovery(page, "spellweave_shoulders")).toContainText(
    "Learn Tailoring",
  );
  await expect(discovery(page, "spellweave_shoulders")).toContainText(
    "Requires level 10",
  );
  await page.locator("#wardrobe-source").selectOption("dungeon");
  await expect(page.locator(".wardrobe-card")).toHaveCount(64);
  await expect(discovery(page, "smite_deckgreaves")).toContainText("Mr. Smite");
  await expect(discovery(page, "smite_deckgreaves")).toContainText(
    "Class restricted",
  );
  await page.getByRole("button", { name: "Showing all classes" }).click();
  await expect(page.locator(".wardrobe-card")).toHaveCount(27);
  await page.locator("#wardrobe-slot").selectOption("waist");
  await expect(page.locator(".wardrobe-empty")).toBeVisible();
  await page.locator("#hero-switch").selectOption("warrior");
  await expect(page.locator(".wardrobe-card")).toHaveCount(4);
});
test("crafting the extended set activates six pieces and comparisons show loss of its final bonus", async ({
  page,
}) => {
  const s = ready();
  s.professions.tailoring = 175;
  s.training.tailoring = 3;
  for (const id of [
    "spellweave_head",
    "spellweave_hands",
    "spellweave_chest",
  ]) {
    s.inventory.push(id);
    equip(s, id);
  }
  s.inventory.push("spiritwoven_leggings");
  await seed(page, s);
  await page.goto("/#armory");
  await open(page);
  await page.locator("#wardrobe-source").selectOption("craft");
  await page.locator("#wardrobe-slot").selectOption("shoulders");
  await discovery(page, "spellweave_shoulders")
    .getByRole("button", { name: "View crafting" })
    .click();
  await expect(page.locator("#recipe-filter")).toHaveValue("tailoring");
  const gold = (await saved(page)).gold;
  for (const slot of ["shoulders", "waist", "legs"])
    await page
      .locator(`[data-recipe-id="craft_spellweave_${slot}"]`)
      .getByRole("button", { name: "Craft", exact: true })
      .click();
  expect((await saved(page)).gold).toBe(gold - 135);
  expect((await saved(page)).materials.silk_cloth).toBe(58);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator("#bag-slot").selectOption("all");
  for (const slot of ["shoulders", "waist", "legs"])
    await gear(page, `spellweave_${slot}`)
      .getByRole("button", { name: "Equip item" })
      .click();
  await expect(page.locator(".equipped-set-bonuses")).toContainText(
    "6 / 6 equipped",
  );
  await expect(
    page.locator(".equipped-set-bonuses .set-bonus.active"),
  ).toHaveCount(3);
  await page.reload();
  await expect(
    page.locator(".equipped-set-bonuses .set-bonus.active"),
  ).toHaveCount(3);
  await expect(
    gear(page, "spiritwoven_leggings").locator(".gear-comparison"),
  ).toContainText("-0.4");
  await expect(
    gear(page, "spiritwoven_leggings").locator(".gear-comparison"),
  ).toContainText("-15%");
  await gear(page, "spiritwoven_leggings")
    .getByRole("button", { name: "Equip item" })
    .click();
  await expect(page.locator(".equipped-set-bonuses")).toContainText(
    "5 / 6 equipped",
  );
  await expect(
    page.locator(".equipped-set-bonuses .set-bonus.active"),
  ).toHaveCount(2);
});
test("owned guide links, combined satchel filters, shared sale protection and new-slot level gates work", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 2;
  s.inventory.push(
    "trailwatch_cloak",
    "northshire_leggings",
    "smite_deckgreaves",
    "runebound_drape",
  );
  equip(s, "trailwatch_cloak");
  await seed(page, s);
  await page.goto("/#armory");
  await open(page);
  await discovery(page, "runebound_drape")
    .getByRole("button", { name: "Show in satchel" })
    .click();
  await expect(page.locator("#bag-slot")).toHaveValue("back");
  await expect(page.locator(".gear-card")).toHaveCount(2);
  await expect(
    gear(page, "runebound_drape").getByRole("button", {
      name: "Requires level 18",
    }),
  ).toBeDisabled();
  await page.locator("#hero-switch").selectOption("warrior");
  await expect(
    gear(page, "trailwatch_cloak").locator('[data-action="sell"]'),
  ).toHaveCount(0);
  await page.locator("#bag-slot").selectOption("legs");
  await expect(page.locator(".gear-card")).toHaveCount(2);
  await page.locator("#hero-switch").selectOption("mage");
  await page.getByRole("button", { name: "Usable", exact: true }).click();
  await expect(page.locator(".gear-card")).toHaveCount(1);
  await gear(page, "northshire_leggings")
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.legs).toBe(
    "northshire_leggings",
  );
  expect((await saved(page)).heroes.mage.equipment.back).toBe(
    "trailwatch_cloak",
  );
});
test("the new catalog and sixteen-slot camp fit six widths with accessible control targets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, ready());
  await page.goto("/#armory");
  await open(page);
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(page.locator(".wardrobe-card")).toHaveCount(222);
    for (const el of await page
      .locator(
        ".wardrobe-section button, .wardrobe-section select, #bag-slot, .browse-slot",
      )
      .all())
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Expedition", exact: true }).click();
    await expect(page.locator(".equipment-socket")).toHaveCount(16);
    for (const el of await page.locator(".equipment-socket").all()) {
      const box = await el.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "Armory", exact: true }).click();
  }
  expect(errors).toEqual([]);
});
test("a real guarded cache awards a new cloak and returning credits it once for camp equipment", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 2;
  await seed(page, s);
  await field(
    page,
    "this.spells=[];this.enemies=[];this.nodes=[];this.rng.pick=(pool)=>pool.find(v=>v?.id==='trailwatch_cloak'||v==='trailwatch_cloak')||pool[0]",
  );
  await clock(page);
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  const reward = await page.evaluate(() => {
    const g = (window as any).__wardrobeGame,
      l = g.landmarks.find((l: any) => l.kind === "cache");
    g.player.x = l.x;
    g.player.y = l.y;
    if (!g.interact()) throw Error("Cache did not activate");
    for (const id of l.guardIds) {
      const e = g.enemies.find((e: any) => e.id === id);
      Object.assign(e, { hp: 1, x: g.player.x + 30, y: g.player.y });
    }
    g.useBomb();
    g.update(1 / 60);
    while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
    return { loot: g.loot, kills: g.kills, state: l.state };
  });
  expect(reward).toEqual({
    loot: ["trailwatch_cloak"],
    kills: 3,
    state: "complete",
  });
  await returnHome(page);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await gear(page, "trailwatch_cloak")
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  expect(
    (await saved(page)).inventory.filter(
      (id: string) => id === "trailwatch_cloak",
    ),
  ).toHaveLength(1);
  expect((await saved(page)).heroes.mage.equipment.back).toBe(
    "trailwatch_cloak",
  );
});
test("Ragefire guardian loot reaches the satchel through actual room victories and a partial return", async ({
  page,
}) => {
  const s = ready();
  s.selectedZone = "ragefire";
  s.clearedZones = ["tirisfal"];
  s.supplies.bombs = 3;
  await seed(page, s);
  await field(
    page,
    "this.spells=[];this.enemies=[];this.nodes=[];this.rng.pick=(pool)=>pool.find(v=>v==='cultist_ritual_kilt')||pool[0]",
  );
  await clock(page);
  await page
    .getByRole("button", { name: "Begin Dungeon", exact: true })
    .click();
  for (let stage = 0; stage < 3; stage++) {
    await page.evaluate(() => {
      const g = (window as any).__wardrobeGame;
      g.dungeonStageTime = g.dungeonStage.duration - 0.01;
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      Object.assign(g.boss, { hp: 1, x: g.player.x + 30, y: g.player.y });
      g.useBomb();
    });
    await page.clock.runFor(50);
    if (stage < 2) {
      // Production recovery actions restore the room and advance its index.
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
    }
  }
  await expect(page.getByRole("dialog")).toContainText("Cultist Ritual Kilt");
  await page.locator('[data-action="dungeon-return"]').click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await gear(page, "cultist_ritual_kilt")
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.legs).toBe(
    "cultist_ritual_kilt",
  );
  expect((await saved(page)).totals.dungeonBosses).toBe(3);
  expect((await saved(page)).totals.dungeonWins).toBe(0);
});
