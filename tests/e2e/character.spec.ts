import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";

async function seed(page: Page, s: SaveData) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const chapter = (page: Page, index: number) =>
  page.locator(".trial-chapter").nth(index);
const formula = (page: Page, id: string) =>
  page.locator(`.enchantment-card[data-formula="${id}"]`);
const errorsFor = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};
async function clock(page: Page, path = "/") {
  await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  await page.goto(path);
  await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
}
function prepared() {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.gold = 2000;
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  for (const key of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[key] = 100;
  s.inventory.push("spellweave_hands", "shadow_boots");
  s.settings.sound = false;
  return s;
}

test("class trial acceptance is explicit, hero-specific and saved without retroactive progress", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = freshSave();
  s.totals.wins = 10;
  s.totals.kills = 5000;
  await seed(page, s);
  await page.goto("/#journal");
  await expect(page.locator(".class-trial")).toContainText(
    "The frostbound lesson",
  );
  await expect(chapter(page, 0)).toContainText("0 / 40");
  await chapter(page, 0)
    .getByRole("button", { name: "Accept chapter" })
    .click();
  await expect(
    chapter(page, 0).getByRole("button", { name: "Chapter in progress" }),
  ).toBeDisabled();
  await page.locator("#hero-switch").selectOption("warrior");
  await expect(page.locator(".class-trial")).toContainText("The steel within");
  await chapter(page, 0)
    .getByRole("button", { name: "Accept chapter" })
    .click();
  await page.reload();
  const state = await saved(page);
  expect(state.heroes.mage.classTrial).toEqual({
    chapter: 0,
    active: true,
    progress: {},
  });
  expect(state.heroes.warrior.classTrial).toEqual({
    chapter: 0,
    active: true,
    progress: {},
  });
  await page.screenshot({
    path: "output/screenshots/class-trials-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("real casts and an active ability complete accepted trial progress on return and claim once", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = freshSave();
  s.settings.sound = false;
  s.heroes.mage.classTrial = {
    chapter: 0,
    active: true,
    progress: { casts: 38, actives: 1 },
  };
  await seed(page, s);
  await clock(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await page.clock.runFor(2500);
  await page.keyboard.press("c");
  await page.keyboard.press("Escape");
  await expect(page.locator(".trial-status")).toContainText("40 / 40");
  await expect(page.locator(".trial-status")).toContainText("2 / 2");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.locator(".trial-status")).toContainText("Chapter complete");
  const settled = await saved(page);
  expect(settled.heroes.mage.classTrial.progress).toEqual({
    casts: 40,
    actives: 2,
  });
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await chapter(page, 0)
    .getByRole("button", { name: "Claim chapter rewards" })
    .click();
  expect((await saved(page)).gold).toBe(settled.gold + 50);
  await expect(
    chapter(page, 1).getByRole("button", {
      name: "Requires character level 5",
    }),
  ).toBeDisabled();
  await page.reload();
  expect((await saved(page)).heroes.mage.classTrial.chapter).toBe(1);
  expect(errors).toEqual([]);
});

test("real evolution selections finish a final class trial and its relic can be equipped after reload", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.heroes.mage.classTrial = {
    chapter: 2,
    active: true,
    progress: { bosses: 1 },
  };
  await seed(page, s);
  // Starting XP accelerates real level choices only inside this isolated fixture.
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      original = await response.text();
    const body = original.replace(/xp\s*=\s*0/, "xp = 2000");
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  await clock(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  for (let i = 0; i < 24; i++) {
    await page.clock.runFor(50);
    if (await page.locator(".upgrade-card").count())
      await page.locator(".upgrade-card").first().click();
    if (await page.locator(".run-spell.evolved").count()) break;
  }
  // At least one rank-five evolution must appear in the actual pause loadout.
  expect(await page.locator(".run-spell.evolved").count()).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".trial-status")).toContainText(
    "Evolve any class spell to rank 5",
  );
  await expect(page.locator(".trial-status")).toContainText("1 / 1");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  expect((await saved(page)).heroes.mage.classTrial.progress.evolutions).toBe(
    1,
  );
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await chapter(page, 2)
    .getByRole("button", { name: "Claim chapter rewards" })
    .click();
  expect((await saved(page)).inventory).toContain("trial_mage_relic");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const relic = page.locator(".gear-card").filter({
    has: page.getByRole("heading", { name: "Frostbound Prism", exact: true }),
  });
  await relic.getByRole("button", { name: "Equip item" }).click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.trinket).toBe(
    "trial_mage_relic",
  );
  expect((await saved(page)).heroes.mage.classTrial.chapter).toBe(3);
  expect(errors).toEqual([]);
});

test("enchantment review cancels without payment, applies stats and replaces with a saved cost", async ({
  page,
}) => {
  const errors = errorsFor(page);
  await seed(page, prepared());
  await page.goto("/#armory");
  await expect(page.locator("#enchant-target")).toHaveValue("starter_mage");
  const before = await saved(page);
  await formula(page, "weapon_force")
    .getByRole("button", { name: "Review enchantment" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("15 G · 2 Strange Dust");
  await page.getByRole("button", { name: "Keep current item" }).click();
  expect(await saved(page)).toEqual(before);
  await formula(page, "weapon_force")
    .getByRole("button", { name: "Review enchantment" })
    .click();
  await page
    .getByRole("button", { name: "Apply Lesser Force · 15 G", exact: true })
    .click();
  await expect(page.locator(".loadout-panel")).toContainText("Lesser Force");
  await expect(
    formula(page, "weapon_force").getByRole("button", {
      name: "Already applied",
    }),
  ).toBeDisabled();
  expect((await saved(page)).gold).toBe(before.gold - 15);
  expect((await saved(page)).materials.dust).toBe(before.materials.dust - 2);
  await formula(page, "weapon_precision")
    .getByRole("button", { name: "Review replacement" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "-6% Damage · +5% Critical chance",
  );
  await page.screenshot({
    path: "output/screenshots/enchantment-replacement.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", {
      name: "Apply Focused Precision · 45 G",
      exact: true,
    })
    .click();
  await page.reload();
  expect((await saved(page)).enchantments.starter_mage).toBe(
    "weapon_precision",
  );
  expect((await saved(page)).gold).toBe(before.gold - 60);
  await expect(page.locator(".loadout-panel")).toContainText(
    "Focused Precision",
  );
  await expect(page.locator(".loadout-panel")).not.toContainText(
    "Lesser Force",
  );
  expect(errors).toEqual([]);
});

test("shared chest enchantment remains for another hero after unlearning the profession", async ({
  page,
}) => {
  const errors = errorsFor(page);
  await seed(page, prepared());
  await page.goto("/#armory");
  await page.locator("#enchant-target").selectOption("cloth");
  await formula(page, "chest_vitality")
    .getByRole("button", { name: "Review enchantment" })
    .click();
  await page
    .getByRole("button", { name: "Apply Lesser Vitality · 15 G", exact: true })
    .click();
  await page.locator("#hero-switch").selectOption("priest");
  await expect(page.locator(".loadout-panel")).toContainText("Lesser Vitality");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  const enchanting = page.locator(".profession-card").filter({
    has: page.getByRole("heading", { name: "Enchanting", exact: true }),
  });
  await enchanting
    .getByRole("button", { name: "Unlearn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unlearn profession", exact: true })
    .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.reload();
  await expect(page.locator(".loadout-panel")).toContainText("Lesser Vitality");
  expect((await saved(page)).enchantments.cloth).toBe("chest_vitality");
  await expect(page.locator(".enchanting-notice")).toContainText(
    "Learn Enchanting",
  );
  expect(errors).toEqual([]);
});

test.describe("touch character progression", () => {
  test.use({
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  test("trial chapters, full formula catalog and review controls fit and respond to taps", async ({
    page,
  }) => {
    const errors = errorsFor(page),
      s = prepared();
    s.heroes.mage.classTrial = {
      chapter: 0,
      active: true,
      progress: { casts: 40, actives: 2 },
    };
    await seed(page, s);
    await page.goto("/#journal");
    await chapter(page, 0)
      .getByRole("button", { name: "Claim chapter rewards" })
      .tap();
    await chapter(page, 1)
      .getByRole("button", { name: "Accept chapter" })
      .tap();
    await page.locator(".class-trial").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "output/screenshots/class-trials-mobile.png",
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Armory", exact: true }).tap();
    await page.locator("#enchant-target").selectOption("spellweave_hands");
    await page.getByText("Browse all 24 formulas", { exact: true }).tap();
    await expect(page.locator(".enchantment-catalog p")).toHaveCount(24);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await formula(page, "hands_precision")
      .getByRole("button", { name: "Review enchantment" })
      .tap();
    const apply = page.getByRole("button", {
      name: "Apply Surehand · 80 G",
      exact: true,
    });
    const box = await apply.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: "output/screenshots/enchantment-review-mobile.png",
      animations: "disabled",
    });
    await apply.tap();
    await page.reload();
    expect((await saved(page)).enchantments.spellweave_hands).toBe(
      "hands_precision",
    );
    expect((await saved(page)).heroes.mage.classTrial.chapter).toBe(1);
    expect((await saved(page)).heroes.mage.classTrial.active).toBe(true);
    expect(errors).toEqual([]);
  });
});
