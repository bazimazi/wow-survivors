import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
const guild = (page: Page, trade: string) =>
  page.locator(`.guild-card[data-guild-trade="${trade}"]`);
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function prepared() {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.heroes.warrior.level = 20;
  s.gold = 2000;
  s.settings.sound = false;
  for (const key of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[key] = 100;
  return s;
}
async function seed(page: Page, s: SaveData | object) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
function errorsFor(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
async function clock(page: Page, path = "/#professions") {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.goto(path);
  await page.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
// Population, starting health/time and node positions are fixtures. All action, evidence and settlement code is unchanged.
async function fieldFixture(page: Page, extra = "") {
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      original = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(original).toContain(marker);
    await route.fulfill({
      response,
      body: original.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.nodes=[];${extra}`,
      ),
    });
  });
}
async function begin(page: Page) {
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
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
const recipe = (page: Page, name: string) =>
  page
    .locator(".recipe-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

test("old saves start optional guild chains with known/all/trade filters and no retroactive credit", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.herbalism = 300;
  s.training.herbalism = 4;
  s.totals.crafts = 500;
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.professionQuests;
  await seed(page, raw);
  await page.goto("/#professions");
  await expect(page.locator(".guild-card")).toHaveCount(4);
  await expect(guild(page, "herbalism")).toContainText("0 / 8");
  await page.locator("#guild-filter").selectOption("all");
  await expect(page.locator(".guild-card")).toHaveCount(12);
  await expect(
    guild(page, "mining").getByRole("button", { name: "Accept project" }),
  ).toBeDisabled();
  await page.locator("#guild-filter").selectOption("herbalism");
  await expect(page.locator(".guild-card")).toHaveCount(1);
  await guild(page, "herbalism")
    .getByRole("button", { name: "Accept project" })
    .click();
  await page.reload();
  const state = await saved(page);
  expect(Object.keys(state.professionQuests)).toHaveLength(12);
  expect(state.professionQuests.herbalism.progress.gathered).toBe(0);
  expect(state.professions.herbalism).toBe(300);
  expect(state.materials).toEqual(s.materials);
  expect(errors).toEqual([]);
});
test("real node gathering previews unsaved progress, settles once and turns in exact stock after review", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.mining = 1;
  await seed(page, s);
  const nodes = [100, 130, 160, 190].map((x, id) => ({
    id,
    kind: "ore",
    x,
    y: 0,
    depleted: false,
  }));
  await fieldFixture(page, `this.nodes=${JSON.stringify(nodes)};`);
  await clock(page);
  await guild(page, "mining")
    .getByRole("button", { name: "Accept project" })
    .click();
  await begin(page);
  await page.keyboard.down("d");
  await page.clock.runFor(2400);
  await page.keyboard.up("d");
  await page.keyboard.press("Escape");
  await page.locator(".guild-status summary").click();
  await expect(page.locator(".guild-status")).toContainText("8 / 8");
  expect((await saved(page)).professionQuests.mining.progress.gathered).toBe(0);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.locator(".guild-status")).toContainText("Progress saved");
  expect((await saved(page)).professionQuests.mining.progress.gathered).toBe(8);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.locator(".guild-camp")).toContainText("1 project ready");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await guild(page, "mining")
    .getByRole("button", { name: "Review turn-in" })
    .click();
  await expect(page.locator(".guild-review")).toContainText("2 Copper Ore");
  const before = await saved(page);
  await page.getByRole("button", { name: "Keep working" }).click();
  expect((await saved(page)).materials.ore).toBe(before.materials.ore);
  await guild(page, "mining")
    .getByRole("button", { name: "Review turn-in" })
    .click();
  await page
    .getByRole("button", { name: "Turn in materials and claim rewards" })
    .click();
  const state = await saved(page);
  expect(state.materials.ore).toBe(s.materials.ore + 8 - 2);
  expect(state.gold).toBe(before.gold + 30);
  expect(state.professionQuests.mining.chapter).toBe(1);
  expect(state.professionQuests.mining.attempt).toBeNull();
  expect(state.history).toHaveLength(1);
  await page.reload();
  await expect(guild(page, "mining")).toContainText("Tin beneath the fields");
  expect(errors).toEqual([]);
});
test("Alchemy requires actual future crafts and successful healing during an expedition", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.alchemy = 1;
  await seed(page, s);
  await fieldFixture(page, "this.player.hp=40;");
  await clock(page);
  const healing = recipe(page, "Lesser Healing Potion");
  await healing.getByRole("button", { name: "Craft", exact: true }).click();
  await guild(page, "alchemy")
    .getByRole("button", { name: "Accept project" })
    .click();
  await expect(guild(page, "alchemy")).toContainText("0 / 2");
  for (let i = 0; i < 2; i++)
    await healing.getByRole("button", { name: "Craft", exact: true }).click();
  await expect(guild(page, "alchemy")).toContainText("2 / 2");
  await expect(
    guild(page, "alchemy").getByRole("button", { name: "Project in progress" }),
  ).toBeDisabled();
  await begin(page);
  const before = (await saved(page)).supplies.potions;
  await page.keyboard.press("q");
  expect((await saved(page)).supplies.potions).toBe(before - 1);
  await returnToCamp(page);
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await expect(guild(page, "alchemy")).toContainText("1 / 1");
  await guild(page, "alchemy")
    .getByRole("button", { name: "Review turn-in" })
    .click();
  await page
    .getByRole("button", { name: "Turn in materials and claim rewards" })
    .click();
  expect((await saved(page)).professionQuests.alchemy.chapter).toBe(1);
  expect((await saved(page)).professionQuests.firstaid.attempt).toBeNull();
  expect(errors).toEqual([]);
});
test("a consumed meal advances Cooking only after one active minute and saves one expedition credit", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.supplies.food = 1;
  await seed(page, s);
  await fieldFixture(page, "this.time=59;");
  await clock(page);
  await guild(page, "cooking")
    .getByRole("button", { name: "Accept project" })
    .click();
  await begin(page);
  expect((await saved(page)).supplies.food).toBe(0);
  await page.keyboard.press("Escape");
  await page.locator(".guild-status summary").click();
  await expect(page.locator(".guild-status")).toContainText("0 / 1");
  await page.clock.runFor(5000);
  await expect(page.locator(".guild-status")).toContainText("0 / 1");
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await page.clock.runFor(1500);
  await returnToCamp(page);
  expect((await saved(page)).professionQuests.cooking.progress.uses).toBe(1);
  expect((await saved(page)).professionQuests.cooking.progress.crafts).toBe(0);
  expect(errors).toEqual([]);
});
test("a final Artisan craft reaches skill 300 and unlocks a permanent shared mastery trinket", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.enchanting = 299;
  s.training.enchanting = 4;
  s.professionQuests.enchanting = {
    chapter: 3,
    attempt: "mastery-fixture",
    progress: { gathered: 0, crafts: 5, uses: 0 },
  };
  await seed(page, s);
  await page.goto("/#professions");
  await expect(guild(page, "enchanting")).toContainText("299 / 300");
  await expect(
    guild(page, "enchanting").getByRole("button", {
      name: "Project in progress",
    }),
  ).toBeDisabled();
  await recipe(page, "Prismatic Waystone")
    .getByRole("button", { name: "Craft", exact: true })
    .click();
  await expect(guild(page, "enchanting")).toContainText("300 / 300");
  await guild(page, "enchanting")
    .getByRole("button", { name: "Review turn-in" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Runekeeper's Prism");
  await page
    .getByRole("button", { name: "Turn in materials and claim rewards" })
    .click();
  let state = await saved(page);
  expect(state.professionQuests.enchanting.chapter).toBe(4);
  expect(state.inventory).toContain("mastery_enchanting");
  expect(state.materials.dream_dust).toBe(100 - 16 - 6);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const item = page.locator(".gear-card").filter({
    has: page.getByRole("heading", {
      name: "Runekeeper's Prism",
      exact: true,
    }),
  });
  await expect(
    item.getByRole("button", { name: /Sell|Disenchant/ }),
  ).toHaveCount(0);
  await item.getByRole("button", { name: "Equip item" }).click();
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page
    .locator(".profession-card")
    .filter({
      has: page.getByRole("heading", { name: "Enchanting", exact: true }),
    })
    .getByRole("button", { name: "Unlearn", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "mastery rewards are retained",
  );
  await page
    .getByRole("button", { name: "Unlearn profession", exact: true })
    .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator("#hero-switch").selectOption("warrior");
  await item.getByRole("button", { name: "Equip item" }).click();
  await page.reload();
  state = await saved(page);
  expect(state.heroes.mage.equipment.trinket).toBe("mastery_enchanting");
  expect(state.heroes.warrior.equipment.trinket).toBe("mastery_enchanting");
  expect(state.professionQuests.enchanting.chapter).toBe(4);
  expect(errors).toEqual([]);
});
test("abandon and unlearn confirmations reset only unfinished progress while preserving claimed chapters", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions.mining = 50;
  s.training.mining = 2;
  s.professionQuests.mining = {
    chapter: 1,
    attempt: "prior-attempt",
    progress: { gathered: 5, crafts: 0, uses: 0 },
  };
  await seed(page, s);
  await page.goto("/#professions");
  await guild(page, "mining")
    .getByRole("button", { name: "Abandon project" })
    .click();
  await page.getByRole("button", { name: "Keep project" }).click();
  expect((await saved(page)).professionQuests.mining.progress.gathered).toBe(5);
  await guild(page, "mining")
    .getByRole("button", { name: "Abandon project" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abandon project" })
    .click();
  await guild(page, "mining")
    .getByRole("button", { name: "Accept project" })
    .click();
  let state = await saved(page);
  expect(state.professionQuests.mining.chapter).toBe(1);
  expect(state.professionQuests.mining.attempt).not.toBe("prior-attempt");
  expect(state.professionQuests.mining.progress.gathered).toBe(0);
  await page
    .locator(".profession-card")
    .filter({ has: page.getByRole("heading", { name: "Mining", exact: true }) })
    .getByRole("button", { name: "Unlearn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unlearn profession", exact: true })
    .click();
  await page
    .locator(".profession-card")
    .filter({ has: page.getByRole("heading", { name: "Mining", exact: true }) })
    .getByRole("button", { name: "+ Learn profession", exact: true })
    .click();
  await expect(
    guild(page, "mining").getByRole("button", { name: "Accept project" }),
  ).toBeDisabled();
  await expect(guild(page, "mining")).toContainText("Requires skill 50");
  state = await saved(page);
  expect(state.professionQuests.mining.chapter).toBe(1);
  expect(state.professionQuests.mining.attempt).toBeNull();
  expect(errors).toEqual([]);
});
test("all guild states and turn-in review fit six viewport widths with usable controls", async ({
  page,
}) => {
  const errors = errorsFor(page),
    s = prepared();
  s.professions = { mining: 300, engineering: 125 };
  s.training = { mining: 4, engineering: 3 };
  s.professionQuests.mining = {
    chapter: 3,
    attempt: "ready-fixture",
    progress: { gathered: 16, crafts: 0, uses: 0 },
  };
  s.professionQuests.engineering.chapter = 2;
  s.professionQuests.firstaid.chapter = 4;
  await seed(page, s);
  await page.goto("/#professions");
  await page.locator("#guild-filter").selectOption("all");
  await expect(guild(page, "engineering")).toContainText(
    "Choose a Gnomish or Goblin path",
  );
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      short: [
        ...document.querySelectorAll<HTMLElement>(
          ".profession-guild button,.profession-guild select",
        ),
      ].filter((el) => el.getBoundingClientRect().height < 44).length,
    }));
    expect(metrics.scroll, `overflow at ${width}`).toBe(width);
    expect(metrics.short, `small controls at ${width}`).toBe(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await guild(page, "mining")
    .getByRole("button", { name: "Review turn-in" })
    .click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(
    page.getByRole("button", { name: "Turn in materials and claim rewards" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/screenshots/guild-turn-in-mobile.png",
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
