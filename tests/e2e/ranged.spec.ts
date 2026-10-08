import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { CLASSES, GEAR_MAP, MATERIALS, STAT_LABELS } from "../../src/content";
import type { ClassId, Stats } from "../../src/content";
import { RANGED_GEAR, rangedClass } from "../../src/ranged";
import {
  freshSave,
  SAVE_KEY,
  equip,
  trainDualWield,
  applyEnchantment,
  gearComparison,
  heroStats,
  acceptProfessionQuest,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
test.use({ hasTouch: true });
const card = (p: Page, id: string) => p.locator(`[data-gear-id="${id}"]`);
const saved = (p: Page): Promise<SaveData> =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready(classId: ClassId = "hunter") {
  const s = freshSave();
  s.selectedClass = classId;
  s.settings.sound = false;
  s.gold = 1500;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  for (const p of ["engineering", "enchanting"] as const) {
    s.professions[p] = 225;
    s.training[p] = 4;
  }
  s.inventory.push(
    ...RANGED_GEAR.map((g) => g.id),
    "duskwood_duelist_blade",
    "artisan_duelist_blade",
    "duskwood_spellblade",
    "artisan_focus",
    "ravenhill_bow",
  );
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
async function fits(p: Page) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
}
async function controls(els: Locator) {
  for (const el of await els.all()) {
    const b = await el.boundingBox();
    expect(Math.round(b!.width * 1000) / 1000).toBeGreaterThanOrEqual(44);
    expect(Math.round(b!.height * 1000) / 1000).toBeGreaterThanOrEqual(44);
  }
}
async function capture(p: Page, name: string, width: number) {
  await mkdir("output/screenshots", { recursive: true });
  await p.locator(".toast").waitFor({ state: "detached" });
  await p.waitForTimeout(220);
  await p.screenshot({
    animations: "disabled",
    path: `output/screenshots/ranged-${name}-${width}-0.28.png`,
  });
}
async function deltaText(el: Locator, delta: Partial<Stats>) {
  for (const [key, value] of Object.entries(delta))
    await expect(el).toContainText(
      `${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as keyof Stats]}`,
    );
}
async function openRanged(p: Page, id: string) {
  const c = card(p, id);
  await c
    .getByRole("button", {
      name:
        GEAR_MAP[id].slot === "weapon" ? "Place ranged weapon" : "Equip item",
      exact: true,
    })
    .click();
}
async function chooseHand(p: Page, id: string, slot: "weapon" | "offhand") {
  await card(p, id)
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await p.locator(`[data-hand-choice="${slot}"] button`).click();
}
test("keyboard legacy bow moves review exact changes, cancel, retain enchanted ownership and coexist with a saved melee pair", async ({
  page,
}) => {
  const s = ready();
  trainDualWield(s);
  applyEnchantment(s, "starter_hunter", "weapon_force");
  await seed(page, s);
  await page.goto("/#armory");
  await card(page, "starter_hunter")
    .getByRole("button", { name: "Place ranged weapon", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "Moves Hunting Bow out of the primary position",
  );
  await controls(dialog.locator("button"));
  await fits(page);
  await capture(page, "placement", 1440);
  const before = await saved(page);
  await dialog
    .getByRole("button", { name: "Keep current equipment", exact: true })
    .click();
  expect(await saved(page)).toEqual(before);
  await openRanged(page, "starter_hunter");
  await deltaText(
    page.locator('[data-ranged-choice="ranged"]'),
    gearComparison(before, "starter_hunter", "ranged"),
  );
  await page.locator('[data-ranged-choice="ranged"] button').click();
  let placed = await saved(page);
  expect(placed.heroes.hunter.equipment.weapon).toBeUndefined();
  expect(placed.heroes.hunter.equipment.ranged).toBe("starter_hunter");
  expect(heroStats(placed)).toEqual(heroStats(before));
  expect(placed.enchantments.starter_hunter).toBe("weapon_force");
  await chooseHand(page, "duskwood_duelist_blade", "weapon");
  await chooseHand(page, "artisan_duelist_blade", "offhand");
  const pair = await saved(page);
  await openRanged(page, "starter_hunter");
  await expect(dialog.locator('[data-ranged-choice="weapon"]')).toContainText(
    "Removes Masterwork Duelist Blade",
  );
  await deltaText(
    dialog.locator('[data-ranged-choice="weapon"]'),
    gearComparison(pair, "starter_hunter", "weapon"),
  );
  await page.keyboard.press("Escape");
  expect(await saved(page)).toEqual(pair);
  await openRanged(page, "starter_hunter");
  await page.locator('[data-ranged-choice="weapon"] button').click();
  await page.reload();
  const primaryAgain = await saved(page);
  expect(primaryAgain.heroes.hunter.equipment.weapon).toBe("starter_hunter");
  expect(primaryAgain.heroes.hunter.equipment.ranged).toBeUndefined();
  expect(primaryAgain.heroes.hunter.equipment.offhand).toBeUndefined();
  expect(primaryAgain.enchantments.starter_hunter).toBe("weapon_force");
  await openRanged(page, "starter_hunter");
  await page.locator('[data-ranged-choice="ranged"] button').click();
  await chooseHand(page, "duskwood_duelist_blade", "weapon");
  await chooseHand(page, "artisan_duelist_blade", "offhand");
  await page
    .locator(".loadout-slot")
    .filter({ hasText: "Hunting Bow" })
    .scrollIntoViewIfNeeded();
  await capture(page, "armory", 1440);
  await openRanged(page, "artisan_thrown");
  await deltaText(dialog, gearComparison(pair, "artisan_thrown", "ranged"));
  await dialog
    .getByRole("button", { name: "Equip ranged position", exact: true })
    .click();
  placed = await saved(page);
  expect(placed.heroes.hunter.equipment.weapon).toBe(
    pair.heroes.hunter.equipment.weapon,
  );
  expect(placed.heroes.hunter.equipment.offhand).toBe(
    pair.heroes.hunter.equipment.offhand,
  );
  expect(placed.heroes.hunter.equipment.ranged).toBe("artisan_thrown");
  await page.locator('[data-action="unequip"][data-id="weapon"]').click();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.heroes.hunter.equipment.ranged).toBe("artisan_thrown");
  expect(loaded.heroes.hunter.equipment.offhand).toBeUndefined();
});
test("phone touch wand migration reviews focus removal and preserves independent/shared ranged placements after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = ready("priest");
  equip(s, "artisan_focus");
  applyEnchantment(s, "starter_priest", "weapon_force");
  s.heroes.mage.equipment.ranged = "artisan_wand";
  await seed(page, s);
  await page.goto("/#armory");
  await card(page, "starter_priest")
    .getByRole("button", { name: "Place ranged weapon", exact: true })
    .tap();
  const before = await saved(page),
    dialog = page.getByRole("dialog");
  await expect(dialog.locator('[data-ranged-choice="ranged"]')).toContainText(
    `Removes ${GEAR_MAP.artisan_focus.name}`,
  );
  await deltaText(
    dialog.locator('[data-ranged-choice="ranged"]'),
    gearComparison(before, "starter_priest", "ranged"),
  );
  await fits(page);
  await dialog
    .getByRole("button", { name: "Keep current equipment", exact: true })
    .tap();
  expect(await saved(page)).toEqual(before);
  await openRanged(page, "starter_priest");
  await page.locator('[data-ranged-choice="ranged"] button').tap();
  let placed = await saved(page);
  expect(placed.heroes.priest.equipment.weapon).toBeUndefined();
  expect(placed.heroes.priest.equipment.offhand).toBeUndefined();
  expect(placed.enchantments.starter_priest).toBe("weapon_force");
  await openRanged(page, "artisan_wand");
  await controls(dialog.locator("button"));
  await capture(page, "placement", 390);
  await dialog
    .getByRole("button", { name: "Equip ranged position", exact: true })
    .tap();
  placed = await saved(page);
  expect(placed.heroes.mage).toEqual(s.heroes.mage);
  await card(page, "duskwood_spellblade")
    .getByRole("button", { name: "Equip item", exact: true })
    .tap();
  await card(page, "artisan_focus")
    .getByRole("button", { name: "Equip item", exact: true })
    .tap();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.heroes.priest.equipment.ranged).toBe("artisan_wand");
  expect(loaded.heroes.priest.equipment.offhand).toBe("artisan_focus");
  await page
    .locator(".loadout-slot")
    .filter({ hasText: "Ranged" })
    .scrollIntoViewIfNeeded();
  await capture(page, "armory", 390);
});
for (const [classId, kind, profession, width] of [
  ["hunter", "thrown", "engineering", 1440],
  ["mage", "wand", "enchanting", 390],
] as const)
  test(`${classId} source links craft exact Expert ranged equipment and review a full-strength weapon enchantment`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const s = ready(classId),
      id = `expert_${kind}`;
    s.inventory = s.inventory.filter((g) => g !== id);
    s.professions[profession] = 125;
    s.training[profession] = 3;
    s.professions.enchanting = 125;
    s.training.enchanting = 3;
    s.professionQuests[profession].chapter = 2;
    acceptProfessionQuest(s, profession);
    await seed(page, s);
    await page.goto("/#armory");
    await page
      .getByRole("button", { name: "Plan your next discovery" })
      .click();
    await page.locator("#wardrobe-slot").selectOption("ranged");
    await page
      .locator(`[data-wardrobe-id="${id}"]`)
      .getByRole("button", { name: "View crafting", exact: true })
      .click();
    await expect(page.locator("#recipe-filter")).toHaveValue(profession);
    const before = await saved(page);
    await page
      .locator(`[data-recipe-id="craft_${id}"] [data-action="craft"]`)
      .click();
    const crafted = await saved(page);
    expect(crafted.gold).toBe(before.gold - 75);
    expect(crafted.materials.iron_ore).toBe(
      before.materials.iron_ore - (kind === "wand" ? 2 : 6),
    );
    expect(
      crafted.materials[kind === "wand" ? "vision_dust" : "silk_cloth"],
    ).toBe(
      before.materials[kind === "wand" ? "vision_dust" : "silk_cloth"] -
        (kind === "wand" ? 4 : 2),
    );
    expect(crafted.professionQuests[profession].progress.crafts).toBe(1);
    await page.getByRole("button", { name: "Armory", exact: true }).click();
    await page.locator("#wardrobe-slot").selectOption("ranged");
    await page
      .locator(`[data-wardrobe-id="${id}"]`)
      .getByRole("button", { name: "Show in satchel", exact: true })
      .click();
    await expect(page.locator("#bag-slot")).toHaveValue("ranged");
    await openRanged(page, id);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Equip ranged position", exact: true })
      .click();
    await page.locator("#enchant-target").selectOption(id);
    await page
      .locator('[data-formula="weapon_precision"]')
      .getByRole("button", { name: "Review enchantment" })
      .click();
    const preEffect = await saved(page);
    await expect(
      page.getByRole("dialog").locator(".enchantment-review-stats p").last(),
    ).toContainText("+5% Critical chance");
    await controls(page.getByRole("dialog").locator("button"));
    await capture(page, "enchantment", width);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Keep current item", exact: true })
      .click();
    expect(await saved(page)).toEqual(preEffect);
    await page
      .locator('[data-formula="weapon_precision"]')
      .getByRole("button", { name: "Review enchantment" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: "Apply Focused Precision · 45 G",
        exact: true,
      })
      .click();
    const enhanced = await saved(page);
    expect(heroStats(enhanced).crit - heroStats(preEffect).crit).toBe(5);
    expect(enhanced.gold).toBe(preEffect.gold - 45);
    expect(enhanced.materials.vision_dust).toBe(
      preEffect.materials.vision_dust - 5,
    );
    expect(enhanced.materials.iron_ore).toBe(preEffect.materials.iron_ore - 2);
    await page.reload();
    expect(heroStats(await saved(page))).toEqual(heroStats(enhanced));
  });
test("explicit file-import review repairs duplicate and forbidden ranged items while retaining a valid three-weapon build", async ({
  page,
}) => {
  const s = ready();
  trainDualWield(s);
  equip(s, "duskwood_duelist_blade");
  equip(s, "artisan_duelist_blade", "offhand");
  equip(s, "ravenhill_bow", "ranged");
  s.heroes.priest.equipment = {
    ranged: "starter_priest",
    weapon: "starter_priest",
  };
  s.heroes.paladin.equipment.ranged = "artisan_wand";
  s.heroes.mage.level = 10;
  s.heroes.mage.equipment.ranged = "artisan_wand";
  const base = freshSave();
  base.settings.sound = false;
  await seed(page, base);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "ranged.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  expect((await saved(page)).heroes.hunter.equipment.ranged).toBeUndefined();
  await page
    .getByRole("button", { name: "Import adventure", exact: true })
    .click();
  const imported = await saved(page);
  expect(imported.heroes.hunter.equipment).toEqual(s.heroes.hunter.equipment);
  for (const id of ["priest", "paladin", "mage"] as const)
    expect(imported.heroes[id].equipment.ranged).toBeUndefined();
  await page.reload();
  expect((await saved(page)).heroes.hunter).toEqual(imported.heroes.hunter);
});
test("real Sneed guardian combat secures ranged equipment with once-only partial-return settlement and reviewed camp equip", async ({
  page,
}) => {
  const s = ready();
  s.inventory = s.inventory.filter((id) => id !== "deadmines_thrown");
  s.selectedZone = "deadmines";
  s.clearedZones = ["westfall"];
  s.supplies.bombs = 3;
  await seed(page, s);
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;this.xpNeeded=1e9;window.__rangedGame=this;this.rng.pick=(pool)=>pool.find(v=>v?.id==='deadmines_thrown'||v==='deadmines_thrown')||pool[0];`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.goto("/#camp");
  await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Dungeon", exact: true })
    .click();
  await page.evaluate(() => {
    const g = (window as any).__rangedGame;
    g.dungeonStageTime = g.dungeonStage.duration - 0.01;
    g.update(1 / 60);
    Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
    g.useBomb();
    g.update(1 / 60);
  });
  await expect(page.getByRole("dialog")).toContainText("Ironclad Throwing Set");
  await page
    .getByRole("button", {
      name: "Return to camp with secured rewards",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  expect((await saved(page)).inventory).toContain("deadmines_thrown");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await openRanged(page, "deadmines_thrown");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Equip ranged position", exact: true })
    .click();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.history).toHaveLength(1);
  expect(loaded.history[0].dungeonBosses).toBe(1);
  expect(loaded.heroes.hunter.equipment.ranged).toBe("deadmines_thrown");
  expect(loaded.heroes.hunter.equipment.weapon).toBe("starter_hunter");
});
test("nine classes at six widths show sixteen sockets and forty-six ranged discoveries with 44px controls and no horizontal overflow", async ({
  page,
}) => {
  await seed(page, ready());
  await page.goto("/#armory");
  const reports = [];
  for (const c of CLASSES)
    for (const width of [360, 390, 760, 800, 1024, 1440]) {
      const s = ready(c.id);
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
        { key: SAVE_KEY, s },
      );
      await page.goto("/#armory");
      await page.reload();
      await expect(page.locator(".loadout-slot")).toHaveCount(16);
      await controls(page.locator('[data-action="review-ranged"]'));
      await page
        .getByRole("button", { name: "Plan your next discovery" })
        .click();
      await page.getByRole("button", { name: "Showing class-usable" }).click();
      await page.locator("#wardrobe-slot").selectOption("ranged");
      await expect(page.locator(".wardrobe-card")).toHaveCount(46);
      await fits(page);
      if (rangedClass(c.id)) {
        const id = ["mage", "priest", "warlock"].includes(c.id)
          ? "artisan_wand"
          : "artisan_thrown";
        await openRanged(page, id);
        await controls(page.getByRole("dialog").locator("button"));
        await fits(page);
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Keep current equipment", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: "Expedition", exact: true })
        .click();
      await expect(page.locator(".equipment-socket")).toHaveCount(16);
      await controls(page.locator(".equipment-socket"));
      await fits(page);
      reports.push({
        classId: c.id,
        width,
        sockets: 16,
        rangedChoices: 24,
        overflow: false,
      });
    }
  await writeFile(
    "output/ranged-layout-0.28.json",
    JSON.stringify(reports, null, 2),
  );
});
