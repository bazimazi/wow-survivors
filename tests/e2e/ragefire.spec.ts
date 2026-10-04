import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { dungeonRoute } from "../../src/dungeon";

function prepared() {
  const s = freshSave();
  s.clearedZones = ["tirisfal"];
  s.selectedZone = "ragefire";
  s.heroes.mage.level = 12;
  s.totals.kills = 120;
  s.totals.wins = 1;
  s.supplies.bombs = 4;
  s.settings.sound = false;
  return s;
}

test("all four volcanic arenas render bounded 400-enemy scenes with the new atlas", async ({
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
      zone: ZONES.find((z) => z.id === "ragefire")!,
      stats: { ...heroStats(freshSave()), health: 10000 },
      professions: {},
      seed: 123,
    });
    const r = new GameRenderer(canvas, g),
      artLoaded = await r.ready();
    const template = g.enemies[0],
      costs: number[] = [];
    const types = ["trogg", "earthborer", "molten", "cultist", "voidwalker"];
    for (let stage = 0; stage < 4; stage++) {
      g.dungeonStageIndex = stage;
      g.spells = [];
      g.enemies = Array.from({ length: 400 }, (_, i) => ({
        ...template,
        id: i,
        type: types[i % types.length],
        x: Math.cos(i * 2.4) * (120 + (i % 440)),
        y: Math.sin(i * 2.4) * (120 + (i % 280)),
        hp: 1000,
        maxHp: 1000,
      }));
      for (let i = 0; i < 20; i++) {
        await new Promise(requestAnimationFrame);
        const t = performance.now();
        g.update(1 / 60);
        r.render();
        costs.push(performance.now() - t);
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
  console.log("Ragefire scene CPU measurements:", JSON.stringify(metrics));
});
async function seed(page: Page, s = prepared()) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function accelerated(page: Page, stage?: number) {
  await page.route(/\/src\/dungeon\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      original = await response.text();
    let body = original.replace(
      /duration:\s*(60|75|90|105|120)/g,
      "duration: 2",
    );
    if (stage === undefined)
      body = body.replace(/baseHealth:\s*(28|32|34|36)/g, "baseHealth: 0.12");
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  if (stage !== undefined)
    await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          /dungeonStageIndex\s*=\s*0/,
          `dungeonStageIndex = ${stage}`,
        ),
      });
    });
  await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-03T12:00:01Z"));
}
async function toGuardianEnd(page: Page) {
  for (let i = 0; i < 85; i++) {
    if (await page.locator(".checkpoint-options, .result-dungeon").count())
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
    page.locator(".checkpoint-options, .result-dungeon"),
  ).toBeVisible();
}

test("Ragefire preview uses an independent unlock, hero gate, continent and four loot pools", async ({
  page,
}) => {
  const s = prepared();
  s.heroes.mage.level = 9;
  s.heroes.warrior.level = 10;
  await seed(page, s);
  await page.goto("/");
  await expect(page.locator(".zone-option")).toHaveCount(7);
  await expect(page.locator(".world-label")).toContainText("KALIMDOR");
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeDisabled();
  await expect(page.locator(".world-hint")).toHaveText(
    "Requires character level 10",
  );
  await expect(page.locator(".dungeon-route li")).toHaveCount(4);
  await expect(page.locator(".dungeon-preview")).toContainText(
    "5:15 of survival, plus 4 boss fights",
  );
  await page.getByText("Preview dungeon equipment", { exact: true }).click();
  await expect(page.locator(".dungeon-loot-guide section")).toHaveCount(4);
  await expect(page.locator(".dungeon-loot-guide section p")).toHaveCount(15);
  await page.locator('[data-action="hero"][data-id="warrior"]').click();
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeEnabled();
  await expect(
    page.locator('[data-action="zone"][data-id="deadmines"]'),
  ).toContainText("Defeat the Westfall boss");
});

test("four real guardian returns settle one victory, correct Journal credit and persistent loot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const trialSave = prepared();
  trialSave.heroes.mage.classTrial = {
    chapter: 2,
    active: true,
    progress: { evolutions: 1 },
  };
  await seed(page, trialSave);
  await accelerated(page);
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  for (let i = 0; i < 4; i++) {
    await toGuardianEnd(page);
    if (i < 3) {
      await expect(page.locator(".checkpoint-modal")).toContainText(
        `GUARDIAN ${i + 1} / 4 DEFEATED`,
      );
      const clock = await page.locator("#run-time").textContent();
      await page.clock.runFor(1500);
      await expect(page.locator("#run-time")).toHaveText(clock!);
      expect((await saved(page)).totals.dungeonBosses).toBe(0);
      await page
        .locator('[data-action="dungeon-continue"][data-id="guard"]')
        .click();
    }
  }
  await expect(page.locator(".result-dungeon")).toContainText(
    "4 / 4 guardians defeated",
  );
  await expect(page.locator(".result-dungeon li.complete")).toHaveCount(4);
  await page.screenshot({
    path: "output/screenshots/ragefire-victory.png",
    animations: "disabled",
  });
  let s = await saved(page);
  expect(s.totals.dungeonBosses).toBe(4);
  expect(s.totals.dungeonWins).toBe(1);
  expect(s.history[0].zoneId).toBe("ragefire");
  expect(s.history[0].classProof.bosses).toBe(4);
  expect(s.clearedZones).toContain("ragefire");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  const milestone = page.locator(".quest-card").filter({
    has: page.getByRole("heading", { name: "Silence the Searing Blade" }),
  });
  await milestone.getByRole("button", { name: "Claim rewards" }).click();
  const other = page.locator(".quest-card").filter({
    has: page.getByRole("heading", { name: "Break the Brotherhood" }),
  });
  await expect(
    other.getByRole("button", { name: "In progress" }),
  ).toBeDisabled();
  await expect(page.locator(".history-row").first()).toContainText(
    "4 / 4 guardians",
  );
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  // Include the added wardrobe rewards when selecting the actual Jergosh drop.
  const inventory = (await saved(page)).inventory as string[];
  const reward = dungeonRoute("ragefire")!.stages[2].loot.find((id) =>
    inventory.includes(id),
  );
  expect(reward).toBeTruthy();
  await page
    .locator(`.gear-card[data-gear-id="${reward}"]`)
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  s = await saved(page);
  expect(s.claimedQuests).toContain("ragefire-clear");
  expect(s.history[0].classProof.bosses).toBe(4);
  expect(s.claimedQuests).not.toContain("deadmines-clear");
  expect(Object.values(s.heroes.mage.equipment)).toContain(reward);
  expect(errors).toEqual([]);
});

test.describe("touch Ragefire", () => {
  test.use({
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  test("phone route, recovery and a three-guardian partial return remain usable", async ({
    page,
  }) => {
    await seed(page);
    await accelerated(page);
    await page.locator(".dungeon-preview").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "output/screenshots/ragefire-preview-mobile.png",
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Begin Dungeon" }).tap();
    for (let i = 0; i < 3; i++) {
      await toGuardianEnd(page);
      await expect(page.locator(".checkpoint-options")).toBeVisible();
      for (const button of await page.locator(".checkpoint-choice").all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeLessThanOrEqual(330);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      if (i < 2)
        await page
          .locator('[data-action="dungeon-continue"][data-id="edge"]')
          .tap();
    }
    await page.screenshot({
      path: "output/screenshots/ragefire-recovery-mobile.png",
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Return to camp with secured rewards" })
      .tap();
    await expect(page.locator(".result-dungeon")).toContainText(
      "3 / 4 guardians defeated",
    );
    await page.screenshot({
      path: "output/screenshots/ragefire-result-mobile.png",
      animations: "disabled",
    });
    const s = await saved(page);
    expect(s.totals.dungeonWins).toBe(0);
    expect(s.totals.dungeonBosses).toBe(3);
    expect(s.clearedZones).not.toContain("ragefire");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

for (const [stage, boss, attack] of [
  [0, "Oggleflint", "Stone cleave"],
  [1, "Taragaman the Hungerer", "Fire nova"],
  [2, "Jergosh the Invoker", "Shadow volley"],
  [3, "Bazzalan", "Blade dash"],
] as const) {
  test(`${boss} renders the original art, correct arena and real telegraph`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (stage === 3) await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await accelerated(page, stage);
    await page.getByRole("button", { name: "Begin Dungeon" }).click();
    await page.clock.runFor(6100);
    await expect(page.locator("#boss-name")).toHaveText(boss);
    await expect(page.locator("#boss-attack")).toContainText(attack);
    await expect(page.locator("#encounter-detail")).toContainText(
      `Stage ${stage + 1} / 4`,
    );
    const box = (await page.locator("#boss-hud").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const atlas = await page.evaluate(async () => {
      const im = new Image();
      im.src = "/art/ragefire-sprites.png";
      await im.decode();
      return im.naturalWidth;
    });
    expect(atlas).toBeGreaterThan(0);
    await page.screenshot({
      path: `output/screenshots/ragefire-guardian-${stage + 1}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    const clock = await page.locator("#run-time").textContent();
    await page.clock.runFor(1500);
    await expect(page.locator("#run-time")).toHaveText(clock!);
    expect(errors).toEqual([]);
  });
}
