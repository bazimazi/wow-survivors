import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import { mkdir, writeFile } from "node:fs/promises";

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
      `${marker}\nwindow.__creatureGame=game;window.__creatureRenderer=renderer;`,
    );
    // Controlled cases use native Canvas/performance time while advancing the real engine explicitly.
    if (manual) {
      expect(body).toContain("requestAnimationFrame(frame);");
      routed = routed.replaceAll("requestAnimationFrame(frame);", "");
    }
    await route.fulfill({ response, body: routed });
  });
  if (!manual)
    await page.clock.install({ time: new Date("2026-10-05T00:00:00Z") });
  await page.goto("/");
  if (!manual) await page.clock.pauseAt(new Date("2026-10-05T00:00:01Z"));
  await page
    .getByRole("button", { name: /^Begin (Expedition|Dungeon)$/ })
    .click();
  await page.evaluate(async () => {
    const r = (window as any).__creatureRenderer;
    await r.ready();
    r.render();
  });
}

test("all 35 creature crops have distinct bounded native gait frames and intact silhouettes", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const { creatureCrop, createAnimationFrame } =
      await import("/src/animation-canvas.ts");
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
      const sheet = document.createElement("canvas");
      sheet.width = 150 + 8 * 116;
      sheet.height = 40 + entries.length * 134;
      const c = sheet.getContext("2d")!;
      c.fillStyle = "#16231e";
      c.fillRect(0, 0, sheet.width, sheet.height);
      c.font = "16px sans-serif";
      c.fillStyle = "#e4d5a3";
      c.fillText(`${group}: eight movement poses`, 12, 25);
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
        for (let frame = 0; frame < 8; frame++) {
          const image = createAnimationFrame(atlas, crop, art.rig, frame);
          const data = image
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
              if (data[(y * 144 + x) * 4 + 3] > 0) {
                pixels++;
                if (x < 2 || y < 2 || x >= 142 || y >= 142) edgeAlpha++;
              }
          visible = Math.min(visible, pixels);
          c.drawImage(image, 150 + frame * 116, 40 + row * 134, 116, 116);
          c.fillStyle = "#869786";
          c.fillText(
            String(frame + 1),
            203 + frame * 116,
            40 + row * 134 + 128,
          );
        }
        let changed = 0;
        for (let offset = 0; offset < frames[0].length; offset += 4)
          if (
            frames[0]
              .slice(offset, offset + 4)
              .some((v, i) => v !== frames[4][offset + i])
          )
            changed++;
        reports.push({
          name,
          rig: art.rig,
          unique: new Set(hashes).size,
          changed,
          edgeAlpha,
          visible,
        });
      }
      sheets.push({ name: group, data: sheet.toDataURL("image/png") });
    }
    return { reports, sheets };
  });
  expect(result.reports).toHaveLength(35);
  for (const row of result.reports) {
    expect(row.unique, row.name).toBe(8);
    expect(row.changed, row.name).toBeGreaterThan(50);
    expect(row.visible, row.name).toBeGreaterThan(500);
    expect(row.edgeAlpha, row.name).toBe(0);
  }
  await mkdir("output/screenshots", { recursive: true });
  for (const sheet of result.sheets)
    await writeFile(
      `output/screenshots/creatures-${sheet.name}-0.20.png`,
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
  await writeFile(
    "output/creature-frames-0.20.json",
    JSON.stringify(result.reports, null, 2) + "\n",
  );
});

test("actual creature movement, slowing, freezing, idle and facing follow the combat clock", async ({
  page,
}) => {
  await setup(page);
  const report = await page.evaluate(() => {
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    const e = g.spawnEnemy(300, false, 0, false, "dusk_spider");
    e.attackTimer = 1e6;
    const read = () => {
      const state = r.animator.actors.get(e);
      return {
        frame: state.frame,
        phase: state.phase,
        mirror: state.mirror,
        x: e.x,
        y: e.y,
      };
    };
    const step = (frames: number) => {
      for (let i = 0; i < frames; i++) {
        g.update(1 / 60);
        r.render();
      }
      return read();
    };
    r.render();
    const initial = read(),
      moving = step(6);
    e.slowUntil = g.time + 10;
    e.slow = 0.25;
    const slowed = step(6);
    e.frozenUntil = g.time + 10;
    const frozen = step(60);
    e.frozenUntil = 0;
    const resumed = step(6);
    g.paused = true;
    const paused = step(30);
    g.paused = false;
    e.speed = 0;
    const idle = step(2);
    e.speed = 60;
    g.player.x = e.x + 300;
    const right = step(6);
    return {
      initial,
      moving,
      slowed,
      frozen,
      resumed,
      paused,
      idle,
      right,
      cache: r.creatureCache.size,
      pending: r.creatureCache.pendingSize,
    };
  });
  expect(report.initial.frame).toBe(-1);
  expect(report.moving.frame).toBeGreaterThanOrEqual(0);
  expect(report.moving.mirror).toBe(true);
  const normal = report.initial.x - report.moving.x,
    slow = report.moving.x - report.slowed.x;
  expect(slow).toBeCloseTo(normal * 0.25, 5);
  expect(report.slowed.phase - report.moving.phase).toBeCloseTo(slow / 32, 5);
  expect(report.frozen).toEqual(report.slowed);
  expect(report.resumed.x).toBeLessThan(report.frozen.x);
  expect(report.paused).toEqual(report.resumed);
  expect(report.idle.frame).toBe(-1);
  expect(report.idle.mirror).toBe(true);
  expect(report.right.mirror).toBe(false);
  expect(report.cache).toBeGreaterThan(0);
  expect(report.cache).toBeLessThanOrEqual(128);
  expect(report.pending).toBeLessThanOrEqual(128);
});

test("guardian warnings stop the gait and Arugal's real teleport establishes a neutral baseline", async ({
  page,
}) => {
  await setup(page, "shadowfang");
  const report = await page.evaluate(() => {
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    g.dungeonStageIndex = 3;
    const b = g.spawnEnemy(250, false, 0, true, "arugal");
    g.boss = b;
    b.attackTimer = 1e6;
    const read = () => {
      const state = r.animator.actors.get(b);
      return {
        frame: state.frame,
        phase: state.phase,
        mirror: state.mirror,
        x: b.x,
        y: b.y,
      };
    };
    const step = () => {
      g.update(1 / 60);
      r.render();
      return read();
    };
    r.render();
    for (let i = 0; i < 8; i++) step();
    const moving = read();
    g.bossState.attackIndex = 1;
    g.castBossAttack(b);
    const warning = step();
    const hazard = g.hazards.find((h: any) => h.teleportId === b.id);
    g.paused = true;
    const beforePause = JSON.stringify(hazard);
    for (let i = 0; i < 20; i++) step();
    const pauseHeld = beforePause === JSON.stringify(hazard);
    g.paused = false;
    let landing = warning;
    for (let i = 0; i < 120; i++) {
      landing = step();
      if (hazard.resolved) break;
    }
    const resumed = step();
    return {
      moving,
      warning,
      pauseHeld,
      landing,
      resumed,
      resolved: hazard.resolved,
      target: { x: hazard.x, y: hazard.y },
    };
  });
  expect(report.moving.frame).toBeGreaterThanOrEqual(0);
  expect(report.warning.frame).toBe(-1);
  expect(report.pauseHeld).toBe(true);
  expect(report.resolved).toBe(true);
  expect(report.landing.x).toBe(report.target.x);
  expect(report.landing.y).toBe(report.target.y);
  expect(report.landing.frame).toBe(-1);
  expect(report.resumed.frame).toBeGreaterThanOrEqual(0);
});

test("disabled animation and live reduced motion cancel queued creature work without stopping combat", async ({
  page,
}) => {
  await setup(page);
  const sample = async (mode: "normal" | "off" | "reduce") =>
    page.evaluate((mode) => {
      const g = (window as any).__creatureGame,
        r = (window as any).__creatureRenderer;
      const e =
        g.enemies[0] || g.spawnEnemy(300, false, 0, false, "earthborer");
      r.animation = mode !== "off";
      r.render();
      const before = e.x,
        cacheBefore = r.creatureCache.size;
      for (let i = 0; i < 4; i++) {
        g.update(1 / 60);
        r.render();
      }
      return {
        before,
        after: e.x,
        frame: r.animator.actors.get(e).frame,
        cacheBefore,
        cache: r.creatureCache.size,
        pending: r.creatureCache.pendingSize,
        enabled: r.motionEnabled,
      };
    }, mode);
  const normal = await sample("normal");
  expect(normal.frame).toBeGreaterThanOrEqual(0);
  const off = await sample("off");
  expect(off.after).toBeLessThan(off.before);
  expect(off.frame).toBe(-1);
  expect(off.cache).toBe(off.cacheBefore);
  expect(off.pending).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await sample("reduce");
  expect(reduced.enabled).toBe(false);
  expect(reduced.after).toBeLessThan(reduced.before);
  expect(reduced.frame).toBe(-1);
  expect(reduced.pending).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await sample("normal")).frame).toBeGreaterThanOrEqual(0);
});

test("missing creature atlases and code-drawn Mr. Smite keep movement, frozen poses and controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    /\/art\/(world|ragefire|shadowfang|duskwood)-sprites\.png/,
    (route) => route.abort(),
  );
  await setup(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    const types = [
      "wolf",
      "dusk_spider",
      "earthborer",
      "arugal",
      "smite",
      "unknown_creature",
    ];
    const enemies = types.map((type, i) =>
      g.spawnEnemy(250, false, (i * Math.PI) / 3, type === "smite", type),
    );
    enemies.forEach((e: any) => (e.attackTimer = 1e6));
    r.render();
    for (let i = 0; i < 12; i++) {
      g.update(1 / 60);
      r.render();
    }
    const moving = enemies.map((e: any) => ({ ...r.animator.actors.get(e) }));
    enemies.forEach((e: any) => (e.frozenUntil = g.time + 10));
    for (let i = 0; i < 12; i++) {
      g.update(1 / 60);
      r.render();
    }
    const frozen = enemies.map((e: any) => ({ ...r.animator.actors.get(e) }));
    r.animation = false;
    g.update(1 / 60);
    r.render();
    return {
      moving,
      frozen,
      disabled: enemies.map((e: any) => r.animator.actors.get(e).frame),
      cache: r.creatureCache.size,
    };
  });
  for (const [i, moving] of result.moving.entries()) {
    expect(moving.frame).toBeGreaterThanOrEqual(0);
    for (const key of ["frame", "phase", "mirror", "x", "y"] as const)
      expect(result.frozen[i][key]).toEqual(moving[key]);
  }
  expect(result.disabled).toEqual(Array(6).fill(-1));
  expect(result.cache).toBe(0);
  expect(errors).toEqual([]);
});

test("native moving 400-enemy rendering remains read-only, bounded and responsive under cache churn", async ({
  page,
}) => {
  await setup(page);
  const report = await page.evaluate(async () => {
    const { CREATURE_ART } = await import("/src/creature-animation.ts");
    const { creatureCrop } = await import("/src/animation-canvas.ts");
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    const types = Object.keys(CREATURE_ART);
    for (let i = 0; i < 400; i++) {
      const e = g.spawnEnemy(
        100 + (i % 180),
        false,
        i * 2.399963,
        false,
        types[i % types.length],
      );
      e.damage = 0;
      e.attackTimer = 1e6;
    }
    const snapshot = () =>
      JSON.stringify({
        time: g.time,
        rng: g.rng.state,
        player: g.player,
        enemies: g.enemies,
        hazards: g.hazards,
        projectiles: g.projectiles,
        pickups: g.pickups,
        spells: g.spells,
      });
    const times = [];
    let readOnly = true,
      maxCache = 0,
      maxPending = 0,
      maxBuilt = 0,
      moving = 0;
    const seen = new Set(),
      cachedKeys = new Set<string>();
    let built = 0;
    const cache = r.creatureCache.frames;
    const originalGet = cache.get.bind(cache);
    cache.get = (key: string, create: () => HTMLCanvasElement) =>
      originalGet(key, () => {
        built++;
        return create();
      });
    for (let i = 0; i < 180; i++) {
      await new Promise(requestAnimationFrame);
      // A broad mixed-roster stress fixture is harsher than any production destination.
      g.player.x = Math.sin(i / 20) * 100;
      g.player.y = Math.cos(i / 20) * 100;
      g.update(1 / 60);
      const before = snapshot();
      built = 0;
      const start = performance.now();
      r.render();
      times.push(performance.now() - start);
      readOnly &&= before === snapshot();
      maxBuilt = Math.max(maxBuilt, built);
      maxCache = Math.max(maxCache, r.creatureCache.size);
      maxPending = Math.max(maxPending, r.creatureCache.pendingSize);
      for (const key of cache.frames.keys()) cachedKeys.add(key);
      for (const e of g.enemies) {
        if (r.animator.actors.get(e)?.frame >= 0) {
          moving++;
          seen.add(e.type);
        }
      }
    }
    times.sort((a, b) => a - b);
    const cachedCrops = new Set();
    for (const art of Object.values(CREATURE_ART)) {
      const atlas = r.creatureAtlases[art.atlas];
      const crop = creatureCrop(
        art.atlas,
        art.index,
        atlas.naturalWidth,
        atlas.naturalHeight,
      );
      const prefix = `${atlas.src}:${crop.x}:${crop.y}:${crop.width}:${crop.height}:${art.rig}:`;
      if ([...cachedKeys].some((key) => key.startsWith(prefix)))
        cachedCrops.add(`${art.atlas}:${art.index}`);
    }
    return {
      readOnly,
      count: g.enemies.length,
      moving,
      animatedTypes: seen.size,
      cachedCrops: cachedCrops.size,
      maxBuilt,
      maxCache,
      maxPending,
      heroCache: r.frameCache.size,
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
  expect(report.moving).toBeGreaterThan(1000);
  expect(report.animatedTypes).toBe(36);
  expect(report.cachedCrops).toBe(35);
  expect(report.maxBuilt).toBeLessThanOrEqual(1);
  expect(report.maxCache).toBe(128);
  expect(report.maxPending).toBeLessThanOrEqual(128);
  expect(report.heroCache).toBeGreaterThan(0);
  expect(report.heroCache).toBeLessThanOrEqual(192);
  expect(report.averageMs).toBeGreaterThan(0);
  expect(report.averageMs).toBeLessThan(30);
  expect(report.p95Ms).toBeLessThan(50);
  console.log("Creature crowd Canvas CPU:", JSON.stringify(report));
  await writeFile(
    "output/creature-render-0.20.json",
    JSON.stringify(report, null, 2) + "\n",
  );
});

test("real keyboard movement animates creatures and paused phone/desktop scenes retain warnings and health", async ({
  page,
}) => {
  await setup(page, "duskwood", false);
  await page.evaluate(() => {
    const g = (window as any).__creatureGame;
    const types = [
      "dusk_spider",
      "dusk_rotted",
      "dusk_wolf",
      "dusk_mage",
      "stitches",
    ];
    types.forEach((type, i) => {
      const e = g.spawnEnemy(
        180 + i * 22,
        i === 3,
        i * 1.2,
        type === "stitches",
        type,
      );
      e.attackTimer = 1e6;
      if (i === 3) {
        e.guard = true;
        e.hp *= 0.8;
        e.flash = 0.15;
      }
    });
  });
  await page.keyboard.down("d");
  await page.clock.runFor(450);
  await page.keyboard.up("d");
  const moving = await page.evaluate(() => {
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    return {
      x: g.player.x,
      frames: g.enemies.map((e: any) => r.animator.actors.get(e)?.frame),
    };
  });
  expect(moving.x).toBeGreaterThan(0);
  expect(moving.frames).toHaveLength(5);
  moving.frames.forEach((frame: number) =>
    expect(frame).toBeGreaterThanOrEqual(0),
  );
  await page.evaluate(() => {
    const g = (window as any).__creatureGame;
    g.boss = g.enemies.find((e: any) => e.boss);
    g.castBossAttack(g.boss);
  });
  await page.clock.runFor(40);
  await page.keyboard.press("Escape");
  const held = await page.evaluate(() => {
    const g = (window as any).__creatureGame,
      r = (window as any).__creatureRenderer;
    return JSON.stringify({
      time: g.time,
      hazards: g.hazards,
      poses: g.enemies.map((e: any) => r.animator.actors.get(e)),
    });
  });
  await page.clock.runFor(1000);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__creatureGame,
        r = (window as any).__creatureRenderer;
      return JSON.stringify({
        time: g.time,
        hazards: g.hazards,
        poses: g.enemies.map((e: any) => r.animator.actors.get(e)),
      });
    }),
  ).toBe(held);
  // Hide only the pause dialog for captures; simulation remains paused.
  await page
    .locator("#modal-root")
    .evaluate(
      (element) => ((element as HTMLElement).style.visibility = "hidden"),
    );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.clock.runFor(40);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `output/screenshots/creature-combat-${width}-0.20.png`,
    });
  }
});
