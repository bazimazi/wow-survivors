import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { CLASSES, MATERIALS } from "../../src/content";
import {
  freshSave,
  SAVE_KEY,
  equip,
  trainWeaponType,
  acceptProfessionQuest,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
test.use({ hasTouch: true });
function ready(classId: SaveData["selectedClass"] = "warrior") {
  const s = freshSave();
  s.selectedClass = classId;
  s.settings.sound = false;
  s.gold = 1500;
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.professions = { enchanting: 225, engineering: 225 };
  s.training.enchanting = s.training.engineering = 4;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  s.inventory.push(
    "artisan_duelist_blade",
    "artisan_thrown",
    "artisan_gun",
    "artisan_crossbow",
    "artisan_greataxe",
    "artisan_fist",
    "artisan_shield",
    "artisan_focus",
    "lantern_cloak",
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
const saved = (p: Page): Promise<SaveData> =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const card = (p: Page, id: string) => p.locator(`[data-gear-id="${id}"]`);
async function capture(p: Page, name: string) {
  await mkdir("output/screenshots", { recursive: true });
  await p.screenshot({
    path: `output/screenshots/equipment-${name}-0.30.png`,
    animations: "disabled",
  });
}
test("attunement reviews personal binding, rejects shared use, cancels, replaces and reloads exact paid effects", async ({
  page,
}) => {
  const s = ready();
  equip(s, "artisan_duelist_blade");
  s.heroes.hunter.equipment.weapon = "artisan_duelist_blade";
  await seed(page, s);
  await page.goto("/#armory");
  await card(page, "artisan_duelist_blade")
    .getByRole("button", { name: "Attune item", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("permanently binds");
  await expect(dialog.locator('[data-affix="force"] button')).toBeDisabled();
  const before = await saved(page);
  await dialog
    .getByRole("button", { name: "Keep current item", exact: true })
    .click();
  expect(await saved(page)).toEqual(before);
  await page.locator("#hero-switch").selectOption("hunter");
  await page
    .getByRole("button", {
      name: "Unequip Masterwork Duelist Blade",
      exact: true,
    })
    .click();
  await page.locator("#hero-switch").selectOption("warrior");
  await card(page, "artisan_duelist_blade")
    .getByRole("button", { name: "Attune item", exact: true })
    .click();
  await expect(dialog.locator('article[data-affix="force"]')).toContainText(
    "+12% Damage",
  );
  await capture(page, "affix-desktop");
  await dialog.locator('[data-affix="force"] button').click();
  let state = await saved(page);
  expect(state.gold).toBe(1400);
  expect(state.materials.dream_dust).toBe(94);
  expect(state.itemStates.artisan_duelist_blade).toEqual({
    condition: 100,
    owner: "warrior",
    affix: "force",
  });
  await expect(card(page, "artisan_duelist_blade")).toContainText(
    "Soulbound to Warrior",
  );
  await page.reload();
  await expect(card(page, "artisan_duelist_blade")).toContainText("of Force");
  await card(page, "artisan_duelist_blade")
    .getByRole("button", { name: "Attune item", exact: true })
    .click();
  await expect(dialog.locator('[data-affix="force"] button')).toBeDisabled();
  await dialog.locator('[data-affix="haste"] button').click();
  state = await saved(page);
  expect(state.gold).toBe(1300);
  expect(state.itemStates.artisan_duelist_blade.affix).toBe("haste");
  await page.locator("#hero-switch").selectOption("hunter");
  await expect(
    card(page, "artisan_duelist_blade").getByRole("button", {
      name: "Soulbound to Warrior",
      exact: true,
    }),
  ).toBeDisabled();
});
test("phone repairs review cost, cancel safely, preserve binding/enchantments and survive reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = ready();
  equip(s, "artisan_duelist_blade");
  s.itemStates.artisan_duelist_blade = {
    condition: 0,
    owner: "warrior",
    affix: "guard",
  };
  s.enchantments.artisan_duelist_blade = "weapon_force";
  await seed(page, s);
  await page.goto("/#armory");
  await page.locator(".equipment-workshop summary").tap();
  await expect(card(page, "artisan_duelist_blade")).toContainText(
    "Broken · bonuses inactive",
  );
  await page.locator('[data-action="review-repair"][data-id="loadout"]').tap();
  const dialog = page.getByRole("dialog");
  const cost = Number(
    await dialog
      .locator('[data-action="confirm-repair"]')
      .getAttribute("data-cost"),
  );
  await expect(dialog).toContainText("0 → 100");
  await capture(page, "repair-phone");
  const before = await saved(page);
  await dialog.getByRole("button", { name: "Keep current condition" }).tap();
  expect(await saved(page)).toEqual(before);
  await page.locator('[data-action="review-repair"][data-id="loadout"]').tap();
  await dialog.locator('[data-action="confirm-repair"]').tap();
  const state = await saved(page);
  expect(state.gold).toBe(1500 - cost);
  expect(state.itemStates.artisan_duelist_blade).toEqual({
    condition: 100,
    owner: "warrior",
    affix: "guard",
  });
  expect(state.enchantments.artisan_duelist_blade).toBe("weapon_force");
  await page.reload();
  await expect(card(page, "artisan_duelist_blade")).toContainText(
    "Condition 100 / 100",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Engineering crafts and trains a personal gun, then enchants an actual cloak and shield with graded formulas", async ({
  page,
}) => {
  const s = ready();
  s.inventory = s.inventory.filter((id) => id !== "artisan_gun");
  s.professionQuests.engineering.chapter = 3;
  acceptProfessionQuest(s, "engineering");
  equip(s, "artisan_duelist_blade");
  equip(s, "artisan_shield");
  await seed(page, s);
  await page.goto("/#professions");
  await page
    .locator(
      '.recipe-card[data-recipe-id="craft_artisan_gun"] [data-action="craft"]',
    )
    .click();
  let state = await saved(page);
  expect(state.inventory).toContain("artisan_gun");
  expect(state.professionQuests.engineering.progress.crafts).toBe(1);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator(".weapon-training-panel summary").click();
  await page.locator('[data-weapon-training="gun"] button').click();
  await page
    .getByRole("dialog")
    .locator('[data-action="train-weapon-type"]')
    .click();
  await card(page, "artisan_gun")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator('[data-action="equip-ranged-position"]')
    .click();
  state = await saved(page);
  expect(state.heroes.warrior.equipment.ranged).toBe("artisan_gun");
  for (const [id, formula] of [
    ["lantern_cloak", "back_ward_4"],
    ["artisan_shield", "offhand_ward_4"],
  ]) {
    await page.locator("#enchant-target").selectOption(id);
    await page.locator(`[data-formula="${formula}"] button`).click();
    await page
      .getByRole("dialog")
      .locator('[data-action="confirm-enchantment"]')
      .click();
    expect((await saved(page)).enchantments[id]).toBe(formula);
  }
  await page.reload();
  expect((await saved(page)).heroes.warrior.weaponSkills.gun).toBe(1);
});
async function combatFixture(page: Page, s: SaveData) {
  await seed(page, s);
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.spells=[];this.pets=[];this.nodes=[];this.spawnTimer=1e6;this.xpNeeded=1e9;const target=this.enemies[0];Object.assign(target,{x:80,y:0,hp:1e6,maxHp:1e6,speed:0,damage:0});this.enemies=[target];this.rng.next=()=>0;window.__equipmentGame=this;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.clock.runFor(50);
}
test("real bow shots consume saved ammunition, pause correctly, practice and settle starting equipment wear once", async ({
  page,
}) => {
  const s = ready("hunter");
  s.ammunition = 10;
  s.inventory.push("ravenhill_bow");
  equip(s, "ravenhill_bow", "ranged");
  s.heroes.hunter.weaponSkills.bow = 1;
  await combatFixture(page, s);
  await expect(page.locator("#shoot-button")).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("t");
    await page.clock.runFor(2600);
  }
  expect((await saved(page)).ammunition).toBe(2);
  await page.keyboard.press("Escape");
  const atPause = await page.evaluate(() => ({
    time: (window as any).__equipmentGame.time,
    hits: (window as any).__equipmentGame.weaponHits.bow,
  }));
  await page.keyboard.press("t");
  await page.clock.runFor(3000);
  expect(await page.evaluate(() => (window as any).__equipmentGame.time)).toBe(
    atPause.time,
  );
  expect((await saved(page)).ammunition).toBe(2);
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await page.evaluate(() => {
    (window as any).__equipmentGame.time = 180;
  });
  await page.clock.runFor(20);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("need repair");
  const state = await saved(page);
  expect(state.itemStates.ravenhill_bow.condition).toBe(91);
  expect(state.heroes.hunter.weaponSkills.bow).toBe(2);
  expect(state.totals.runs).toBe(1);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.reload();
  expect((await saved(page)).totals.runs).toBe(1);
});
test("gun equipment shooting works with RT and the phone Shoot button; misses spend ammunition and cooldown is bounded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = ready();
  trainWeaponType(s, "gun");
  equip(s, "artisan_gun");
  s.ammunition = 3;
  await page.addInitScript(() => {
    (window as any).__equipmentPad = {
      index: 0,
      id: "Equipment pad",
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [(window as any).__equipmentPad],
    });
  });
  await combatFixture(page, s);
  await page.locator("#shoot-button").tap();
  expect((await saved(page)).ammunition).toBe(2);
  await page.locator("#shoot-button").tap();
  expect((await saved(page)).ammunition).toBe(2);
  await page.clock.runFor(2600);
  // First activity acquires the controller; release once before the combat press.
  await page.evaluate(() => {
    (window as any).__equipmentPad.buttons[7] = { pressed: true, value: 1 };
  });
  await page.clock.runFor(50);
  await page.evaluate(() => {
    (window as any).__equipmentPad.buttons[7] = { pressed: false, value: 0 };
  });
  await page.clock.runFor(50);
  await page.evaluate(() => {
    (window as any).__equipmentPad.buttons[7] = { pressed: true, value: 1 };
  });
  await page.clock.runFor(50);
  expect((await saved(page)).ammunition).toBe(1);
  await capture(page, "shoot-phone");
  const box = await page.locator("#shoot-button").boundingBox();
  const travel = await page.locator("#travel-button").boundingBox();
  const tutorial = await page.locator("#game-tutorial").boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(travel!.x);
  expect(tutorial!.y + tutorial!.height).toBeLessThanOrEqual(travel!.y);
  await expect(page.locator("#travel-label")).toBeVisible();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("a caster without ranged equipment strikes with keyboard and touch, obeys pause and spends no ammunition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const s = ready("mage");
  s.heroes.mage.weaponSkills.staff = 1;
  await combatFixture(page, s);
  await expect(page.locator("#shoot-button")).toContainText("Strike");
  await page.keyboard.press("t");
  expect(
    await page.evaluate(() => (window as any).__equipmentGame.weaponHits.staff),
  ).toBe(1);
  await page.clock.runFor(2600);
  await page.keyboard.press("Escape");
  await page.keyboard.press("t");
  expect(
    await page.evaluate(() => (window as any).__equipmentGame.weaponHits.staff),
  ).toBe(1);
  await page.keyboard.press("Escape");
  await page.locator("#shoot-button").tap();
  expect(
    await page.evaluate(() => (window as any).__equipmentGame.weaponHits.staff),
  ).toBe(2);
  expect(
    await page.evaluate(
      () => (window as any).__equipmentGame.damageBySpell["equipment-strike"],
    ),
  ).toBeGreaterThan(0);
  expect((await saved(page)).ammunition).toBe(0);
  await page.clock.runFor(30);
  await capture(page, "strike-phone");
});
test("nine heroes at three widths expose workshop practice and binding reviews with usable 44px controls", async ({
  page,
}) => {
  await seed(page, ready());
  await page.goto("/#armory");
  for (const c of CLASSES)
    for (const width of [360, 800, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("#hero-switch").selectOption(c.id);
      await page.locator(".equipment-workshop summary").click();
      await expect(page.locator(".weapon-practice-grid")).toBeVisible();
      for (const button of await page
        .locator(".equipment-workshop button")
        .all()) {
        const rect = await button.boundingBox();
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        expect(rect!.width).toBeGreaterThanOrEqual(44);
      }
      await page
        .locator(".equipment-workshop [data-action='buy-ammunition']")
        .click();
      expect((await saved(page)).ammunition).toBeGreaterThanOrEqual(50);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
});
