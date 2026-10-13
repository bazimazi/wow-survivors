import { test, expect } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

test("departure keeps launch and all nine heroes visible on desktop and usable on phone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".class-card")).toHaveCount(9);
    await expect
      .poll(() =>
        page.locator("#camp-hero-canvas").evaluate((c) => {
          const el = c as HTMLCanvasElement;
          if (el.width < 1 || el.height < 1) return false;
          const d = el
            .getContext("2d")!
            .getImageData(0, 0, el.width, el.height).data;
          return d.some((v, i) => i % 4 !== 3 && v > 80);
        }),
      )
      .toBe(true);
    const launch = page.getByRole("button", {
      name: "Begin Expedition",
      exact: true,
    });
    await launch.scrollIntoViewIfNeeded();
    await expect(launch).toBeInViewport();
    if (viewport.width > 600) {
      await expect(page.locator(".class-card").first()).toBeInViewport();
      await expect(page.locator(".class-card").last()).toBeInViewport();
      const top = (await page.locator(".departure-mission").boundingBox())!.y;
      expect(top).toBeGreaterThanOrEqual(65);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    await page
      .getByRole("button", { name: "Warrior Steel & fury", exact: true })
      .click();
    await expect(page.locator(".hero-art-name h2")).toHaveText("Warrior");
    await page
      .getByRole("button", { name: "Mage Frost & arcana", exact: true })
      .click();
    await expect(page.locator(".hero-art-name h2")).toHaveText("Mage");
  }
  expect(errors).toEqual([]);
});

test("camp services navigate, preparation updates live and the oath survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Camp services" }).click();
  await expect(
    page.getByRole("heading", { name: "Around the campfire" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Armory Equip, repair and enchant" })
    .click();
  await expect(page.locator(".main-content")).toHaveAttribute(
    "data-page",
    "armory",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.getByRole("button", { name: "Difficulty & build" }).click();
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await expect(
    page.locator('[data-action="difficulty"][data-id="explorer"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-action="oath"][data-id="vanguard"]').click();
  await expect(
    page.locator('[data-action="oath"][data-id="vanguard"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.adventure.difficulty).toBe("explorer");
  expect(saved.adventure.oath).toBe("vanguard");
});

test("the battlefield renders painted terrain, warns of real hordes and freezes when paused", async ({
  page,
}) => {
  const save = freshSave();
  save.settings.sound = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    await route.fulfill({
      response,
      body: body.replace(
        "renderer.shake = save.settings.screenShake;",
        "renderer.shake = save.settings.screenShake;window.__citadelGame=game;window.__citadelRenderer=renderer;",
      ),
    });
  });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__citadelGame;
    await (window as any).__citadelRenderer.ready();
    g.spells = [];
    g.enemies = [];
    g.pets = [];
    g.spawnTimer = 1e9;
    g.xpNeeded = 1e9;
    g.time = 15.9;
  });
  await page.clock.runFor(250);
  await expect(page.locator("#battle-announcement")).toContainText(
    "Hold your ground",
  );
  await expect(page.locator("#director-next")).toContainText("EAST");
  await page.clock.runFor(4100);
  expect(
    await page.evaluate(() => (window as any).__citadelGame.enemies.length),
  ).toBe(11);
  await page.keyboard.press("Space");
  await page.clock.runFor(120);
  await expect(page.locator('.game-actions [data-action="dash"]')).toHaveClass(
    /dash-unavailable/,
  );
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() => (window as any).__citadelGame.time);
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => (window as any).__citadelGame.time)).toBe(
    before,
  );
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
});
