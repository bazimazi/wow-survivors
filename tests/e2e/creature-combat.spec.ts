import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import { mkdir, writeFile } from "node:fs/promises";

test.use({ hasTouch: true });

async function setup(page: Page, zone = "elwynn", manual = true) {
  const save = freshSave();
  save.selectedClass = "warrior";
  save.selectedZone = zone;
  save.clearedZones = ["westfall", "tirisfal", "ragefire", "shadowfang"];
  save.heroes.warrior.level = 20;
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: SAVE_KEY,
      value: JSON.stringify(save),
    },
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
      `${marker}\nwindow.__enemyCombatGame=game;window.__enemyCombatRenderer=renderer;window.__enemyCombatHud=updateHud;`,
    );
    // Controlled cases use native Canvas/performance time while advancing the real engine explicitly.
    if (manual) {
      expect(body).toContain("requestAnimationFrame(frame);");
      routed = routed.replaceAll("requestAnimationFrame(frame);", "");
    }
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
    const r = (window as any).__enemyCombatRenderer;
    await r.ready();
    r.render();
  });
}

const readPose = (page: Page, index = 0) =>
  page.evaluate((index) => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer,
      e = g.enemies[index];
    return {
      pose: r.creaturePose(e, 44),
      gesture: r.creatureCombatAnimator.sample(e, g.time, {
        enabled: r.motionEnabled,
        frozen: g.paused || e.frozenUntil > g.time,
      }),
      time: g.time,
      x: e.x,
      y: e.y,
      hazards: JSON.stringify(g.hazards),
      cache: r.creatureCache.size,
      pending: r.creatureCache.pendingSize,
    };
  }, index);
const readCombatState = async (page: Page) => {
  const { cache, pending, ...state } = await readPose(page);
  return state;
};

test("all 35 creature crops render six distinct padded frames for every combat style", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const { creatureCrop, createAnimationFrame } =
      await import("/src/animation-canvas.ts");
    const { combatFrame, COMBAT_STYLES } =
      await import("/src/combat-animation.ts");
    const reports = [],
      sheets = [];
    for (const group of [
      "world",
      "ragefire",
      "shadowfang",
      "duskwood",
    ] as const) {
      const atlas = new Image();
      atlas.src = `/art/${group}-sprites.png`;
      await atlas.decode();
      const entries = Object.entries(CREATURE_ART).filter(
        ([name, art]) => art.atlas === group && name !== "blackguard",
      );
      for (const style of COMBAT_STYLES) {
        const sheet = document.createElement("canvas");
        sheet.width = 150 + 6 * 116;
        sheet.height = 40 + entries.length * 134;
        const c = sheet.getContext("2d")!;
        c.fillStyle = "#16231e";
        c.fillRect(0, 0, sheet.width, sheet.height);
        c.fillStyle = "#e4d5a3";
        c.font = "16px sans-serif";
        c.fillText(
          `${group}: ${style} preparation, release and recovery`,
          12,
          25,
        );
        for (const [row, [name, art]] of entries.entries()) {
          const crop = creatureCrop(
            group,
            art.index,
            atlas.naturalWidth,
            atlas.naturalHeight,
          );
          const hashes = [],
            frames = [];
          let edgeAlpha = 0,
            visible = Infinity;
          c.font = "12px sans-serif";
          c.fillStyle = "#d9d8bc";
          c.fillText(name, 8, 40 + row * 134 + 60);
          c.fillText(art.rig, 8, 40 + row * 134 + 78);
          for (let pose = 0; pose < 6; pose++) {
            const frame = createAnimationFrame(
              atlas,
              crop,
              art.rig,
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
              for (let x = 0; x < 144; x++)
                if (data[(y * 144 + x) * 4 + 3]) {
                  pixels++;
                  if (x < 2 || y < 2 || x >= 142 || y >= 142) edgeAlpha++;
                }
            visible = Math.min(visible, pixels);
            c.drawImage(frame, 150 + pose * 116, 40 + row * 134, 116, 116);
            c.fillStyle = "#869786";
            c.fillText(
              String(pose + 1),
              203 + pose * 116,
              40 + row * 134 + 128,
            );
          }
          let changed = 0;
          for (let offset = 0; offset < frames[1].length; offset += 4)
            if (
              frames[1]
                .slice(offset, offset + 4)
                .some((v, i) => v !== frames[2][offset + i])
            )
              changed++;
          reports.push({
            name,
            style,
            rig: art.rig,
            unique: new Set(hashes).size,
            edgeAlpha,
            visible,
            changed,
          });
        }
        sheets.push({
          name: `${group}-${style}`,
          data: sheet.toDataURL("image/png"),
        });
      }
    }
    return { reports, sheets };
  });
  expect(result.reports).toHaveLength(105);
  for (const row of result.reports) {
    expect(row.unique, `${row.name}/${row.style}`).toBe(6);
    expect(row.edgeAlpha, row.name).toBe(0);
    expect(row.visible, row.name).toBeGreaterThan(500);
    expect(row.changed, row.name).toBeGreaterThan(40);
  }
  await mkdir("output/screenshots", { recursive: true });
  for (const sheet of result.sheets)
    await writeFile(
      `output/screenshots/creature-attacks-${sheet.name}-0.22.png`,
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
  await writeFile(
    "output/creature-combat-frames-0.22.json",
    JSON.stringify(result.reports, null, 2) + "\n",
  );
});

test("all creature contact hits and four real ranged launches gesture on their own objects with immune/range/cap guards", async ({
  page,
}) => {
  await setup(page);
  const report = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    const results = [],
      actions: any[] = [];
    const original = r.onEnemyAction.bind(r);
    r.onEnemyAction = (a: any) => {
      actions.push(a);
      original(a);
    };
    for (const type of Object.keys(CREATURE_ART)) {
      g.enemies = [];
      g.projectiles = [];
      g.player.invulnerable = 0;
      g.player.shield = 10000;
      const e = g.spawnEnemy(10, false, 0, false, type);
      e.speed = 0;
      e.attackTimer = 1e6;
      const before = actions.length;
      g.update(1 / 60);
      r.render();
      r.render();
      const hit = r.creaturePose(e, 44);
      g.update(1 / 60);
      r.render();
      results.push({
        type,
        frame: hit.frame,
        mirror: hit.mirror,
        count: actions.length - before,
      });
    }
    const ranged = [];
    for (const type of ["wraith", "defias", "cultist", "dusk_mage"]) {
      g.enemies = [];
      g.projectiles = [];
      const e = g.spawnEnemy(700, false, 0, false, type);
      e.speed = 0;
      e.attackTimer = 0;
      const before = actions.length;
      g.update(1 / 60);
      const far = actions.length - before;
      e.x = 300;
      g.update(1 / 60);
      r.render();
      r.render();
      const pose = r.creatureCombatAnimator.sample(e, g.time),
        launched = actions.length - before;
      g.projectiles = Array.from({ length: 500 }, () => ({
        ...g.projectiles[0],
        x: 10000,
        y: 10000,
        vx: 0,
        vy: 0,
        life: 1000,
        hit: new Set(),
      }));
      e.attackTimer = 0;
      g.update(1 / 60);
      ranged.push({
        type,
        far,
        launched,
        capped: actions.length - before,
        pose,
      });
    }
    return {
      results,
      ranged,
      cache: r.creatureCache.size,
      heroCache: r.frameCache.size,
    };
  });
  expect(report.results).toHaveLength(36);
  for (const row of report.results) {
    expect(row.frame, row.type).toBeGreaterThanOrEqual(14);
    expect(row.mirror).toBe(true);
    expect(row.count).toBe(1);
  }
  for (const row of report.ranged) {
    expect(row.far).toBe(0);
    expect(row.launched).toBe(1);
    expect(row.capped).toBe(1);
    expect(row.pose.style).toBe(row.type === "defias" ? "shoot" : "cast");
  }
  expect(report.cache).toBeLessThanOrEqual(128);
  expect(report.heroCache).toBe(0);
});

test("all fifteen guardians prepare throughout their actual warning and release/recover in both phases and patterns", async ({
  page,
}) => {
  for (const zone of [
    "elwynn",
    "westfall",
    "tirisfal",
    "duskwood",
    "deadmines",
    "ragefire",
    "shadowfang",
  ]) {
    await setup(page, zone);
    const reports = await page.evaluate(async (zone) => {
      const { DUNGEONS } = await import("/src/dungeon.ts"),
        { BOSS_IDENTITIES } = await import("/src/expedition.ts");
      const { combatFrame } = await import("/src/combat-animation.ts");
      const g = (window as any).__enemyCombatGame,
        r = (window as any).__enemyCombatRenderer;
      const route = DUNGEONS.find((route: any) => route.id === zone);
      const guardians = route
        ? route.stages.map((stage: any, index: number) => ({
            type: stage.enemy,
            stage: index,
          }))
        : [{ type: BOSS_IDENTITIES[zone].enemy, stage: 0 }];
      const reports = [];
      for (const guardian of guardians)
        for (const phase of [1, 2])
          for (const pattern of [0, 1]) {
            g.enemies = [];
            g.hazards = [];
            g.projectiles = [];
            g.dungeonStageIndex = guardian.stage;
            g.player.x = g.player.y = 0;
            g.player.hp = 10000;
            g.player.invulnerable = 0;
            const e = g.spawnEnemy(300, false, 0, true, guardian.type);
            g.boss = e;
            e.speed = 0;
            e.hp = e.maxHp = 1e6;
            if (phase === 2) e.hp *= 0.4;
            e.attackTimer = 0;
            g.bossState.attackIndex = pattern;
            g.update(1 / 60);
            r.render();
            r.render();
            e.attackTimer = 1e6;
            const start = r.creatureCombatAnimator.sample(e, g.time),
              deadline = g.bossState.attackUntil;
            while (g.time < deadline - 0.08) g.update(1 / 60);
            r.render();
            r.render();
            const preparation = r.creatureCombatAnimator.sample(e, g.time);
            const before = JSON.stringify({
              hazards: g.hazards,
              rng: g.rng.state,
              enemies: g.enemies,
            });
            r.render();
            const readOnly =
              before ===
              JSON.stringify({
                hazards: g.hazards,
                rng: g.rng.state,
                enemies: g.enemies,
              });
            while (g.time < deadline + 0.025) g.update(1 / 60);
            r.render();
            r.render();
            const release = r.creatureCombatAnimator.sample(e, g.time);
            const resolved = g.hazards.every(
              (h: any) => h.resolved || h.warning > 0,
            );
            while (g.time < deadline + 0.3) g.update(1 / 60);
            r.render();
            const expired = r.creatureCombatAnimator.sample(e, g.time);
            reports.push({
              type: guardian.type,
              phase,
              pattern,
              start,
              preparation,
              release,
              expired,
              readOnly,
              resolved,
              first: combatFrame(start.style, 0),
              ready: combatFrame(start.style, 1),
              released: combatFrame(start.style, 2),
            });
          }
      return reports;
    }, zone);
    for (const row of reports) {
      expect(row.start.frame, `${row.type}/${row.phase}/${row.pattern}`).toBe(
        row.first,
      );
      expect(row.preparation.frame).toBe(row.ready);
      expect(row.release.frame).toBe(row.released);
      expect(row.release.mirror).toBe(true);
      expect(row.expired).toBeNull();
      expect(row.readOnly).toBe(true);
      expect(row.resolved).toBe(true);
    }
  }
});

test("pause and individual freeze hold enemy poses; thaw, death and clock rewinds discard stale responses", async ({
  page,
}) => {
  await setup(page, "shadowfang");
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.dungeonStageIndex = 3;
    const e = g.spawnEnemy(300, false, 0, true, "arugal");
    g.boss = e;
    e.speed = 0;
    e.attackTimer = 0;
    g.update(1 / 60);
    e.attackTimer = 1e6;
    for (let i = 0; i < 20; i++) g.update(1 / 60);
    r.render();
    g.paused = true;
  });
  const held = await readCombatState(page);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    for (let i = 0; i < 80; i++) {
      g.update(1 / 60);
      r.render();
    }
  });
  expect(await readCombatState(page)).toEqual(held);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.paused = false;
    g.enemies[0].frozenUntil = g.time + 3;
    for (let i = 0; i < 140; i++) {
      g.update(1 / 60);
      if (i === 90) g.castBossAttack(g.enemies[0]);
      r.render();
    }
  });
  const frozen = await readPose(page);
  expect(frozen.pose.frame).toBe(held.pose.frame);
  expect(frozen.time).toBeGreaterThan(held.time + 2);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.enemies[0].frozenUntil = 0;
    r.render();
  });
  expect((await readPose(page)).gesture).toBeNull();
  const reset = await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer,
      e = g.enemies[0];
    g.castBossAttack(e);
    r.render();
    g.time -= 0.1;
    r.render();
    const rewind = r.creatureCombatAnimator.sample(e, g.time);
    g.castBossAttack(e);
    r.render();
    g.damageEnemy(e, 1e8, "frostbolt");
    const dead = r.creatureCombatAnimator.sample(e, g.time);
    return { rewind, dead, killed: e.dead };
  });
  expect(reset.rewind).toBeNull();
  expect(reset.dead).toBeNull();
  expect(reset.killed).toBe(true);
});

test("live reduced motion and animation disabling discard boss gestures and cancel prioritized construction", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    const e = g.spawnEnemy(300, false, 0, true, "gnoll");
    g.boss = e;
    e.speed = 0;
    e.attackTimer = 0;
    g.update(1 / 60);
    r.render();
    r.animation = false;
    r.render();
  });
  expect((await readPose(page)).pose.frame).toBe(-1);
  expect((await readPose(page)).pending).toBe(0);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.castBossAttack(g.enemies[0]);
    r.render();
    r.animation = true;
    r.render();
  });
  expect((await readPose(page)).gesture).toBeNull();
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.castBossAttack(g.enemies[0]);
    r.render();
  });
  expect((await readPose(page)).pose.frame).toBeGreaterThanOrEqual(8);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => (window as any).__enemyCombatRenderer.render());
  expect((await readPose(page)).gesture).toBeNull();
  expect((await readPose(page)).pending).toBe(0);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.castBossAttack(g.enemies[0]);
    r.render();
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => (window as any).__enemyCombatRenderer.render());
  expect((await readPose(page)).gesture).toBeNull();
});

test("real charges and Shadow Port move the attacking guardian to actual hazard coordinates without changing its warning", async ({
  page,
}) => {
  for (const zone of ["elwynn", "shadowfang"]) {
    await setup(page, zone);
    const report = await page.evaluate((zone) => {
      const g = (window as any).__enemyCombatGame,
        r = (window as any).__enemyCombatRenderer;
      if (zone === "shadowfang") g.dungeonStageIndex = 3;
      const e = g.spawnEnemy(
        250,
        false,
        0,
        true,
        zone === "elwynn" ? "gnoll" : "arugal",
      );
      g.boss = e;
      e.speed = 0;
      g.bossState.attackIndex = zone === "elwynn" ? 0 : 1;
      g.castBossAttack(e);
      e.attackTimer = 1e6;
      const h = g.hazards.find(
          (h: any) => h.chargeId === e.id || h.teleportId === e.id,
        ),
        deadline = g.bossState.attackUntil;
      r.render();
      const warning = JSON.stringify(h);
      r.render();
      const unchanged = warning === JSON.stringify(h);
      while (g.time < deadline + 0.025) {
        g.update(1 / 60);
        r.render();
      }
      return {
        unchanged,
        resolved: h.resolved,
        x: e.x,
        y: e.y,
        target: h.end || h,
        pose: r.creaturePose(e, 44),
        gait: r.animator.actors.get(e).frame,
      };
    }, zone);
    expect(report.unchanged).toBe(true);
    expect(report.resolved).toBe(true);
    expect(report.x).toBe(report.target.x);
    expect(report.y).toBe(report.target.y);
    expect(report.pose.frame).toBeGreaterThanOrEqual(8);
    expect(report.gait).toBe(-1);
  }
});

test("missing atlases and code-drawn Mr. Smite retain attack gestures, movement, pause and readable health/warnings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    /\/art\/(world|ragefire|shadowfang|duskwood)-sprites\.png$/,
    (route) => route.abort(),
  );
  await setup(page, "deadmines");
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer;
    g.dungeonStageIndex = 1;
    const e = g.spawnEnemy(80, false, 0, true, "smite");
    g.boss = e;
    e.speed = 0;
    e.attackTimer = 0;
    e.hp = e.maxHp = 1e6;
    g.update(1 / 60);
    r.render();
    e.attackTimer = 1e6;
    g.setInput(-1, 0);
    for (let i = 0; i < 6; i++) g.update(1 / 60);
    r.render();
    g.paused = true;
  });
  const held = await readPose(page);
  expect(held.pose.frame).toBeGreaterThanOrEqual(14);
  expect(held.cache).toBe(0);
  await page.evaluate(() => {
    const r = (window as any).__enemyCombatRenderer;
    for (let i = 0; i < 20; i++) r.render();
  });
  expect(await readPose(page)).toEqual(held);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    (window as any).__enemyCombatRenderer.render();
    (window as any).__enemyCombatHud();
  });
  await page.screenshot({
    path: "output/screenshots/creature-attacks-fallback-390-0.22.png",
  });
  const fallbacks = await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer,
      poses = [];
    g.paused = false;
    g.boss = null;
    g.setInput(0, 0);
    g.dungeonStageIndex = 0;
    for (const type of ["wolf", "earthborer", "keep_worgen", "dusk_spider"]) {
      g.enemies = [];
      g.hazards = [];
      g.player.invulnerable = 0;
      const e = g.spawnEnemy(10, false, 0, false, type);
      e.speed = 0;
      e.attackTimer = 1e6;
      g.update(1 / 60);
      r.render();
      poses.push(r.creaturePose(e, 44).frame);
    }
    return { poses, cache: r.creatureCache.size, x: g.player.x };
  });
  expect(fallbacks.poses.every((frame) => frame >= 14)).toBe(true);
  expect(fallbacks.cache).toBe(0);
  expect(fallbacks.x).toBeLessThan(0);
  expect(errors).toEqual([]);
});

test("native combat with 400 enemies warms boss gestures fairly and preserves state/RNG and both cache budgets", async ({
  page,
}) => {
  await setup(page, "duskwood");
  const report = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const g = (window as any).__enemyCombatGame,
      r = (window as any).__enemyCombatRenderer,
      types = Object.keys(CREATURE_ART);
    for (let i = 0; i < 399; i++) {
      const e = g.spawnEnemy(
        100 + (i % 180),
        false,
        i * 2.399963,
        false,
        types[i % types.length],
      );
      e.hp = e.maxHp = 1e6;
      e.attackTimer = 0;
    }
    const boss = g.spawnEnemy(220, false, 0, true, "stitches");
    g.boss = boss;
    boss.hp = boss.maxHp = 1e6;
    boss.speed = 0;
    boss.attackTimer = 0;
    let creatureBuilt = 0,
      heroBuilt = 0,
      priorityBuilt = 0;
    const queueGet = r.creatureCache.get.bind(r.creatureCache);
    r.creatureCache.get = (
      key: string,
      create: () => HTMLCanvasElement,
      priority = false,
    ) =>
      queueGet(
        key,
        () => {
          if (priority) priorityBuilt++;
          return create();
        },
        priority,
      );
    for (const [cache, creature] of [
      [r.creatureCache.frames, true],
      [r.frameCache, false],
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
        projectiles: g.projectiles,
        hazards: g.hazards,
        pickups: g.pickups,
        bossState: g.bossState,
      });
    const times = [];
    let readOnly = true,
      maxCreatureBuilt = 0,
      maxHeroBuilt = 0,
      maxCache = 0,
      maxPending = 0,
      cachedBossFrames = 0,
      projectiles = 0;
    for (let i = 0; i < 180; i++) {
      await new Promise(requestAnimationFrame);
      g.setInput(Math.sin(i / 20), Math.cos(i / 20));
      g.player.resource = 100;
      if (i % 60 === 0) {
        g.player.activeCooldown = 0;
        g.activate();
      }
      if (i % 45 === 0)
        for (const e of g.enemies) if (!e.boss) e.attackTimer = 0;
      g.update(1 / 60);
      const before = snapshot();
      creatureBuilt = heroBuilt = 0;
      const start = performance.now();
      r.render();
      times.push(performance.now() - start);
      readOnly &&= before === snapshot();
      maxCreatureBuilt = Math.max(maxCreatureBuilt, creatureBuilt);
      maxHeroBuilt = Math.max(maxHeroBuilt, heroBuilt);
      maxCache = Math.max(maxCache, r.creatureCache.size);
      maxPending = Math.max(maxPending, r.creatureCache.pendingSize);
      cachedBossFrames = Math.max(
        cachedBossFrames,
        [...r.creatureCache.frames.frames.keys()].filter(
          (key: string) =>
            key.includes(":heavy:") && Number(key.split(":").at(-1)) >= 8,
        ).length,
      );
      projectiles = Math.max(
        projectiles,
        g.projectiles.filter((p: any) => p.enemy).length,
      );
    }
    times.sort((a, b) => a - b);
    return {
      readOnly,
      count: g.enemies.length,
      finite: g.enemies.every(
        (e: any) => Number.isFinite(e.x) && Number.isFinite(e.y),
      ),
      maxCreatureBuilt,
      maxHeroBuilt,
      maxCache,
      maxPending,
      priorityBuilt,
      cachedBossFrames,
      projectiles,
      averageMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
    };
  });
  expect(report.readOnly).toBe(true);
  expect(report.count).toBe(400);
  expect(report.finite).toBe(true);
  expect(report.maxCreatureBuilt).toBeLessThanOrEqual(1);
  expect(report.maxHeroBuilt).toBeLessThanOrEqual(2);
  expect(report.maxCache).toBeLessThanOrEqual(128);
  expect(report.maxPending).toBeLessThanOrEqual(128);
  expect(report.priorityBuilt).toBeGreaterThan(0);
  expect(report.cachedBossFrames).toBeGreaterThanOrEqual(4);
  expect(report.projectiles).toBeGreaterThan(0);
  expect(report.averageMs).toBeGreaterThan(0);
  expect(report.averageMs).toBeLessThan(35);
  expect(report.p95Ms).toBeLessThan(70);
  console.log("Creature attack Canvas CPU:", JSON.stringify(report));
  await writeFile(
    "output/creature-combat-render-0.22.json",
    JSON.stringify(report, null, 2) + "\n",
  );
});

test("production keyboard, focus recovery and phone pointer movement hold and resume a visible boss warning gesture", async ({
  page,
}) => {
  await setup(page, "elwynn", false);
  await page.evaluate(() => {
    const g = (window as any).__enemyCombatGame;
    const e = g.spawnEnemy(90, false, 0, true, "gnoll");
    g.boss = e;
    e.speed = 0;
    e.hp = e.maxHp = 1e6;
    e.attackTimer = 0;
  });
  await page.clock.runFor(120);
  const warning = await readPose(page);
  expect(warning.pose.frame).toBeGreaterThanOrEqual(14);
  await page.keyboard.press("Escape");
  const held = await readPose(page);
  await page.clock.runFor(1200);
  expect(await readPose(page)).toEqual(held);
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await page.keyboard.down("a");
  await page.clock.runFor(180);
  await page.keyboard.up("a");
  expect(
    await page.evaluate(() => (window as any).__enemyCombatGame.player.x),
  ).toBeLessThan(0);
  await page.screenshot({
    path: "output/screenshots/creature-attacks-warning-1440-0.22.png",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await readPose(page);
  await page.clock.runFor(1000);
  expect(await readPose(page)).toEqual(blurred);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  const pad = await page.locator(".touch-pad").boundingBox();
  expect(pad).not.toBeNull();
  const before = await page.evaluate(
    () => (window as any).__enemyCombatGame.player.x,
  );
  await page.mouse.move(pad!.x + pad!.width / 2 + 22, pad!.y + pad!.height / 2);
  await page.mouse.down();
  await page.clock.runFor(100);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__enemyCombatGame.player.x),
  ).toBeGreaterThan(before);
  expect((await readPose(page)).pose.frame).toBeGreaterThanOrEqual(14);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__enemyCombatGame,
        r = (window as any).__enemyCombatRenderer;
      return Math.abs(g.enemies[0].x - g.player.x) + 65 < r.width / 2;
    }),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "output/screenshots/creature-attacks-warning-390-0.22.png",
  });
});
