import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { ClassId } from "../../src/content";
import { CLASSES } from "../../src/content";
import { freshSave, SAVE_KEY } from "../../src/progression";
import { mkdir, writeFile } from "node:fs/promises";
test.use({ hasTouch: true });

async function setup(page: Page, hero: ClassId = "mage", manual = true) {
  const save = freshSave();
  save.selectedClass = hero;
  save.heroes[hero].level = 20;
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
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
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    let routed = body.replace(
      marker,
      `${marker}\nwindow.__combatGame=game;window.__combatRenderer=renderer;`,
    );
    if (manual) routed = routed.replaceAll("requestAnimationFrame(frame);", "");
    await route.fulfill({ response, body: routed });
  });
  if (!manual)
    await page.clock.install({ time: new Date("2026-10-05T00:00:00Z") });
  await page.goto("/");
  if (!manual) await page.clock.pauseAt(new Date("2026-10-05T00:00:01Z"));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const r = (window as any).__combatRenderer;
    await r.ready();
    r.render();
  });
}
const readPose = (page: Page) =>
  page.evaluate(() => {
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    return {
      pose: r.characterPose(g.player),
      gesture: { ...r.combatAnimator.actors.get(g.player) },
      x: g.player.x,
      time: g.time,
      cache: r.frameCache.size,
      enabled: r.motionEnabled,
    };
  });
async function cast(page: Page, id = "frostbolt") {
  return page.evaluate(async (id) => {
    const { SPELLS } = await import("/src/content.ts");
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    if (!g.enemies.length) {
      const e = g.spawnEnemy(65, false, Math.PI);
      e.speed = 0;
      e.hp = e.maxHp = 1e6;
      e.damage = 0;
    }
    g.grid.rebuild(g.enemies);
    g.player.resource = 100;
    const accepted = g.castSpell(SPELLS[id], 1);
    r.render();
    return accepted;
  }, id);
}

test("all hero, companion and Bear Form crops render six distinct native poses for each combat style", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { heroCrop, createAnimationFrame } =
      await import("/src/animation-canvas.ts");
    const { combatFrame, COMBAT_STYLES } =
      await import("/src/combat-animation.ts");
    const heroes = new Image(),
      companions = new Image();
    heroes.src = "/art/hero-sprites.png";
    companions.src = "/art/companions.png";
    await Promise.all([heroes.decode(), companions.decode()]);
    const crops = [
      ...[
        "Warrior",
        "Mage",
        "Rogue",
        "Hunter",
        "Paladin",
        "Priest",
        "Shaman",
        "Warlock",
        "Druid",
      ].map((name, index) => ({
        name,
        atlas: heroes,
        crop: heroCrop(index, heroes.naturalWidth, heroes.naturalHeight),
        rig: [1, 5, 7, 8].includes(index) ? "robe" : "biped",
      })),
      ...["Wolf", "Imp", "Bear Form", "Fire totem"].map((name, index) => ({
        name,
        atlas: companions,
        rig: ["quadruped", "biped", "quadruped", "totem"][index],
        crop: {
          x: ((index % 2) * companions.naturalWidth) / 2,
          y: (Math.floor(index / 2) * companions.naturalHeight) / 2,
          width: companions.naturalWidth / 2,
          height: companions.naturalHeight / 2,
        },
      })),
    ];
    const reports = [],
      sheets = [];
    for (const style of COMBAT_STYLES) {
      const sheet = document.createElement("canvas");
      sheet.width = 120 + 6 * 116;
      sheet.height = 40 + crops.length * 134;
      const c = sheet.getContext("2d")!;
      c.fillStyle = "#16231e";
      c.fillRect(0, 0, sheet.width, sheet.height);
      c.fillStyle = "#e4d5a3";
      c.font = "16px sans-serif";
      c.fillText(
        `${style}: gather, draw, release, follow-through, recover, settle`,
        12,
        25,
      );
      for (const [row, crop] of crops.entries()) {
        const hashes = [],
          frames = [];
        let edgeAlpha = 0,
          visible = Infinity;
        c.fillStyle = "#d9d8bc";
        c.font = "12px sans-serif";
        c.fillText(crop.name, 8, 40 + row * 134 + 65);
        for (let pose = 0; pose < 6; pose++) {
          const frame = createAnimationFrame(
            crop.atlas,
            crop.crop,
            crop.rig,
            combatFrame(style, pose),
          );
          const data = frame
            .getContext("2d")!
            .getImageData(0, 0, 144, 144).data;
          frames.push(data);
          let hash = 2166136261,
            pixels = 0;
          for (let offset = 0; offset < data.length; offset++)
            hash = Math.imul(hash ^ data[offset], 16777619);
          hashes.push(hash);
          for (let y = 0; y < 144; y++)
            for (let x = 0; x < 144; x++) {
              if (data[(y * 144 + x) * 4 + 3]) {
                pixels++;
                if (x < 2 || y < 2 || x >= 142 || y >= 142) edgeAlpha++;
              }
            }
          visible = Math.min(visible, pixels);
          c.drawImage(frame, 120 + pose * 116, 40 + row * 134, 116, 116);
          c.fillStyle = "#869786";
          c.fillText(String(pose + 1), 173 + pose * 116, 40 + row * 134 + 128);
        }
        let upperChanged = 0;
        for (let y = 0; y < 95; y++)
          for (let x = 0; x < 144; x++) {
            const offset = (y * 144 + x) * 4;
            if (
              frames[1]
                .slice(offset, offset + 4)
                .some((v, i) => v !== frames[2][offset + i])
            )
              upperChanged++;
          }
        reports.push({
          name: crop.name,
          style,
          unique: new Set(hashes).size,
          edgeAlpha,
          visible,
          upperChanged,
        });
      }
      sheets.push({ style, data: sheet.toDataURL("image/png") });
    }
    return { reports, sheets };
  });
  expect(result.reports).toHaveLength(39);
  for (const report of result.reports) {
    expect(report.unique, `${report.name}/${report.style}`).toBe(6);
    expect(report.edgeAlpha, report.name).toBe(0);
    expect(report.visible, report.name).toBeGreaterThan(500);
    expect(report.upperChanged, report.name).toBeGreaterThan(40);
  }
  await mkdir("output/screenshots", { recursive: true });
  for (const sheet of result.sheets)
    await writeFile(
      `output/screenshots/combat-${sheet.style}-0.21.png`,
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
  await writeFile(
    "output/combat-frames-0.21.json",
    JSON.stringify(result.reports, null, 2) + "\n",
  );
});

test("all nine actual automatic starter actions gesture toward their target and resume movement afterwards", async ({
  page,
}) => {
  for (const hero of CLASSES) {
    await setup(page, hero.id);
    const result = await page.evaluate(() => {
      const g = (window as any).__combatGame,
        r = (window as any).__combatRenderer;
      const e = g.spawnEnemy(65, false, Math.PI);
      e.speed = 0;
      e.hp = e.maxHp = 1e6;
      e.damage = 0;
      const id = g.classDef.spells[0];
      g.addSpell(id);
      g.spells[0].timer = 0;
      g.player.resource = 100;
      g.update(1 / 60);
      r.render();
      g.spells[0].timer = 1e6;
      const first = r.characterPose(g.player),
        resource = g.player.resource;
      g.setInput(1, 0);
      for (let i = 0; i < 12; i++) {
        g.update(1 / 60);
        r.render();
      }
      const during = r.characterPose(g.player),
        xDuring = g.player.x;
      for (let i = 0; i < 18; i++) {
        g.update(1 / 60);
        r.render();
      }
      return {
        first,
        during,
        xDuring,
        after: r.characterPose(g.player),
        resource,
        trialCasts: g.trialCasts,
        cache: r.frameCache.size,
      };
    });
    expect(result.first.frame, hero.id).toBeGreaterThanOrEqual(8);
    expect(result.first.mirror, hero.id).toBe(true);
    expect(result.during.frame, hero.id).toBeGreaterThanOrEqual(8);
    expect(result.xDuring, hero.id).toBeGreaterThan(0);
    expect(result.after.frame, hero.id).toBeLessThan(8);
    expect(result.after.frame, hero.id).toBeGreaterThanOrEqual(0);
    expect(result.trialCasts, hero.id).toBe(1);
    expect(result.cache, hero.id).toBeLessThanOrEqual(192);
  }
});

test("failed casts stay neutral, accepted self-healing animates once and ticks do not restart it", async ({
  page,
}) => {
  await setup(page, "priest");
  const report = await page.evaluate(async () => {
    const { SPELLS } = await import("/src/content.ts");
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    const attempt = (id: string) => {
      const accepted = g.castSpell(SPELLS[id], 1);
      r.render();
      return { accepted, frame: r.characterPose(g.player).frame };
    };
    const targetless = attempt("smite"),
      fullHealth = attempt("renew");
    g.player.hp -= 100;
    g.player.resource = 0;
    const noResource = attempt("renew");
    g.player.resource = 100;
    const healed = attempt("renew"),
      repeated = attempt("renew");
    const initial = { ...r.combatAnimator.actors.get(g.player) };
    for (let i = 0; i < 150; i++) {
      g.update(1 / 60);
      r.render();
    }
    return {
      targetless,
      fullHealth,
      noResource,
      healed,
      repeated,
      initial,
      after: r.characterPose(g.player).frame,
      hp: g.player.hp,
      totalHealing: g.totalHealing,
    };
  });
  for (const failed of [
    report.targetless,
    report.fullHealth,
    report.noResource,
  ])
    expect(failed).toEqual({ accepted: false, frame: -1 });
  expect(report.healed.accepted).toBe(true);
  expect(report.healed.frame).toBeGreaterThanOrEqual(8);
  expect(report.repeated.accepted).toBe(false);
  expect(report.repeated.frame).toBe(report.healed.frame);
  expect(report.after).toBe(-1);
  expect(report.totalHealing).toBeGreaterThan(0);
});

test("pause, upgrade choices and focus loss hold the gesture and resume it on the combat clock", async ({
  page,
}) => {
  await setup(page, "mage", false);
  expect(await cast(page)).toBe(true);
  await page.clock.runFor(80);
  await page.keyboard.press("Escape");
  const paused = await readPose(page);
  await page.clock.runFor(1200);
  expect((await readPose(page)).pose).toEqual(paused.pose);
  expect((await readPose(page)).time).toBe(paused.time);
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await page.clock.runFor(40);
  await page.evaluate(() => (window as any).__combatGame.openUpgrade());
  const choosing = await readPose(page);
  await page.clock.runFor(1200);
  expect((await readPose(page)).pose).toEqual(choosing.pose);
  await page.locator('[data-action="upgrade"]').first().click();
  await page.evaluate(() => {
    (window as any).__combatGame.spells = [];
  });
  await page.clock.runFor(40);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await readPose(page);
  await page.clock.runFor(1200);
  expect((await readPose(page)).pose).toEqual(blurred.pose);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await page.clock.runFor(500);
  expect((await readPose(page)).pose.frame).toBe(-1);
});

test("simultaneous accepted spells finish one gesture and accepted abilities interrupt without cooldown retries", async ({
  page,
}) => {
  await setup(page);
  expect(await cast(page)).toBe(true);
  const initial = await readPose(page);
  expect(await cast(page, "fireball")).toBe(true);
  expect((await readPose(page)).gesture).toEqual(initial.gesture);
  const result = await page.evaluate(() => {
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    for (let i = 0; i < 8; i++) {
      g.update(1 / 60);
      r.render();
    }
    g.player.resource = 100;
    const accepted = g.activate();
    r.render();
    const ability = { ...r.combatAnimator.actors.get(g.player) };
    const retry = g.activate();
    r.render();
    return {
      accepted,
      retry,
      ability,
      afterwards: { ...r.combatAnimator.actors.get(g.player) },
    };
  });
  expect(result.accepted).toBe(true);
  expect(result.ability.priority).toBe(1);
  expect(result.ability.age).toBe(0);
  expect(result.retry).toBe(false);
  expect(result.afterwards).toEqual(result.ability);
});

test("real wolf bites, imp/totem projectiles and Bear Form animate their own actor objects", async ({
  page,
}) => {
  await setup(page, "druid");
  const result = await page.evaluate(() => {
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    const e = g.spawnEnemy(80, false, Math.PI);
    e.speed = 0;
    e.hp = e.maxHp = 1e6;
    e.damage = 0;
    const reports = [];
    for (const id of ["beast", "imp", "totem"]) {
      g.spells = [];
      g.pets = [];
      g.addSpell(id);
      const pet = g.pets[0];
      pet.x = -60;
      pet.y = 0;
      pet.timer = 0;
      g.update(1 / 60);
      r.render();
      reports.push({
        id,
        pose: r.characterPose(pet),
        gesture: { ...r.combatAnimator.actors.get(pet) },
        hero: r.characterPose(g.player),
      });
    }
    g.player.resource = 100;
    const accepted = g.activate();
    r.render();
    return {
      reports,
      accepted,
      bear: r.characterPose(g.player),
      cacheKeys: [...r.frameCache.frames.keys()],
    };
  });
  for (const row of result.reports) {
    expect(row.pose.frame, row.id).toBeGreaterThanOrEqual(8);
    expect(row.pose.mirror, row.id).toBe(true);
    expect(row.gesture.style, row.id).toBe(
      row.id === "beast" ? "strike" : "cast",
    );
    expect(row.hero.frame).toBe(-1);
  }
  expect(result.accepted).toBe(true);
  expect(result.bear.frame).toBeGreaterThanOrEqual(14);
  expect(
    result.cacheKeys.some(
      (key: string) =>
        key.includes("companions.png") && /:quadruped:1[4-9]$/.test(key),
    ),
  ).toBe(true);
});

test("disabled motion and live reduced motion discard combat gestures while casts still resolve", async ({
  page,
}) => {
  await setup(page);
  expect(await cast(page)).toBe(true);
  await page.evaluate(() => {
    const r = (window as any).__combatRenderer;
    r.animation = false;
    r.render();
  });
  expect((await readPose(page)).pose.frame).toBe(-1);
  expect(await cast(page, "fireball")).toBe(true);
  expect((await readPose(page)).pose.frame).toBe(-1);
  await page.evaluate(() => {
    const r = (window as any).__combatRenderer;
    r.animation = true;
    r.render();
  });
  expect((await readPose(page)).pose.frame).toBe(-1);
  expect(await cast(page)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => (window as any).__combatRenderer.render());
  expect((await readPose(page)).pose.frame).toBe(-1);
  expect(await cast(page)).toBe(true);
  expect((await readPose(page)).enabled).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => (window as any).__combatRenderer.render());
  expect((await readPose(page)).pose.frame).toBe(-1);
  expect(await cast(page)).toBe(true);
  expect((await readPose(page)).pose.frame).toBeGreaterThanOrEqual(8);
});

test("missing hero/companion art keeps code-drawn combat poses, movement and freeze usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    /\/art\/(hero-sprites|companions|world-sprites)\.png/,
    (route) => route.abort(),
  );
  await setup(page, "warlock");
  const result = await page.evaluate(() => {
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    const e = g.spawnEnemy(65);
    e.speed = 0;
    e.hp = e.maxHp = 1e6;
    e.damage = 0;
    g.addSpell(g.classDef.spells[0]);
    g.spells[0].timer = 0;
    g.player.resource = 100;
    g.addSpell("imp");
    g.pets[0].timer = 0;
    g.update(1 / 60);
    r.render();
    const first = r.characterPose(g.player),
      pet = r.characterPose(g.pets[0]);
    g.spells[0].timer = 1e6;
    g.setInput(1, 0);
    for (let i = 0; i < 6; i++) {
      g.update(1 / 60);
      r.render();
    }
    g.paused = true;
    const held = r.characterPose(g.player);
    for (let i = 0; i < 20; i++) r.render();
    return {
      first,
      pet,
      held,
      paused: r.characterPose(g.player),
      x: g.player.x,
      cache: r.frameCache.size,
    };
  });
  expect(result.first.frame).toBeGreaterThanOrEqual(8);
  expect(result.pet.frame).toBeGreaterThanOrEqual(8);
  expect(result.x).toBeGreaterThan(0);
  expect(result.paused).toEqual(result.held);
  expect(result.cache).toBe(0);
  expect(errors).toEqual([]);
});

test("native moving combat with 400 enemies preserves gameplay/RNG and both construction budgets", async ({
  page,
}) => {
  await setup(page, "warlock");
  const report = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const g = (window as any).__combatGame,
      r = (window as any).__combatRenderer;
    g.classDef.spells.forEach((id: string) => g.addSpell(id));
    const types = Object.keys(CREATURE_ART);
    for (let i = 0; i < 400; i++) {
      const e = g.spawnEnemy(
        100 + (i % 180),
        false,
        i * 2.399963,
        false,
        types[i % types.length],
      );
      e.hp = e.maxHp = 1e6;
      e.damage = 0;
      e.attackTimer = 1e6;
    }
    let heroBuilt = 0,
      creatureBuilt = 0;
    for (const [cache, creature] of [
      [r.frameCache, false],
      [r.creatureCache.frames, true],
    ]) {
      const original = cache.get.bind(cache);
      cache.get = (key: string, create: () => HTMLCanvasElement) =>
        original(key, () => {
          if (creature) creatureBuilt++;
          else heroBuilt++;
          return create();
        });
    }
    const snapshot = () =>
      JSON.stringify({
        time: g.time,
        rng: g.rng.state,
        player: g.player,
        enemies: g.enemies,
        spells: g.spells,
        pets: g.pets,
        projectiles: g.projectiles,
        pickups: g.pickups,
        areas: g.areas,
        hazards: g.hazards,
      });
    const times = [];
    let readOnly = true,
      maxHeroBuilt = 0,
      maxCreatureBuilt = 0,
      combatFrames = 0;
    for (let i = 0; i < 180; i++) {
      await new Promise(requestAnimationFrame);
      g.player.resource = 100;
      g.setInput(Math.sin(i / 20), Math.cos(i / 20));
      if (i % 60 === 0) {
        g.player.activeCooldown = 0;
        g.activate();
      }
      g.update(1 / 60);
      const before = snapshot();
      heroBuilt = creatureBuilt = 0;
      const start = performance.now();
      r.render();
      times.push(performance.now() - start);
      readOnly &&= before === snapshot();
      maxHeroBuilt = Math.max(maxHeroBuilt, heroBuilt);
      maxCreatureBuilt = Math.max(maxCreatureBuilt, creatureBuilt);
      if (r.characterPose(g.player).frame >= 8) combatFrames++;
    }
    times.sort((a, b) => a - b);
    return {
      readOnly,
      count: g.enemies.length,
      combatFrames,
      maxHeroBuilt,
      maxCreatureBuilt,
      heroCache: r.frameCache.size,
      creatureCache: r.creatureCache.size,
      pending: r.creatureCache.pendingSize,
      averageMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
      finite: g.enemies.every(
        (e: any) => Number.isFinite(e.x) && Number.isFinite(e.y),
      ),
    };
  });
  expect(report.readOnly).toBe(true);
  expect(report.count).toBe(400);
  expect(report.finite).toBe(true);
  expect(report.combatFrames).toBeGreaterThan(50);
  expect(report.maxHeroBuilt).toBeLessThanOrEqual(2);
  expect(report.maxCreatureBuilt).toBeLessThanOrEqual(1);
  expect(report.heroCache).toBeGreaterThan(8);
  expect(report.heroCache).toBeLessThanOrEqual(192);
  expect(report.creatureCache).toBeLessThanOrEqual(128);
  expect(report.pending).toBeLessThanOrEqual(128);
  expect(report.averageMs).toBeGreaterThan(0);
  expect(report.averageMs).toBeLessThan(30);
  expect(report.p95Ms).toBeLessThan(50);
  console.log("Combat animation Canvas CPU:", JSON.stringify(report));
  await writeFile(
    "output/combat-render-0.21.json",
    JSON.stringify(report, null, 2) + "\n",
  );
});

test("real keyboard and phone pointer actions show combat gestures with readable controls", async ({
  page,
}) => {
  await setup(page, "warrior", false);
  await page.evaluate(() => {
    const g = (window as any).__combatGame;
    const e = g.spawnEnemy(200, true, 0);
    e.speed = 0;
    e.hp = e.maxHp = 1e6;
    e.damage = 0;
    g.player.resource = 100;
  });
  await page.keyboard.press("c");
  await page.clock.runFor(120);
  expect((await readPose(page)).pose.frame).toBeGreaterThanOrEqual(14);
  await page.screenshot({
    path: "output/screenshots/combat-action-1440-0.21.png",
  });
  await page.clock.runFor(500);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const g = (window as any).__combatGame;
    g.player.activeCooldown = 0;
    g.player.resource = 100;
  });
  const pad = (await page.locator("#touch-pad").boundingBox())!;
  await page.mouse.move(pad.x + pad.width / 2 + 20, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.clock.runFor(100);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Class ability", exact: true })
    .click();
  await page.clock.runFor(140);
  expect((await readPose(page)).pose.frame).toBeGreaterThanOrEqual(14);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/screenshots/combat-action-390-0.21.png",
  });
});
