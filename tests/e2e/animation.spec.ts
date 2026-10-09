import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";
import type { ClassId } from "../../src/content";
import { writeFile, mkdir } from "node:fs/promises";
test.use({ hasTouch: true });

async function setup(
  page: Page,
  hero: ClassId = "warrior",
  legacy = false,
  native = false,
) {
  const save = freshSave();
  save.selectedClass = hero;
  save.settings.sound = false;
  save.settings.screenShake = false;
  save.heroes[hero].level = 20;
  save.heroes[hero].travel = {
    riding: 1,
    form: true,
    selected:
      hero === "druid"
        ? "travel_form"
        : hero === "shaman"
          ? "ghost_wolf"
          : "horse",
  };
  save.mounts = ["horse"];
  if (legacy) delete (save.settings as any).animation;
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
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
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.nodes=[];this.landmarks=[];this.pickups=[];this.spawnTimer=1e6;this.xpNeeded=1e9;this.stats.regen=0;`,
      ),
    });
  });
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__animRenderer=renderer;window.__animGame=game;`,
      ),
    });
  });
  if (!native)
    await page.clock.install({ time: new Date("2026-10-05T00:00:00Z") });
  await page.goto("/");
  if (!native) await page.clock.pauseAt(new Date("2026-10-05T00:00:01Z"));
}
async function begin(page: Page, native = false) {
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(() => (window as any).__animRenderer.ready());
  if (native) await page.waitForTimeout(40);
  else await page.clock.runFor(40);
}
const pose = (page: Page) =>
  page.evaluate(() => {
    const r = (window as any).__animRenderer,
      g = (window as any).__animGame;
    const state = r.animator.actors.get(g.player);
    return {
      frame: state?.frame,
      phase: state?.phase,
      x: g.player.x,
      y: g.player.y,
      time: g.time,
      cache: r.frameCache.size,
      enabled: r.motionEnabled,
    };
  });

test("all 22 original sprite crops render bounded distinct native Canvas gait frames", async ({
  page,
}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    const { createAnimationFrame, heroCrop } =
      await import("/src/animation-canvas.ts");
    const groups = [
      {
        name: "heroes",
        url: "/art/hero-sprites.png",
        columns: 3,
        rows: [0, 0.336, 0.65, 1],
        names: [
          "Warrior",
          "Mage",
          "Rogue",
          "Hunter",
          "Paladin",
          "Priest",
          "Shaman",
          "Warlock",
          "Druid",
        ],
        rigs: [
          "biped",
          "robe",
          "biped",
          "biped",
          "biped",
          "robe",
          "biped",
          "robe",
          "robe",
        ],
      },
      {
        name: "companions",
        url: "/art/companions.png",
        columns: 2,
        rows: [0, 0.5, 1],
        names: ["Wolf", "Imp", "Bear Form", "Fire totem"],
        rigs: ["quadruped", "biped", "quadruped", "totem"],
      },
      {
        name: "travel",
        url: "/art/travel-sprites.png",
        columns: 3,
        rows: [0, 1 / 3, 2 / 3, 1],
        names: [
          "Horse",
          "Ram",
          "Wolf",
          "Saber",
          "Skeletal steed",
          "Paladin steed",
          "Warlock steed",
          "Travel Form",
          "Ghost Wolf",
        ],
        rigs: Array(9).fill("quadruped"),
      },
    ];
    const reports = [],
      sheets = [];
    for (const group of groups) {
      const atlas = new Image();
      atlas.src = group.url;
      await atlas.decode();
      const sheet = document.createElement("canvas");
      sheet.width = 110 + 8 * 116;
      sheet.height = 40 + group.names.length * 134;
      const c = sheet.getContext("2d")!;
      c.fillStyle = "#16231e";
      c.fillRect(0, 0, sheet.width, sheet.height);
      c.font = "16px sans-serif";
      c.fillStyle = "#e4d5a3";
      c.fillText(
        `${group.name}: contact, recoil, passing, high point; opposite foot`,
        12,
        25,
      );
      for (let index = 0; index < group.names.length; index++) {
        const row = Math.floor(index / group.columns),
          width = atlas.naturalWidth / group.columns;
        const crop =
          group.name === "heroes"
            ? heroCrop(index, atlas.naturalWidth, atlas.naturalHeight)
            : {
                x: (index % group.columns) * width,
                y: group.rows[row] * atlas.naturalHeight,
                width,
                height:
                  (group.rows[row + 1] - group.rows[row]) * atlas.naturalHeight,
              };
        const frames = [],
          hashes = [];
        let edgeAlpha = 0;
        c.font = "12px sans-serif";
        c.fillStyle = "#d9d8bc";
        c.fillText(group.names[index], 8, 40 + index * 134 + 65);
        for (let frame = 0; frame < 8; frame++) {
          const image = createAnimationFrame(
              atlas,
              crop,
              group.rigs[index],
              frame,
            ),
            data = image.getContext("2d")!.getImageData(0, 0, 144, 144).data;
          frames.push(data);
          let hash = 2166136261;
          for (let offset = 0; offset < data.length; offset++)
            hash = Math.imul(hash ^ data[offset], 16777619);
          hashes.push(hash);
          for (let y = 0; y < 144; y++)
            for (let x = 0; x < 144; x++)
              if (
                (x < 2 || y < 2 || x >= 142 || y >= 142) &&
                data[(y * 144 + x) * 4 + 3] > 0
              )
                edgeAlpha++;
          c.drawImage(image, 110 + frame * 116, 40 + index * 134, 116, 116);
          c.fillStyle = "#869786";
          c.fillText(
            String(frame + 1),
            163 + frame * 116,
            40 + index * 134 + 128,
          );
        }
        let feet = 0,
          upper = 0;
        for (let y = 0; y < 144; y++)
          for (let x = 0; x < 144; x++) {
            const offset = (y * 144 + x) * 4;
            if (
              frames[0]
                .slice(offset, offset + 4)
                .some((v, i) => v !== frames[4][offset + i])
            ) {
              if (y > 95) feet++;
              if (y < 70) upper++;
            }
          }
        reports.push({
          name: group.names[index],
          unique: new Set(hashes).size,
          feet,
          upper,
          edgeAlpha,
        });
      }
      sheets.push({ name: group.name, data: sheet.toDataURL("image/png") });
    }
    return { reports, sheets };
  });
  expect(result.reports).toHaveLength(22);
  for (const row of result.reports) {
    expect(row.unique, row.name).toBeGreaterThanOrEqual(4);
    expect(row.edgeAlpha, row.name).toBe(0);
    if (row.name !== "Fire totem")
      expect(row.feet, row.name).toBeGreaterThan(50);
  }
  await mkdir("output/screenshots", { recursive: true });
  for (const sheet of result.sheets)
    await writeFile(
      `output/screenshots/animation-${sheet.name}-0.19.png`,
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
  await writeFile(
    "output/animation-frames-0.19.json",
    JSON.stringify(result.reports, null, 2) + "\n",
  );
});

test("actual walking stops at idle and walls, holds through pause/choices/focus loss and resumes", async ({
  page,
}) => {
  await setup(page);
  await begin(page);
  expect((await pose(page)).frame).toBe(-1);
  await page.keyboard.down("d");
  await page.clock.runFor(160);
  expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Escape");
  const held = await pose(page);
  await page.clock.runFor(1200);
  expect(await pose(page)).toEqual(held);
  await page.keyboard.up("d");
  await page.keyboard.press("Escape");
  await page.keyboard.down("a");
  await page.clock.runFor(140);
  await page.keyboard.up("a");
  expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
  await page.clock.runFor(40);
  expect((await pose(page)).frame).toBe(-1);
  await page.evaluate(() => {
    const g = (window as any).__animGame;
    g.player.x = g.movementBounds.x;
  });
  await page.clock.runFor(40);
  await page.keyboard.down("d");
  await page.clock.runFor(200);
  expect((await pose(page)).frame).toBe(-1);
  await page.keyboard.up("d");
  await page.keyboard.down("a");
  await page.clock.runFor(160);
  await page.evaluate(() => {
    const g = (window as any).__animGame;
    g.xp = g.xpNeeded;
  });
  await page.clock.runFor(40);
  await expect(page.locator(".upgrade-card")).toHaveCount(3);
  const choice = await pose(page);
  await page.clock.runFor(500);
  expect(await pose(page)).toEqual(choice);
  await page.keyboard.up("a");
  await page.locator(".upgrade-card").first().click();
  await page.keyboard.down("a");
  await page.clock.runFor(120);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.keyboard.up("a");
  const blurred = await pose(page);
  await page.clock.runFor(500);
  expect(await pose(page)).toEqual(blurred);
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
});

test("settings migrate, retain independent music/effects, and disable gait after reload", async ({
  page,
}) => {
  await setup(page, "warrior", true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const control = page.locator('[data-setting="animation"]');
  await expect(control).toBeChecked();
  await control.locator("..").click();
  await expect(control).not.toBeChecked();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.settings).toMatchObject({
    animation: false,
    sound: false,
    music: false,
  });
  await page.reload();
  await page.clock.runFor(40);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(control).not.toBeChecked();
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toBeChecked();
  await control.locator("..").click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await begin(page);
  await page.keyboard.down("d");
  await page.clock.runFor(180);
  await page.keyboard.up("d");
  expect((await pose(page)).x).toBeGreaterThan(0);
  expect((await pose(page)).frame).toBe(-1);
  expect((await pose(page)).cache).toBe(0);
});

test("live device reduced-motion preference keeps walking static without changing movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await begin(page);
  await page.keyboard.down("d");
  await page.clock.runFor(180);
  expect((await pose(page)).frame).toBe(-1);
  expect((await pose(page)).cache).toBe(0);
  expect((await pose(page)).x).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(180);
  expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
  expect((await pose(page)).cache).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(40);
  expect((await pose(page)).frame).toBe(-1);
  await page.keyboard.up("d");
});

test("real wolf, imp and totem following and Bear Form use their separate locomotion rigs", async ({
  page,
}) => {
  await setup(page, "druid");
  await begin(page);
  await page.evaluate(async () => {
    const { SPELLS } = await import("/src/content.ts"),
      g = (window as any).__animGame;
    for (const spell of Object.values(SPELLS).filter(
      (s: any) => s.kind === "pet",
    ))
      g.addSpell((spell as any).id);
  });
  await page.keyboard.down("d");
  await page.clock.runFor(320);
  const pets = await page.evaluate(() => {
    const r = (window as any).__animRenderer,
      g = (window as any).__animGame;
    return g.pets.map((p: any) => ({
      id: p.spellId,
      frame: r.animator.actors.get(p)?.frame,
    }));
  });
  expect(pets).toHaveLength(3);
  for (const pet of pets) expect(pet.frame, pet.id).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("c");
  await page.clock.runFor(1300);
  await page.keyboard.press("c");
  await page.clock.runFor(80);
  expect(
    await page.evaluate(() => (window as any).__animGame.player.kit.form),
  ).toBe("bear");
  expect(
    await page.evaluate(() =>
      [...(window as any).__animRenderer.frameCache.frames.keys()].some(
        (k: any) => k.includes("companions.png") && k.includes("quadruped"),
      ),
    ),
  ).toBe(true);
  await page.keyboard.up("d");
});

for (const hero of ["warrior", "druid", "shaman"] as const)
  test(`${hero} actual travel summoning and movement animate the selected steed/form`, async ({
    page,
  }) => {
    await setup(page, hero);
    await begin(page);
    await page.keyboard.press("r");
    await page.clock.runFor(1450);
    expect(
      await page.evaluate(() => (window as any).__animGame.travel.active),
    ).toBe(true);
    await page.keyboard.down("d");
    await page.clock.runFor(200);
    expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
    expect(
      await page.evaluate(() =>
        [...(window as any).__animRenderer.frameCache.frames.keys()].some(
          (k: any) => k.includes("travel-sprites.png"),
        ),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    const held = await pose(page);
    await page.clock.runFor(450);
    expect(await pose(page)).toEqual(held);
    await page.keyboard.up("d");
  });

test("touch and controller movement drive gait while six widths keep animation settings usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__pad = {
      id: "Animation fixture",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [(window as any).__pad],
    });
  });
  await setup(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page
      .locator('[data-setting="animation"]')
      .locator("..")
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `output/screenshots/animation-settings-${width}.png`,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Close dialog" }).click();
  await begin(page);
  await page.evaluate(() => {
    (window as any).__pad.buttons[0] = { pressed: true, value: 1 };
  });
  await page.clock.runFor(40);
  await page.evaluate(() => {
    (window as any).__pad.buttons[0] = { pressed: false, value: 0 };
  });
  await page.clock.runFor(40);
  await page.evaluate(() => {
    (window as any).__pad.axes[0] = 0.7;
  });
  await page.clock.runFor(160);
  expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
  await page.evaluate(() => {
    (window as any).__pad.axes[0] = 0;
  });
  await page.clock.runFor(40);
  await page.setViewportSize({ width: 390, height: 844 });
  const box = (await page.locator("#touch-pad").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(180);
  expect((await pose(page)).frame).toBeGreaterThanOrEqual(0);
  await page.screenshot({
    path: "output/screenshots/animation-combat-390.png",
  });
  await page.mouse.up();
  await page.clock.runFor(40);
  expect((await pose(page)).frame).toBe(-1);
});

test("cached animation remains read-only and bounded in a 400-enemy scene; missing art keeps movement usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page, "warrior", false, true);
  await begin(page, true);
  await page.keyboard.down("d");
  await page.waitForTimeout(120);
  await page.keyboard.up("d");
  const report = await page.evaluate(async () => {
    const g = (window as any).__animGame,
      r = (window as any).__animRenderer;
    for (let i = 0; i < 400; i++) g.spawnEnemy(80 + (i % 250));
    g.paused = true;
    const snapshot = () =>
      JSON.stringify({
        random: g.rng.state,
        time: g.time,
        player: g.player,
        enemies: g.enemies,
        spells: g.spells,
        pickups: g.pickups,
        travel: g.travel,
      });
    const before = snapshot(),
      times = [];
    for (let i = 0; i < 80; i++) {
      await new Promise(requestAnimationFrame);
      const start = performance.now();
      r.render();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      readOnly: before === snapshot(),
      count: g.enemies.length,
      cache: r.frameCache.size,
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
  expect(report.cache).toBeGreaterThan(0);
  expect(report.cache).toBeLessThanOrEqual(192);
  expect(report.averageMs).toBeGreaterThan(0);
  expect(report.averageMs).toBeLessThan(30);
  expect(report.p95Ms).toBeLessThan(50);
  console.log("Animation dense-scene CPU:", JSON.stringify(report));
  await writeFile(
    "output/animation-render-0.19.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await page.route("**/art/hero-sprites.png", (route) => route.abort());
  await page.reload();
  await page.waitForTimeout(40);
  await begin(page, true);
  await page.keyboard.down("d");
  await page.waitForTimeout(140);
  await page.keyboard.up("d");
  expect((await pose(page)).x).toBeGreaterThan(0);
  expect((await pose(page)).cache).toBe(0);
  expect(errors).toEqual([]);
});
