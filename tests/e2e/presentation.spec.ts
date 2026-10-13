import { test, expect } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
test.use({ hasTouch: true });

test("spell visuals animate, retain distinct identities, respect motion/particle settings, and restore Canvas state", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { SPELLS } = await import("/src/content.ts");
    const {
      drawSpellProjectile,
      drawSpellArea,
      drawSpellEffect,
      drawSpellOrbit,
    } = await import("/src/spell-visuals.ts");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 360;
    const c = canvas.getContext("2d")!;
    const image = (draw: () => void) => {
      c.reset();
      c.translate(180, 180);
      c.globalAlpha = 0.8;
      c.lineWidth = 1.75;
      c.lineCap = "square";
      draw();
      const transform = c.getTransform();
      if (
        c.globalAlpha !== 0.8 ||
        c.lineWidth !== 1.75 ||
        c.lineCap !== "square" ||
        transform.e !== 180 ||
        transform.f !== 180 ||
        transform.a !== 1 ||
        transform.d !== 1
      )
        throw new Error("Spell drawing leaked Canvas state");
      return canvas.toDataURL();
    };
    const snapshots: string[] = [];
    let animated = 0,
      frozen = 0,
      visibleWithoutParticles = 0;
    for (const id of [
      "frostbolt",
      "fireball",
      "lightning",
      "shadowbolt",
      "wrath",
      "smite",
      "hammer",
    ]) {
      const shot = {
        x: 0,
        y: 0,
        spellId: id,
        vx: 420,
        vy: 0,
        radius: 5,
        color: SPELLS[id].color,
      };
      const draw = (t: number, motion: boolean, particles = true) =>
        image(() => drawSpellProjectile(c, shot, t, motion, particles));
      const first = draw(1.1, true);
      snapshots.push(first);
      if (first !== draw(1.3, true)) animated++;
      if (draw(1.1, false) === draw(1.3, false)) frozen++;
      if (draw(1.1, true, false) !== image(() => {})) visibleWithoutParticles++;
    }
    let groundAnimated = 0,
      groundFrozen = 0;
    for (const id of [
      "blizzard",
      "flamestrike",
      "consecration",
      "pain",
      "corruption",
      "hurricane",
      "moonfire",
      "volley",
    ]) {
      const area = {
        x: 0,
        y: 0,
        spellId: id,
        radius: 120,
        color: SPELLS[id].color,
        life: 2,
        maxLife: 3,
      };
      const draw = (t: number, motion: boolean) =>
        image(() => drawSpellArea(c, area, t, motion, true));
      if (draw(1.1, true) !== draw(1.3, true)) groundAnimated++;
      if (draw(1.1, false) === draw(1.3, false)) groundFrozen++;
    }
    // Exercise every learned spell with both particle settings, including large AoEs and chains.
    for (const spell of Object.values(SPELLS))
      for (const particles of [true, false]) {
        const base = {
          x: 0,
          y: 0,
          spellId: spell.id,
          color: spell.color,
          radius: 90,
          life: 0.3,
          maxLife: 0.55,
          facing: 0.5,
        };
        for (const kind of ["ring", "burst", "line"] as const)
          image(() =>
            drawSpellEffect(
              c,
              { ...base, kind, end: { x: 80, y: 40 } },
              true,
              particles,
            ),
          );
        image(() =>
          drawSpellOrbit(
            c,
            "flurry",
            { x: 70, y: 0 },
            { x: 0, y: 0 },
            1.1,
            true,
            particles,
          ),
        );
        image(() =>
          drawSpellOrbit(
            c,
            "thorns",
            { x: 70, y: 0 },
            { x: 0, y: 0 },
            1.1,
            true,
            particles,
          ),
        );
      }
    return {
      distinct: new Set(snapshots).size,
      animated,
      frozen,
      visibleWithoutParticles,
      groundAnimated,
      groundFrozen,
    };
  });
  expect(result).toEqual({
    distinct: 7,
    animated: 7,
    frozen: 7,
    visibleWithoutParticles: 7,
    groundAnimated: 8,
    groundFrozen: 8,
  });
});

test("fantasy menus and action dock fit small screens without nested combat scrollbars", async ({
  page,
}) => {
  const save = freshSave();
  save.settings.largeText = true;
  save.settings.sound = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.goto("/");
  for (const width of [320, 360, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    for (const box of await page
      .locator(".nav-link, .class-card")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      )) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
  }
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  for (const width of [320, 360, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    for (const box of await page
      .locator(".game-actions > button, .run-spell")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      )) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(900);
    }
    expect(
      await page
        .locator(".combat-briefing")
        .evaluate((node) =>
          /auto|scroll/.test(getComputedStyle(node).overflowY),
        ),
    ).toBe(false);
    const dock = (await page.locator(".game-bottom").boundingBox())!;
    for (const control of await page
      .locator(".touch-controls > *")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      )) {
      expect(
        control.bottom <= dock.y ||
          control.top >= dock.y + dock.height ||
          control.right <= dock.x ||
          control.left >= dock.x + dock.width,
        `touch control overlaps dock at width ${width}: ${JSON.stringify({ control, dock })}`,
      ).toBe(true);
    }
  }
});

test("real casts emit spell-specific releases and impacts without altering paused gameplay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__presentationGame=game;window.__presentationRenderer=renderer;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-09T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-09T00:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__presentationGame;
    await (window as any).__presentationRenderer.ready();
    g.enemies = [];
    g.spawnTimer = 1e6;
    g.player.hp = g.player.maxHp = 10000;
    g.xpNeeded = 1e9;
    g.spells = [{ id: "frostbolt", rank: 1, timer: 0 }];
    const enemy = g.spawnEnemy(0, false, 0, false, "wolf");
    enemy.x = g.player.x + 110;
    enemy.y = g.player.y;
    enemy.hp = enemy.maxHp = 10000;
    enemy.speed = 0;
  });
  await page.clock.runFor(280);
  const observed = await page.evaluate(() => {
    const g = (window as any).__presentationGame;
    return {
      release: g.effects.some(
        (fx: any) => fx.spellId === "frostbolt" && fx.motif === "cast",
      ),
      impact: g.effects.some(
        (fx: any) => fx.spellId === "frostbolt" && fx.kind === "burst",
      ),
      count: g.effects.length,
    };
  });
  expect(observed.release).toBe(true);
  expect(observed.impact).toBe(true);
  expect(observed.count).toBeLessThanOrEqual(100);
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).__presentationGame.effects),
  );
  await page.clock.runFor(1000);
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__presentationGame.effects),
    ),
  ).toBe(before);
  expect(errors).toEqual([]);
});
