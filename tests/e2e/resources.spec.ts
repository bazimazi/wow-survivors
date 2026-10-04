import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { RESOURCE_FAMILIES, RESOURCE_IDS } from "../../src/resources";

async function seed(page: Page, s: SaveData | object) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const recipe = (page: Page, name: string) =>
  page
    .locator(".recipe-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
function errorsFor(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
function prepared() {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.gold = 2000;
  s.settings.sound = false;
  return s;
}
async function clock(page: Page, path = "/") {
  await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  await page.goto(path);
  await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
}
// Only node positions/population are fixtures; movement, gathering, gates and settlement use production code.
async function fieldFixture(page: Page, nodes: { kind: string; x: number }[]) {
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      original = await response.text();
    const marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(original).toContain(marker);
    const population = nodes.map((n, i) => ({
      ...n,
      id: 900 + i,
      y: 0,
      depleted: false,
    }));
    const body = original.replace(
      marker,
      `${marker}\nthis.nodes = ${JSON.stringify(population)}; this.enemies = []; this.spells = [];`,
    );
    await route.fulfill({ response, body });
  });
}
async function returnToCamp(page: Page) {
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
}

test("older six-material saves show 24 resources and retain stock, training and an enchanted item on reload", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.enchanting = 130;
  s.training.enchanting = 2;
  s.enchantments.starter_mage = "weapon_force";
  const raw = JSON.parse(JSON.stringify(s));
  raw.materials = {
    herbs: 11,
    ore: 22,
    leather: 33,
    cloth: 44,
    dust: 55,
    fish: 66,
  };
  await seed(page, raw);
  await page.goto("/#professions");
  await expect(page.locator(".resource-family")).toHaveCount(6);
  await expect(page.locator(".resource-grade")).toHaveCount(24);
  await expect(page.locator('[data-material="cloth"] strong')).toHaveText("44");
  await expect(
    page.locator('[data-material="mageweave_cloth"] strong'),
  ).toHaveText("0");
  await page.reload();
  // A real trainer transaction persists the migrated schema without granting resources.
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await expect(page.locator(".loadout-panel")).toContainText("Lesser Force");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page.locator('.trade-training[data-trade="enchanting"] button').click();
  const state = await saved(page);
  expect(state.training.enchanting).toBe(3);
  expect(state.enchantments.starter_mage).toBe("weapon_force");
  for (const f of RESOURCE_FAMILIES) {
    expect(state.materials[f]).toBe(raw.materials[f]);
    for (const id of RESOURCE_IDS[f].slice(1))
      expect(state.materials[id]).toBe(0);
  }
  await page.reload();
  await expect(page.locator(".resource-grade")).toHaveCount(24);
  expect(errors).toEqual([]);
});

test("real Tin gathering enables a grade-II craft, charges the right stock and persists equipment", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.selectedClass = "warrior";
  s.heroes.warrior.level = 20;
  s.professions = { mining: 50, blacksmithing: 50 };
  s.materials.ore = 80;
  s.materials.dust = 40;
  s.materials.soul_dust = 1;
  await seed(page, s);
  await fieldFixture(
    page,
    [100, 130, 160, 190].map((x) => ({ kind: "tin_ore", x })),
  );
  await clock(page, "/#professions");
  await page.locator("#recipe-filter").selectOption("blacksmithing");
  const crown = recipe(page, "Ironwarden Crown");
  await expect(crown).toContainText("Tin Ore");
  await expect(
    crown.getByRole("button", { name: "More resources needed" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.keyboard.press("g");
  await expect(page.locator("#gather-name")).toHaveText("Tin Ore");
  await expect(page.locator("#gather-practice")).toContainText("+1 skill");
  await page.keyboard.down("d");
  await page.clock.runFor(2400);
  await page.keyboard.up("d");
  await expect(page.locator("#gather-name")).toHaveText(
    "No matching nodes remain",
  );
  await returnToCamp(page);
  let state = await saved(page);
  expect(state.materials.tin_ore).toBe(8);
  expect(state.professions.mining).toBe(54);
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page.locator("#recipe-filter").selectOption("blacksmithing");
  await crown.getByRole("button", { name: "Craft", exact: true }).click();
  state = await saved(page);
  expect(state.materials.tin_ore).toBe(1);
  expect(state.materials.soul_dust).toBe(0);
  expect(state.materials.ore).toBe(80);
  expect(state.materials.dust).toBe(40);
  expect(state.inventory).toContain("ironwarden_head");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page
    .locator(".gear-card")
    .filter({
      has: page.getByRole("heading", { name: "Ironwarden Crown", exact: true }),
    })
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  expect((await saved(page)).heroes.warrior.equipment.head).toBe(
    "ironwarden_head",
  );
  expect(errors).toEqual([]);
});

test("compass explains locked grades, filters families, freezes with pause and waits for dismount", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.herbalism = 50;
  s.mounts = ["horse"];
  s.heroes.mage.travel = { riding: 1, form: false, selected: "horse" };
  await seed(page, s);
  await fieldFixture(page, [
    { kind: "ore", x: 20 },
    { kind: "sungrass", x: 45 },
    { kind: "briarthorn", x: 120 },
    { kind: "fish", x: 180 },
  ]);
  await clock(page);
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.keyboard.press("g");
  await expect(
    page.getByRole("region", { name: "Gathering compass" }),
  ).toBeVisible();
  await expect(page.locator("#gather-name")).toHaveText("Briarthorn");
  await page.getByLabel("Inspect locked nodes").check();
  await expect(page.locator("#gather-name")).toHaveText("Copper Ore");
  await expect(page.locator("#gather-reason")).toContainText("Learn Mining");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Inspect locked nodes")).not.toBeChecked();
  await page.getByLabel("Inspect locked nodes").check();
  await page.getByRole("button", { name: "Herbs", exact: true }).click();
  await expect(page.locator("#gather-name")).toHaveText("Sungrass");
  await expect(page.locator("#gather-reason")).toContainText("225");
  await page.getByLabel("Inspect locked nodes").uncheck();
  await page.keyboard.press("Escape");
  const distance = await page.locator("#gather-distance").textContent();
  await page.keyboard.down("d");
  await page.clock.runFor(1200);
  await page.keyboard.up("d");
  expect(await page.locator("#gather-distance").textContent()).toBe(distance);
  await page.getByRole("button", { name: /Resume expedition/ }).click();
  await page.keyboard.press("r");
  await page.clock.runFor(1500);
  await expect(page.locator("#gather-reason")).toContainText("Dismount");
  await page.keyboard.down("d");
  await page.clock.runFor(350);
  await page.keyboard.up("d");
  await expect(page.locator("#gather-name")).toHaveText("Briarthorn");
  await page.keyboard.press("r");
  await page.clock.runFor(180);
  await expect(page.locator("#gather-name")).toHaveText(
    "No matching nodes remain",
  );
  await returnToCamp(page);
  expect((await saved(page)).materials.briarthorn).toBe(2);
  expect((await saved(page)).professions.herbalism).toBe(51);
  expect((await saved(page)).materials.sungrass).toBe(0);
  expect(errors).toEqual([]);
});

test("disenchant previews and advanced enchant reviews spend equipment-grade dust with exact saved deductions", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.enchanting = 125;
  s.training.enchanting = 3;
  s.inventory.push("lantern_hood", "starwoven_crown");
  s.materials.vision_dust = 3;
  s.materials.iron_ore = 2;
  const baseDust = s.materials.dust;
  await seed(page, s);
  await page.goto("/#armory");
  const hood = page.locator(
    '[data-action="disenchant"][data-id="lantern_hood"]',
  );
  await expect(hood).toHaveAttribute("title", "Disenchant into 2 Vision Dust");
  await hood.click();
  expect((await saved(page)).materials.vision_dust).toBe(5);
  const crown = page.locator(
    '[data-action="disenchant"][data-id="starwoven_crown"]',
  );
  await expect(crown).toHaveAttribute("title", /Dream Dust/);
  await crown.click();
  expect((await saved(page)).materials.dream_dust).toBeGreaterThan(0);
  expect((await saved(page)).professions.enchanting).toBe(128); // Grade IV dust grants no unqualified practice.
  await page.locator("#enchant-target").selectOption("starter_mage");
  const formula = page.locator('[data-formula="weapon_precision"]');
  await expect(formula).toContainText("Vision Dust");
  await formula.getByRole("button", { name: "Review enchantment" }).click();
  await expect(page.getByRole("dialog")).toContainText("5 Vision Dust");
  await page.getByRole("button", { name: /Apply Focused Precision/ }).click();
  await page.reload();
  const state = await saved(page);
  expect(state.materials.vision_dust).toBe(0);
  expect(state.materials.iron_ore).toBe(0);
  expect(state.materials.dust).toBe(baseDust);
  expect(state.enchantments.starter_mage).toBe("weapon_precision");
  expect(state.inventory).not.toContain("lantern_hood");
  expect(state.inventory).not.toContain("starwoven_crown");
  expect(errors).toEqual([]);
});

test.describe("touch fieldwork", () => {
  test.use({
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  test("24 material rows, source guides and compass controls fit the phone and respond to taps", async ({
    page,
  }) => {
    const errors = errorsFor(page),
      s = prepared();
    s.professions.herbalism = 125;
    s.training.herbalism = 3;
    await seed(page, s);
    await clock(page, "/#professions");
    await expect(page.locator(".resource-grade")).toHaveCount(24);
    const source = page.getByText("Where to find herbs", { exact: true });
    expect((await source.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await source.tap();
    await expect(page.locator(".resource-family").first()).toContainText(
      "Tirisfal: I",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(360);
    await page.locator(".resource-store").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "output/screenshots/material-storage-mobile.png",
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Expedition", exact: true }).tap();
    await page.getByRole("button", { name: /Begin Expedition/ }).tap();
    await page.clock.runFor(200);
    await page.locator("#fieldwork-toggle").tap();
    for (const control of await page
      .locator(".fieldwork-families button")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    const locked = page.locator(".fieldwork-locked");
    expect((await locked.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await locked.tap();
    await expect(page.getByLabel("Inspect locked nodes")).toBeChecked();
    await page.getByRole("button", { name: "Ore", exact: true }).tap();
    await expect(page.locator("#gather-reason")).toContainText("Learn Mining");
    await page.screenshot({
      path: "output/screenshots/gathering-compass-mobile.png",
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(360);
    await page.locator("#fieldwork-toggle").tap();
    await expect(
      page.getByRole("region", { name: "Gathering compass" }),
    ).toBeHidden();
    expect(errors).toEqual([]);
  });
});
