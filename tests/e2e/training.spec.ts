import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";

async function seed(page: Page, save: SaveData) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const recipe = (page: Page, name: string) =>
  page
    .locator(".recipe-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

test("partial craft gains stop at a cap, trainer payment extends it and reload retains the rank", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = freshSave();
  s.heroes.mage.level = 14;
  s.gold = 1000;
  s.professions.tailoring = 74;
  s.materials.cloth = 100;
  s.materials.dust = 20;
  s.materials.wool_cloth = 100;
  s.materials.soul_dust = 20;
  await seed(page, s);
  await page.goto("/#professions");
  const trainer = page.locator('.trade-training[data-trade="tailoring"]');
  await expect(trainer).toContainText("74 / 75");
  await page.locator("#recipe-filter").selectOption("tailoring");
  const crown = recipe(page, "Spellwoven Crown");
  await expect(crown.locator(".recipe-mastery")).toContainText(
    "+1 skill per craft",
  );
  await crown.getByRole("button", { name: "Craft", exact: true }).click();
  await expect(trainer).toContainText("75 / 75");
  await expect(crown).toContainText("Skill cap reached · visit trainer");
  await crown.getByRole("button", { name: "Craft", exact: true }).click();
  expect((await saved(page)).professions.tailoring).toBe(75);
  const gold = (await saved(page)).gold;
  await trainer
    .getByRole("button", { name: "Train Journeyman · 30 G" })
    .click();
  await expect(trainer).toContainText("75 / 150");
  expect((await saved(page)).gold).toBe(gold - 30);
  await expect(crown.locator(".recipe-mastery")).toContainText(
    "+2 skill per craft",
  );
  await crown.getByRole("button", { name: "Craft", exact: true }).click();
  await page.reload();
  await expect(trainer).toContainText("77 / 150");
  expect((await saved(page)).training.tailoring).toBe(2);
  expect(errors).toEqual([]);
});

test("smithing paths show concrete rewards, review charges, gate recipes and keep equipped gear after switching", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = freshSave();
  s.selectedClass = "warrior";
  s.heroes.warrior.level = 20;
  s.professions.blacksmithing = 150;
  s.professions.engineering = 150;
  s.gold = 2000;
  s.materials.ore = 120;
  s.materials.leather = 80;
  s.materials.dust = 40;
  s.materials.iron_ore = 120;
  s.materials.heavy_leather = 80;
  s.materials.vision_dust = 40;
  await seed(page, s);
  await page.goto("/#professions");
  await expect(page.locator(".trade-specialization-card")).toHaveCount(4);
  const armor = page.locator('[data-specialization="armorsmith"]');
  const weapon = page.locator('[data-specialization="weaponsmith"]');
  await expect(
    armor.getByRole("button", { name: "Train Expert" }),
  ).toBeDisabled();
  await page
    .locator('.trade-training[data-trade="blacksmithing"]')
    .getByRole("button", { name: "Train Expert · 90 G" })
    .click();
  const gold = (await saved(page)).gold;
  await armor.getByRole("button", { name: "Choose path · 100 G" }).click();
  await expect(page.getByRole("dialog")).toContainText("Bastion Cuirass");
  await expect(page.getByRole("dialog")).toContainText("+45 Health");
  expect((await saved(page)).gold).toBe(gold);
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await armor.getByRole("button", { name: "Choose path · 100 G" }).click();
  await page.getByRole("button", { name: "Choose Armorsmith · 100 G" }).click();
  expect((await saved(page)).gold).toBe(gold - 100);
  await page.locator("#recipe-filter").selectOption("blacksmithing");
  await recipe(page, "Bastion Cuirass")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await expect(
    recipe(page, "Tempered Edge").getByRole("button", {
      name: "Requires Weaponsmith",
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page
    .locator(".gear-card")
    .filter({
      has: page.getByRole("heading", { name: "Bastion Cuirass", exact: true }),
    })
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await weapon.getByRole("button", { name: "Change path · 100 G" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Armorsmith recipes will become unavailable",
  );
  await page.getByRole("button", { name: "Keep current path" }).click();
  expect((await saved(page)).professionSpecializations.blacksmithing).toBe(
    "armorsmith",
  );
  await weapon.getByRole("button", { name: "Change path · 100 G" }).click();
  await page
    .getByRole("button", { name: "Choose Weaponsmith · 100 G" })
    .click();
  await expect(
    recipe(page, "Bastion Cuirass").getByRole("button", {
      name: "Requires Armorsmith",
    }),
  ).toBeDisabled();
  await recipe(page, "Tempered Edge")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await page.reload();
  const data = await saved(page);
  expect(data.professionSpecializations.blacksmithing).toBe("weaponsmith");
  expect(data.professions.blacksmithing).toBe(160);
  expect(data.heroes.warrior.equipment.chest).toBe("bastion_cuirass");
  expect(data.inventory).toContain("tempered_edge");
  expect(errors).toEqual([]);
});

test("Artisan and secondary training unlock advanced crafts without granting free skill", async ({
  page,
}) => {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.professions.tailoring = 225;
  s.training.tailoring = 3;
  s.secondary.firstaid = 75;
  s.secondary.cooking = 225;
  s.training.cooking = 3;
  s.gold = 2000;
  s.materials.cloth = 150;
  s.materials.dust = 60;
  s.materials.fish = 60;
  s.materials.herbs = 60;
  s.materials.mageweave_cloth = 150;
  s.materials.wool_cloth = 150;
  s.materials.dream_dust = 60;
  s.materials.yellowtail = 60;
  s.materials.sungrass = 60;
  await seed(page, s);
  await page.goto("/#professions");
  await page.locator("#recipe-filter").selectOption("tailoring");
  await expect(
    recipe(page, "Starwoven Crown").getByRole("button", {
      name: "Train Artisan",
    }),
  ).toBeDisabled();
  await page
    .locator('.trade-training[data-trade="tailoring"]')
    .getByRole("button", { name: "Train Artisan · 180 G" })
    .click();
  expect((await saved(page)).professions.tailoring).toBe(225);
  await recipe(page, "Starwoven Crown")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  expect((await saved(page)).professions.tailoring).toBe(230);
  await page
    .locator('.trade-training[data-trade="firstaid"]')
    .getByRole("button", { name: "Train Journeyman · 30 G" })
    .click();
  await page.locator("#recipe-filter").selectOption("firstaid");
  await recipe(page, "Field Bandage Bundle")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  expect((await saved(page)).secondary.firstaid).toBe(80);
  await page
    .locator('.trade-training[data-trade="cooking"]')
    .getByRole("button", { name: "Train Artisan · 180 G" })
    .click();
  await page.locator("#recipe-filter").selectOption("cooking");
  await recipe(page, "Artisan Journey Feast")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await page.reload();
  const data = await saved(page);
  expect(data.training.tailoring).toBe(4);
  expect(data.training.cooking).toBe(4);
  expect(data.training.firstaid).toBe(2);
  expect(data.supplies.food).toBe(12);
  expect(data.secondary.cooking).toBe(230);
});

test.describe("touch crafting paths", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 800 },
  });
  test("leatherworking paths, reviews, trainers and the complete crafting book fit a phone", async ({
    page,
  }) => {
    const s = freshSave();
    s.selectedClass = "hunter";
    s.heroes.hunter.level = 20;
    s.professions.leatherworking = 150;
    s.training.leatherworking = 3;
    s.gold = 1000;
    s.materials.leather = 80;
    s.materials.herbs = 50;
    s.materials.dust = 40;
    s.materials.heavy_leather = 80;
    s.materials.kingsblood = 50;
    s.materials.vision_dust = 40;
    await seed(page, s);
    await page.goto("/#professions");
    await expect(page.locator(".trade-specialization-card")).toHaveCount(3);
    const tribal = page.locator('[data-specialization="tribal"]');
    await tribal.getByRole("button", { name: "Choose path · 100 G" }).tap();
    await expect(page.getByRole("dialog")).toContainText(
      "Trail Spirit Talisman",
    );
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/specialization-review-mobile.png",
    });
    await page
      .getByRole("button", { name: "Choose Tribal Leatherworker · 100 G" })
      .tap();
    await expect(tribal).toContainText("Chosen");
    await page.locator(".toast").waitFor({ state: "detached" });
    await tribal.scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/leatherworking-paths-mobile.png",
    });
    await page.locator("#recipe-filter").selectOption("leatherworking");
    await recipe(page, "Trail Spirit Talisman")
      .getByRole("button", { name: "Craft", exact: true })
      .tap();
    await page.locator("#recipe-filter").selectOption("all");
    await expect(page.locator(".recipe-card")).toHaveCount(75);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".toast").waitFor({ state: "detached" });
    await page
      .locator('.trade-training[data-trade="leatherworking"]')
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/profession-trainer-mobile.png",
    });
    await page.reload();
    expect((await saved(page)).professionSpecializations.leatherworking).toBe(
      "tribal",
    );
  });
});
