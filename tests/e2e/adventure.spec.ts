import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";

async function setup(page: Page, save = freshSave()) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__adventureGame=game;window.__adventureRenderer=renderer;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-09T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-09T00:00:01Z"));
}
const saved = (page: Page): Promise<SaveData> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function begin(page: Page) {
  await page.locator('[data-action="begin"]').click();
  await page.evaluate(async () => {
    const g = (window as any).__adventureGame;
    await (window as any).__adventureRenderer.ready();
    g.spells = [];
    g.pets = [];
    g.spawnTimer = 1e9;
  });
}

test("preparation explains trade-offs, persists choices and launches the selected build", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.getByRole("button", { name: "Shape your build" }).click();
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.locator('[data-action="oath"][data-id="vanguard"]').click();
  expect((await saved(page)).adventure.oath).toBe("vanguard");
  await page.reload();
  await expect(
    page.locator('[data-action="difficulty"][data-id="explorer"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".departure-build")).toContainText("The Vanguard");
  await page.getByRole("button", { name: "Set out with this build" }).click();
  await expect(page.locator("#health-text")).toContainText("133");
  await expect(page.locator(".adventure-hud")).toBeVisible();
  expect(errors).toEqual([]);
});
test("keystone keyboard choices, bounded rerolls and pause preserve simulation state", async ({
  page,
}) => {
  await setup(page);
  await begin(page);
  await page.evaluate(() => {
    const g = (window as any).__adventureGame;
    g.level = 3;
    g.xp = g.xpNeeded;
  });
  await page.clock.runFor(100);
  await expect(
    page.getByRole("heading", { name: "Choose your keystone" }),
  ).toBeVisible();
  await expect(page.locator(".keystone-card")).toHaveCount(3);
  const snapshot = await page.evaluate(() => {
    const g = (window as any).__adventureGame;
    return [g.time, g.xp, g.level];
  });
  await page.getByRole("button", { name: "Reroll choices · 2 left" }).click();
  await page.getByRole("button", { name: "Reroll choices · 1 left" }).click();
  await expect(
    page.getByRole("button", { name: "Reroll choices · 0 left" }),
  ).toBeDisabled();
  await page.clock.runFor(3000);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__adventureGame;
      return [g.time, g.xp, g.level];
    }),
  ).toEqual(snapshot);
  await page.keyboard.press("1");
  await page.clock.runFor(100);
  await expect(page.locator("#run-level")).toContainText("LEVEL 4");
  await expect(page.locator("#run-keystones > span")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
});
test("momentum and contracts reflect real combat, return once, unlock relics and retry cleanly", async ({
  page,
}) => {
  await setup(page);
  await begin(page);
  await page.evaluate(() => {
    const g = (window as any).__adventureGame,
      template = { ...g.enemies[0] };
    g.player.invulnerable = 100;
    g.xpNeeded = 1e9;
    for (let i = 0; i < 60; i++) {
      const e = {
        ...template,
        id: 5000 + i,
        hp: 1,
        maxHp: 1,
        boss: false,
        elite: false,
        dead: false,
        x: 200,
        y: 0,
      };
      g.enemies.push(e);
      g.damageEnemy(e, 10, "field-test", false);
    }
  });
  await page.clock.runFor(120);
  await expect(page.locator("#momentum-label")).toHaveText("LEGENDARY");
  await expect(page.locator("#contract-hunt")).toHaveText("✓ Complete");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Return to camp" }).click();
  await expect(page.locator(".adventure-result")).toContainText(
    "Thin the horde",
  );
  const first = await saved(page);
  expect(first.adventure.contracts).toBe(1);
  expect(first.adventure.bestStreak).toBe(60);
  await page.getByRole("button", { name: "One more adventure" }).click();
  await expect(page.locator("#game-canvas")).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__adventureGame.rerolls),
  ).toBe(2);
  expect((await saved(page)).totals.runs).toBe(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Return to camp" }).click();
  await page.getByRole("button", { name: "Return to camp" }).click();
  await page
    .getByRole("button", { name: "Hall of mastery", exact: true })
    .click();
  const chapter = page.locator(".mastery-card").filter({
    has: page.getByRole("heading", {
      name: "The first chapter",
      exact: true,
    }),
  });
  const gold = (await saved(page)).gold;
  await chapter.getByRole("button", { name: "Claim reward" }).click();
  await expect(chapter.getByRole("button", { name: "Claimed" })).toBeDisabled();
  expect((await saved(page)).gold).toBe(gold + 35);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#adventure-relic").selectOption("compass");
  await page.reload();
  await expect(page.locator("#adventure-relic")).toHaveValue("compass");
});
test("accessibility choices persist and affect both menu and battlefield renderer", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .locator(".setting-row")
    .filter({ has: page.locator('[data-setting="largeText"]') })
    .click();
  await page
    .locator(".setting-row")
    .filter({ has: page.locator('[data-setting="highContrast"]') })
    .click();
  await expect(page.locator("body")).toHaveClass(/large-text/);
  await expect(page.locator("body")).toHaveClass(/high-contrast/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await begin(page);
  expect(
    await page.evaluate(() => [
      (window as any).__adventureRenderer.largeText,
      (window as any).__adventureRenderer.highContrast,
    ]),
  ).toEqual([true, true]);
});
test("camp and preparation fit phone, tablet and desktop with large text", async ({
  page,
}) => {
  const s = freshSave();
  s.settings.largeText = true;
  s.settings.highContrast = true;
  await setup(page, s);
  for (const width of [320, 360, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const selector of [
      ".difficulty-choice",
      ".oath-card",
      "#adventure-relic",
    ]) {
      const boxes = await page.locator(selector).evaluateAll((els) =>
        els.map((el) => {
          const b = el.getBoundingClientRect();
          return { left: b.left, right: b.right, height: b.height };
        }),
      );
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width + 1);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});
test("phone exploration and momentum panels never overlap, including co-op and boss state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.locator("#coop-hero").selectOption("warrior");
  await begin(page);
  const overlap = () =>
    page.evaluate(() => {
      const a = document.querySelector(".world-hud")!.getBoundingClientRect(),
        b = document.querySelector(".adventure-hud")!.getBoundingClientRect();
      return (
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      );
    });
  expect(await overlap()).toBe(0);
  await page
    .locator(".game-shell")
    .evaluate((el) => el.classList.add("has-boss"));
  expect(await overlap()).toBe(0);
});
