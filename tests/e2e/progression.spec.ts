import { test, expect } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

test("advanced specialization, recipe milestones, crafted set equipment and set-aware comparison survive reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const save = freshSave();
  save.heroes.mage.level = 14;
  save.professions.tailoring = 74;
  save.gold = 2000;
  save.materials.cloth = 150;
  save.materials.dust = 10;
  save.materials.wool_cloth = 150;
  save.materials.soul_dust = 10;
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.goto("/#talents");
  const fire = page
    .locator(".talent-tree")
    .filter({ has: page.getByRole("heading", { name: "Fire", exact: true }) });
  await expect(fire.locator(".talent-node")).toHaveCount(6);
  for (const [index, count] of [3, 3, 1, 3, 3, 1].entries())
    for (let rank = 0; rank < count; rank++)
      await fire
        .locator(".talent-node")
        .nth(index)
        .getByRole("button", { name: "+ Train talent", exact: true })
        .click();
  await expect(page.locator(".point-count")).toContainText("0");
  await expect(page.locator(".specialization-summary")).toContainText(
    "Fireball",
  );
  await expect(page.locator(".specialization-summary")).toContainText("+1");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page.locator("#recipe-filter").selectOption("tailoring");
  const vestments = page.locator(".recipe-card").filter({
    has: page.getByRole("heading", {
      name: "Spellwoven Vestments",
      exact: true,
    }),
  });
  await expect(
    vestments.getByRole("button", { name: "Requires skill 75" }),
  ).toBeDisabled();
  await page
    .locator('.trade-training[data-trade="tailoring"]')
    .getByRole("button", { name: "Train Journeyman · 30 G" })
    .click();
  await page
    .locator(".recipe-card")
    .filter({
      has: page.getByRole("heading", { name: "Azure Linen Robe", exact: true }),
    })
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await expect(page.locator(".profession-card.learned")).toContainText(
    "Journeyman",
  );
  for (const name of [
    "Spellwoven Gloves",
    "Spellwoven Crown",
    "Spellwoven Vestments",
  ])
    await page
      .locator(".recipe-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) })
      .getByRole("button", { name: "Craft", exact: true })
      .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await expect(page.locator(".loadout-slot")).toHaveCount(16);
  for (const name of [
    "Spellwoven Gloves",
    "Spellwoven Crown",
    "Spellwoven Vestments",
  ])
    await page
      .locator(".gear-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) })
      .getByRole("button", { name: "Equip item" })
      .click();
  await expect(
    page.locator(".equipped-set-bonuses .set-bonus.active"),
  ).toHaveCount(2);
  await expect(page.locator(".equipped-set-bonuses")).toContainText(
    "3 / 6 equipped",
  );
  const robe = page.locator(".gear-card").filter({
    has: page.getByRole("heading", { name: "Azure Linen Robe", exact: true }),
  });
  await expect(robe.locator(".gear-comparison")).toContainText("-11% Damage");
  await robe.getByRole("button", { name: "Equip item" }).click();
  await expect(
    page.locator(".equipped-set-bonuses .set-bonus.active"),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".equipped-set-bonuses")).toContainText(
    "2 / 6 equipped",
  );
  await page.getByRole("button", { name: "Talents", exact: true }).click();
  await expect(page.locator(".specialization-summary")).toContainText(
    "Fireball",
  );
  expect(errors).toEqual([]);
});

test("expanded equipment and recipe catalog remain usable on a narrow screen", async ({
  page,
}) => {
  const save = freshSave();
  save.inventory.push("spellweave_hands");
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#armory");
  await expect(
    page.getByRole("button", { name: "Requires level 3" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page.locator("#recipe-filter").selectOption("all");
  await expect(page.locator(".recipe-card")).toHaveCount(127);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
