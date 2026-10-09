import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.selectedZone = "shadowfang";
  s.clearedZones = ["tirisfal", "ragefire"];
  s.heroes.mage.level = 15;
  s.supplies.bombs = 8;
  return s;
}
async function seed(p: Page, s = ready()) {
  await p.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
const saved = (p: Page) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function field(p: Page, extra = "") {
  await p.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.xpNeeded=1e9;this.player.hp=10000;this.player.maxHp=10000;${extra};window.__shadowfangGame=this;`,
      ),
    });
  });
  await p.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await p.goto("/#camp");
  await p.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function guardian(p: Page, phase = 1, alternate = 0) {
  await p.evaluate(
    ({ phase, alternate }) => {
      const g = (window as any).__shadowfangGame;
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      g.pickups = [];
      g.spells = [];
      g.pets = [];
      g.dungeonStageTime = g.dungeonStage.duration - 0.001;
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      const b = g.boss;
      g.enemies = [b];
      Object.assign(b, { x: 100, y: 0, speed: 0, attackTimer: 0 });
      if (phase === 2) b.hp = b.maxHp * 0.49;
      g.bossState.attackIndex = alternate;
      g.update(1 / 60);
    },
    { phase, alternate },
  );
  await p.clock.runFor(120);
}
async function defeat(p: Page) {
  await guardian(p);
  await p.evaluate(() => {
    const g = (window as any).__shadowfangGame;
    g.boss.hp = 1;
    g.boss.x = g.player.x + 25;
    g.boss.y = g.player.y;
    g.useBomb();
  });
  await p.clock.runFor(18);
}
test("Shadowfang preview checks the selected hero gate and displays all thirty-three guardian sources", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 14;
  s.heroes.warrior.level = 15;
  await seed(page, s);
  await page.goto("/");
  await expect(page.locator(".zone-option")).toHaveCount(9);
  await expect(page.locator(".world-label")).toContainText("EASTERN KINGDOMS");
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeDisabled();
  await expect(page.locator(".world-hint")).toHaveText(
    "Requires character level 15",
  );
  await expect(page.locator(".dungeon-preview")).toContainText(
    "6:30 of survival, plus 4 boss fights",
  );
  await page.getByText("Preview dungeon equipment", { exact: true }).click();
  await expect(page.locator(".dungeon-loot-guide section p")).toHaveCount(33);
  await page.locator('[data-action="hero"][data-id="warrior"]').click();
  await expect(
    page.getByRole("button", { name: "Begin Dungeon" }),
  ).toBeEnabled();
});
test("locked destination and acquisition guide state the Ragefire prerequisite", async ({
  page,
}) => {
  const s = ready();
  s.clearedZones = ["tirisfal"];
  s.selectedZone = "elwynn";
  await seed(page, s);
  await page.goto("/");
  await expect(
    page.locator('[data-action="zone"][data-id="shadowfang"]'),
  ).toContainText("Clear Ragefire Chasm");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.getByRole("button", { name: /Plan your next discovery/ }).click();
  const card = page.locator('[data-wardrobe-id="haunted_mantle"]');
  await expect(card).toContainText("Baron Silverlaine");
  await expect(card).toContainText("Clear Ragefire Chasm to unlock");
});
test("four actual guardian deaths settle victory, graded rewards, persistent equipment and one Journal claim", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await field(page);
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  for (let stage = 0; stage < 4; stage++) {
    await defeat(page);
    if (stage < 3) {
      await expect(page.locator(".checkpoint-modal")).toContainText(
        `GUARDIAN ${stage + 1} / 4 DEFEATED`,
      );
      const time = await page.locator("#run-time").textContent();
      await page.clock.runFor(1500);
      await expect(page.locator("#run-time")).toHaveText(time!);
      if (stage === 0)
        await page.screenshot({
          path: "output/screenshots/shadowfang-recovery.png",
          animations: "disabled",
        });
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
    }
  }
  await expect(page.locator(".result-dungeon")).toContainText(
    "4 / 4 guardians defeated",
  );
  await page.screenshot({
    path: "output/screenshots/shadowfang-victory.png",
    animations: "disabled",
  });
  const before = await saved(page);
  expect(before.clearedZones).toContain("shadowfang");
  expect(before.history[0].loot).toHaveLength(4);
  expect(before.totals.dungeonWins).toBe(1);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  const quest = page.locator(".quest-card").filter({
    has: page.getByRole("heading", { name: "Break the Moonlit Curse" }),
  });
  await quest.getByRole("button", { name: "Claim rewards" }).click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const id = before.history[0].loot[0];
  await page
    .locator(`[data-gear-id="${id}"]`)
    .getByRole("button", { name: "Equip item" })
    .click();
  await page.reload();
  const after = await saved(page);
  expect(after.claimedQuests).toContain("shadowfang-clear");
  expect(after.claimedQuests).not.toContain("ragefire-clear");
  expect(Object.values(after.heroes.mage.equipment)).toContain(id);
  expect(errors).toEqual([]);
});
test("phone recovery retains two secured guardians and direct Skinning practice on a partial return", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 844 });
  const s = ready();
  s.professions.skinning = 125;
  s.training.skinning = 3;
  await seed(page, s);
  await field(page);
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  await page.clock.runFor(120);
  await expect(page.locator(".run-spell.unlearned")).toHaveCount(4);
  const compactLabels = await page
    .locator(".run-spell.unlearned")
    .evaluateAll((cards) =>
      cards.every((card) => {
        const box = card.getBoundingClientRect(),
          label = card.querySelector("small")!.getBoundingClientRect();
        return (
          label.left >= box.left &&
          label.right <= box.right &&
          label.bottom <= box.bottom
        );
      }),
    );
  expect(compactLabels).toBe(true);
  await page.evaluate(() => {
    const g = (window as any).__shadowfangGame;
    g.time = 185;
    g.rng.next = () => 0;
    // Obtain the enemy shape through a real scheduled spawn, then isolate one beast.
    for (let i = 0; i < 20 && !g.enemies.length; i++) g.update(0.05);
    const template = g.enemies[0];
    g.enemies = [
      {
        ...template,
        id: 9000,
        type: "keep_worgen",
        x: 0,
        y: 0,
        hp: 1,
        maxHp: 1,
        damage: 0,
        speed: 0,
      },
    ];
    g.useBomb();
  });
  await defeat(page);
  await page
    .locator('[data-action="dungeon-continue"][data-id="guard"]')
    .click();
  await defeat(page);
  await expect(page.locator(".checkpoint-modal")).toContainText(
    "GUARDIAN 2 / 4 DEFEATED",
  );
  for (const control of await page.locator(".checkpoint-choice").all()) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(330);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: "output/screenshots/shadowfang-recovery-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Return to camp with secured rewards" })
    .click();
  await expect(page.locator(".result-dungeon")).toContainText(
    "2 / 4 guardians defeated",
  );
  await page.screenshot({
    path: "output/screenshots/shadowfang-result-mobile.png",
    animations: "disabled",
  });
  const after = await saved(page);
  expect(after.professions.skinning).toBe(126);
  expect(after.totals.dungeonWins).toBe(0);
  expect(after.clearedZones).not.toContain("shadowfang");
  expect(after.history[0].loot).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    360,
  );
});
for (const [stage, name, attack] of [
  [0, "Baron Silverlaine", "Veil of shadow"],
  [1, "Commander Springvale", "Hammer of justice"],
  [2, "Fenrus the Devourer", "Devourer's lunge"],
  [3, "Archmage Arugal", "Void bolts"],
] as const) {
  test(`${name} renders its castle arena, new sprite and stronger warnings`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await seed(page);
    await field(page, `this.dungeonStageIndex=${stage};`);
    await page.getByRole("button", { name: "Begin Dungeon" }).click();
    await guardian(page, 2);
    await expect(page.locator("#boss-name")).toHaveText(name);
    await expect(page.locator("#boss-attack")).toContainText(attack);
    await expect(page.locator("#encounter-detail")).toContainText(
      `Stage ${stage + 1} / 4`,
    );
    await page.screenshot({
      path: `output/screenshots/shadowfang-guardian-${stage + 1}.png`,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}
test("Arugal's marked teleport waits for warning resolution and freezes during real pause", async ({
  page,
}) => {
  await seed(page);
  await field(page, "this.dungeonStageIndex=3;");
  await page.getByRole("button", { name: "Begin Dungeon" }).click();
  await guardian(page, 2, 1);
  const before = await page.evaluate(() => {
    const g = (window as any).__shadowfangGame;
    return {
      x: g.boss.x,
      y: g.boss.y,
      warning: g.hazards.find((h: any) => h.teleportId !== undefined).warning,
    };
  });
  await page.keyboard.press("Escape");
  await page.clock.runFor(2000);
  const paused = await page.evaluate(() => {
    const g = (window as any).__shadowfangGame;
    return {
      x: g.boss.x,
      y: g.boss.y,
      warning: g.hazards.find((h: any) => h.teleportId !== undefined).warning,
    };
  });
  expect(paused).toEqual(before);
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "output/screenshots/shadowfang-shadowport.png",
    animations: "disabled",
  });
  await page.clock.runFor(1800);
  const after = await page.evaluate(() => {
    const g = (window as any).__shadowfangGame;
    return { x: g.boss.x, y: g.boss.y };
  });
  expect(after).toEqual({ x: -220, y: -140 });
});
test("six atlases decode and all castle floors render bounded scenes of four hundred enemies", async ({
  page,
}) => {
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts"),
      { ZONES } = await import("/src/content.ts"),
      { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:1280px;height:720px;position:fixed;inset:0";
    document.body.append(canvas);
    const g = new GameEngine({
        classId: "mage",
        zone: ZONES.find((z) => z.id === "shadowfang")!,
        stats: { ...heroStats(freshSave()), health: 10000 },
        professions: {},
        seed: 123,
      }),
      r = new GameRenderer(canvas, g),
      artLoaded = await r.ready(),
      template = g.enemies[0],
      costs: number[] = [];
    const types = [
      "keep_worg",
      "keep_worgen",
      "keep_servitor",
      "keep_guard",
      "keep_void",
    ];
    for (let stage = 0; stage < 4; stage++) {
      g.dungeonStageIndex = stage;
      g.spells = [];
      g.enemies = Array.from({ length: 400 }, (_, i) => ({
        ...template,
        id: i,
        type: types[i % 5],
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
  console.log("Shadowfang scene CPU measurements:", JSON.stringify(metrics));
});
