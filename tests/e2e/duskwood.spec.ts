import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.selectedZone = "duskwood";
  s.clearedZones = ["shadowfang"];
  s.heroes.mage.level = 20;
  s.supplies.bombs = 10;
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
async function field(p: Page) {
  await p.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.xpNeeded=1e9;this.stats.regen=0;this.player.hp=10000;this.player.maxHp=10000;window.__duskwoodGame=this;`,
      ),
    });
  });
  await p.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await p.goto("/");
  await p.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function boss(p: Page, phase = 1, attack = 0) {
  await p.evaluate(
    ({ phase, attack }) => {
      const g = (window as any).__duskwoodGame;
      g.time = 539.999;
      g.update(1 / 60);
      const b = g.boss;
      g.enemies = [b];
      Object.assign(b, { x: 220, y: 0, speed: 0, attackTimer: 0 });
      b.hp = b.maxHp * (phase === 2 ? 0.49 : 1);
      g.bossState.attackIndex = attack;
      g.update(1 / 60);
      b.attackTimer = 100;
    },
    { phase, attack },
  );
  await p.clock.runFor(120);
}
async function home(p: Page) {
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Return to camp", exact: true }).click();
  await p.getByRole("button", { name: "Return to camp", exact: true }).click();
}

test("Duskwood preview shows selected-hero entry requirements, six landmarks and thirteen equipment rewards", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 19;
  s.heroes.warrior.level = 20;
  await seed(page, s);
  await page.goto("/");
  await expect(page.locator(".zone-option")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Begin Expedition" }),
  ).toBeDisabled();
  await expect(page.locator(".world-hint")).toHaveText(
    "Requires character level 20",
  );
  await expect(page.locator(".duskwood-landmarks li")).toHaveCount(6);
  await expect(page.locator(".duskwood-preview")).toContainText(
    "Watchkeeper’s Oath",
  );
  await page.getByText("Preview Duskwood equipment", { exact: true }).click();
  await expect(page.locator(".dungeon-loot-guide section p")).toHaveCount(12);
  await page.locator('[data-action="hero"][data-id="warrior"]').click();
  await expect(
    page.getByRole("button", { name: "Begin Expedition" }),
  ).toBeEnabled();
  await page.reload();
  await expect(page.locator(".world-content h2")).toHaveText("Duskwood");
});
for (const phase of [1, 2])
  test(`Stitches phase ${phase} renders captured cleaver lanes and persistent poison with repeated damage`, async ({
    page,
  }) => {
    await seed(page);
    await field(page);
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await boss(page, phase);
    await expect(page.locator(".world-hud")).toBeHidden();
    await expect(page.locator("#travel-button")).toBeHidden();
    await expect(page.locator("#boss-name")).toHaveText("Stitches");
    await expect(page.locator("#boss-phase")).toHaveText(
      phase === 1 ? "PHASE I" : "ENRAGED",
    );
    await expect(page.locator("#boss-attack")).toContainText("Cleaver");
    expect(
      await page.evaluate(() => (window as any).__duskwoodGame.hazards.length),
    ).toBe(phase === 1 ? 3 : 5);
    await page.evaluate(() => {
      const g = (window as any).__duskwoodGame;
      g.hazards = [];
      g.bossState.attackIndex = 1;
      g.boss.attackTimer = 0;
      g.update(1 / 60);
      g.boss.attackTimer = 100;
    });
    await page.clock.runFor(120);
    const hp = await page.evaluate(
      () => (window as any).__duskwoodGame.player.hp,
    );
    await page.clock.runFor(1750);
    await expect(page.locator("#boss-attack")).toContainText("green clouds");
    expect(
      await page.evaluate(
        () =>
          (window as any).__duskwoodGame.hazards.filter(
            (h: any) => h.resolved && h.linger,
          ).length,
      ),
    ).toBe(phase === 1 ? 1 : 2);
    const first = await page.evaluate(
      () => (window as any).__duskwoodGame.player.hp,
    );
    expect(first).toBeLessThan(hp);
    await page.screenshot({
      path: `output/screenshots/duskwood-cloud-phase-${phase}.png`,
    });
    await page.clock.runFor(850);
    expect(
      await page.evaluate(() => (window as any).__duskwoodGame.player.hp),
    ).toBeLessThan(first);
  });
test("pause freezes active clouds and keyboard movement escapes their repeated damage", async ({
  page,
}) => {
  await seed(page);
  await field(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await boss(page, 1, 1);
  await page.clock.runFor(1800);
  const before = await page.evaluate(() => {
    const g = (window as any).__duskwoodGame;
    return {
      hazards: JSON.stringify(g.hazards),
      hp: g.player.hp,
      time: g.time,
    };
  });
  await page.keyboard.press("Escape");
  await page.clock.runFor(2200);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__duskwoodGame;
      return {
        hazards: JSON.stringify(g.hazards),
        hp: g.player.hp,
        time: g.time,
      };
    }),
  ).toEqual(before);
  await page.keyboard.press("Escape");
  await page.keyboard.down("a");
  await page.clock.runFor(900);
  await page.keyboard.up("a");
  const hp = await page.evaluate(
    () => (window as any).__duskwoodGame.player.hp,
  );
  await page.clock.runFor(2000);
  expect(
    await page.evaluate(() => (window as any).__duskwoodGame.player.hp),
  ).toBe(hp);
});
test("local cache, shrine and ritual complete through gameplay and cloak loot survives a partial return and reload", async ({
  page,
}) => {
  await seed(page);
  await field(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame,
      l = g.landmarks[1];
    g.player.x = l.x;
    g.player.y = l.y;
    g.rng.pick = (a: any[]) => a.find((x) => x?.id === "lantern_cloak") || a[0];
  });
  await page.clock.runFor(120);
  await page.keyboard.press("f");
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame;
    for (const e of g.enemies.filter((e: any) => e.guard))
      Object.assign(e, { hp: 1, x: g.player.x + 20, y: g.player.y });
  });
  await page.keyboard.press("e");
  await page.clock.runFor(120);
  expect(
    await page.evaluate(() => (window as any).__duskwoodGame.loot),
  ).toContain("lantern_cloak");
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame,
      l = g.landmarks[0];
    g.player.x = l.x;
    g.player.y = l.y;
  });
  await page.clock.runFor(120);
  await page.keyboard.press("f");
  await page.locator('[data-action="blessing"]').first().click();
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame,
      l = g.landmarks[2];
    g.player.x = l.x;
    g.player.y = l.y;
  });
  await page.clock.runFor(120);
  await page.keyboard.press("f");
  await page.clock.runFor(20100);
  expect(
    await page.evaluate(
      () => (window as any).__duskwoodGame.completedEncounters,
    ),
  ).toBe(3);
  await home(page);
  expect((await saved(page)).inventory).toContain("lantern_cloak");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator('[data-action="equip"][data-id="lantern_cloak"]').click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.back).toBe("lantern_cloak");
});
test("Duskwood grade-four fieldwork uses actual gathering and returns materials and practice", async ({
  page,
}) => {
  const s = ready();
  s.professions.herbalism = 225;
  s.training.herbalism = 4;
  await seed(page, s);
  await field(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame,
      n = g.nodes.find((n: any) => n.kind === "sungrass");
    g.player.x = n.x;
    g.player.y = n.y;
  });
  await page.clock.runFor(120);
  expect(
    await page.evaluate(
      () => (window as any).__duskwoodGame.materials.sungrass,
    ),
  ).toBeGreaterThan(0);
  await home(page);
  const result = await saved(page);
  expect(result.materials.sungrass).toBeGreaterThan(0);
  expect(result.professions.herbalism).toBeGreaterThan(225);
});
test("defeating Stitches cancels poison, settles the epic trophy and enables the once-only Journal claim", async ({
  page,
}) => {
  await seed(page);
  await field(page);
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await boss(page, 2, 1);
  await page.evaluate(() => {
    const g = (window as any).__duskwoodGame;
    Object.assign(g.boss, { hp: 1, x: g.player.x + 25, y: g.player.y });
  });
  await page.keyboard.press("e");
  await page.clock.runFor(120);
  await expect(page.locator(".result-loot")).toContainText(
    "Watchkeeper's Oath",
  );
  expect(
    await page.evaluate(() => (window as any).__duskwoodGame.hazards.length),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  expect((await saved(page)).clearedZones).toContain("duskwood");
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await page.locator('[data-action="claim"][data-id="nightwatch"]').click();
  expect((await saved(page)).claimedQuests).toContain("nightwatch");
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page
    .locator('[data-action="equip"][data-id="watchkeeper_oath"]')
    .click();
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.trinket).toBe(
    "watchkeeper_oath",
  );
});
test("seven-destination camp and Duskwood guide fit six viewport widths", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".zone-option")).toHaveCount(7);
    await expect(page.locator(".duskwood-landmarks li")).toHaveCount(6);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const minimum = await page
      .locator(".zone-option")
      .evaluateAll((els) =>
        Math.min(...els.map((e) => e.getBoundingClientRect().height)),
      );
    expect(minimum).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      fullPage: true,
      path: `output/screenshots/duskwood-camp-${width}.png`,
    });
  }
  expect(errors).toEqual([]);
});
test("seven atlases decode and all nine Duskwood silhouettes render in a bounded dense scene", async ({
  page,
}) => {
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts"),
      { ZONES } = await import("/src/content.ts"),
      { DUSKWOOD_SPRITES } = await import("/src/duskwood.ts"),
      { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:1280px;height:720px;position:fixed;inset:0";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES.find((z: any) => z.id === "duskwood")!,
      characterLevel: 20,
      stats: { ...heroStats(freshSave()), health: 10000 },
      professions: {},
      seed: 123,
    });
    const template = g.enemies[0],
      types = Object.keys(DUSKWOOD_SPRITES);
    g.spells = [];
    g.pets = [];
    g.enemies = Array.from({ length: 400 }, (_, i) => ({
      ...template,
      id: i,
      type: types[i % 9],
      x: Math.cos(i * 2.4) * (140 + (i % 480)),
      y: Math.sin(i * 2.4) * (140 + (i % 280)),
      hp: 10000,
      maxHp: 10000,
    }));
    const r = new GameRenderer(canvas, g),
      loaded = await r.ready(),
      costs: number[] = [];
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame);
      const start = performance.now();
      g.update(1 / 60);
      r.render();
      costs.push(performance.now() - start);
    }
    costs.sort((a, b) => a - b);
    return {
      loaded,
      enemies: g.enemies.length,
      finite: g.enemies.every((e: any) => Number.isFinite(e.x + e.y)),
      averageMs: Number((costs.reduce((a, b) => a + b) / 60).toFixed(2)),
      p95Ms: Number(costs[57].toFixed(2)),
    };
  });
  expect(metrics.loaded).toBe(true);
  expect(metrics.enemies).toBeLessThanOrEqual(400);
  expect(metrics.finite).toBe(true);
  expect(metrics.averageMs).toBeLessThan(100);
  console.log("Duskwood dense scene:", JSON.stringify(metrics));
  await page.screenshot({ path: "output/screenshots/duskwood-dense.png" });
});
