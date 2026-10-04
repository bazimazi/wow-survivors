import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
test.use({ hasTouch: true });

function prepared() {
  const s = freshSave();
  s.gold = 4000;
  for (const h of Object.values(s.heroes)) h.level = 20;
  s.settings.sound = false;
  return s;
}
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
const card = (page: Page, id: string) =>
  page.locator(`.travel-card[data-travel="${id}"]`);
async function confirm(page: Page, amount: number) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `Confirm · ${amount} G`, exact: true })
    .click();
}
async function clock(page: Page) {
  await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
}

test("stable gates early heroes and reviews personal training and shared purchases before charging", async ({
  page,
}) => {
  const s = prepared();
  s.heroes.mage.level = 11;
  await seed(page, s);
  await page.goto("/#stable");
  await expect(page.locator(".riding-trainer")).toContainText(
    "Requires character level 12",
  );
  await expect(
    page.getByRole("button", { name: "Train Trail riding · 100 G" }),
  ).toBeDisabled();
  await page.locator("#hero-switch").selectOption("warrior");
  await page
    .getByRole("button", { name: "Train Trail riding · 100 G" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "does not include a steed",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect((await saved(page)).gold).toBe(4000);
  await page
    .getByRole("button", { name: "Train Trail riding · 100 G" })
    .click();
  await confirm(page, 100);
  await card(page, "horse")
    .getByRole("button", { name: "Purchase steed · 200 G" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("shared stable");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect((await saved(page)).mounts).toEqual([]);
  await card(page, "horse")
    .getByRole("button", { name: "Purchase steed · 200 G" })
    .click();
  await confirm(page, 200);
  const state = await saved(page);
  expect(state.gold).toBe(3700);
  expect(state.mounts).toEqual(["horse"]);
  expect(state.heroes.warrior.travel.selected).toBe("horse");
  await page.locator("#hero-switch").selectOption("priest");
  await expect(card(page, "horse")).toContainText("Requires Trail riding");
  await page
    .getByRole("button", { name: "Train Trail riding · 100 G" })
    .click();
  await confirm(page, 100);
  await card(page, "horse")
    .getByRole("button", { name: "Select for expedition" })
    .click();
  await page.reload();
  expect((await saved(page)).gold).toBe(3600);
  expect((await saved(page)).mounts).toEqual(["horse"]);
  await page.getByRole("button", { name: "Travel on foot instead" }).click();
  expect((await saved(page)).heroes.priest.travel.selected).toBeNull();
  expect((await saved(page)).heroes.warrior.travel.selected).toBe("horse");
});
test("swift riding and steeds use a second reviewed fee and an explicit saved selection", async ({
  page,
}) => {
  const s = prepared();
  s.heroes.mage.travel = { riding: 1, form: false, selected: "horse" };
  s.mounts = ["horse"];
  await seed(page, s);
  await page.goto("/#stable");
  await expect(card(page, "swift_horse")).toContainText(
    "Requires Swift riding",
  );
  await page
    .getByRole("button", { name: "Train Swift riding · 350 G" })
    .click();
  await confirm(page, 350);
  await card(page, "swift_horse")
    .getByRole("button", { name: "Purchase steed · 650 G" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "current travel selection stays selected",
  );
  await confirm(page, 650);
  expect((await saved(page)).heroes.mage.travel.selected).toBe("horse");
  await card(page, "swift_horse")
    .getByRole("button", { name: "Select for expedition" })
    .click();
  await page.reload();
  await expect(page.locator(".stable-preview")).toContainText("+100% movement");
  expect((await saved(page)).gold).toBe(3000);
  expect((await saved(page)).heroes.mage.travel.riding).toBe(2);
});
test("real final Paladin trial claim opens the class steed without paid riding", async ({
  page,
}) => {
  const s = prepared();
  s.selectedClass = "paladin";
  s.heroes.paladin.level = 10;
  s.heroes.paladin.classTrial = {
    chapter: 2,
    active: true,
    progress: { evolutions: 1, bosses: 1 },
  };
  await seed(page, s);
  await page.goto("/#stable");
  await expect(card(page, "oathbound")).toContainText(
    "Complete all three class trials",
  );
  await card(page, "oathbound")
    .getByRole("button", { name: /View class trial/ })
    .click();
  await page.getByRole("button", { name: "Claim chapter rewards" }).click();
  await page.getByRole("button", { name: "Stable", exact: true }).click();
  await card(page, "oathbound")
    .getByRole("button", { name: "Select for expedition" })
    .click();
  await page.reload();
  const state = await saved(page);
  expect(state.gold).toBe(4150);
  expect(state.heroes.paladin.travel).toEqual({
    riding: 0,
    form: false,
    selected: "oathbound",
  });
  await expect(page.locator(".stable-preview")).toContainText(
    "Oathbound Warhorse",
  );
});
test("keyboard summons, pause freezes the channel, movement cancels and a class action dismisses travel", async ({
  page,
}) => {
  const s = prepared();
  s.heroes.mage.travel = { riding: 1, form: false, selected: "horse" };
  s.mounts = ["horse"];
  await seed(page, s);
  await clock(page);
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.keyboard.press("r");
  await page.clock.runFor(200);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "data-state",
    "summoning",
  );
  await page.keyboard.press("Escape");
  await page.clock.runFor(150);
  const hint = await page.locator("#travel-hint").textContent();
  await page.clock.runFor(2000);
  expect(await page.locator("#travel-hint").textContent()).toBe(hint);
  await page.getByRole("button", { name: /Resume expedition/ }).click();
  await page.keyboard.down("d");
  await page.clock.runFor(250);
  await page.keyboard.up("d");
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "data-state",
    "walking",
  );
  await page.keyboard.press("r");
  await page.clock.runFor(1600);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#travel-hint")).toContainText(
    "Chestnut Courser · +60% speed",
  );
  await page.screenshot({ path: "output/screenshots/mounted-expedition.png" });
  await page.keyboard.press("Space");
  await page.clock.runFor(200);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
for (const [classId, form] of [
  ["druid", "travel_form"],
  ["shaman", "ghost_wolf"],
] as const) {
  test(`phone ${classId} learns its travel form and taps summon and dismount`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const s = prepared();
    s.selectedClass = classId;
    s.heroes[classId].level = 8;
    await seed(page, s);
    await clock(page);
    await page.getByRole("button", { name: "Stable", exact: true }).click();
    await card(page, form)
      .getByRole("button", { name: "Learn form · 40 G" })
      .click();
    const choices = page.getByRole("dialog").locator(".modal-actions .button");
    for (const b of await choices.all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await confirm(page, 40);
    expect((await saved(page)).heroes[classId].travel).toEqual({
      riding: 0,
      form: true,
      selected: form,
    });
    await page.getByRole("button", { name: "Expedition", exact: true }).click();
    await page.getByRole("button", { name: /Begin Expedition/ }).click();
    const control = page.getByRole("button", { name: "Travel", exact: true });
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await control.tap();
    await page.clock.runFor(900);
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#game-tutorial")).toHaveClass(/hidden/);
    await page.screenshot({ path: `output/screenshots/${form}-mobile.png` });
    await control.tap();
    await page.clock.runFor(30);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
  });
}
test("a selected mount stays saved but cannot be summoned in Deadmines", async ({
  page,
}) => {
  const s = prepared();
  s.selectedZone = "deadmines";
  s.clearedZones = ["westfall"];
  s.totals.kills = 120;
  s.heroes.mage.travel = { riding: 1, form: false, selected: "horse" };
  s.mounts = ["horse"];
  await seed(page, s);
  await clock(page);
  await page.getByRole("button", { name: /Begin Dungeon/ }).click();
  await expect(page.locator("#travel-button")).toBeDisabled();
  await expect(page.locator("#travel-hint")).toContainText(
    "unavailable in dungeons",
  );
  await page.keyboard.press("r");
  await page.clock.runFor(1300);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect((await saved(page)).heroes.mage.travel.selected).toBe("horse");
});
