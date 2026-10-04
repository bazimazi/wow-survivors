import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CLASS_MAP } from "../../src/content";
import {
  freshSave,
  heroStats,
  learnTalent,
  SAVE_KEY,
} from "../../src/progression";

const startTime = new Date("2026-10-02T10:00:00Z");
async function controlledClock(page: Page) {
  await page.clock.install({ time: startTime });
  await page.goto("/");
  await page.clock.pauseAt(new Date(startTime.getTime() + 60000));
}
async function walk(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.clock.runFor(ms);
  await page.keyboard.up(key);
}
async function chooseUpgradeIfNeeded(page: Page) {
  if (await page.locator('.upgrade-card[data-action="upgrade"]').count())
    await page.locator('.upgrade-card[data-action="upgrade"]').first().click();
}
async function preparedExpedition(page: Page) {
  const save = freshSave();
  save.heroes.mage.level = 60;
  for (const n of CLASS_MAP.mage.trees[2].nodes)
    for (let i = 0; i < n.max; i++) learnTalent(save, n.id);
  const equipment = {
    weapon: "ember_staff",
    chest: "mooncloth",
    head: "spellweave_head",
    hands: "spellweave_hands",
    boots: "shadow_boots",
    trinket: "lionheart",
  };
  save.inventory.push(...Object.values(equipment));
  save.heroes.mage.equipment = equipment;
  await page.addInitScript(
    ({ key, save }) => {
      localStorage.setItem(key, JSON.stringify(save));
      Math.random = () => 0.42;
    },
    { key: SAVE_KEY, save },
  );
  await controlledClock(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  return CLASS_MAP.mage.speed * (1 + heroStats(save).speed / 100);
}
async function approachLandmark(page: Page, key: string, label: string) {
  await page.keyboard.down(key);
  for (let i = 0; i < 35; i++) {
    await page.clock.runFor(200);
    await chooseUpgradeIfNeeded(page);
    if (
      (await page.locator("#landmark-button").isVisible()) &&
      (await page.locator("#landmark-interact").textContent()) === label
    )
      break;
  }
  await page.keyboard.up(key);
  await expect(page.locator("#landmark-interact")).toHaveText(label);
  await expect(page.locator("#landmark-button")).toBeVisible();
}

test("a guarded cache completes through combat and brings its item back to camp", async ({
  page,
}) => {
  const speed = await preparedExpedition(page);
  await walk(page, "s", (350 / speed) * 1000);
  await approachLandmark(page, "a", "Challenge the guards");
  await expect(page.locator("#landmark-preview")).toContainText(
    "three marked guards",
  );
  await page.locator("#landmark-button").click();
  await page.clock.runFor(200);
  await chooseUpgradeIfNeeded(page);
  await expect(page.locator("#encounter-status")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/cache-guards.png",
  });
  for (
    let i = 0;
    i < 60 &&
    !(await page.locator("#landmark-count").textContent())?.includes("1 / 6");
    i++
  ) {
    await page.clock.runFor(250);
    await chooseUpgradeIfNeeded(page);
  }
  await expect(page.locator("#landmark-count")).toHaveText("LANDMARKS 1 / 6");
  await expect(page.locator("#encounter-status")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Return to camp" }).click();
  await expect(page.locator(".result-loot")).toBeVisible();
  await expect(page.locator(".result-exploration")).toContainText("1 / 6");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.totals.encounters).toBe(1);
  expect(saved.history[0].loot.length).toBeGreaterThan(0);
});

test("a ritual displays range, pauses its timer, loses progress outside and completes", async ({
  page,
}) => {
  const speed = await preparedExpedition(page);
  await approachLandmark(page, "w", "Begin the ritual");
  await expect(page.locator("#landmark-preview")).toContainText("20 seconds");
  await page.keyboard.press("f");
  for (let i = 0; i < 16; i++) {
    await page.clock.runFor(250);
    await chooseUpgradeIfNeeded(page);
  }
  await expect(page.locator("#encounter-detail")).toContainText(
    "Defend the circle",
  );
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/ritual-defense.png",
  });
  await page.keyboard.press("Escape");
  const progress = await page.locator("#encounter-detail").textContent();
  await page.clock.runFor(2000);
  await expect(page.locator("#encounter-detail")).toHaveText(progress!);
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await walk(page, "d", (220 / speed) * 1000);
  await chooseUpgradeIfNeeded(page);
  const beforeDecay = await page
    .locator("#encounter-fill")
    .evaluate((e) => parseFloat((e as HTMLElement).style.width));
  for (let i = 0; i < 8; i++) {
    await page.clock.runFor(250);
    await chooseUpgradeIfNeeded(page);
  }
  await expect(page.locator("#encounter-detail")).toContainText(
    "progress fading",
  );
  const afterDecay = await page
    .locator("#encounter-fill")
    .evaluate((e) => parseFloat((e as HTMLElement).style.width));
  expect(afterDecay).toBeLessThan(beforeDecay);
  await walk(page, "a", (220 / speed) * 1000);
  await chooseUpgradeIfNeeded(page);
  for (
    let i = 0;
    i < 100 &&
    !(await page.locator("#landmark-count").textContent())?.includes("1 / 6");
    i++
  ) {
    await page.clock.runFor(250);
    await chooseUpgradeIfNeeded(page);
  }
  await expect(page.locator("#landmark-count")).toHaveText("LANDMARKS 1 / 6");
  await expect(page.locator("#encounter-status")).not.toBeVisible();
});

for (const mobile of [false, true]) {
  test.describe(mobile ? "Touch layout" : "Desktop layout", () => {
    if (mobile)
      test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
    test(`shrines support cancellation, keyboard/click choices and saved exploration rewards (${mobile ? "390px" : "desktop"})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      await controlledClock(page);
      await page.getByRole("button", { name: "Begin Expedition" }).click();
      const speed =
        CLASS_MAP.mage.speed * (1 + heroStats(freshSave()).speed / 100);
      await walk(page, "d", (340 / speed) * 1000);
      await walk(page, "s", (180 / speed) * 1000);
      await expect(page.locator("#landmark-button")).toBeVisible();
      await expect(page.locator("#landmark-name")).toHaveText(
        "Wayfarer's Shrine",
      );
      await page.keyboard.press("f");
      await expect(page.locator(".blessing-card")).toHaveCount(3);
      await page.screenshot({
        animations: "disabled",
        path: `output/screenshots/shrine-${mobile ? "mobile" : "desktop"}.png`,
      });
      const time = await page.locator("#run-time").textContent();
      await page.clock.runFor(2000);
      await expect(page.locator("#run-time")).toHaveText(time!);
      if (mobile)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await page.locator("#landmark-button").click();
      if (mobile)
        await page.locator('[data-action="blessing"][data-id="wind"]').click();
      else await page.keyboard.press("2");
      await expect(page.locator("#landmark-count")).toHaveText(
        "LANDMARKS 1 / 6",
      );
      await expect(page.locator("#blessing-count")).toHaveText("1 blessing");
      await page.clock.runFor(32);
      await page.screenshot({
        animations: "disabled",
        path: `output/screenshots/exploration-${mobile ? "mobile" : "desktop"}.png`,
      });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Return to camp" }).click();
      await expect(page.locator(".result-exploration")).toContainText("1 / 6");
      await page.getByRole("button", { name: "Return to camp" }).click();
      await page.getByRole("button", { name: "Journal", exact: true }).click();
      await expect(page.locator(".history-row")).toContainText("1 landmark");
      await page.reload();
      await expect(page.locator(".history-row")).toContainText("1 landmark");
      const saved = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        SAVE_KEY,
      );
      expect(saved.totals.encounters).toBe(1);
      expect(saved.totals.runs).toBe(1);
      expect(errors).toEqual([]);
    });
  });
}

for (const [zone, boss, attack] of [
  ["elwynn", "Hogger", "Savage charge"],
  ["westfall", "Defias Captain", "Crossfire"],
  ["tirisfal", "The Gravekeeper", "Soul ring"],
]) {
  test(`${boss} shows its own telegraph and boss HUD`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (zone === "westfall")
      await page.setViewportSize({ width: 390, height: 844 });
    // Shorten only the encounter arrival in this browser fixture; use the real UI and engine.
    await page.route(/\/src\/content\.ts(?:\?|$)/, async (route) => {
      const response = await route.fetch();
      const original = await response.text();
      const body = original.replace(
        /duration:\s*(360|420|480)/g,
        "duration: 2",
      );
      expect(body).not.toBe(original);
      await route.fulfill({ response, body });
    });
    const save = freshSave();
    save.selectedZone = zone;
    save.totals.kills = 120;
    save.totals.wins = 1;
    await page.addInitScript(
      ({ key, save }) => localStorage.setItem(key, JSON.stringify(save)),
      { key: SAVE_KEY, save },
    );
    await controlledClock(page);
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await page.clock.runFor(6100);
    await expect(page.locator("#boss-hud")).toBeVisible();
    await expect(page.locator("#boss-name")).toHaveText(boss);
    await expect(page.locator("#boss-phase")).toHaveText("PHASE I");
    await expect(page.locator("#boss-attack")).toContainText(attack);
    await expect(page.locator("#landmark-button")).not.toBeVisible();
    const box = await page.locator("#boss-hud").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({
      animations: "disabled",
      path: `output/screenshots/boss-${zone}.png`,
    });
    await page.keyboard.press("Escape");
    const t = await page.locator("#run-time").textContent();
    await page.clock.runFor(2000);
    await expect(page.locator("#run-time")).toHaveText(t!);
    expect(errors).toEqual([]);
  });
}
