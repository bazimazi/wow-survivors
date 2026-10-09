import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { freshSave, SAVE_KEY, awardGear, equip } from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { EPILOGUES } from "../../src/final-journey";
import { MATERIALS } from "../../src/content";

function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.settings.screenShake = false;
  s.gold = 5000;
  for (const h of Object.values(s.heroes)) h.level = 60;
  s.clearedZones = [
    "elwynn",
    "westfall",
    "tirisfal",
    "deadmines",
    "ragefire",
    "shadowfang",
    "duskwood",
  ];
  for (const m of Object.keys(MATERIALS))
    s.materials[m as keyof typeof MATERIALS] = 100;
  return s;
}
async function seed(page: Page, s = ready()) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
const saved = (page: Page): Promise<SaveData> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function field(page: Page, s = ready()) {
  await seed(page, s);
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const marker = "renderer.shake = save.settings.screenShake;";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nwindow.__completionGame=game;window.__completionRenderer=renderer;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-09T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-09T00:00:01Z"));
}
async function begin(page: Page) {
  await page.locator('[data-action="begin"]').click();
  await page.evaluate(async () => {
    const g = (window as any).__completionGame;
    await (window as any).__completionRenderer.ready();
    g.enemies = [];
    g.spells = [];
    g.pets = [];
    g.spawnTimer = 1e9;
    g.xpNeeded = 1e9;
    if (g.partner) {
      g.partner.spells = [];
      g.partner.pet = undefined;
    }
  });
}

test("delayed dialog autofocus preserves a keyboard-selected confirmation", async ({
  page,
}) => {
  await field(page);
  await page.getByRole("button", { name: "Talents", exact: true }).click();
  await page.locator('[data-action="review-talent-mode"]').click();
  const confirm = page.getByRole("button", {
    name: "Switch talent path",
    exact: true,
  });
  await confirm.focus();
  await page.clock.runFor(30);
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  expect((await saved(page)).heroes.mage.talentMode).toBe("classic");
});

test("co-op health and ability controls avoid timer, fieldwork and boss panels at phone, tablet and desktop widths", async ({
  page,
}) => {
  await field(page);
  await page.locator("#coop-hero").selectOption("warrior");
  await begin(page);
  const disjoint = (
    a: { x: number; y: number; width: number; height: number },
    b: typeof a,
  ) =>
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y;
  for (const width of [390, 800, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.clock.runFor(150);
    const partner = (await page.locator(".partner-hud").boundingBox())!;
    for (const selector of [".game-timer", ".world-hud", ".combat-briefing"])
      expect(
        disjoint(partner, (await page.locator(selector).boundingBox())!),
        `${width}: ${selector} · ${JSON.stringify(partner)}`,
      ).toBe(true);
    const control = (await page
      .locator('[data-action="partner-active"]')
      .boundingBox())!;
    expect(control.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => {
    const g = (window as any).__completionGame;
    g.time = g.zone.duration;
    g.update(1 / 60);
  });
  for (const width of [390, 800, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.clock.runFor(150);
    await expect(page.locator(".boss-hud")).toBeVisible();
    const boss = (await page.locator(".boss-hud").boundingBox())!;
    expect(
      disjoint((await page.locator(".partner-hud").boundingBox())!, boss),
      `${width}: partner / boss`,
    ).toBe(true);
    expect(
      disjoint((await page.locator(".world-hud").boundingBox())!, boss),
      `${width}: fieldwork / boss`,
    ).toBe(true);
  }
  await mkdir("output/screenshots", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(150);
  await page.screenshot({
    path: "output/screenshots/coop-boss-phone-1.0.png",
    animations: "disabled",
  });
});

test("a specialization support technique uses reviewed permanent learning and preparation", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#spellbook");
  const card = page.locator('[data-spell="icebarrier"]');
  await card.getByRole("button", { name: "Learn technique · 480 G" }).click();
  const before = await saved(page);
  await page
    .getByRole("dialog")
    .locator('[data-action="close-modal"]')
    .first()
    .click();
  expect(await saved(page)).toEqual(before);
  await card.getByRole("button", { name: "Learn technique · 480 G" }).click();
  await page
    .getByRole("dialog")
    .locator('[data-action="confirm-technique"]')
    .click();
  expect((await saved(page)).gold).toBe(before.gold - 480);
  await card.getByRole("button", { name: "Prepare for expedition" }).click();
  await page
    .getByRole("dialog")
    .locator('[data-action="confirm-prepare"]')
    .first()
    .click();
  await page.reload();
  const state = await saved(page);
  expect(state.heroes.mage.spellbook.learned).toContain("icebarrier");
  expect(state.heroes.mage.spellbook.prepared).toContain("icebarrier");
  expect(state.heroes.mage.spellbook.prepared).toHaveLength(4);
});

test("Classic path reviews refunds, exposes all nodes, gates rows and persists ranks", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.talents.m_frost = 1;
  await seed(page, s);
  await page.goto("/#talents");
  const before = await saved(page);
  await page.locator('[data-action="review-talent-mode"]').click();
  await expect(page.getByRole("dialog")).toContainText("51 at level 60");
  await page.getByRole("button", { name: "Keep current path" }).click();
  expect(await saved(page)).toEqual(before);
  await page.locator('[data-action="review-talent-mode"]').click();
  await page.getByRole("button", { name: "Switch talent path" }).click();
  await expect(page.locator(".talent-node")).toHaveCount(49);
  await expect(page.locator(".point-count")).toContainText("51");
  const arcane = page.locator(".talent-tree").first();
  await expect(arcane).toContainText("Arcane Power");
  const first = arcane.locator(".talent-node").first();
  await first.locator('[data-action="talent"]').click();
  await expect(first).toContainText("1 / 2 ranks");
  await expect(page.locator(".point-count")).toContainText("50");
  await expect(
    arcane
      .locator(".talent-node")
      .filter({
        has: page.getByRole("heading", { name: "Arcane Power", exact: true }),
      })
      .locator("button"),
  ).toBeDisabled();
  await page.reload();
  expect((await saved(page)).heroes.mage.talentMode).toBe("classic");
  await expect(page.locator(".point-count")).toContainText("50");
});

test("independent crafted copies retain rolls through attunement and per-copy destruction", async ({
  page,
}) => {
  const s = ready();
  s.professions.tailoring = 300;
  s.professions.enchanting = 300;
  s.training.tailoring = 4;
  s.training.enchanting = 4;
  awardGear(s, "dawnward_cloth_head", "first");
  await seed(page, s);
  await page.goto("/#professions");
  await page.locator("#recipe-filter").selectOption("tailoring");
  await page
    .locator('[data-action="craft-copy"][data-id="craft_dawnward_cloth_head"]')
    .click();
  let state = await saved(page);
  const copy = "dawnward_cloth_head~1",
    roll = state.itemStates[copy].roll;
  expect(state.inventory).toContain(copy);
  expect(roll).toBeGreaterThanOrEqual(0);
  expect(state.gold).toBe(4880);
  expect(state.materials.mageweave_cloth).toBe(92);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const card = page.locator(`[data-gear-id="${copy}"]`);
  await expect(card).toContainText("Independent roll");
  await card.getByRole("button", { name: "Attune item", exact: true }).click();
  await page.getByRole("dialog").locator('[data-affix="force"] button').click();
  state = await saved(page);
  expect(state.itemStates[copy].roll).toBe(roll);
  expect(state.itemStates[copy].owner).toBe("mage");
  expect(state.itemStates.dawnward_cloth_head?.owner).toBeUndefined();
  await page.reload();
  await expect(card).toContainText("Soulbound to Mage");
  await card.locator('[data-action="sell"]').click();
  state = await saved(page);
  expect(state.inventory).not.toContain(copy);
  expect(state.inventory).toContain("dawnward_cloth_head");
  expect(state.itemStates[copy]).toBeUndefined();
});

test("two owned rings equip in different slots and the northern guide shows properties on a phone", async ({
  page,
}) => {
  const s = ready();
  awardGear(s, "cathedral_ring", "first");
  const copy = awardGear(s, "cathedral_ring", "second")!;
  equip(s, "cathedral_ring", "finger1");
  equip(s, copy, "finger2");
  await seed(page, s);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#armory");
  await expect(
    page.locator(".loadout-slot").filter({ hasText: "Seal of the Last Dawn" }),
  ).toHaveCount(2);
  await expect(
    page.locator('[aria-label="Attributes and resistances"]'),
  ).toContainText("stamina");
  await page.locator(".endgame-guide summary").click();
  await expect(
    page.locator('[data-endgame-gear="cathedral_ring"]'),
  ).toContainText("2 owned copies");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the four cathedral guardians enforce resurrection and settle one final route victory", async ({
  page,
}) => {
  const s = ready();
  s.selectedZone = "scarlet";
  await field(page, s);
  await expect(page.locator(".zone-option")).toHaveCount(9);
  await begin(page);
  for (let room = 0; room < 4; room++) {
    const report = await page.evaluate(() => {
      const g = (window as any).__completionGame;
      g.enemies = [];
      g.spells = [];
      g.pets = [];
      g.player.hp = g.player.maxHp;
      g.dungeonStageTime = g.dungeonStage.duration;
      g.update(1 / 60);
      const boss = g.boss;
      g.damageEnemy(boss, 1e9, "cleave", false);
      const guard = g.enemies.find(
        (e: any) => e.guard && !e.dead && e !== boss,
      );
      const held = !!guard && !boss.dead;
      if (guard) {
        g.damageEnemy(guard, 1e9, "cleave", false);
        g.damageEnemy(boss, 1e9, "cleave", false);
      }
      return { held, bosses: g.dungeonBosses };
    });
    expect(report.bosses).toBe(room + 1);
    expect(report.held).toBe(room === 3);
    if (room < 3)
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
  }
  await expect(page.locator(".result-modal")).toContainText(
    "High Inquisitor Whitemane",
  );
  const state = await saved(page);
  expect(state.history[0].dungeonBosses).toBe(4);
  expect(state.clearedZones).toContain("scarlet");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.locator('[data-action="zone"][data-id="plaguelands"]').click();
  await expect(page.locator('[data-action="begin"]')).toBeEnabled();
});

test("final promises review exact rewards, cancel safely, claim once and show the completed journey", async ({
  page,
}) => {
  const s = ready();
  s.clearedZones.push("scarlet", "plaguelands");
  for (const q of EPILOGUES)
    s.journey[q.id] = { attempt: null, complete: false, claimed: true };
  s.journey.faction_argent = {
    attempt: "witnessed",
    complete: true,
    claimed: false,
  };
  s.campaigns.argent.chapter = 4;
  await seed(page, s);
  await page.goto("/#journal");
  const card = page.locator('[data-epilogue="faction_argent"]');
  await card.getByRole("button", { name: "Review conclusion" }).click();
  await expect(page.getByRole("dialog")).toContainText("350 G");
  const before = await saved(page);
  await page.getByRole("button", { name: "Keep the promise open" }).click();
  expect(await saved(page)).toEqual(before);
  await card.getByRole("button", { name: "Review conclusion" }).click();
  await page.getByRole("button", { name: "Conclude the story" }).click();
  const after = await saved(page);
  expect(after.gold).toBe(before.gold + 350);
  expect(after.inventory).toContain("epilogue_argent");
  await expect(
    page.getByRole("heading", { name: "Your journey is complete." }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await page.reload();
  expect((await saved(page)).gold).toBe(after.gold);
});

test("local co-op separates keyboard movement, holds during pause, revives allies and ends with once-only party rewards", async ({
  page,
}) => {
  await field(page);
  await page.locator("#coop-hero").selectOption("warrior");
  await begin(page);
  await expect(
    page.getByRole("complementary", { name: "Cooperative partner" }),
  ).toContainText("P2 · Warrior");
  await page.keyboard.down("d");
  await page.keyboard.down("ArrowDown");
  await page.clock.runFor(250);
  await page.keyboard.up("d");
  await page.keyboard.up("ArrowDown");
  const positions = await page.evaluate(() => {
    const g = (window as any).__completionGame;
    return [g.player.x, g.player.y, g.partner.player.x, g.partner.player.y];
  });
  expect(positions[0]).toBeGreaterThan(10);
  expect(positions[1]).toBe(0);
  expect(positions[3]).toBeGreaterThan(10);
  await page.keyboard.press("Escape");
  const time = await page.evaluate(() => (window as any).__completionGame.time);
  await page.clock.runFor(500);
  expect(await page.evaluate(() => (window as any).__completionGame.time)).toBe(
    time,
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const g = (window as any).__completionGame;
    Object.assign(g.player, { hp: 0, x: 0, y: 0 });
    Object.assign(g.partner.player, { x: 20, y: 0 });
  });
  await page.clock.runFor(3200);
  expect(
    await page.evaluate(() => (window as any).__completionGame.player.hp),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    const g = (window as any).__completionGame;
    g.xp = 100;
    g.gold = 40;
    g.player.hp = 0;
    g.partner.player.hp = 0;
    g.update(1 / 60);
  });
  await expect(page.locator(".result-modal")).toContainText(
    "partner also earns",
  );
  const after = await saved(page);
  expect(after.gold).toBe(5040);
  expect(after.totals.runs).toBe(1);
  expect(after.history[0].party?.classId).toBe("warrior");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.reload();
  expect((await saved(page)).totals.runs).toBe(1);
});

test("every back-facing hero has visible, transparent, distinct native Canvas animation frames", async ({
  page,
}) => {
  await field(page);
  await begin(page);
  const result = await page.evaluate(async () => {
    const { backHeroCrop, createAnimationFrame } =
        await import("/src/animation-canvas.ts"),
      { CLASSES } = await import("/src/content.ts");
    const atlas = new Image();
    atlas.src = "/art/hero-backs.png";
    await atlas.decode();
    const sheet = document.createElement("canvas");
    sheet.width = 500;
    sheet.height = 9 * 150;
    const c = sheet.getContext("2d")!;
    c.fillStyle = "#18251d";
    c.fillRect(0, 0, sheet.width, sheet.height);
    const rows = CLASSES.map((hero, index) => {
      const crop = backHeroCrop(
          hero.portrait,
          atlas.naturalWidth,
          atlas.naturalHeight,
        ),
        hashes = [],
        counts = [];
      for (const frame of [0, 2, 4]) {
        const canvas = createAnimationFrame(
          atlas,
          crop,
          ["mage", "priest", "warlock", "druid"].includes(hero.id)
            ? "robe"
            : "biped",
          frame,
        );
        const data = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261,
          visible = 0,
          edge = 0;
        for (let n = 0; n < data.length; n += 4) {
          hash = Math.imul(hash ^ data[n], 16777619);
          if (data[n + 3]) visible++;
          const px = (n / 4) % canvas.width,
            py = Math.floor(n / 4 / canvas.width);
          if (
            (px === 0 ||
              py === 0 ||
              px === canvas.width - 1 ||
              py === canvas.height - 1) &&
            data[n + 3]
          )
            edge++;
        }
        hashes.push(hash);
        counts.push(visible);
        c.drawImage(canvas, 55 + hashes.length * 140 - 140, index * 150);
        if (edge) throw Error(hero.id + " clipped frame");
      }
      c.fillStyle = "#e4d5a3";
      c.font = "11px sans-serif";
      c.fillText(hero.name, 2, index * 150 + 135);
      return {
        hero: hero.id,
        unique: new Set(hashes).size,
        visible: Math.min(...counts),
      };
    });
    return { rows, image: sheet.toDataURL() };
  });
  for (const row of result.rows) {
    expect(row.unique, row.hero).toBe(3);
    expect(row.visible, row.hero).toBeGreaterThan(500);
  }
  await mkdir("output/screenshots", { recursive: true });
  await writeFile(
    "output/screenshots/back-hero-frames-1.0.png",
    Buffer.from(result.image.split(",")[1], "base64"),
  );
  const directions = await page.evaluate(() => {
    const g = (window as any).__completionGame,
      r = (window as any).__completionRenderer,
      original = r.sprite.bind(r),
      sources: string[] = [];
    r.sprite = (atlas: HTMLImageElement, ...args: any[]) => {
      if (atlas.src.includes("hero")) sources.push(atlas.src);
      return original(atlas, ...args);
    };
    r.motionEnabled = false;
    g.player.facing = -Math.PI / 2;
    r.render();
    g.player.facing = Math.PI / 2;
    r.render();
    return sources;
  });
  expect(directions.some((url) => url.endsWith("hero-backs.png"))).toBe(true);
  expect(directions.some((url) => url.endsWith("hero-sprites.png"))).toBe(true);
});

test("party collection and phone movement stay usable, and choosing the partner as leader returns to solo", async ({
  page,
}) => {
  await field(page);
  await page.locator("#coop-hero").selectOption("warrior");
  await page.getByRole("button", { name: "Warrior Steel & fury" }).click();
  await expect(page.locator("#coop-hero")).toHaveValue("");
  await page.getByRole("button", { name: "Mage Frost & arcana" }).click();
  await page.locator("#coop-hero").selectOption("rogue");
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  await page.keyboard.down("a");
  await page.keyboard.down("ArrowRight");
  await page.clock.runFor(2200);
  await page.keyboard.up("a");
  await page.keyboard.up("ArrowRight");
  const distance = await page.evaluate(() => {
    const g = (window as any).__completionGame;
    return Math.hypot(
      g.player.x - g.partner.player.x,
      g.player.y - g.partner.player.y,
    );
  });
  expect(distance).toBeLessThanOrEqual(280.01);
  const collected = await page.evaluate(() => {
    const g = (window as any).__completionGame,
      p = g.partner.player;
    g.pickups = [
      {
        id: 900,
        x: p.x,
        y: p.y,
        kind: "chest",
        loot: "cathedral_ring",
        value: 0,
      },
    ];
    g.update(1 / 60);
    return g.loot;
  });
  expect(collected).toContain("cathedral_ring");
  await page.evaluate(() => {
    const g = (window as any).__completionGame;
    g.level = 3;
    g.partner.spells = [{ id: "flurry", rank: 1, timer: 0, orbitTimer: 0 }];
  });
  const report = await page.evaluate(() => {
    const g = (window as any).__completionGame,
      r = (window as any).__completionRenderer,
      original = g.orbitPositions.bind(g),
      actors: number[] = [];
    g.orbitPositions = (state: any, actor: any, bonuses: any) => {
      actors.push(actor?.x ?? g.player.x);
      return original(state, actor, bonuses);
    };
    r.render();
    return { actors, partner: g.partner.player.x };
  });
  expect(report.actors).toContain(report.partner);
});
