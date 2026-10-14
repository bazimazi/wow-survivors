import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import { mkdir } from "node:fs/promises";

async function setup(page: Page, partner = false) {
  const save = freshSave();
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body
        .replace(
          marker,
          `${marker}\nwindow.__huntGame=game;window.__huntRenderer=renderer;window.__huntHud=updateHud;`,
        )
        .replaceAll("requestAnimationFrame(frame);", ""),
    });
  });
  await page.goto("/");
  if (partner) await page.locator("#coop-hero").selectOption("warrior");
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__huntGame,
      r = (window as any).__huntRenderer;
    await r.ready();
    g.enemies = [];
    g.spells = [];
    g.pets = [];
    g.nodes = [];
    g.landmarks = [];
    g.spawnTimer = 1e9;
    g.xpNeeded = 1e9;
    g.player.invulnerable = 1000;
    g.directorWave = 1;
    g.time = 40;
    g.update(1 / 60);
    r.render();
    (window as any).__huntHud();
  });
}

test("a browser player can find, awaken, expose and defeat a champion, with readable phone HUD", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(page.locator("#field-hunt-hud")).toBeVisible();
  await expect(page.locator("#hunt-begin")).toBeDisabled();
  await expect(page.locator("#hunt-tactic")).toContainText("Violet marker");
  await mkdir("output/living-combat", { recursive: true });
  await page.screenshot({
    path: "output/living-combat/hunt-offer.png",
    animations: "disabled",
  });
  await page.evaluate(() => {
    const g = (window as any).__huntGame;
    g.player.x = g.hunt.x;
    g.player.y = g.hunt.y;
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
  });
  await page
    .getByRole("button", { name: "F Awaken champion", exact: true })
    .click();
  await page.evaluate(() => {
    const g = (window as any).__huntGame,
      e = g.enemies.find((e: any) => e.id === g.hunt.enemyId);
    e.x = g.player.x + 90;
    e.y = g.player.y;
    e.speed = 0;
    e.damage = 0;
    e.hp = e.maxHp = 1000;
    g.battleArt.aim = { x: e.x, y: e.y };
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
  });
  await expect(page.locator("#hunt-tactic")).toContainText("Fully charge");
  await page.keyboard.down("v");
  await page.evaluate(() => {
    const g = (window as any).__huntGame;
    for (let i = 0; i < 44; i++) g.update(1 / 60);
    (window as any).__huntRenderer.render();
  });
  await page.keyboard.up("v");
  await page.evaluate(() => {
    const g = (window as any).__huntGame;
    for (let i = 0; i < 12; i++) g.update(1 / 60);
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
  });
  await expect(page.locator("#hunt-tactic")).toContainText("WARD BROKEN");
  await page.screenshot({
    path: "output/living-combat/hunt-exposed.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
  });
  const box = (await page.locator("#field-hunt-hud").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThan(620);
  await page.screenshot({
    path: "output/living-combat/hunt-phone.png",
    animations: "disabled",
  });
  await page.evaluate(() => {
    const g = (window as any).__huntGame,
      e = g.enemies.find((e: any) => e.id === g.hunt.enemyId);
    g.damageEnemy(e, 10000, "frostbolt", false);
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
  });
  await expect(page.locator("#hunt-timer")).toHaveText("COMPLETE");
  await page
    .getByRole("button", { name: "Pause expedition", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(page.locator(".hunt-result")).toContainText(
    "1 Field Hunt completed",
  );
  expect(errors).toEqual([]);
});

test("hero motion changes between subframes, keeps one reusable surface, and freezes cleanly", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { prepareHeroMotion, drawHeroMotion } =
      await import("/src/hero-motion.ts");
    await prepareHeroMotion("warrior");
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 140;
    const c = canvas.getContext("2d")!,
      owner = {};
    const surfaces = new Set();
    const draw = c.drawImage.bind(c);
    c.drawImage = ((...args: any[]) => {
      if (args[0]?.dataset?.heroMotion) surfaces.add(args[0]);
      return (draw as any)(...args);
    }) as any;
    const sample = (
      phase: number,
      time: number,
      frozen = false,
      enabled = true,
    ) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 160, 140);
      c.translate(80, 110);
      drawHeroMotion(
        c,
        "warrior",
        { frame: 0, phase, mirror: false, strideWeight: 1 },
        time,
        0,
        -1,
        false,
        { owner, frozen, enabled },
      );
      return canvas.toDataURL();
    };
    const a = sample(0.05, 1),
      b = sample(0.06, 1.01),
      bRepeat = sample(0.06, 1.01, true);
    const surfacesUsed = surfaces.size;
    const disabledA = sample(0.05, 0, false, false),
      disabledB = sample(0.05, 0, false, false);
    return {
      continuous: a !== b,
      paused: b === bRepeat,
      surfacesUsed,
      disabled: disabledA === disabledB,
    };
  });
  expect(result).toEqual({
    continuous: true,
    paused: true,
    surfacesUsed: 1,
    disabled: true,
  });
});

test("local co-op gives each hero one hunt recovery when P2 lands the finishing attack", async ({
  page,
}) => {
  await setup(page, true);
  const result = await page.evaluate(() => {
    const g = (window as any).__huntGame;
    g.player.x = g.hunt.x;
    g.player.y = g.hunt.y;
    if (!g.interact()) throw new Error("hunt did not awaken");
    const enemy = g.enemies.find((e: any) => e.id === g.hunt.enemyId);
    const p1 = g.player,
      p2 = g.partner.player;
    p1.hp = p1.maxHp * 0.5;
    p2.hp = p2.maxHp * 0.5;
    p1.activeCooldown = p2.activeCooldown = 10;
    g.damageEnemy(enemy, 100000, "cleave", false);
    (window as any).__huntRenderer.render();
    (window as any).__huntHud();
    return {
      p1: p1.hp / p1.maxHp,
      p2: p2.hp / p2.maxHp,
      ready: p1.activeCooldown === 0 && p2.activeCooldown === 0,
      hunts: g.hunt.completed,
    };
  });
  expect(result.p1).toBeCloseTo(0.65);
  expect(result.p2).toBeCloseTo(0.65);
  expect(result.ready).toBe(true);
  expect(result.hunts).toBe(1);
  await expect(page.locator("#hunt-timer")).toHaveText("COMPLETE");
});
