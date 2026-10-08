import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { CLASSES, MATERIALS, GEAR_MAP, STAT_LABELS } from "../../src/content";
import type { ClassId, Stats } from "../../src/content";
import { DUAL_WIELD_GEAR, dualWieldClass } from "../../src/dual-wield";
import {
  freshSave,
  SAVE_KEY,
  trainDualWield,
  equip,
  heroStats,
  gearComparison,
  weaponSwapComparison,
  applyEnchantment,
  acceptProfessionQuest,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
test.use({ hasTouch: true });
const card = (p: Page, id: string) => p.locator(`[data-gear-id="${id}"]`);
const saved = (p: Page): Promise<SaveData> =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready(classId: ClassId = "rogue") {
  const s = freshSave();
  s.selectedClass = classId;
  s.settings.sound = false;
  s.gold = 1500;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  s.professions.blacksmithing = 225;
  s.training.blacksmithing = 4;
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  s.inventory.push(...DUAL_WIELD_GEAR.map((g) => g.id));
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
    path: `output/screenshots/dual-wield-${name}-${width}-0.27.png`,
  });
}
async function deltaText(dialog: Locator, delta: Partial<Stats>) {
  for (const [key, value] of Object.entries(delta))
    await expect(dialog).toContainText(
      `${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as keyof Stats]}`,
    );
}
async function choose(p: Page, id: string, slot: "weapon" | "offhand") {
  await card(p, id)
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await p
    .getByRole("dialog")
    .locator(`[data-hand-choice="${slot}"] button`)
    .click();
}
test("legacy heroes receive no free training and class/level/gold gates are visible without changing saved builds", async ({
  page,
}) => {
  const s = ready("hunter");
  s.heroes.hunter.level = 9;
  await seed(page, s);
  await page.goto("/#armory");
  await expect(page.locator(".loadout-slot")).toHaveCount(16);
  await expect(page.locator(".dual-wield-panel button")).toHaveText(
    "Requires character level 10",
  );
  await expect(page.locator(".dual-wield-panel button")).toBeDisabled();
  expect((await saved(page)).heroes.hunter.dualWield).toBe(false);
  const low = await saved(page);
  low.heroes.hunter.level = 10;
  low.gold = 59;
  await page.evaluate(
    ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
    { key: SAVE_KEY, s: low },
  );
  await page.reload();
  await expect(page.locator(".dual-wield-panel button")).toHaveText(
    "Requires 60 G",
  );
  await expect(page.locator(".dual-wield-panel button")).toBeDisabled();
  await page.locator("#hero-switch").selectOption("shaman");
  await expect(page.locator(".dual-wield-panel")).toHaveCount(0);
  const loaded = await saved(page);
  for (const h of Object.values(loaded.heroes)) expect(h.dualWield).toBe(false);
});
for (const classId of ["rogue", "hunter"] as const)
  test(`${classId} ${classId === "hunter" ? "touch" : "keyboard"} training, placement and hand swap review exact enchanted changes, cancel and persist shared ownership`, async ({
    page,
  }) => {
    const width = classId === "hunter" ? 390 : 1440;
    await page.setViewportSize({ width, height: 1000 });
    const s = ready(classId);
    s.selectedClass = "warrior";
    trainDualWield(s);
    equip(s, "duskwood_duelist_blade");
    equip(s, "artisan_duelist_blade", "offhand");
    s.selectedClass = classId;
    applyEnchantment(s, "duskwood_duelist_blade", "weapon_force");
    applyEnchantment(s, "artisan_duelist_blade", "weapon_precision");
    await seed(page, s);
    await page.goto("/#armory");
    const untouched = structuredClone(s.heroes.warrior),
      before = await saved(page);
    await page
      .getByRole("button", { name: "Train Dual Wield · 60 G", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeFocused();
    await controls(page.getByRole("dialog").locator("button"));
    await fits(page);
    await capture(page, "training", width);
    await page
      .getByRole("button", { name: "Keep current training", exact: true })
      .click();
    expect(await saved(page)).toEqual(before);
    await page
      .getByRole("button", { name: "Train Dual Wield · 60 G", exact: true })
      .click();
    const learn = page
      .getByRole("dialog")
      .getByRole("button", { name: "Learn Dual Wield · 60 G", exact: true });
    if (classId === "hunter") await learn.tap();
    else {
      await learn.focus();
      await page.keyboard.press("Enter");
    }
    expect((await saved(page)).gold).toBe(before.gold - 60);
    expect((await saved(page)).heroes[classId].dualWield).toBe(true);
    await card(page, "duskwood_duelist_blade")
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    if (classId === "hunter")
      await expect(
        page.getByRole("dialog").locator('[data-hand-choice="offhand"] button'),
      ).toHaveText("Equip a one-handed weapon");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Equip primary weapon", exact: true })
      .click();
    const first = await saved(page),
      changes = gearComparison(first, "artisan_duelist_blade", "offhand");
    await card(page, "artisan_duelist_blade")
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    const hand = page.getByRole("dialog");
    await expect(hand).toBeFocused();
    await deltaText(hand.locator('[data-hand-choice="offhand"]'), changes);
    await controls(hand.locator("button"));
    await fits(page);
    await capture(page, "placement", width);
    await hand
      .getByRole("button", { name: "Keep current equipment", exact: true })
      .click();
    expect(await saved(page)).toEqual(first);
    await card(page, "artisan_duelist_blade")
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Equip secondary weapon", exact: true })
      .click();
    const paired = await saved(page);
    expect(heroStats(paired).power - heroStats(first).power).toBe(13);
    expect(heroStats(paired).crit - heroStats(first).crit).toBe(4.5);
    await expect(
      page.locator(".loadout-slot").filter({ hasText: "SECONDARY WEAPON" }),
    ).toContainText("50%");
    await page
      .locator(".loadout-slot")
      .filter({ hasText: "SECONDARY WEAPON" })
      .scrollIntoViewIfNeeded();
    await capture(page, "armory", width);
    await page
      .locator(".dual-wield-panel")
      .getByRole("button", { name: "Swap weapon hands", exact: true })
      .click();
    const swap = page.getByRole("dialog");
    await deltaText(swap, weaponSwapComparison(paired));
    await controls(swap.locator("button"));
    await fits(page);
    await capture(page, "swap", width);
    await swap
      .getByRole("button", { name: "Keep current hands", exact: true })
      .click();
    expect(await saved(page)).toEqual(paired);
    await page
      .locator(".dual-wield-panel")
      .getByRole("button", { name: "Swap weapon hands", exact: true })
      .click();
    const confirm = page
      .getByRole("dialog")
      .getByRole("button", { name: "Swap weapon hands", exact: true });
    if (classId === "hunter") await confirm.tap();
    else {
      await confirm.focus();
      await page.keyboard.press("Enter");
    }
    const swapped = await saved(page);
    expect(swapped.heroes[classId].equipment.weapon).toBe(
      "artisan_duelist_blade",
    );
    expect(swapped.heroes[classId].equipment.offhand).toBe(
      "duskwood_duelist_blade",
    );
    expect(swapped.heroes.warrior).toEqual(untouched);
    expect(swapped.inventory).toEqual(paired.inventory);
    expect(swapped.enchantments).toEqual(paired.enchantments);
    await page.reload();
    expect((await saved(page)).heroes[classId]).toEqual(
      swapped.heroes[classId],
    );
    if (classId === "hunter") {
      await card(page, "starter_hunter")
        .getByRole("button", { name: "Equip item", exact: true })
        .click();
      await deltaText(
        page.getByRole("dialog"),
        gearComparison(swapped, "starter_hunter"),
      );
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: `Equip ${GEAR_MAP.starter_hunter.name}`,
          exact: true,
        })
        .tap();
    } else
      await page
        .getByRole("button", {
          name: `Unequip ${GEAR_MAP.artisan_duelist_blade.name}`,
          exact: true,
        })
        .click();
    const cleared = await saved(page);
    expect(cleared.heroes[classId].equipment.offhand).toBeUndefined();
    expect(cleared.heroes.warrior).toEqual(untouched);
    expect(cleared.heroes[classId].dualWield).toBe(true);
    await page.reload();
    expect(
      (await saved(page)).heroes[classId].equipment.offhand,
    ).toBeUndefined();
  });
test("source navigation crafts an exact Expert blade, advances accepted guild work and enchants the equipped secondary at half effect", async ({
  page,
}) => {
  const s = ready();
  s.inventory = s.inventory.filter((id) => id !== "expert_duelist_blade");
  s.professions.blacksmithing = 125;
  s.training.blacksmithing = 3;
  s.professionQuests.blacksmithing.chapter = 2;
  acceptProfessionQuest(s, "blacksmithing");
  trainDualWield(s);
  equip(s, "duskwood_duelist_blade");
  await seed(page, s);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Plan your next discovery" }).click();
  await page.locator("#wardrobe-slot").selectOption("offhand");
  await page
    .locator('[data-wardrobe-id="expert_duelist_blade"]')
    .getByRole("button", { name: "View crafting", exact: true })
    .click();
  await expect(page.locator("#recipe-filter")).toHaveValue("blacksmithing");
  const before = await saved(page);
  await page
    .locator(
      '[data-recipe-id="craft_expert_duelist_blade"] [data-action="craft"]',
    )
    .click();
  const crafted = await saved(page);
  expect(crafted.gold).toBe(before.gold - 85);
  expect(crafted.materials.iron_ore).toBe(before.materials.iron_ore - 8);
  expect(crafted.materials.heavy_leather).toBe(
    before.materials.heavy_leather - 2,
  );
  expect(crafted.professionQuests.blacksmithing.progress.crafts).toBe(1);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator("#wardrobe-slot").selectOption("offhand");
  await page
    .locator('[data-wardrobe-id="expert_duelist_blade"]')
    .getByRole("button", { name: "Show in satchel", exact: true })
    .click();
  await expect(page.locator("#bag-slot")).toHaveValue("offhand");
  await choose(page, "expert_duelist_blade", "offhand");
  await page.locator("#enchant-target").selectOption("expert_duelist_blade");
  const preEffect = await saved(page);
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
  expect(enhanced.enchantments.expert_duelist_blade).toBe("weapon_precision");
  expect(heroStats(enhanced).crit - heroStats(preEffect).crit).toBe(2.5);
  expect(enhanced.gold).toBe(preEffect.gold - 45);
  expect(enhanced.materials.vision_dust).toBe(
    preEffect.materials.vision_dust - 5,
  );
  expect(enhanced.materials.iron_ore).toBe(preEffect.materials.iron_ore - 2);
  await page.reload();
  expect(heroStats(await saved(page))).toEqual(heroStats(enhanced));
});
test("actual file import retains a valid trained pair and repairs forged training, duplicate and two-handed pairs", async ({
  page,
}) => {
  const s = ready("hunter");
  trainDualWield(s);
  equip(s, "duskwood_duelist_blade");
  equip(s, "artisan_duelist_blade", "offhand");
  s.heroes.rogue.dualWield = "true" as any;
  s.heroes.rogue.equipment = {
    weapon: "duskwood_duelist_blade",
    offhand: "artisan_duelist_blade",
  };
  s.heroes.warrior.dualWield = true;
  s.heroes.warrior.equipment = {
    offhand: "duskwood_duelist_blade",
    weapon: "duskwood_duelist_blade",
  };
  s.heroes.mage.dualWield = true;
  const base = freshSave();
  base.settings.sound = false;
  await seed(page, base);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "dual-wield.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page
    .getByRole("button", { name: "Import adventure", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const imported = await saved(page);
  expect(imported.heroes.hunter.equipment).toEqual(s.heroes.hunter.equipment);
  expect(imported.heroes.rogue.dualWield).toBe(false);
  expect(imported.heroes.rogue.equipment.offhand).toBeUndefined();
  expect(imported.heroes.warrior.equipment.offhand).toBeUndefined();
  expect(imported.heroes.mage.dualWield).toBe(false);
  await page.reload();
  expect((await saved(page)).heroes.hunter).toEqual(imported.heroes.hunter);
});
test("actual Mr. Smite room combat secures a blade for later camp pairing and once-only partial settlement", async ({
  page,
}) => {
  const s = ready("hunter");
  s.inventory = s.inventory.filter((id) => id !== "ironclad_duelist");
  s.selectedZone = "deadmines";
  s.clearedZones = ["westfall"];
  s.supplies.bombs = 3;
  trainDualWield(s);
  equip(s, "duskwood_duelist_blade");
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
        `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;this.xpNeeded=1e9;window.__dualGame=this;this.rng.pick=(pool)=>pool.find(v=>v?.id==='ironclad_duelist'||v==='ironclad_duelist')||pool[0];`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-07T12:00:00Z") });
  await page.goto("/#camp");
  await page.clock.pauseAt(new Date("2026-10-07T12:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Dungeon", exact: true })
    .click();
  for (let stage = 0; stage < 2; stage++) {
    await page.evaluate(() => {
      const g = (window as any).__dualGame;
      g.dungeonStageTime = g.dungeonStage.duration - 0.01;
      g.update(1 / 60);
      Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
      g.useBomb();
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
    });
    if (stage === 0)
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
  }
  await expect(page.getByRole("dialog")).toContainText(
    "Ironclad Duelist Blade",
  );
  await page
    .getByRole("button", {
      name: "Return to camp with secured rewards",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  expect((await saved(page)).inventory).toContain("ironclad_duelist");
  expect((await saved(page)).heroes.hunter.equipment.offhand).toBeUndefined();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await choose(page, "ironclad_duelist", "offhand");
  await page.reload();
  const settled = await saved(page);
  expect(settled.history).toHaveLength(1);
  expect(settled.history[0].dungeonBosses).toBe(2);
  expect(settled.heroes.hunter.equipment.offhand).toBe("ironclad_duelist");
});
test("all nine classes at six widths fit training, sixteen sockets and expanded hand catalogs with 44px review controls", async ({
  page,
}) => {
  await seed(page, ready());
  await page.goto("/#armory");
  const reports = [];
  for (const c of CLASSES)
    for (const width of [360, 390, 760, 800, 1024, 1440]) {
      const s = ready(c.id);
      if (dualWieldClass(c.id)) {
        trainDualWield(s);
        equip(s, "duskwood_duelist_blade");
        equip(s, "artisan_duelist_blade", "offhand");
      }
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
        { key: SAVE_KEY, s },
      );
      await page.goto("/#armory");
      await page.reload();
      await fits(page);
      await expect(page.locator(".loadout-slot")).toHaveCount(16);
      await expect(page.locator(".dual-wield-panel")).toHaveCount(
        dualWieldClass(c.id) ? 1 : 0,
      );
      if (dualWieldClass(c.id)) {
        await controls(page.locator(".dual-wield-panel button"));
        await card(page, "expert_duelist_blade")
          .getByRole("button", { name: "Equip item", exact: true })
          .click();
        await fits(page);
        await controls(page.getByRole("dialog").locator("button"));
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Keep current equipment", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: "Plan your next discovery" })
        .click();
      await page.locator("#wardrobe-slot").selectOption("offhand");
      await page.getByRole("button", { name: "Showing class-usable" }).click();
      await expect(page.locator(".wardrobe-card")).toHaveCount(61);
      await fits(page);
      await page.locator("#wardrobe-slot").selectOption("weapon");
      await expect(page.locator(".wardrobe-card")).toHaveCount(69);
      await page
        .getByRole("button", { name: "Expedition", exact: true })
        .click();
      await expect(page.locator(".equipment-socket")).toHaveCount(16);
      await controls(page.locator(".equipment-socket"));
      await fits(page);
      reports.push({
        class: c.id,
        width,
        sockets: 16,
        offhands: 61,
        weapons: 69,
        trained: dualWieldClass(c.id),
        overflow: false,
      });
    }
  await mkdir("output", { recursive: true });
  await writeFile(
    "output/dual-wield-layout-0.27.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
});
