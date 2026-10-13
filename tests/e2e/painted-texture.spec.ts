import { test, expect } from "@playwright/test";

test("fallback melee, bow and spell wind-ups match their accepted release without changing gameplay", async ({
  page,
}) => {
  await page.route(/\/art\/[a-z]+-motion\.webp$/, (route) => route.abort());
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts");
    const { GameRenderer } = await import("/src/renderer.ts");
    const { ZONES, SPELLS } = await import("/src/content.ts");
    const { freshSave, heroStats } = await import("/src/progression.ts");
    const result = [];
    for (const [hero, id] of [
      ["warrior", "cleave"],
      ["hunter", "shot"],
      ["mage", "frostbolt"],
    ]) {
      const g = new GameEngine({
        classId: hero,
        zone: ZONES[0],
        stats: heroStats(freshSave(), hero),
        professions: {},
        seed: 12,
      });
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:320px;height:240px";
      document.body.append(canvas);
      const r = new GameRenderer(canvas, g);
      await r.ready();
      g.config.classCombat = false;
      g.enemies = [];
      g.spells = [{ id, rank: 1, timer: 0.1, orbitTimer: 0 }];
      g.pets = [];
      g.player.resource = 100;
      const target = g.spawnEnemy(60);
      target.x = 60;
      target.y = 0;
      target.speed = 0;
      target.hp = target.maxHp = 1e6;
      let paintedFrame = -1;
      const draw = r.drawCrop.bind(r);
      r.drawCrop = (...args: any[]) => {
        if (args[0] === r.heroAtlas) paintedFrame = args[5].pose.frame;
        return draw(...args);
      };
      const snapshot = () =>
        JSON.stringify([g.time, g.player, g.spells, g.enemies, g.rng.state]);
      const before = snapshot();
      r.render();
      const windup = paintedFrame,
        readOnly = before === snapshot();
      // An enemy outside melee range must not cause a phantom sword wind-up.
      if (hero === "warrior") {
        target.x = 600;
        r.render();
      }
      const outside = hero === "warrior" ? paintedFrame : undefined;
      target.x = 60;
      r.onAction({
        actor: g.player,
        time: g.time,
        facing: 0,
        spellId: id,
        spellKind: SPELLS[id].kind,
      });
      r.render();
      result.push({ hero, windup, outside, release: paintedFrame, readOnly });
      canvas.remove();
    }
    return result;
  });
  expect(report).toEqual([
    { hero: "warrior", windup: 14, outside: -1, release: 16, readOnly: true },
    {
      hero: "hunter",
      windup: 20,
      outside: undefined,
      release: 22,
      readOnly: true,
    },
    {
      hero: "mage",
      windup: 8,
      outside: undefined,
      release: 10,
      readOnly: true,
    },
  ]);
});

test("joint interpolation reuses a texture surface, keeps opaque art opaque and leaves transparent padding", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createAnimationFrame, FRAME_SIZE } =
      await import("/src/animation-canvas.ts");
    const source = document.createElement("canvas");
    source.width = source.height = 64;
    const c = source.getContext("2d")!;
    c.fillStyle = "rgb(200,60,40)";
    c.fillRect(0, 0, 64, 64);
    const image = new Image();
    image.src = source.toDataURL();
    await image.decode();
    const crop = { x: 0, y: 0, width: 64, height: 64 };
    const target = document.createElement("canvas"),
      hashes = [],
      alpha = [];
    let reused = true,
      edges = 0;
    for (const mix of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const frame = createAnimationFrame(
        image,
        crop,
        "robe",
        10,
        2,
        "mage",
        false,
        {
          nextFrame: 11,
          mix,
          gaitNext: 3,
          gaitMix: 0.3,
          strideWeight: 1,
          restFrame: 32,
          restNext: 33,
          restMix: 0,
        },
        target,
      );
      reused &&= frame === target;
      hashes.push(frame.toDataURL());
      const pixels = frame
        .getContext("2d")!
        .getImageData(0, 0, FRAME_SIZE, FRAME_SIZE).data;
      alpha.push(
        pixels[((FRAME_SIZE / 2) * FRAME_SIZE + FRAME_SIZE / 2) * 4 + 3],
      );
      for (let i = 0; i < FRAME_SIZE; i++)
        edges +=
          +(pixels[i * 4 + 3] > 0) +
          +(pixels[((FRAME_SIZE - 1) * FRAME_SIZE + i) * 4 + 3] > 0) +
          +(pixels[i * FRAME_SIZE * 4 + 3] > 0) +
          +(pixels[(i * FRAME_SIZE + FRAME_SIZE - 1) * 4 + 3] > 0);
    }
    return { reused, unique: new Set(hashes).size, alpha, edges };
  });
  expect(result.reused).toBe(true);
  expect(result.unique).toBe(6);
  expect(result.alpha.every((a) => a >= 250)).toBe(true);
  expect(result.edges).toBe(0);
});

test("the painted fallback interpolates when an authored sheet is unavailable and pause holds the same pixels", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/art/mage-motion.webp", (route) => route.abort());
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "renderer.shake = save.settings.screenShake;";
    await route.fulfill({
      response,
      body: body
        .replace(
          marker,
          `${marker}\nwindow.__skinGame=game;window.__skinRenderer=renderer;`,
        )
        .replaceAll("requestAnimationFrame(frame);", ""),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  const result = await page.evaluate(async () => {
    const g = (window as any).__skinGame,
      r = (window as any).__skinRenderer;
    await r.ready();
    g.enemies = [];
    g.pets = [];
    g.spells = [];
    g.spawnTimer = 1e6;
    g.xpNeeded = 1e9;
    r.shake = false;
    const step = () => {
      r.beforeStep();
      g.update(1 / 60);
      r.render(1 / 60);
    };
    r.render();
    g.setInput(1, 0);
    for (let i = 0; i < 12; i++) step();
    const surface = r.liveSkins.get(g.player).image;
    r.beforeStep();
    g.update(1 / 60);
    const images = [];
    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
      r.render(1 / 240, alpha);
      images.push(r.liveSkins.get(g.player).image.toDataURL());
    }
    r.onAction({
      actor: g.player,
      time: g.time,
      facing: 0,
      spellId: "frostbolt",
      spellKind: "projectile",
    });
    r.render();
    const release = r.characterPose(g.player).frame;
    for (let i = 0; i < 5; i++) step();
    const walkingCast = r.characterPose(g.player);
    const reused = r.liveSkins.get(g.player).image === surface;
    g.paused = true;
    r.render();
    const before = r.canvas.toDataURL();
    const state = JSON.stringify([g.player, g.rng.state, g.time]);
    for (let i = 0; i < 20; i++) r.render(1 / 120, 0.5);
    return {
      unique: new Set(images).size,
      reused,
      release,
      gait: walkingCast.gaitFrame,
      frozen: before === r.canvas.toDataURL(),
      readOnly: state === JSON.stringify([g.player, g.rng.state, g.time]),
    };
  });
  expect(result.unique).toBe(5);
  expect(result.reused).toBe(true);
  expect(result.release).toBe(10);
  expect(result.gait).toBeGreaterThanOrEqual(0);
  expect(result.frozen).toBe(true);
  expect(result.readOnly).toBe(true);
  expect(errors).toEqual([]);
});
