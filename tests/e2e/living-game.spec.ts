import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

async function setup(page: Page, manual = true) {
  const save = freshSave();
  save.selectedClass = "mage";
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    let routed = body.replace(
      marker,
      `${marker}\nwindow.__livingGame=game;window.__livingRenderer=renderer;`,
    );
    if (manual) routed = routed.replaceAll("requestAnimationFrame(frame);", "");
    await route.fulfill({ response, body: routed });
  });
  if (!manual)
    await page.clock.install({ time: new Date("2026-10-09T00:00:00Z") });
  await page.goto("/");
  if (!manual) await page.clock.pauseAt(new Date("2026-10-09T00:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__livingGame,
      r = (window as any).__livingRenderer;
    await r.ready();
    g.enemies = [];
    g.spells = [];
    g.pets = [];
    g.spawnTimer = 1e6;
    g.xpNeeded = 1e9;
    r.render();
  });
}

test("120 Hz display frames interpolate fixed-step actors and the camera without changing combat state", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__livingGame,
      r = (window as any).__livingRenderer;
    const start = g.player.x;
    g.setInput(1, 0);
    r.beforeStep();
    g.update(1 / 60);
    const snapshot = () =>
      JSON.stringify({ player: g.player, rng: g.rng.state, time: g.time });
    const before = snapshot(),
      points = [],
      cameras = [],
      phases = [],
      images = [];
    for (const alpha of [0, 0.5, 1]) {
      r.render(1 / 120, alpha);
      points.push(r.present(g.player).x);
      cameras.push(r.viewCenter.x);
      phases.push(r.animator.actors.get(g.player).phase);
      images.push(r.canvas.toDataURL());
    }
    return {
      start,
      end: g.player.x,
      points,
      cameras,
      phases,
      readOnly: before === snapshot(),
      imagesDiffer: new Set(images).size === 3,
    };
  });
  expect(result.end).toBeGreaterThan(result.start);
  expect(result.points[0]).toBeCloseTo(result.start);
  expect(result.points[1]).toBeCloseTo((result.start + result.end) / 2);
  expect(result.points[2]).toBeCloseTo(result.end);
  expect(result.cameras[2]).toBeGreaterThan(result.cameras[0]);
  expect(result.phases[1]).toBeGreaterThan(result.phases[0]);
  expect(result.phases[2]).toBeGreaterThan(result.phases[1]);
  expect(result.readOnly).toBe(true);
  expect(result.imagesDiffer).toBe(true);
});

test("moving casts keep the upper-body release while feet continue stepping in real painted hero frames", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { createAnimationFrame, heroCrop } =
      await import("/src/animation-canvas.ts");
    const { combatFrame } = await import("/src/combat-animation.ts");
    const g = (window as any).__livingGame,
      r = (window as any).__livingRenderer;
    const crop = heroCrop(
      g.classDef.portrait,
      r.heroAtlas.naturalWidth,
      r.heroAtlas.naturalHeight,
    );
    const a = createAnimationFrame(
      r.heroAtlas,
      crop,
      "biped",
      combatFrame("cast", 2),
      1,
    );
    const b = createAnimationFrame(
      r.heroAtlas,
      crop,
      "biped",
      combatFrame("cast", 2),
      5,
    );
    const aa = a.getContext("2d")!.getImageData(0, 0, a.width, a.height).data;
    const bb = b.getContext("2d")!.getImageData(0, 0, b.width, b.height).data;
    let upper = 0,
      lower = 0;
    for (let i = 0; i < aa.length; i += 4) {
      if (
        aa[i] !== bb[i] ||
        aa[i + 1] !== bb[i + 1] ||
        aa[i + 2] !== bb[i + 2] ||
        aa[i + 3] !== bb[i + 3]
      ) {
        if (Math.floor(i / 4 / a.width) < 54) upper++;
        else lower++;
      }
    }
    return { upper, lower };
  });
  expect(result.upper).toBe(0);
  expect(result.lower).toBeGreaterThan(100);
});

test("painted spell atlases have transparent gutters, animate all three schools and preserve Canvas state", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { prepareSpellTextures, drawSpellTexture } =
      await import("/src/spell-textures.ts");
    const loaded = await prepareSpellTextures();
    const c = document.createElement("canvas").getContext("2d")!;
    c.canvas.width = c.canvas.height = 256;
    const images: string[] = [];
    let animated = 0,
      transparent = 0,
      restored = 0;
    for (const school of ["fire", "frost", "arcane"]) {
      const draw = (p: number) => {
        c.reset();
        c.translate(128, 128);
        c.globalAlpha = 0.7;
        c.globalCompositeOperation = "source-over";
        if (!drawSpellTexture(c, school, p, 80, 0.8))
          throw new Error("Missing painted effect");
        if (
          c.globalAlpha === 0.7 &&
          c.getTransform().e === 128 &&
          c.globalCompositeOperation === "source-over"
        )
          restored++;
        return c.canvas.toDataURL();
      };
      const first = draw(0.3),
        next = draw(0.32);
      images.push(first);
      if (first !== next) animated++;
      const pixels = c.getImageData(0, 0, 256, 256).data;
      if (
        pixels[3] === 0 &&
        pixels[(255 * 256 + 255) * 4 + 3] === 0 &&
        pixels[(128 * 256 + 128) * 4 + 3] > 0
      )
        transparent++;
    }
    return {
      loaded,
      distinct: new Set(images).size,
      animated,
      transparent,
      restored,
    };
  });
  expect(result).toEqual({
    loaded: true,
    distinct: 3,
    animated: 3,
    transparent: 3,
    restored: 6,
  });
});

test("production keyboard movement leaves dust and pause holds every rendered pixel, including cooldown anticipation", async ({
  page,
}) => {
  await setup(page, false);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.keyboard.down("d");
  await page.clock.runFor(500);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(
      () => (window as any).__livingRenderer.footfalls.prints.length,
    ),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    const g = (window as any).__livingGame,
      r = (window as any).__livingRenderer;
    const enemy = g.spawnEnemy(0);
    enemy.x = g.player.x + 120;
    enemy.y = g.player.y;
    enemy.speed = 0;
    enemy.attackTimer = 999;
    enemy.hp = enemy.maxHp = 1e6;
    g.spells = [{ id: "frostbolt", rank: 1, timer: 0.13, orbitTimer: 0 }];
    g.player.resource = 100;
    r.render(1 / 60, 0.5);
  });
  await page.keyboard.press("Escape");
  const before = await page
    .locator("#game-canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.clock.runFor(1000);
  expect(
    await page
      .locator("#game-canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(before);
  expect(errors).toEqual([]);
});

test("wind, smoke and area volumes stay still with motion disabled and restore their drawing state", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { drawWorldAtmosphere, drawAreaAtmosphere, drawCampfireLife } =
      await import("/src/living-world.ts");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 360;
    const c = canvas.getContext("2d")!;
    const draw = (time: number, motion: boolean) => {
      c.reset();
      c.translate(180, 180);
      c.globalAlpha = 0.75;
      drawWorldAtmosphere(
        c,
        { x: 0, y: 0 },
        360,
        360,
        "elwynn",
        time,
        motion,
        true,
        false,
      );
      drawCampfireLife(c, time, motion, true);
      drawAreaAtmosphere(
        c,
        {
          x: 0,
          y: 0,
          spellId: "blizzard",
          radius: 100,
          color: "#7cddfa",
          life: 2,
          maxLife: 3,
        },
        time,
        motion,
        true,
      );
      if (c.globalAlpha !== 0.75 || c.getTransform().e !== 180)
        throw new Error("Leaked world Canvas state");
      return canvas.toDataURL();
    };
    return {
      moving: draw(1.1, true) !== draw(1.5, true),
      held: draw(1.1, false) === draw(1.5, false),
    };
  });
  expect(result).toEqual({ moving: true, held: true });
});

test("airborne area spells animate distinct schools, intensify at evolution and respect graphics settings without changing combat", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { drawAreaRain } = await import("/src/living-world.ts");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 360;
    const c = canvas.getContext("2d")!;
    const schools = [
      "blizzard",
      "flamestrike",
      "arcane",
      "consecration",
      "chainlightning",
      "volley",
    ];
    const images: string[] = [];
    let animated = 0,
      evolved = 0,
      held = 0,
      restored = 0,
      readOnly = 0;
    for (const spellId of schools) {
      const area = {
        x: 0,
        y: 0,
        spellId,
        spellRank: 4,
        radius: 100,
        color: "#c8c8ff",
        life: 2,
        maxLife: 3,
      };
      const draw = (time: number, motion = true, particles = true) => {
        c.reset();
        c.translate(180, 180);
        c.globalAlpha = 0.75;
        c.lineCap = "butt";
        const before = JSON.stringify(area);
        drawAreaRain(c, area, time, motion, particles);
        if (JSON.stringify(area) === before) readOnly++;
        if (
          c.globalAlpha === 0.75 &&
          c.getTransform().e === 180 &&
          c.lineCap === "butt"
        )
          restored++;
        return canvas.toDataURL();
      };
      const base = draw(1.1);
      images.push(base);
      if (base !== draw(1.5)) animated++;
      area.spellRank = 5;
      if (base !== draw(1.1)) evolved++;
      if (draw(1.1, false) === draw(1.5, false)) held++;
      draw(1.1, true, false);
      if (
        c
          .getImageData(0, 0, 360, 360)
          .data.some((value, i) => i % 4 === 3 && value)
      )
        throw new Error("Particles disabled still draws area rain");
    }
    return {
      distinct: new Set(images).size,
      animated,
      evolved,
      held,
      restored,
      readOnly,
    };
  });
  expect(result).toEqual({
    distinct: 6,
    animated: 6,
    evolved: 6,
    held: 6,
    restored: 36,
    readOnly: 36,
  });
});

test("crowded damage, criticals and healing have separate glyph bounds in normal and large text", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CombatLabels } = await import("/src/combat-text.ts");
    const labels = new CombatLabels();
    const texts = Array.from({ length: 12 }, (_, i) => ({
      x: (i % 3) * 8,
      y: (i % 2) * 5,
      value: i % 3 === 0 ? "999!" : i % 3 === 1 ? "250" : "HEAL",
      color: i % 3 === 2 ? "#8f8" : "#ff8",
      life: 0.6,
    }));
    const before = JSON.stringify(texts);
    labels.observe(texts, 1);
    const canvas = document.createElement("canvas");
    const c = canvas.getContext("2d")!;
    const boxes: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[] = [];
    const originalFill = c.fillText.bind(c);
    c.fillText = (text, x, y) => {
      const m = c.getTransform(),
        width = c.measureText(text).width * m.a,
        height = parseFloat(c.font.replace(/^\d+\s/, "")) * m.d;
      boxes.push({
        left: m.e - width / 2,
        right: m.e + width / 2,
        top: m.f - height / 2,
        bottom: m.f + height / 2,
      });
      originalFill(text, x, y);
    };
    let overlaps = 0;
    for (const large of [false, true]) {
      boxes.length = 0;
      labels.draw(c, 1.1, true, large);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          )
            overlaps++;
        }
    }
    return {
      overlaps,
      count: boxes.length,
      readOnly: JSON.stringify(texts) === before,
    };
  });
  expect(result.overlaps).toBe(0);
  expect(result.count).toBeGreaterThan(4);
  expect(result.readOnly).toBe(true);
});

test("paused cast preparation is a snapshot even when upgrades reset the original spell cooldown", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CastChoreography } = await import("/src/battle-presentation.ts");
    const casting = new CastChoreography(),
      actor = {};
    const spell = { id: "frostbolt", rank: 1, timer: 0.08, orbitTimer: 0 };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d")!;
    const draw = (held: boolean) => {
      c.reset();
      c.translate(64, 64);
      casting.draw(c, actor, [spell], 1, true, true, !held, held);
      return canvas.toDataURL();
    };
    const before = draw(false);
    spell.timer = 4;
    spell.rank = 5;
    const state = JSON.stringify(spell),
      after = draw(true);
    return {
      held: before === after,
      readOnly: state === JSON.stringify(spell),
    };
  });
  expect(result).toEqual({ held: true, readOnly: true });
});
