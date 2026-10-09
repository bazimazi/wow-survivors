import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CLASSES } from "../../src/content";
import type { ClassId } from "../../src/content";
import { CLASS_KITS } from "../../src/class-combat";
import { freshSave, SAVE_KEY } from "../../src/progression";
import { mkdir } from "node:fs/promises";

test.use({ hasTouch: true });
async function setup(page: Page, id: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = id;
  s.settings.sound = false;
  s.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__classGame=game;window.__classRenderer=renderer;game.enemies=[];game.spells=[];game.pets=[];game.spawnTimer=1e6;game.xpNeeded=1e9;game.player.hp=game.player.maxHp=2000;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-09T10:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-09T10:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    await (window as any).__classRenderer.ready();
  });
  await page.clock.runFor(30);
}
const state = (page: Page) =>
  page.evaluate(() => {
    const g = (window as any).__classGame;
    return {
      x: g.player.x,
      y: g.player.y,
      dash: g.player.dashCooldown,
      active: g.player.activeCooldown,
      form: g.player.kit.form,
      time: g.time,
      effects: g.effects.length,
    };
  });
test("Space really dashes while idle; C is the signature key; holding Space cannot bypass cooldown or pause", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator("#active-button kbd")).toHaveText("C");
  await expect(
    page.locator('.game-actions [data-action="dash"] kbd'),
  ).toHaveText("SPACE");
  await page.keyboard.press("Space");
  const blink = await state(page);
  expect(blink.x).toBe(190);
  expect(blink.dash).toBeGreaterThan(3);
  expect(blink.active).toBe(0);
  await page.keyboard.down("Space");
  await page.clock.runFor(300);
  await page.keyboard.up("Space");
  expect((await state(page)).x).toBe(190);
  await page.keyboard.press("c");
  expect((await state(page)).active).toBeGreaterThan(3);
  await expect(page.locator("#class-kit-status")).toContainText("Focus");
  await page.keyboard.press("Escape");
  const paused = await state(page);
  await page.keyboard.press("Space");
  await page.clock.runFor(500);
  expect(await state(page)).toEqual(paused);
});
test("Phone has a dedicated usable dash and signature button, visible mechanics, and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, "druid");
  await page
    .getByRole("button", { name: "Dash with Space", exact: true })
    .click();
  await page.clock.runFor(150);
  expect((await state(page)).x).toBeGreaterThan(70);
  await page
    .getByRole("button", { name: "Class ability", exact: true })
    .click();
  await page.clock.runFor(100);
  expect((await state(page)).form).toBe("cat");
  await expect(page.locator("#class-kit-status")).toContainText("CAT");
  await page.locator(".class-kit-hud summary").click();
  await expect(page.locator(".class-kit-hud p")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const boxes = await page
    .locator(".touch-controls > button")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      }),
    );
  expect(boxes).toHaveLength(2);
  for (const b of boxes) {
    expect(b.w).toBeGreaterThanOrEqual(44);
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.x + b.w).toBeLessThanOrEqual(390);
  }
  const hud = (await page.locator(".class-kit-hud").boundingBox())!,
    pad = (await page.locator("#touch-pad").boundingBox())!;
  expect(hud.y + hud.height).toBeLessThan(pad.y);
  await mkdir("output/screenshots", { recursive: true });
  await page.screenshot({ path: "output/screenshots/classes-phone-cat.png" });
});
for (const hero of CLASSES)
  test(`${hero.name}: distinct kit, accepted signature and authored graphics render without errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await setup(page, hero.id);
    await page.evaluate(() => {
      const g = (window as any).__classGame;
      for (let i = 0; i < 8; i++) {
        const e = g.spawnEnemy(
          g.classDef.id === "rogue" ? 140 : 180,
          false,
          (i * Math.PI) / 4,
        );
        e.speed = 0;
        e.damage = 0;
        e.hp = e.maxHp = 5000;
      }
      g.grid.rebuild(g.enemies);
      g.player.resource = 100;
      g.player.kit.focus = 3;
      g.player.kit.points = g.classDef.id === "paladin" ? 3 : 5;
      g.player.kit.target = g.enemies[0].id;
      if (g.classDef.id === "warlock")
        for (const e of g.enemies) g.player.kit.curses.set(e.id, g.time + 8);
    });
    await page.keyboard.press("c");
    await page.clock.runFor(120);
    expect((await state(page)).active).toBeGreaterThan(0);
    await expect(page.locator(".class-kit-hud summary")).toContainText(
      CLASS_KITS[hero.id].title,
    );
    expect(
      await page.evaluate(() => {
        const g = (window as any).__classGame;
        return g.effects.some(
          (fx: any) => fx.kind === "class" && fx.classId === g.classDef.id,
        );
      }),
    ).toBe(true);
    await mkdir("output/screenshots", { recursive: true });
    await page.screenshot({ path: `output/screenshots/class-${hero.id}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.runFor(100);
    expect(
      await page.evaluate(() => (window as any).__classRenderer.motionEnabled),
    ).toBe(false);
    await page.keyboard.press("Space");
    await page.clock.runFor(100);
    expect((await state(page)).dash).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
test("Shaman totems remain distinct with particles disabled", async ({
  page,
}) => {
  await setup(page, "shaman");
  await page.evaluate(() => {
    (window as any).__classRenderer.particles = false;
  });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("c");
    await page.clock.runFor(2100);
  }
  expect(
    await page.evaluate(() =>
      (window as any).__classGame.player.kit.anchors.map((a: any) => a.kind),
    ),
  ).toEqual(["earth", "fire", "storm"]);
  await page.screenshot({ path: "output/screenshots/class-shaman-totems.png" });
});

test("Druid artwork and resource HUD switch between Moonkin, Cat and Bear", async ({
  page,
}) => {
  await setup(page, "druid");
  await mkdir("output/screenshots", { recursive: true });
  await expect(page.locator("#resource-text")).toContainText("Mana");
  expect(
    await page.evaluate(
      () => (window as any).__classRenderer.formAtlas.naturalWidth,
    ),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: "output/screenshots/druid-moonkin.png" });
  await page.keyboard.press("c");
  await page.clock.runFor(1300);
  await expect(page.locator("#resource-text")).toContainText("Energy");
  await page.screenshot({ path: "output/screenshots/druid-cat.png" });
  await page.keyboard.press("c");
  await page.clock.runFor(1300);
  await expect(page.locator("#resource-text")).toContainText("Rage");
  await page.screenshot({ path: "output/screenshots/druid-bear.png" });
  await page.keyboard.press("c");
  await page.clock.runFor(100);
  await expect(page.locator("#resource-text")).toContainText("Mana");
});

test("Rogue real auto attacks keep one victim and keyboard Eviscerate follows its combo mark", async ({
  page,
}) => {
  await setup(page, "rogue");
  await expect(page.locator("#active-button")).toBeDisabled();
  await page.evaluate(() => {
    const g = (window as any).__classGame;
    g.stats.crit = 0;
    for (const x of [90, 40]) {
      const e = g.spawnEnemy(200, false, 0);
      e.x = x;
      e.y = 0;
      e.hp = e.maxHp = 5000;
      e.speed = 0;
      e.damage = 0;
    }
    g.spells = [{ id: "sinister", rank: 1, timer: 0.01, orbitTimer: 0 }];
  });
  await page.clock.runFor(150);
  const initial = await page.evaluate(() => {
    const g = (window as any).__classGame;
    return {
      target: g.player.kit.target,
      enemy: g.enemies.map((e: any) => ({ id: e.id, hp: e.hp })),
    };
  });
  expect(initial.target).toBe(initial.enemy[1].id);
  expect(initial.enemy[0].hp).toBe(5000);
  expect(initial.enemy[1].hp).toBeLessThan(5000);
  await expect(page.locator("#active-button")).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__classGame.enemies[0].x = 20;
  });
  await page.clock.runFor(650);
  const before = await page.evaluate(() =>
    (window as any).__classGame.enemies.map((e: any) => e.hp),
  );
  await page.keyboard.press("c");
  const after = await page.evaluate(() => {
    const g = (window as any).__classGame;
    return {
      hp: g.enemies.map((e: any) => e.hp),
      points: g.player.kit.points,
      cooldown: g.player.activeCooldown,
    };
  });
  expect(before[0]).toBe(5000);
  expect(after.hp[0]).toBe(5000);
  expect(after.hp[1]).toBeLessThan(before[1]);
  expect(after.points).toBe(0);
  expect(after.cooldown).toBeGreaterThan(0);
});
