import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

async function setup(page: Page, zone = "elwynn", legacy = false) {
  const s = freshSave();
  s.settings.sound = false;
  s.selectedZone = zone;
  s.heroes.mage.level = 20;
  s.clearedZones = ["westfall", "tirisfal", "ragefire", "shadowfang"];
  s.supplies.bombs = 5;
  if (legacy) {
    delete (s.settings as any).music;
    delete (s.settings as any).musicVolume;
  }
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "const music = new MusicPlayer();";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__music=music;window.__sound=sound;`,
      ),
    });
  });
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.xpNeeded=1e9;this.spawnTimer=1e6;this.stats.regen=0;window.__musicGame=this;`,
      ),
    });
  });
  await page.goto("/");
}
async function enable(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".music-settings .setting-row").click();
  await expect(page.locator("#music-status")).toContainText(
    "Now playing: Lanterns at Rest",
  );
}
const saved = (p: Page) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const audio = (p: Page) =>
  p.evaluate(() => {
    const m = (window as any).__music;
    return {
      state: m.context?.state || "absent",
      cue: m.cue,
      playing: m.transport.playing,
      step: m.transport.step,
      voices: m.voices.size,
      buses: m.buses.size,
      volume: m.volume,
      status: m.status(),
      busLevel: m.bus?.gain.value,
      contextTime: m.context?.currentTime || 0,
    };
  });
async function start(page: Page) {
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: /^Begin (Expedition|Dungeon)$/, exact: true })
    .click();
}

test("legacy muted saves remain silent; native music controls, independent effects and volume survive reload", async ({
  page,
}) => {
  await setup(page, "elwynn", true);
  expect((await audio(page)).state).toBe("absent");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator('[data-setting="music"]')).not.toBeChecked();
  await expect(page.locator('[data-setting="sound"]')).not.toBeChecked();
  await page.locator(".music-settings .setting-row").click();
  await expect(page.locator("#music-status")).toContainText(
    "Now playing: Lanterns",
  );
  expect((await audio(page)).state).toBe("running");
  await page.getByLabel("Music volume", { exact: true }).selectOption("75");
  expect((await saved(page)).settings).toMatchObject({
    music: true,
    musicVolume: 75,
    sound: false,
  });
  expect(await page.evaluate(() => (window as any).__sound.enabled)).toBe(
    false,
  );
  await page.reload();
  expect((await audio(page)).state).toBe("absent");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Music volume", { exact: true })).toHaveValue(
    "75",
  );
  await expect(page.locator("#music-status")).toContainText(
    "Now playing: Lanterns",
  );
});

test("twelve actual offline Web Audio compositions render finite non-silent waveforms", async ({
  page,
}) => {
  await setup(page);
  const reports = await page.evaluate(async () => {
    const { MUSIC_SCORES, musicStep } = await import("/src/music.ts");
    const { scheduleMusicNote } = await import("/src/music-player.ts");
    const rows = [];
    for (const cue of Object.keys(MUSIC_SCORES)) {
      const context = new OfflineAudioContext(1, 44100, 22050);
      const stepLength = 30 / MUSIC_SCORES[cue].tempo;
      for (let step = 0; 0.05 + step * stepLength < 1.8; step++)
        for (const note of musicStep(cue, step, 0.05 + step * stepLength, true))
          scheduleMusicNote(context, context.destination, note);
      const buffer = await context.startRendering(),
        samples = buffer.getChannelData(0);
      let peak = 0,
        energy = 0,
        finite = true;
      for (const sample of samples) {
        finite &&= Number.isFinite(sample);
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      rows.push({ cue, finite, peak, rms: Math.sqrt(energy / samples.length) });
    }
    return rows;
  });
  expect(reports).toHaveLength(12);
  for (const row of reports) {
    expect(row.finite).toBe(true);
    expect(row.peak).toBeGreaterThan(0.005);
    expect(row.peak).toBeLessThan(0.3);
    expect(row.rms).toBeGreaterThan(0.001);
  }
  console.log("Original score waveform checks:", JSON.stringify(reports));
});

test("actual native playback changes from woodland to boss and danger, and frozen choices hold musical time", async ({
  page,
}) => {
  await setup(page);
  await enable(page);
  await start(page);
  await expect.poll(async () => (await audio(page)).cue).toBe("woodland");
  await expect.poll(async () => (await audio(page)).voices).toBeGreaterThan(0);
  await page.evaluate(() => {
    const g = (window as any).__musicGame;
    g.time = g.zone.duration;
    g.update(1 / 60);
    g.boss.attackTimer = 1e6;
    g.player.hp = g.player.maxHp * 0.2;
  });
  await expect.poll(async () => (await audio(page)).cue).toBe("boss");
  await expect
    .poll(async () => (await audio(page)).status)
    .toContain("danger pulse");
  expect((await audio(page)).busLevel).toBeGreaterThan(0);
  await page.evaluate(() => {
    const g = (window as any).__musicGame;
    g.xp = g.xpNeeded;
  });
  await expect(page.locator(".upgrade-card")).toHaveCount(3);
  await expect.poll(async () => (await audio(page)).playing).toBe(false);
  const paused = await audio(page);
  await page.waitForTimeout(400);
  expect((await audio(page)).step).toBe(paused.step);
  await expect.poll(async () => (await audio(page)).voices).toBe(0);
  await page.locator(".upgrade-card").first().click();
  await expect.poll(async () => (await audio(page)).playing).toBe(true);
  expect((await audio(page)).cue).toBe("boss");
  expect((await audio(page)).voices).toBeLessThanOrEqual(32);
});

test("native mute stops sources, effect settings stay independent, and pause/blur require gameplay resume", async ({
  page,
}) => {
  await setup(page);
  await enable(page);
  await page.getByLabel("Music volume", { exact: true }).selectOption("0");
  await expect(page.locator("#music-status")).toContainText("muted");
  await expect.poll(async () => (await audio(page)).voices).toBe(0);
  await page.getByLabel("Music volume", { exact: true }).selectOption("50");
  await expect(page.locator("#music-status")).toContainText("Now playing");
  await page.locator(".music-settings .setting-row").click();
  await expect.poll(async () => (await audio(page)).voices).toBe(0);
  await page.locator(".music-settings .setting-row").click();
  await start(page);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audio(page)).playing).toBe(false);
  const paused = await audio(page);
  await page.waitForTimeout(250);
  expect((await audio(page)).step).toBe(paused.step);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audio(page)).playing).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
  await expect.poll(async () => (await audio(page)).playing).toBe(false);
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Resume expedition" }).click();
  await expect.poll(async () => (await audio(page)).playing).toBe(true);
});

test("a real mine guardian defeat plays recovery; partial return plays defeat and victory plays its own score", async ({
  page,
}) => {
  await setup(page, "deadmines");
  await enable(page);
  await start(page);
  await expect.poll(async () => (await audio(page)).cue).toBe("mine");
  await page.evaluate(() => {
    const g = (window as any).__musicGame;
    g.dungeonStageTime = g.dungeonStage.duration;
    g.update(1 / 60);
    g.boss.hp = 1;
    g.boss.x = g.player.x + 10;
    g.boss.y = g.player.y;
    g.boss.attackTimer = 1e6;
  });
  await page.keyboard.press("e");
  await expect(page.locator(".checkpoint-choice")).toHaveCount(3);
  await expect.poll(async () => (await audio(page)).cue).toBe("recovery");
  expect((await audio(page)).playing).toBe(true);
  await page
    .getByRole("button", { name: "Return to camp with secured rewards" })
    .click();
  await expect.poll(async () => (await audio(page)).cue).toBe("defeat");
  expect((await audio(page)).playing).toBe(true);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect.poll(async () => (await audio(page)).cue).toBe("camp");
  await page.locator('[data-action="zone"][data-id="elwynn"]').click();
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(() => {
    const g = (window as any).__musicGame;
    g.time = g.zone.duration;
    g.update(1 / 60);
    g.boss.hp = 1;
    g.boss.x = g.player.x + 10;
    g.boss.y = g.player.y;
    g.boss.attackTimer = 1e6;
  });
  await page.keyboard.press("e");
  await expect(
    page.getByRole("heading", { name: "A legend begins." }),
  ).toBeVisible();
  await expect.poll(async () => (await audio(page)).cue).toBe("victory");
  expect((await audio(page)).playing).toBe(true);
  expect((await audio(page)).status).toContain("The Road Remembers");
});

test("blocked or absent Web Audio reports status while movement and saving continue", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as any).AudioContext = class {
      constructor() {
        throw Error("Audio unavailable");
      }
    };
  });
  await setup(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".music-settings .setting-row").click();
  await expect(page.locator("#music-status")).toContainText("unavailable");
  expect((await saved(page)).settings.music).toBe(true);
  await start(page);
  await page.keyboard.down("d");
  await page.waitForTimeout(200);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(() => (window as any).__musicGame.player.x),
  ).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("music controls are controller-accessible and preserve modal focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__pad = {
      id: "Music fixture",
      index: 2,
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [null, null, (window as any).__pad],
    });
  });
  await setup(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const press = async (button: number) => {
    await page.evaluate((button) => {
      const b = (window as any).__pad.buttons[button];
      b.pressed = true;
      b.value = 1;
    }, button);
    await page.waitForTimeout(70);
    await page.evaluate((button) => {
      const b = (window as any).__pad.buttons[button];
      b.pressed = false;
      b.value = 0;
    }, button);
    await page.waitForTimeout(70);
  };
  await press(0);
  await press(8);
  await page.locator('[data-setting="music"]').focus();
  await press(0);
  await expect(page.locator("#music-status")).toContainText("Now playing");
  await press(7);
  await expect(page.getByLabel("Music volume", { exact: true })).toBeFocused();
  await press(15);
  await expect(page.getByLabel("Music volume", { exact: true })).toHaveValue(
    "75",
  );
  expect((await saved(page)).settings.musicVolume).toBe(75);
  await press(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("music settings fit six widths with visible controls and scrollable status", async ({
  page,
}) => {
  await setup(page);
  await enable(page);
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.locator(".music-settings").scrollIntoViewIfNeeded();
    const rect = (await page
      .getByLabel("Music volume", { exact: true })
      .boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("#music-status")).toContainText("Now playing");
    await page.screenshot({
      path: `output/screenshots/music-settings-${width}.png`,
      animations: "disabled",
    });
  }
});
