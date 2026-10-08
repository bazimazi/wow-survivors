import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { ClassId } from "../../src/types";

test.use({ hasTouch: true });
async function setup(
  page: Page,
  zone = "elwynn",
  classId: ClassId = "warrior",
  manual = true,
) {
  const save = freshSave();
  save.selectedClass = classId;
  save.selectedZone = zone;
  save.clearedZones = ["westfall", "tirisfal", "ragefire", "shadowfang"];
  save.heroes[classId].level = 20;
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.nodes=[];this.landmarks=[];this.pickups=[];this.spawnTimer=1e6;this.xpNeeded=1e9;this.player.hp=this.player.maxHp=10000;`,
      ),
    });
  });
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    let routed = body.replace(
      marker,
      `${marker}\nwindow.__deathGame=game;window.__deathRenderer=renderer;window.__deathHud=updateHud;`,
    );
    if (manual) routed = routed.replaceAll("requestAnimationFrame(frame);", "");
    await route.fulfill({ response, body: routed });
  });
  if (!manual)
    await page.clock.install({ time: new Date("2026-10-06T00:00:00Z") });
  await page.goto("/");
  if (!manual) await page.clock.pauseAt(new Date("2026-10-06T00:00:01Z"));
  await page
    .getByRole("button", { name: /^Begin (Expedition|Dungeon)$/ })
    .click();
  await page.evaluate(async () => {
    const r = (window as any).__deathRenderer;
    await r.ready();
    r.render();
  });
}
async function artifact(name: string, data: unknown) {
  await mkdir("output/screenshots", { recursive: true });
  await writeFile(
    `output/${name}-0.23.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
}

test("all 45 creature/hero/Bear crops have six distinct padded death poses and silhouette falls", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts"),
      { CLASSES } = await import("/src/content.ts");
    const { creatureCrop, heroCrop, createAnimationFrame } =
      await import("/src/animation-canvas.ts");
    const { deathVisual, DEATH_DURATION } =
      await import("/src/death-animation.ts");
    const reports = [],
      sheets = [];
    for (const group of [
      "world",
      "ragefire",
      "shadowfang",
      "duskwood",
      "heroes",
    ] as const) {
      const atlas = new Image();
      atlas.src = `/art/${group === "heroes" ? "hero" : group}-sprites.png`;
      await atlas.decode();
      const bear = new Image();
      bear.src = "/art/companions.png";
      if (group === "heroes") await bear.decode();
      const entries =
        group === "heroes"
          ? CLASSES.map((c) => ({
              name: c.id,
              index: c.portrait,
              rig: ["mage", "priest", "warlock", "druid"].includes(c.id)
                ? "robe"
                : "biped",
            })).concat([{ name: "bear", index: 2, rig: "quadruped" }])
          : Object.entries(CREATURE_ART)
              .filter(([name, a]) => a.atlas === group && name !== "blackguard")
              .map(([name, a]) => ({ name, index: a.index, rig: a.rig }));
      const sheet = document.createElement("canvas");
      sheet.width = 1050;
      sheet.height = 80 + entries.length * 132;
      const c = sheet.getContext("2d")!;
      c.fillStyle = "#16231e";
      c.fillRect(0, 0, sheet.width, sheet.height);
      c.fillStyle = "#e4d5a3";
      c.font = "16px sans-serif";
      c.fillText(
        `${group}: recoil, buckle, fall, land, settle, final silhouette`,
        12,
        25,
      );
      for (const [row, entry] of entries.entries()) {
        const image = entry.name === "bear" ? bear : atlas;
        const crop =
          entry.name === "bear"
            ? {
                x: 0,
                y: bear.naturalHeight / 2,
                width: bear.naturalWidth / 2,
                height: bear.naturalHeight / 2,
              }
            : group === "heroes"
              ? heroCrop(entry.index, image.naturalWidth, image.naturalHeight)
              : creatureCrop(
                  group,
                  entry.index,
                  image.naturalWidth,
                  image.naturalHeight,
                );
        const hashes = [];
        let edgeAlpha = 0,
          visible = Infinity;
        c.font = "12px sans-serif";
        c.fillStyle = "#d9d8bc";
        c.fillText(entry.name, 8, 110 + row * 132);
        for (let i = 0; i < 6; i++) {
          const frame = createAnimationFrame(
              image,
              crop,
              entry.rig as any,
              26 + i,
            ),
            pixels = frame.getContext("2d")!.getImageData(0, 0, 144, 144).data;
          let hash = 2166136261,
            count = 0;
          for (let offset = 0; offset < pixels.length; offset++)
            hash = Math.imul(hash ^ pixels[offset], 16777619);
          hashes.push(hash);
          for (let y = 0; y < 144; y++)
            for (let x = 0; x < 144; x++)
              if (pixels[(y * 144 + x) * 4 + 3]) {
                count++;
                if (x < 2 || y < 2 || x >= 142 || y >= 142) edgeAlpha++;
              }
          visible = Math.min(visible, count);
          const v = deathVisual(
            ((i + 0.1) / 6) * DEATH_DURATION,
            entry.rig as any,
            false,
            true,
          );
          c.save();
          c.translate(180 + i * 146, 142 + row * 132);
          c.globalAlpha = v.alpha;
          c.translate(0, v.drop);
          c.rotate(v.rotation);
          c.scale(v.scaleX, v.scaleY);
          c.drawImage(frame, -48, -100, 96, 96);
          c.restore();
        }
        reports.push({
          name: entry.name,
          rig: entry.rig,
          unique: new Set(hashes).size,
          edgeAlpha,
          visible,
        });
      }
      sheets.push({ name: group, data: sheet.toDataURL("image/png") });
    }
    return { reports, sheets };
  });
  expect(result.reports).toHaveLength(45);
  for (const row of result.reports) {
    expect(row.unique, row.name).toBe(6);
    expect(row.edgeAlpha, row.name).toBe(0);
    expect(row.visible, row.name).toBeGreaterThan(500);
  }
  await artifact("death-frames", result.reports);
  for (const sheet of result.sheets)
    await writeFile(
      `output/screenshots/deaths-${sheet.name}-0.23.png`,
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
});

test("actual lethal hits snapshot all creatures and fifteen guardians independently of removal and room cleanup", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts"),
      { ZONES } = await import("/src/content.ts"),
      { DUNGEONS } = await import("/src/dungeon.ts"),
      { BOSS_IDENTITIES } = await import("/src/expedition.ts");
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer;
    let creatures = 0,
      guardians = 0;
    for (const type of [...Object.keys(CREATURE_ART), "smite"]) {
      g.enemies = [];
      r.deathAnimator.clear();
      const e = g.spawnEnemy(90, false, 0, false, type);
      e.hp = e.maxHp = 10;
      r.creaturePose(e, 44);
      g.time += 1 / 60;
      e.x += 2;
      r.creaturePose(e, 44);
      e.frozenUntil = 100;
      e.guard = true;
      e.dots = { melee: {} };
      g.damageEnemy(e, 1, "melee", false);
      if (r.deathAnimator.enemies.length) throw Error("nonlethal cue");
      g.damageEnemy(e, 100, "melee", false);
      g.damageEnemy(e, 100, "melee", false);
      const scene = r.deathAnimator.enemies[0],
        x = scene.data.actor.x;
      e.x += 300;
      g.update(1 / 60);
      r.render();
      if (
        g.enemies.includes(e) ||
        r.deathAnimator.enemies.length !== 1 ||
        scene.data.actor.x !== x ||
        scene.mirror ||
        scene.data.actor.flash ||
        scene.data.actor.guard ||
        scene.data.actor.dots
      )
        throw Error(type);
      creatures++;
    }
    const all = [
      ...ZONES.filter((z) => !z.dungeon).map((z) => ({
        zone: z.id,
        stage: 0,
        type: BOSS_IDENTITIES[z.id].enemy,
      })),
      ...DUNGEONS.flatMap((d) =>
        d.stages.map((s, stage) => ({ zone: d.id, stage, type: s.enemy })),
      ),
    ];
    const { GameEngine } = await import("/src/engine.ts"),
      { GameRenderer } = await import("/src/renderer.ts");
    for (const boss of all) {
      let renderer: any;
      const engine = new GameEngine({
        classId: "warrior",
        zone: ZONES.find((z) => z.id === boss.zone)!,
        stats: g.stats,
        professions: {},
        seed: 8,
        onDeath: (a) => renderer.onDeath(a),
      });
      engine.enemies = [];
      engine.dungeonStageIndex = boss.stage;
      engine.dungeonBosses = boss.stage;
      const canvas = document.createElement("canvas");
      canvas.style.width = "1440px";
      canvas.style.height = "1000px";
      document.body.append(canvas);
      renderer = new GameRenderer(canvas, engine);
      await renderer.ready();
      const e = (engine as any).spawnEnemy(100, false, 0, true, boss.type);
      engine.boss = e;
      e.hp = 1;
      (engine as any).damageEnemy(e, 1000, "melee", false);
      renderer.render();
      if (
        !(engine.checkpoint || engine.ended) ||
        renderer.deathAnimator.enemies[0]?.data.actor.type !== boss.type
      )
        throw Error(boss.type);
      for (let i = 0; i < 16; i++) renderer.render(0.05);
      if (renderer.deathAnimator.enemies.length)
        throw Error("did not finish behind recovery/results");
      canvas.remove();
      guardians++;
    }
    return { creatures, guardians };
  });
  expect(result).toEqual({ creatures: 37, guardians: 15 });
});

test("nine real hero defeats and Bear Form fall behind immediate results; healthy returns remain neutral", async ({
  browser,
}) => {
  for (const classId of [
    "warrior",
    "mage",
    "rogue",
    "hunter",
    "paladin",
    "priest",
    "shaman",
    "warlock",
    "druid",
  ] as ClassId[]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await setup(page, "elwynn", classId);
    const result = await page.evaluate(() => {
      const g = (window as any).__deathGame,
        r = (window as any).__deathRenderer;
      g.player.hp = 1;
      g.player.activeBuff = 2;
      const e = g.spawnEnemy(0, false, 0, false, "wolf");
      e.x = g.player.x;
      e.y = g.player.y;
      e.damage = 1e6;
      e.speed = 0;
      g.update(1 / 60);
      r.render();
      const start = r.deathAnimator.hero,
        bear = start.data.bear,
        age = start.age,
        time = g.time,
        rng = g.rng.state;
      for (let i = 0; i < 16; i++) r.render(0.05);
      return {
        ended: g.ended,
        victory: g.victory,
        bear,
        age,
        finalAge: r.deathAnimator.hero.age,
        timeHeld: g.time === time,
        rngHeld: g.rng.state === rng,
      };
    });
    expect(result).toEqual({
      ended: true,
      victory: false,
      bear: classId === "druid",
      age: 0,
      finalAge: 0.75,
      timeHeld: true,
      rngHeld: true,
    });
    await expect(
      page.getByRole("heading", { name: "Until the next adventure." }),
    ).toBeVisible();
    const count = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).history.length,
      SAVE_KEY,
    );
    expect(count).toBe(1);
    await page.evaluate(() => (window as any).__deathGame.finish(false));
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        SAVE_KEY,
      ),
    ).toBe(1);
    if (classId === "warrior") {
      await mkdir("output/screenshots", { recursive: true });
      await page.screenshot({
        path: "output/screenshots/death-results-1440-0.23.png",
        animations: "disabled",
      });
    }
    await page.close();
  }
  const page = await browser.newPage();
  await setup(page);
  await page.evaluate(() => {
    const g = (window as any).__deathGame;
    g.finish(false);
  });
  expect(
    await page.evaluate(
      () => (window as any).__deathRenderer.deathAnimator.hero,
    ),
  ).toBeNull();
  await page.close();
});

test("paused choices/focus hold death time; disable/reduced motion/rewind/stage changes never replay corpses", async ({
  page,
}) => {
  await setup(page);
  const kill = async () =>
    page.evaluate(() => {
      const g = (window as any).__deathGame,
        r = (window as any).__deathRenderer,
        e = g.spawnEnemy(90, false, 0, false, "wolf");
      e.hp = 1;
      g.damageEnemy(e, 1000, "melee", false);
      r.render(0.05);
      return r.deathAnimator.enemies[0].age;
    });
  expect(await kill()).toBe(0.05);
  const held = await page.evaluate(() => {
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer,
      a = r.deathAnimator;
    const ages = [];
    for (const key of ["paused", "choosing", "shrineChoice"]) {
      g[key] = key === "shrineChoice" ? {} : true;
      for (let i = 0; i < 20; i++) r.render(0.05);
      ages.push(a.enemies[0].age);
      g[key] = key === "shrineChoice" ? null : false;
    }
    const focus = document.hasFocus;
    document.hasFocus = () => false;
    for (let i = 0; i < 20; i++) r.render(0.05);
    ages.push(a.enemies[0].age);
    document.hasFocus = focus;
    r.render();
    ages.push(a.enemies[0].age);
    return ages;
  });
  expect(held).toEqual([0.05, 0.05, 0.05, 0.05, 0.05]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => (window as any).__deathRenderer.render());
  expect(
    await page.evaluate(
      () => (window as any).__deathRenderer.deathAnimator.enemies.length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await kill()).toBe(0.05);
  const reset = await page.evaluate(() => {
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer;
    r.animation = false;
    r.render();
    r.animation = true;
    r.render(0.05);
    const n = r.deathAnimator.enemies.length;
    g.time = 5;
    r.render();
    const e = g.spawnEnemy(90, false, 0, false, "wolf");
    e.hp = 1;
    g.damageEnemy(e, 1000, "melee", false);
    g.time = 0;
    r.render();
    return [n, r.deathAnimator.enemies.length];
  });
  expect(reset).toEqual([0, 0]);
  await kill();
  await page.evaluate(() => {
    const g = (window as any).__deathGame;
    g.dungeonStageIndex++;
    (window as any).__deathRenderer.render();
  });
  expect(
    await page.evaluate(
      () => (window as any).__deathRenderer.deathAnimator.enemies.length,
    ),
  ).toBe(0);
});

test("live keyboard pause and focus recovery hold casualties and normal combat movement resumes", async ({
  page,
}) => {
  await setup(page, "elwynn", "warrior", false);
  await page.keyboard.down("d");
  await page.clock.runFor(100);
  await page.keyboard.up("d");
  await page.evaluate(() => {
    const g = (window as any).__deathGame,
      e = g.spawnEnemy(100, false, 0, false, "wolf");
    e.hp = 1;
    g.damageEnemy(e, 1000, "melee", false);
  });
  await page.clock.runFor(100);
  await page.keyboard.press("Escape");
  const read = () =>
    page.evaluate(() => {
      const g = (window as any).__deathGame,
        r = (window as any).__deathRenderer;
      return {
        time: g.time,
        x: g.player.x,
        age: r.deathAnimator.enemies[0]?.age,
      };
    });
  const held = await read();
  expect(held.age).toBeGreaterThan(0);
  await page.clock.runFor(1000);
  expect(await read()).toEqual(held);
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(1000);
  expect(await read()).toEqual(held);
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await page.keyboard.down("d");
  await page.clock.runFor(1000);
  await page.keyboard.up("d");
  const resumed = await read();
  expect(resumed.x).toBeGreaterThan(held.x);
  expect(resumed.age).toBeUndefined();
});

test("phone recovery and missing-atlas Smite/code drawings keep death visuals and usable controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(
    /\/art\/(companions|(?:world|hero|ragefire|shadowfang|duskwood)-sprites)\.png$/,
    (route) => route.abort(),
  );
  await setup(page, "deadmines");
  const result = await page.evaluate(() => {
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer;
    g.dungeonStageIndex = 1;
    g.dungeonBosses = 1;
    r.render();
    for (const type of ["wolf", "kobold", "wraith"]) {
      const e = g.spawnEnemy(70, false, Math.PI, false, type);
      e.hp = 1;
      g.damageEnemy(e, 1000, "melee", false);
    }
    const e = g.spawnEnemy(80, false, 0, true, "smite");
    e.hp = 1;
    g.boss = e;
    g.damageEnemy(e, 1000, "melee", false);
    for (let i = 0; i < 7; i++) r.render(0.05);
    (window as any).__deathHud();
    return {
      checkpoint: g.checkpoint,
      count: r.deathAnimator.enemies.length,
      smite: r.deathAnimator.enemies.find(
        (s: any) => s.data.actor.type === "smite",
      )?.age,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(result).toEqual({
    checkpoint: true,
    count: 4,
    smite: 0.35,
    overflow: false,
  });
  await expect(
    page.getByRole("button", { name: /Continue/ }).first(),
  ).toBeVisible();
  await mkdir("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/death-recovery-fallback-390-0.23.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: /Continue/ })
    .first()
    .click();
  await page.evaluate(() => (window as any).__deathRenderer.render());
  expect(
    await page.evaluate(
      () => (window as any).__deathRenderer.deathAnimator.enemies.length,
    ),
  ).toBe(0);
});

test("phone defeat with unavailable hero art and reduced motion shows a static fallen hero without replay", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/\/art\/hero-sprites\.png$/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer;
    g.player.hp = 1;
    const e = g.spawnEnemy(0, false, 0, false, "wolf");
    e.x = g.player.x;
    e.y = g.player.y;
    e.damage = 1e6;
    g.update(1 / 60);
    r.render();
    return {
      age: r.deathAnimator.hero.age,
      enemies: r.deathAnimator.enemies.length,
      ended: g.ended,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(result).toEqual({
    age: 0.75,
    enemies: 0,
    ended: true,
    overflow: false,
  });
  await expect(
    page.getByRole("heading", { name: "Until the next adventure." }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => (window as any).__deathRenderer.render(0.05));
  expect(
    await page.evaluate(
      () => (window as any).__deathRenderer.deathAnimator.hero.age,
    ),
  ).toBe(0.75);
  await mkdir("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/death-results-static-390-0.23.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: /Return to camp/ }).click();
  await expect(
    page.getByRole("button", { name: "Begin Expedition", exact: true }),
  ).toBeVisible();
});

test("desktop and phone battlefield show fading casualties without health/status markers or overflow", async ({
  page,
}) => {
  await setup(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const result = await page.evaluate(async (width) => {
      await new Promise(requestAnimationFrame);
      const g = (window as any).__deathGame,
        r = (window as any).__deathRenderer;
      r.deathAnimator.clear();
      g.enemies = [];
      g.pickups = [];
      g.texts = [];
      for (const [i, type] of [
        "wolf",
        "kobold",
        "ghoul",
        "golem",
        "wraith",
        "dusk_spider",
      ].entries()) {
        const e = g.spawnEnemy(100, true, 0, false, type);
        e.x = g.player.x + ((i % 3) - 1) * (width === 390 ? 105 : 180);
        e.y = g.player.y - 70 + Math.floor(i / 3) * 135;
        e.hp = 1;
        e.frozenUntil = g.time + 10;
        e.guard = true;
        g.damageEnemy(e, 1000, "melee", false);
      }
      for (let i = 0; i < 7; i++) r.render(0.05);
      (window as any).__deathHud();
      return {
        deaths: r.deathAnimator.enemies.length,
        living: g.enemies.filter((e: any) => !e.dead).length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    }, width);
    expect(result).toEqual({ deaths: 6, living: 0, overflow: false });
    await mkdir("output/screenshots", { recursive: true });
    await page.screenshot({
      path: `output/screenshots/death-field-${width}-0.23.png`,
      animations: "disabled",
    });
  }
});

test("400 real kills retain at most 64 death snapshots and cache budgets while rendering leaves rewards/RNG untouched", async ({
  page,
}) => {
  await setup(page);
  const report = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const g = (window as any).__deathGame,
      r = (window as any).__deathRenderer,
      types = Object.keys(CREATURE_ART);
    let creatureBuilds = 0,
      heroBuilds = 0,
      maxCreature = 0,
      maxHero = 0,
      maxCache = 0,
      maxPending = 0,
      maxDeaths = 0;
    const cg = r.creatureCache.get.bind(r.creatureCache),
      hg = r.frameCache.get.bind(r.frameCache);
    r.creatureCache.get = (key: any, create: any, priority: any) =>
      cg(
        key,
        () => {
          creatureBuilds++;
          return create();
        },
        priority,
      );
    r.frameCache.get = (key: any, create: any) =>
      hg(key, () => {
        heroBuilds++;
        return create();
      });
    for (let i = 0; i < 400; i++) {
      const e = g.spawnEnemy(
        80 + (i % 8) * 12,
        false,
        i * 2.4,
        false,
        types[i % types.length],
      );
      e.hp = 1;
      e.speed = 0;
    }
    for (const e of [...g.enemies]) g.damageEnemy(e, 1000, "melee", false);
    const snapshot = () =>
      JSON.stringify({
        rng: g.rng.state,
        time: g.time,
        player: g.player,
        enemies: g.enemies,
        pickups: g.pickups,
        kills: g.kills,
        gold: g.gold,
        loot: g.loot,
        totalDamage: g.totalDamage,
      });
    const before = snapshot(),
      samples = [];
    for (let i = 0; i < 90; i++) {
      await new Promise(requestAnimationFrame);
      const cb = creatureBuilds,
        hb = heroBuilds,
        start = performance.now();
      r.render(1 / 60);
      samples.push(performance.now() - start);
      if (snapshot() !== before) throw Error("render changed gameplay");
      maxCreature = Math.max(maxCreature, creatureBuilds - cb);
      maxHero = Math.max(maxHero, heroBuilds - hb);
      maxCache = Math.max(maxCache, r.creatureCache.size);
      maxPending = Math.max(maxPending, r.creatureCache.pendingSize);
      maxDeaths = Math.max(maxDeaths, r.deathAnimator.enemies.length);
    }
    samples.sort((a, b) => a - b);
    return {
      kills: g.kills,
      maxDeaths,
      remaining: r.deathAnimator.enemies.length,
      maxCreature,
      maxHero,
      maxCache,
      maxPending,
      creatureBuilds,
      averageMs: samples.reduce((a, b) => a + b) / samples.length,
      p95Ms: samples[Math.floor(samples.length * 0.95)],
    };
  });
  expect(report.kills).toBe(400);
  expect(report.maxDeaths).toBe(64);
  expect(report.remaining).toBe(0);
  expect(report.maxCreature).toBeLessThanOrEqual(1);
  expect(report.maxHero).toBeLessThanOrEqual(2);
  expect(report.maxCache).toBeLessThanOrEqual(128);
  expect(report.maxPending).toBeLessThanOrEqual(128);
  expect(report.creatureBuilds).toBeGreaterThan(5);
  await artifact("death-render", report);
});
