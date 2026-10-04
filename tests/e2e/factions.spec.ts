import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CLASS_MAP } from "../../src/content";
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

test("accepted commissions receive real landmark settlement and abandonment asks before discarding progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const date = new Date("2026-10-02T10:00:00Z");
  await page.clock.install({ time: date });
  await page.goto("/#outposts");
  await page.clock.pauseAt(new Date(date.getTime() + 60000));
  await expect(page.locator(".standing-panel")).toContainText("Neutral");
  await page.locator('[data-id="timbermaw_survey"]').click();
  await expect(page.locator(".active-commission")).toContainText("0 / 3");
  await page.getByRole("button", { name: "Prepare in Elwynn Forest" }).click();
  await expect(page.locator(".camp-outpost")).toContainText(
    "Wisdom of the Woods",
  );
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  const speed = CLASS_MAP.mage.speed;
  await page.keyboard.down("d");
  await page.clock.runFor((340 / speed) * 1000);
  await page.keyboard.up("d");
  await page.keyboard.down("s");
  await page.clock.runFor((180 / speed) * 1000);
  await page.keyboard.up("s");
  await expect(page.locator("#landmark-interact")).toHaveText(
    "Receive a blessing",
  );
  await page.keyboard.press("f");
  await page.locator('[data-action="blessing"][data-id="wind"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-commission")).toContainText("1 / 3");
  await page.getByRole("button", { name: "Return to camp" }).click();
  await expect(page.locator(".result-reputation")).toContainText(
    "+15 reputation",
  );
  await expect(page.locator(".result-modal .commission-status")).toContainText(
    "1 / 3",
  );
  const data = await saved(page);
  expect(data.commission.progress).toBe(1);
  expect(data.reputation.timbermaw).toBe(15);
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/faction-result.png",
  });
  await page.getByRole("button", { name: "Return to camp" }).click();
  await page.getByRole("button", { name: "Outposts", exact: true }).click();
  await page.reload();
  await expect(page.locator(".active-commission")).toContainText("1 / 3");
  await page
    .getByRole("button", { name: "Abandon commission", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("1 / 3");
  await page.getByRole("button", { name: "Keep commission" }).click();
  await expect(page.locator(".active-commission")).toContainText("1 / 3");
  await page
    .getByRole("button", { name: "Abandon commission", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abandon commission", exact: true })
    .click();
  expect((await saved(page)).commission).toBeNull();
  expect((await saved(page)).reputation.timbermaw).toBe(15);
  expect(errors).toEqual([]);
});

test("claiming a completed commission unlocks a quartermaster purchase and repetition starts at zero", async ({
  page,
}) => {
  const s = freshSave();
  s.heroes.mage.level = 5;
  s.commission = { id: "timbermaw_survey", progress: 3 };
  s.reputation.timbermaw = 140;
  await seed(page, s);
  await page.goto("/#camp");
  await expect(
    page.locator('.nav-link[data-id="outposts"] .nav-count'),
  ).toHaveText("1");
  await page.getByRole("button", { name: "Outposts", exact: true }).click();
  const offer = page.locator('[data-offer="timbermaw_token"]');
  await expect(
    offer.getByRole("button", { name: "Requires Friendly" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Claim 90 G · 100 XP · 90 rep" })
    .click();
  await expect(page.locator(".standing-panel")).toContainText("Friendly");
  expect((await saved(page)).heroes.mage.xp).toBe(100);
  await offer.getByRole("button", { name: "Buy equipment" }).click();
  await expect(
    offer.getByRole("button", { name: "Already owned" }),
  ).toBeDisabled();
  expect((await saved(page)).gold).toBe(130);
  await page.locator('[data-id="timbermaw_survey"]').click();
  await expect(page.locator(".active-commission")).toContainText("0 / 3");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page
    .locator(".gear-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Trailkeeper's Token",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.trinket).toBe("trail_token");
  await page.getByRole("button", { name: "Outposts", exact: true }).click();
  await expect(page.locator(".active-commission")).toContainText("0 / 3");
});

test("quartermaster patterns unlock crafting, produce equipment and remain learned after changing professions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = freshSave();
  s.heroes.mage.level = 10;
  s.professions.tailoring = 125;
  s.reputation.argent = 500;
  s.gold = 1000;
  s.materials.cloth = 60;
  s.materials.dust = 20;
  s.materials.silk_cloth = 60;
  s.materials.vision_dust = 20;
  s.totals.wins = 1;
  await seed(page, s);
  await page.goto("/#professions");
  await page.locator("#recipe-filter").selectOption("tailoring");
  const recipe = page.locator(".recipe-card").filter({
    has: page.getByRole("heading", {
      name: "Lantern Keeper's Hood",
      exact: true,
    }),
  });
  await expect(
    recipe.getByRole("button", { name: "Learn quartermaster pattern" }),
  ).toBeDisabled();
  await recipe.getByRole("button", { name: "Visit quartermaster" }).click();
  await expect(page.locator(".outpost-banner")).toContainText("ARGENT DAWN");
  const offer = page.locator('[data-offer="argent_pattern"]');
  await offer.getByRole("button", { name: "Learn pattern" }).click();
  await expect(
    offer.getByRole("button", { name: "Pattern learned" }),
  ).toBeDisabled();
  await offer.getByRole("button", { name: "Open crafting book" }).click();
  await recipe.getByRole("button", { name: "Craft", exact: true }).click();
  expect((await saved(page)).gold).toBe(850);
  expect((await saved(page)).professions.tailoring).toBe(130);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page
    .locator(".gear-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Lantern Keeper's Hood",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page
    .locator(".profession-card")
    .filter({
      has: page.getByRole("heading", { name: "Tailoring", exact: true }),
    })
    .getByRole("button", { name: "Unlearn" })
    .click();
  await page.getByRole("button", { name: "Unlearn profession" }).click();
  await page.reload();
  const data = await saved(page);
  expect(data.learnedRecipes).toContain("craft_lantern_hood");
  expect(data.heroes.mage.equipment.head).toBe("lantern_hood");
  await page.locator("#recipe-filter").selectOption("all");
  await expect(recipe).toContainText("Quartermaster pattern learned");
  await expect(
    recipe.getByRole("button", { name: "Learn Tailoring" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test.describe("touch outposts", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 800 },
  });
  test("faction selection, offers, commissions and eight navigation buttons fit a narrow screen", async ({
    page,
  }) => {
    const s = freshSave();
    s.heroes.mage.level = 10;
    s.totals.wins = 1;
    s.totals.kills = 120;
    s.reputation = { timbermaw: 550, thorium: 300, argent: 1200 };
    s.commission = { id: "timbermaw_survey", progress: 2 };
    await seed(page, s);
    await page.goto("/#outposts");
    await expect(page.locator(".nav-link")).toHaveCount(8);
    await expect(page.locator(".commission-card")).toHaveCount(3);
    await expect(page.locator(".quartermaster-card")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: "output/screenshots/outposts-mobile.png",
    });
    await page.locator('.outpost-choice[data-id="argent"]').tap();
    await expect(page.locator(".standing-panel")).toContainText("Revered");
    await page
      .locator('[data-offer="argent_boots"]')
      .getByRole("button", { name: "More gold needed" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/quartermaster-mobile.png",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Expedition", exact: true }).tap();
    await expect(page.locator(".camp-outpost")).toContainText("2 / 3");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
