import { test, expect } from "@playwright/test";
import { freshSave } from "../../src/progression";

test("camp, nine heroes, talents, professions, crafting, equipment and save reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Wow Survivors");
  await expect(page.locator(".class-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Warrior Steel & fury" }).click();
  await expect(page.locator(".hero-art-name h2")).toHaveText("Warrior");
  await page.getByRole("button", { name: "Mage Frost & arcana" }).click();
  await page.getByRole("button", { name: "Talents", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Train talent", exact: true })
    .first()
    .click();
  await expect(page.locator(".point-count")).toContainText("0");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page
    .locator(".profession-card")
    .filter({
      has: page.getByRole("heading", { name: "Herbalism", exact: true }),
    })
    .getByRole("button", { name: "+ Learn profession" })
    .click();
  await page
    .locator(".profession-card")
    .filter({
      has: page.getByRole("heading", { name: "Alchemy", exact: true }),
    })
    .getByRole("button", { name: "+ Learn profession" })
    .click();
  await page
    .locator(".recipe-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Lesser Healing Potion",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await expect(page.locator(".crafting-title")).toContainText("6 heals");
  await expect(page.locator(".profession-card.learned")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".profession-card.learned")).toHaveCount(2);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await expect(page.locator(".loadout-slot")).toHaveCount(10);
  await expect(page.locator(".loadout-slot")).toContainText([
    "Apprentice’s Staff",
    "Linen Robe",
    "Empty slot",
    "Empty slot",
    "Empty slot",
    "Empty slot",
  ]);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator(".setting-row").first().click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(errors).toEqual([]);
});
test("real keyboard gameplay, active ability, level-up choice and paused reward settlement", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Warrior Steel & fury" }).click();
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await page.keyboard.down("d");
  await page.waitForTimeout(650);
  await page.keyboard.up("d");
  await page.keyboard.press("Space");
  await expect(page.locator("#active-cooldown")).not.toBeEmpty();
  // Make small loops through the melee kill area to physically collect XP.
  await page.waitForTimeout(4500);
  for (const key of [
    "a",
    "w",
    "d",
    "s",
    "a",
    "w",
    "d",
    "s",
    "a",
    "w",
    "d",
    "s",
    "a",
    "w",
    "d",
    "s",
    "a",
    "w",
    "d",
    "s",
  ]) {
    if (
      await page
        .getByRole("dialog")
        .isVisible()
        .catch(() => false)
    )
      break;
    await page.keyboard.down(key);
    await page.waitForTimeout(600);
    await page.keyboard.up(key);
  }
  await expect(page.locator(".upgrade-card")).toHaveCount(3, {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: /Choose upgrade/ })
    .first()
    .click();
  await expect(page.locator("#run-level")).toContainText("LEVEL 2");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
  const t = await page.locator("#run-time").textContent();
  await page.waitForTimeout(1000);
  await expect(page.locator("#run-time")).toHaveText(t!);
  await page.getByRole("button", { name: "Return to camp" }).click();
  await expect(
    page.getByRole("heading", { name: "Until the next adventure." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Begin Expedition" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".history-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("narrow viewport remains usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".class-card")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Talents", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("save export downloads and import requires a valid, reviewable replacement", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export save" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("wow-survivors-save.json");
  await page.locator("#import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator("#toast-root")).toContainText(
    "not a supported Wow Survivors save",
  );
  const imported = freshSave();
  imported.gold = 777;
  imported.selectedClass = "druid";
  await page.locator("#import-file").setInputFiles({
    name: "adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(
    page.getByRole("heading", { name: "Import this save?" }),
  ).toBeVisible();
  await expect(page.locator(".modal-intro")).toContainText("777 gold");
  await page.getByRole("button", { name: "Import adventure" }).click();
  await expect(page.locator(".gold-balance")).toContainText("777");
  await expect(page.locator(".hero-art-name h2")).toHaveText("Druid");
  await page.reload();
  await expect(page.locator(".gold-balance")).toContainText("777");
  await expect(page.locator(".hero-art-name h2")).toHaveText("Druid");
});
