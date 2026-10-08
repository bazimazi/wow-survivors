import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { CLASSES, GEAR_MAP, MATERIALS, STAT_LABELS } from "../../src/content";
import type { ClassId, Stats } from "../../src/content";
import {
  TRAINED_WEAPON_GEAR,
  WEAPON_TRAINING,
} from "../../src/weapon-training";
import {
  freshSave,
  SAVE_KEY,
  equip,
  trainDualWield,
  trainWeaponType,
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
function ready(classId: ClassId = "warrior") {
  const s = freshSave();
  s.selectedClass = classId;
  s.settings.sound = false;
  s.gold = 1500;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  s.professions = { blacksmithing: 225, enchanting: 225 };
  s.training.blacksmithing = s.training.enchanting = 4;
  s.inventory.push(
    ...TRAINED_WEAPON_GEAR.map((g) => g.id),
    "artisan_shield",
    "artisan_thrown",
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
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
async function controls(items: Locator) {
  for (const el of await items.all()) {
    const b = await el.boundingBox();
    expect(b).toBeTruthy();
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
    path: `output/screenshots/weapon-training-${name}-${width}-0.29.png`,
  });
}
async function deltaText(el: Locator, delta: Partial<Stats>) {
  for (const [key, value] of Object.entries(delta))
    await expect(el).toContainText(
      `${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as keyof Stats]}`,
    );
}
async function train(p: Page, type: "axe" | "polearm") {
  await p.locator(".weapon-training-panel summary").click();
  await p.locator(`[data-weapon-training="${type}"] button`).click();
  await p
    .getByRole("dialog")
    .locator('[data-action="train-weapon-type"]')
    .click();
}

test("keyboard training reviews exact fees, cancels, stays personal, equips enchanted axes and reviews both-hand replacement", async ({
  page,
}) => {
  const s = ready("paladin");
  trainWeaponType(s, "axe");
  equip(s, "artisan_axe");
  applyEnchantment(s, "artisan_axe", "weapon_force");
  s.selectedClass = "warrior";
  trainDualWield(s);
  equip(s, "artisan_thrown");
  await seed(page, s);
  await page.goto("/#armory");
  await card(page, "artisan_axe")
    .getByRole("button", { name: "View weapon training", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Pay 40 G once");
  await controls(dialog.locator("button"));
  await fits(page);
  await capture(page, "purchase", 1440);
  const before = await saved(page);
  await dialog
    .getByRole("button", { name: "Keep current training", exact: true })
    .click();
  expect(await saved(page)).toEqual(before);
  await card(page, "artisan_axe")
    .getByRole("button", { name: "View weapon training", exact: true })
    .click();
  await dialog.locator('[data-action="train-weapon-type"]').focus();
  await page.keyboard.press("Enter");
  const paid = await saved(page);
  expect(paid.gold).toBe(before.gold - 40);
  expect(paid.heroes.warrior.weaponTraining).toEqual(["axe"]);
  expect(paid.heroes.paladin).toEqual(before.heroes.paladin);
  expect(paid.heroes.hunter.weaponTraining).toEqual([]);
  expect(heroStats(paid)).toEqual(heroStats(before));
  await card(page, "duskwood_axe")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.locator('[data-hand-choice="weapon"] button').click();
  const primary = await saved(page);
  await card(page, "artisan_axe")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await deltaText(
    page.locator('[data-hand-choice="offhand"]'),
    gearComparison(primary, "artisan_axe", "offhand"),
  );
  await page.locator('[data-hand-choice="offhand"] button').click();
  await page.reload();
  const paired = await saved(page);
  expect(paired.heroes.warrior.equipment.offhand).toBe("artisan_axe");
  expect(paired.enchantments.artisan_axe).toBe("weapon_force");
  await page
    .locator(".loadout-slot")
    .filter({ has: page.locator('[data-action="unequip"][data-id="offhand"]') })
    .scrollIntoViewIfNeeded();
  await capture(page, "armory", 1440);
  await train(page, "polearm");
  const trained = await saved(page);
  expect(trained.gold).toBe(paired.gold - 55);
  await card(page, "artisan_polearm")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await expect(dialog).toContainText("removes Masterwork Handaxe");
  await deltaText(dialog, gearComparison(trained, "artisan_polearm"));
  await controls(dialog.locator("button"));
  await capture(page, "replacement", 1440);
  await dialog
    .getByRole("button", { name: "Keep current equipment", exact: true })
    .click();
  expect(await saved(page)).toEqual(trained);
  await card(page, "artisan_polearm")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Equip Masterwork Glaive", exact: true })
    .click();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.heroes.warrior.weaponTraining).toEqual(["axe", "polearm"]);
  expect(loaded.heroes.warrior.equipment.offhand).toBeUndefined();
  expect(loaded.heroes.warrior.equipment.ranged).toBe("artisan_thrown");
  expect(loaded.heroes.paladin).toEqual(before.heroes.paladin);
});
test("touch Paladin purchases axes and polearms, retains shared ownership, cancels a shield-removal review and reloads the chosen build", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = ready();
  trainWeaponType(s, "axe");
  equip(s, "artisan_axe");
  s.selectedClass = "paladin";
  equip(s, "artisan_shield");
  await seed(page, s);
  await page.goto("/#armory");
  await train(page, "axe");
  await card(page, "artisan_axe")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.locator(".weapon-training-panel summary").click();
  await page.locator('[data-weapon-training="polearm"] button').tap();
  const dialog = page.getByRole("dialog"),
    before = await saved(page);
  await controls(dialog.locator("button"));
  await fits(page);
  await capture(page, "purchase", 390);
  await dialog
    .getByRole("button", { name: "Keep current training", exact: true })
    .tap();
  expect(await saved(page)).toEqual(before);
  await page.locator('[data-weapon-training="polearm"] button').tap();
  await dialog.locator('[data-action="train-weapon-type"]').tap();
  const trained = await saved(page);
  expect(trained.gold).toBe(before.gold - 55);
  await card(page, "artisan_polearm")
    .getByRole("button", { name: "Equip item", exact: true })
    .tap();
  await deltaText(dialog, gearComparison(trained, "artisan_polearm"));
  await expect(dialog).toContainText("removes Masterwork Bulwark");
  await controls(dialog.locator("button"));
  await fits(page);
  await capture(page, "replacement", 390);
  await dialog
    .getByRole("button", { name: "Keep current equipment", exact: true })
    .tap();
  expect(await saved(page)).toEqual(trained);
  await card(page, "artisan_polearm")
    .getByRole("button", { name: "Equip item", exact: true })
    .tap();
  await dialog
    .getByRole("button", { name: "Equip Masterwork Glaive", exact: true })
    .tap();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.heroes.paladin.equipment.weapon).toBe("artisan_polearm");
  expect(loaded.heroes.paladin.equipment.offhand).toBeUndefined();
  expect(loaded.heroes.warrior).toEqual(s.heroes.warrior);
  await page
    .locator(".loadout-slot")
    .filter({ has: page.locator('[data-action="unequip"][data-id="weapon"]') })
    .scrollIntoViewIfNeeded();
  await capture(page, "armory", 390);
});
test("trainer shows level/gold gates and explicit file import repairs malformed training and dependent equipment before reload", async ({
  page,
}) => {
  const s = ready();
  s.heroes.warrior.level = 2;
  s.gold = 39;
  await seed(page, s);
  await page.goto("/#armory");
  await page.locator(".weapon-training-panel summary").click();
  await page.locator('[data-weapon-training="axe"] button').click();
  await expect(page.getByRole("dialog")).toContainText(
    "Requires character level 3",
  );
  await expect(
    page.locator('[data-action="train-weapon-type"]'),
  ).toBeDisabled();
  const before = await saved(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep current training", exact: true })
    .click();
  expect(await saved(page)).toEqual(before);
  const raw = ready();
  raw.heroes.warrior.dualWield = true;
  raw.heroes.warrior.weaponTraining = ["polearm", "axe", "axe"] as any;
  raw.heroes.warrior.equipment = {
    offhand: "artisan_axe",
    ranged: "artisan_thrown",
    weapon: "duskwood_axe",
  };
  (raw.heroes.hunter as any).weaponTraining = "axe";
  raw.heroes.hunter.dualWield = true;
  raw.heroes.hunter.equipment = {
    weapon: "duskwood_axe",
    offhand: "artisan_axe",
    ranged: "artisan_thrown",
  };
  (raw.heroes.mage as any).weaponTraining = ["axe", "polearm"];
  raw.heroes.mage.equipment = { weapon: "artisan_polearm" };
  raw.heroes.paladin.level = 3;
  raw.heroes.paladin.weaponTraining = ["axe", "polearm"];
  raw.heroes.paladin.equipment = {
    weapon: "artisan_polearm",
    offhand: "artisan_shield",
  };
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "weapon-training.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(raw)),
  });
  expect((await saved(page)).heroes.warrior.weaponTraining).toEqual([]);
  await page
    .getByRole("button", { name: "Import adventure", exact: true })
    .click();
  const loaded = await saved(page);
  expect(loaded.heroes.warrior.weaponTraining).toEqual(["axe", "polearm"]);
  expect(loaded.heroes.warrior.equipment).toEqual(raw.heroes.warrior.equipment);
  expect(loaded.heroes.hunter.equipment).toEqual({ ranged: "artisan_thrown" });
  expect(loaded.heroes.mage.weaponTraining).toEqual([]);
  expect(loaded.heroes.mage.equipment).toEqual({});
  expect(loaded.heroes.paladin.weaponTraining).toEqual(["axe"]);
  expect(loaded.heroes.paladin.equipment).toEqual({});
  loaded.gold = 39;
  loaded.selectedClass = "shaman";
  await page.evaluate(
    ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
    { key: SAVE_KEY, s: loaded },
  );
  await page.reload();
  await card(page, "artisan_axe")
    .getByRole("button", { name: "View weapon training", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Requires 40 G");
  await expect(
    page.locator('[data-action="train-weapon-type"]'),
  ).toBeDisabled();
});
test("Shaman discovers the Expert axe craft, spends exact graded materials, earns project credit and learns/equips/enchants after crafting", async ({
  page,
}) => {
  const s = ready("shaman");
  s.inventory = s.inventory.filter((id) => id !== "expert_axe");
  s.professions.blacksmithing = 125;
  s.training.blacksmithing = 3;
  s.professionQuests.blacksmithing.chapter = 2;
  acceptProfessionQuest(s, "blacksmithing");
  await seed(page, s);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Plan your next discovery" }).click();
  await page.locator("#wardrobe-slot").selectOption("weapon");
  const discovery = page.locator('[data-wardrobe-id="expert_axe"]');
  await expect(discovery).toContainText("Train One-handed axes first");
  await expect(discovery).toContainText("8 Iron Ore");
  await discovery
    .getByRole("button", { name: "View crafting", exact: true })
    .click();
  const before = await saved(page);
  await page
    .locator('[data-recipe-id="craft_expert_axe"] [data-action="craft"]')
    .click();
  const crafted = await saved(page);
  expect(crafted.gold).toBe(before.gold - 85);
  expect(crafted.materials.iron_ore).toBe(before.materials.iron_ore - 8);
  expect(crafted.materials.heavy_leather).toBe(
    before.materials.heavy_leather - 2,
  );
  expect(crafted.professionQuests.blacksmithing.progress.crafts).toBe(1);
  expect(crafted.heroes.shaman.weaponTraining).toEqual([]);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await discovery
    .getByRole("button", { name: "View weapon training", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator('[data-action="train-weapon-type"]')
    .click();
  await discovery
    .getByRole("button", { name: "Show in satchel", exact: true })
    .click();
  await card(page, "expert_axe")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.locator("#bag-slot").selectOption("all");
  await card(page, "artisan_shield")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.locator("#enchant-target").selectOption("expert_axe");
  await page
    .locator('[data-formula="weapon_force"]')
    .getByRole("button", { name: "Review enchantment" })
    .click();
  const preEffect = await saved(page);
  await expect(page.getByRole("dialog")).toContainText("+6% Damage");
  await page
    .getByRole("dialog")
    .locator('[data-action="confirm-enchantment"]')
    .click();
  const enhanced = await saved(page);
  expect(enhanced.gold).toBe(preEffect.gold - 15);
  expect(enhanced.materials.dust).toBe(preEffect.materials.dust - 2);
  expect(heroStats(enhanced).power - heroStats(preEffect).power).toBe(6);
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.heroes.shaman.weaponTraining).toEqual(["axe"]);
  expect(loaded.heroes.shaman.equipment.weapon).toBe("expert_axe");
  expect(loaded.heroes.shaman.equipment.offhand).toBe("artisan_shield");
});
test("actual Sneed combat secures an untrained axe, settles once and supports a reviewed camp training purchase", async ({
  page,
}) => {
  const s = ready();
  s.inventory = s.inventory.filter((id) => id !== "deadmines_axe");
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
        `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;this.xpNeeded=1e9;window.__weaponTrainingGame=this;this.rng.pick=pool=>pool.find(v=>v?.id==='deadmines_axe'||v==='deadmines_axe')||pool[0];`,
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
    const g = (window as any).__weaponTrainingGame;
    g.dungeonStageTime = g.dungeonStage.duration - 0.01;
    g.update(1 / 60);
    Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
    g.useBomb();
    g.update(1 / 60);
  });
  await expect(page.getByRole("dialog")).toContainText("Ironclad Handaxe");
  await page
    .getByRole("button", {
      name: "Return to camp with secured rewards",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  const earned = await saved(page);
  expect(earned.inventory).toContain("deadmines_axe");
  expect(earned.heroes.warrior.weaponTraining).toEqual([]);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await card(page, "deadmines_axe")
    .getByRole("button", { name: "View weapon training", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator('[data-action="train-weapon-type"]')
    .click();
  await card(page, "deadmines_axe")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.reload();
  const loaded = await saved(page);
  expect(loaded.history).toHaveLength(1);
  expect(loaded.history[0].dungeonBosses).toBe(1);
  expect(loaded.inventory.filter((id) => id === "deadmines_axe")).toHaveLength(
    1,
  );
  expect(loaded.heroes.warrior.equipment.weapon).toBe("deadmines_axe");
  expect(loaded.gold).toBe(earned.gold - 40);
});
test("nine classes at six widths expose only eligible training and all new sources with 44px controls and no overflow", async ({
  page,
}) => {
  await seed(page, ready());
  await page.goto("/#armory");
  const reports = [];
  for (const c of CLASSES)
    for (const width of [360, 390, 760, 800, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("#hero-switch").selectOption(c.id);
      await page.locator(".weapon-training-panel summary").click();
      const choices = Object.values(WEAPON_TRAINING).filter((r) =>
        r.classes.includes(c.id),
      ).length;
      await expect(page.locator("[data-weapon-training]")).toHaveCount(choices);
      await controls(
        page.locator(
          '.weapon-training-panel button, .gear-actions [data-action="review-weapon-training"]',
        ),
      );
      await controls(page.locator(".weapon-training-panel summary"));
      await fits(page);
      await page
        .getByRole("button", { name: "Plan your next discovery" })
        .click();
      if (
        (await page
          .locator('[data-action="wardrobe-usable"]')
          .getAttribute("aria-pressed")) === "true"
      )
        await page.locator('[data-action="wardrobe-usable"]').click();
      await page.locator("#wardrobe-slot").selectOption("weapon");
      await expect(page.locator(".wardrobe-card")).toHaveCount(69);
      await controls(
        page.locator(
          '.wardrobe-actions [data-action="review-weapon-training"]',
        ),
      );
      await fits(page);
      await page
        .getByRole("button", { name: "Plan your next discovery" })
        .click();
      await page.locator(".weapon-training-panel summary").click();
      reports.push({
        class: c.id,
        width,
        trainingChoices: choices,
        weaponDiscoveries: 69,
        noHorizontalOverflow: true,
        minControlPixels: 44,
      });
    }
  await mkdir("output", { recursive: true });
  await writeFile(
    "output/weapon-training-layout-0.29.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
});
