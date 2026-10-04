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
function prepared() {
  const s = freshSave();
  s.clearedZones = ["westfall"];
  s.selectedZone = "deadmines";
  s.heroes.mage.level = 12;
  s.totals.kills = 120;
  s.totals.wins = 1;
  s.supplies.bombs = 3;
  s.settings.sound = false;
  return s;
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function accelerated(page: Page) {
  // Shorten arrival and health in an isolated fixture; interactions use the real engine/UI.
  await page.route(/\/src\/dungeon\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original
      .replace(/duration:\s*(90|105|120)/g, "duration: 2")
      .replace(/baseHealth:\s*(34|38|42)/g, "baseHealth: 0.12");
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
}
async function toCheckpoint(page: Page) {
  for (let i = 0; i < 80; i++) {
    if (
      await page
        .getByRole("heading", { name: "A moment to recover." })
        .isVisible()
    )
      return;
    if (await page.locator(".upgrade-card").count())
      await page.locator(".upgrade-card").first().click();
    const hint = await page.locator("#landmark-hint").textContent();
    if (
      hint?.startsWith("Dungeon guardian") &&
      Number(hint.match(/(\d+) m/)?.[1] || 999) <= 24
    )
      await page.keyboard.press("e");
    await page.clock.runFor(250);
  }
  await expect(
    page.getByRole("heading", { name: "A moment to recover." }),
  ).toBeVisible();
}

test("dungeon preview explains the unlock, selected-hero entry level, stages and rewards", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = prepared();
  s.heroes.mage.level = 9;
  s.heroes.warrior.level = 10;
  await seed(page, s);
  await page.goto("/");
  await expect(page.locator(".zone-option")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeDisabled();
  await expect(page.locator(".world-hint")).toHaveText(
    "Requires character level 10",
  );
  await expect(page.locator(".dungeon-route li")).toHaveCount(3);
  await expect(page.locator(".dungeon-preview")).toContainText(
    "Sneed's Shredder",
  );
  await page.locator('.class-card[data-id="warrior"]').click();
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeEnabled();
  await page.getByText("Preview dungeon equipment", { exact: true }).click();
  await expect(page.locator(".dungeon-loot-guide")).toContainText(
    "Dockmaster's Maul",
  );
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/deadmines-preview.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".zone-option.selected")).toContainText(
    "The Deadmines",
  );
  expect((await saved(page)).selectedClass).toBe("warrior");
  expect(errors).toEqual([]);
});

test("a recovery break freezes combat, accepts a keyboard boon and partial return saves boss rewards", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = prepared();
  s.commission = { id: "thorium_patrol", progress: 0 };
  await seed(page, s);
  await accelerated(page);
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  await toCheckpoint(page);
  await expect(page.locator(".checkpoint-options button")).toHaveCount(3);
  await expect(page.locator(".checkpoint-reward")).toContainText(
    "SECURED FOR YOUR RETURN",
  );
  const time = await page.locator("#run-time").textContent();
  const before = await saved(page);
  for (const key of ["Escape", "Space", "Shift", "q", "e"])
    await page.keyboard.press(key);
  await page.clock.runFor(3000);
  await expect(page.locator("#run-time")).toHaveText(time!);
  await expect(
    page.getByRole("heading", { name: "A moment to recover." }),
  ).toBeVisible();
  expect((await saved(page)).supplies).toEqual(before.supplies);
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/deadmines-recovery.png",
  });
  await page.keyboard.press("1");
  await expect(page.locator("#landmark-name")).toHaveText(
    "The Ironclad Approach",
  );
  await expect(page.locator("#landmark-count")).toHaveText("GUARDIANS 1 / 3");
  await page.clock.runFor(100);
  if (await page.locator(".upgrade-card").count())
    await page.locator(".upgrade-card").first().click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.locator(".result-dungeon")).toContainText(
    "1 / 3 guardians defeated",
  );
  const settled = await saved(page);
  expect(settled.history[0].dungeonBosses).toBe(1);
  expect(settled.history[0].victory).toBe(false);
  expect(settled.totals.dungeonBosses).toBe(1);
  expect(settled.totals.dungeonWins).toBe(0);
  expect(settled.reputation).toEqual(before.reputation);
  expect(settled.inventory.length).toBeGreaterThan(before.inventory.length);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.reload();
  expect((await saved(page)).totals.dungeonBosses).toBe(1);
  expect(errors).toEqual([]);
});

test("all three guardians lead to a dungeon victory, journal claim and persistent equipment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, prepared());
  await accelerated(page);
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  await toCheckpoint(page);
  await page
    .locator('[data-action="dungeon-continue"][data-id="guard"]')
    .click();
  await toCheckpoint(page);
  await expect(page.getByRole("dialog")).toContainText("Mr. Smite has fallen");
  await page
    .locator('[data-action="dungeon-continue"][data-id="stride"]')
    .click();
  await expect(page.locator("#landmark-name")).toHaveText("The Captain's Deck");
  for (let i = 0; i < 80; i++) {
    if (await page.locator(".result-dungeon").isVisible()) break;
    if (await page.locator(".upgrade-card").count())
      await page.locator(".upgrade-card").first().click();
    const hint = await page.locator("#landmark-hint").textContent();
    if (
      hint?.startsWith("Dungeon guardian") &&
      Number(hint.match(/(\d+) m/)?.[1] || 999) <= 24
    )
      await page.keyboard.press("e");
    await page.clock.runFor(250);
  }
  await expect(page.locator(".result-dungeon")).toContainText(
    "3 / 3 guardians defeated",
  );
  await expect(page.locator(".result-dungeon li.complete")).toHaveCount(3);
  await page.screenshot({
    animations: "disabled",
    path: "output/screenshots/deadmines-victory.png",
  });
  const result = await saved(page);
  expect(result.totals.dungeonWins).toBe(1);
  expect(result.history[0].victory).toBe(true);
  expect(result.clearedZones).toContain("deadmines");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  const q = page.locator(".quest-card").filter({
    has: page.getByRole("heading", { name: "Break the Brotherhood" }),
  });
  await q.getByRole("button", { name: /Claim/ }).click();
  expect((await saved(page)).claimedQuests).toContain("deadmines-clear");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const dungeonWeapon = page.locator(".gear-card").filter({
    has: page.getByRole("heading", {
      name: "Tidecaller's Staff",
      exact: true,
    }),
  });
  await dungeonWeapon.getByRole("button", { name: "Equip item" }).click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.weapon).toBe(
    "rigging_staff",
  );
  expect((await saved(page)).totals.dungeonBosses).toBe(3);
  expect(errors).toEqual([]);
});

test.describe("touch dungeon", () => {
  test.use({
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  test("phone route, recovery choices and partial results fit and respond to taps", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await seed(page, prepared());
    await accelerated(page);
    await page.locator(".dungeon-preview").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/deadmines-preview-mobile.png",
    });
    await page.getByRole("button", { name: "Begin Dungeon" }).tap();
    await toCheckpoint(page);
    await expect(page.locator(".checkpoint-choice")).toHaveCount(3);
    for (const choice of await page.locator(".checkpoint-choice").all()) {
      const b = await choice.boundingBox();
      expect(b!.width).toBeLessThanOrEqual(330);
      expect(b!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/deadmines-recovery-mobile.png",
    });
    await page
      .locator('[data-action="dungeon-continue"][data-id="edge"]')
      .tap();
    await toCheckpoint(page);
    await page
      .getByRole("button", { name: "Return to camp with secured rewards" })
      .tap();
    await expect(page.locator(".result-dungeon")).toContainText(
      "2 / 3 guardians defeated",
    );
    await page.screenshot({
      animations: "disabled",
      path: "output/screenshots/deadmines-result-mobile.png",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Return to camp", exact: true })
      .tap();
    await page.reload();
    expect((await saved(page)).totals.dungeonBosses).toBe(2);
    expect(errors).toEqual([]);
  });
});

for (const [index, boss, attack] of [
  [0, "Sneed's Shredder", "Saw sweep"],
  [1, "Mr. Smite", "Hammerfall"],
  [2, "Edwin VanCleef", "Crossing blades"],
] as const) {
  test(`${boss} renders its stage, real boss HUD and telegraph`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (index === 1) await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, prepared());
    await page.route(/\/src\/dungeon\.ts(?:\?|$)/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          /duration:\s*(90|105|120)/g,
          "duration: 2",
        ),
      });
    });
    // Start at the target arena only in this isolated browser fixture.
    await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
      const response = await route.fetch();
      const original = await response.text();
      const body = original.replace(
        /dungeonStageIndex\s*=\s*0/,
        `dungeonStageIndex = ${index}`,
      );
      await route.fulfill({ response, body });
    });
    await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
    await page.goto("/");
    await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
    await page.getByRole("button", { name: "Begin Dungeon" }).click();
    await page.clock.runFor(6100);
    await expect(page.locator("#boss-hud")).toBeVisible();
    await expect(page.locator("#boss-name")).toHaveText(boss);
    await expect(page.locator("#boss-attack")).toContainText(attack);
    const box = await page.locator("#boss-hud").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (index === 1) await page.clock.runFor(4000);
    await page.screenshot({
      path: `output/screenshots/deadmines-guardian-${index + 1}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    const clock = await page.locator("#run-time").textContent();
    await page.clock.runFor(2000);
    await expect(page.locator("#run-time")).toHaveText(clock!);
    expect(errors).toEqual([]);
  });
}

test("dungeon decking and machinery render a bounded 400-enemy scene", async ({
  page,
}) => {
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts");
    const { GameRenderer } = await import("/src/renderer.ts");
    const { ZONES } = await import("/src/content.ts");
    const { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:1280px;height:720px;position:fixed;inset:0;";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES.find((z) => z.id === "deadmines")!,
      stats: { ...heroStats(freshSave()), health: 10000 },
      professions: {},
      seed: 123,
    });
    const r = new GameRenderer(canvas, g),
      artLoaded = await r.ready();
    const template = g.enemies[0];
    const costs: number[] = [];
    for (let stage = 0; stage < 3; stage++) {
      g.dungeonStageIndex = stage;
      g.spells = [];
      g.enemies = Array.from({ length: 400 }, (_, i) => ({
        ...template,
        id: i,
        type: i % 3 === 0 ? "blackguard" : i % 3 === 1 ? "golem" : "defias",
        x: Math.cos(i * 2.4) * (120 + (i % 480)),
        y: Math.sin(i * 2.4) * (120 + (i % 280)),
        hp: 1000,
        maxHp: 1000,
      }));
      for (let i = 0; i < 20; i++) {
        await new Promise(requestAnimationFrame);
        const start = performance.now();
        g.update(1 / 60);
        r.render();
        costs.push(performance.now() - start);
      }
    }
    costs.sort((a, b) => a - b);
    return {
      artLoaded,
      enemies: g.enemies.length,
      finite: g.enemies.every((e) => Number.isFinite(e.x + e.y)),
      averageMs: Number(
        (costs.reduce((a, b) => a + b) / costs.length).toFixed(2),
      ),
      p95Ms: Number(costs[Math.floor(costs.length * 0.95)].toFixed(2)),
    };
  });
  expect(metrics.artLoaded).toBe(true);
  expect(metrics.finite).toBe(true);
  expect(metrics.enemies).toBeLessThanOrEqual(400);
  expect(metrics.averageMs).toBeLessThan(100);
  console.log("Dungeon scene CPU measurements:", JSON.stringify(metrics));
});
