import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

test.use({ hasTouch: true });

async function setup(page: Page, zone = "elwynn") {
  const save = freshSave();
  save.settings.sound = false;
  save.gold = 1000;
  save.selectedZone = zone;
  save.clearedZones = ["westfall", "tirisfal", "ragefire", "shadowfang"];
  save.supplies.potions = 5;
  save.supplies.bombs = 5;
  save.heroes.mage.level = 20;
  save.heroes.mage.travel = { riding: 1, form: false, selected: "horse" };
  save.mounts = ["horse"];
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      (window as any).__pad = {
        index: 3,
        id: "Fixture standard controller",
        connected: true,
        mapping: "standard",
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({
          pressed: false,
          value: 0,
        })),
      };
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [null, null, null, (window as any).__pad],
      });
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
        `${marker}\nthis.enemies=[];this.spells=[];this.pets=[];this.xpNeeded=1e9;this.spawnTimer=1e6;this.stats.regen=0;window.__controllerGame=this;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function buttons(page: Page, indices: number[] = [], duration = 48) {
  await page.evaluate((indices) => {
    const p = (window as any).__pad;
    p.buttons = p.buttons.map((_: unknown, i: number) => ({
      pressed: indices.includes(i),
      value: indices.includes(i) ? 1 : 0,
    }));
  }, indices);
  await page.clock.runFor(duration);
}
async function press(page: Page, index: number) {
  await buttons(page, [index]);
  await buttons(page);
}
async function axes(page: Page, x: number, y = 0, rightY = 0, duration = 48) {
  await page.evaluate(
    (axes) => {
      (window as any).__pad.axes = axes;
    },
    [x, y, 0, rightY],
  );
  await page.clock.runFor(duration);
}
async function connect(page: Page) {
  await press(page, 0); // Discovery press is deliberately consumed.
  await press(page, 8); // Engage controller UI without selecting a camp action.
  await expect(page.locator("body")).toHaveClass(/controller-input/);
}
async function begin(page: Page) {
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .focus();
  await press(page, 0);
  await expect(page.locator("#game-canvas")).toBeVisible();
}
const game = (page: Page) =>
  page.evaluate(() => {
    const g = (window as any).__controllerGame;
    return {
      x: g.player.x,
      y: g.player.y,
      time: g.time,
      active: g.player.activeCooldown,
      dash: g.player.dashCooldown,
      hp: g.player.hp,
      actives: g.trialActives,
      input: g.input,
      level: g.level,
      stage: g.dungeonStageIndex,
      travel: g.travel.mode,
    };
  });
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);

test("controller camp tabs, focus cycling and selectors use real persisted UI handlers", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await press(page, 5);
  await expect(page.locator(".nav-link.active")).toHaveAttribute(
    "data-id",
    "talents",
  );
  await expect(page.locator(".nav-link.active")).toBeFocused();
  await press(page, 7);
  await expect(
    page.locator('[data-action="nav"][data-id="spellbook"]'),
  ).toBeFocused();
  await press(page, 0);
  await expect(page.locator(".nav-link.active")).toHaveAttribute(
    "data-id",
    "spellbook",
  );
  await page.locator("#hero-switch").focus();
  await press(page, 15);
  await expect(page.locator("#hero-switch")).toBeFocused();
  const selected = (await saved(page)).selectedClass;
  expect(selected).not.toBe("mage");
  await expect(page.locator("#hero-switch")).toHaveValue(selected);
  await press(page, 14);
  expect((await saved(page)).selectedClass).toBe("mage");
  await press(page, 4);
  await expect(page.locator(".nav-link.active")).toHaveAttribute(
    "data-id",
    "talents",
  );
  await press(page, 5);
  await page.reload();
  await expect(page.locator("#hero-switch")).toHaveValue("mage");
  await expect(page.locator(".nav-link.active")).toHaveAttribute(
    "data-id",
    "spellbook",
  );
});

test("settings checkboxes, modal containment, right-stick scrolling and back work with a controller", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await page.getByRole("button", { name: "Settings", exact: true }).focus();
  await buttons(page, [0], 500);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#controller-status")).toContainText("connected");
  // Holding confirm must not activate the newly focused close button.
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await buttons(page);
  await press(page, 7);
  const checkbox = page.locator('[data-setting="sound"]');
  await expect(checkbox).toBeFocused();
  await press(page, 0);
  await expect(checkbox).toBeChecked();
  expect((await saved(page)).settings.sound).toBe(true);
  await page.evaluate(() => {
    const modal = document.querySelector(".modal")!;
    modal.scrollTop = 0;
  });
  await axes(page, 0, 0, 1, 500);
  expect(
    await page.locator(".modal").evaluate((el) => el.scrollTop),
  ).toBeGreaterThan(0);
  await axes(page, 0);
  for (let i = 0; i < 10; i++) {
    await press(page, 7);
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      ),
    ).toBe(true);
  }
  await press(page, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("analog combat, drift, class ability, dash and held supplies use production simulation", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await begin(page);
  await axes(page, 0.12, -0.12, 0, 300);
  expect((await game(page)).x).toBe(0);
  await axes(page, 0.6, 0, 0, 400);
  const half = (await game(page)).x;
  expect(half).toBeGreaterThan(10);
  await axes(page, 0);
  await press(page, 0);
  expect((await game(page)).active).toBeGreaterThan(0);
  expect((await game(page)).actives).toBe(1);
  await axes(page, 1);
  await press(page, 1);
  expect((await game(page)).dash).toBeGreaterThan(0);
  await axes(page, 0);
  await page.evaluate(() => {
    const g = (window as any).__controllerGame;
    g.player.hp = g.player.maxHp - 70;
  });
  const hp = (await game(page)).hp;
  await buttons(page, [2], 600);
  expect((await saved(page)).supplies.potions).toBe(4);
  expect((await game(page)).hp).toBe(hp + 45);
  await buttons(page);
  await buttons(page, [3], 600);
  expect((await saved(page)).supplies.bombs).toBe(4);
  await buttons(page);
  await press(page, 8);
  await expect(page.locator("#fieldwork-panel")).toBeVisible();
  await press(page, 5);
  await page.clock.runFor(2200);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await press(page, 5);
  await expect(page.locator("#travel-button")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator("#active-button kbd")).toHaveText("A / ×");
});

test("held controller input cannot choose an upgrade or leak back into combat", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await begin(page);
  await buttons(page, [0]);
  await page.evaluate(() => {
    const g = (window as any).__controllerGame;
    g.xp = g.xpNeeded;
  });
  await page.clock.runFor(700);
  await expect(page.locator(".upgrade-card")).toHaveCount(3);
  const before = await game(page);
  await page.clock.runFor(500);
  expect((await game(page)).time).toBe(before.time);
  await buttons(page);
  await press(page, 15);
  await expect(page.locator(".upgrade-card").nth(1)).toBeFocused();
  await buttons(page, [0], 500);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await game(page)).level).toBe(2);
  await page.evaluate(() => {
    (window as any).__controllerGame.player.activeCooldown = 0;
  });
  await page.clock.runFor(500);
  expect((await game(page)).actives).toBe(before.actives);
  expect((await game(page)).input).toEqual({ x: 0, y: 0 });
  await buttons(page);
  await press(page, 0);
  expect((await game(page)).actives).toBe(before.actives + 1);
});

test("landmark shoulders and controller blessing selection use the real encounter", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await begin(page);
  await page.evaluate(() => {
    const g = (window as any).__controllerGame;
    const shrine = g.landmarks.find((l: any) => l.kind === "shrine");
    g.player.x = shrine.x;
    g.player.y = shrine.y;
  });
  await press(page, 4);
  await expect(page.locator(".blessing-card")).toHaveCount(3);
  await press(page, 7);
  await press(page, 0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as any).__controllerGame.blessings.length,
    ),
  ).toBe(1);
});

test("real dungeon guardian defeat opens recovery and held bomb cannot consume supplies there", async ({
  page,
}) => {
  await setup(page, "deadmines");
  await connect(page);
  await page
    .getByRole("button", { name: "Begin Dungeon", exact: true })
    .focus();
  await press(page, 0);
  await page.evaluate(() => {
    const g = (window as any).__controllerGame;
    g.time = g.dungeonStage.duration;
    g.dungeonStageTime = g.dungeonStage.duration;
    g.update(1 / 60);
    g.boss.x = g.player.x + 30;
    g.boss.y = g.player.y;
    g.boss.hp = 1;
  });
  await buttons(page, [3], 500);
  await expect(page.getByRole("dialog")).toContainText("Choose a boon");
  expect((await saved(page)).supplies.bombs).toBe(4);
  await buttons(page);
  await press(page, 15);
  await press(page, 0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await game(page)).stage).toBe(1);
  expect((await saved(page)).supplies.bombs).toBe(4);
});

test("disconnect and focus loss freeze combat until release and explicit resume; results settle once", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await begin(page);
  await axes(page, 1, 0, 0, 200);
  await page.evaluate(() => {
    (window as any).__pad.connected = false;
  });
  await page.clock.runFor(80);
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
  const paused = await game(page);
  await page.clock.runFor(500);
  expect((await game(page)).time).toBe(paused.time);
  expect((await game(page)).input).toEqual({ x: 0, y: 0 });
  await page.evaluate(() => {
    const p = (window as any).__pad;
    p.connected = true;
    p.axes = [0, 0, 0, 0];
  });
  await buttons(page, [9], 500);
  await expect(page.getByRole("dialog")).toBeVisible();
  await buttons(page);
  await press(page, 9);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await buttons(page, [9]);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(400);
  await expect(page.getByRole("dialog")).toBeVisible();
  await buttons(page);
  await press(page, 9);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await press(page, 9);
  await press(page, 7); // Resume -> return to camp.
  await press(page, 0);
  await expect(page.getByRole("dialog")).toContainText(
    "Until the next adventure",
  );
  await press(page, 0);
  await expect(page.locator(".world-card")).toBeVisible();
  expect((await saved(page)).totals.runs).toBe(1);
});

test("keyboard and pointer restore hints and touch movement coexists with controller polling", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  await begin(page);
  await page.keyboard.down("d");
  await page.clock.runFor(250);
  await page.keyboard.up("d");
  expect((await game(page)).x).toBeGreaterThan(0);
  await expect(page.locator("#active-button kbd")).toHaveText("SPACE");
  await press(page, 8);
  await expect(page.locator("#active-button kbd")).toHaveText("A / ×");
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await expect(page.locator("#active-button kbd")).toHaveText("SPACE");
  // Real pointer events on the production touch pad, without a runtime input hook.
  await page.setViewportSize({ width: 390, height: 844 });
  const pad = page.locator("#touch-pad"),
    box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(250);
  expect((await game(page)).input.x).toBeGreaterThan(0);
  await page.mouse.up();
  await page.clock.runFor(80);
  expect((await game(page)).input).toEqual({ x: 0, y: 0 });
});

test("unsupported mappings and blocked browser access report status while ordinary controls work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await page.evaluate(() => {
    (window as any).__pad.mapping = "";
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.clock.runFor(80);
  await expect(page.locator("#controller-status")).toContainText(
    "unsupported layout",
  );
  await buttons(page, [0], 200);
  await expect(page.locator("body")).not.toHaveClass(/controller-input/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "getGamepads", {
      value: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.clock.runFor(80);
  await expect(page.locator("#controller-status")).toContainText("blocked");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.keyboard.down("d");
  await page.clock.runFor(300);
  await page.keyboard.up("d");
  expect((await game(page)).x).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("controller reviews require a separate confirmation and expandable guides keep native behavior", async ({
  page,
}) => {
  await setup(page, "deadmines");
  await connect(page);
  const summary = page.locator(".dungeon-loot-guide summary");
  await summary.focus();
  await press(page, 0);
  await expect(page.locator(".dungeon-loot-guide")).toHaveAttribute("open", "");
  await press(page, 0);
  await expect(page.locator(".dungeon-loot-guide")).not.toHaveAttribute(
    "open",
    "",
  );
  await press(page, 5);
  await press(page, 5);
  await expect(page.locator(".nav-link.active")).toHaveAttribute(
    "data-id",
    "spellbook",
  );
  const learn = page.locator('[data-action="review-technique"]').first();
  const id = (await learn.getAttribute("data-id"))!;
  await learn.focus();
  await buttons(page, [0], 700);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await saved(page)).gold).toBe(1000);
  expect((await saved(page)).heroes.mage.spellbook.learned).not.toContain(id);
  await buttons(page);
  await press(page, 7); // Close -> cancel.
  await press(page, 7); // Cancel -> confirm.
  await expect(page.locator('[data-action="confirm-technique"]')).toBeFocused();
  await buttons(page, [0], 700);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await saved(page)).gold).toBe(960);
  expect((await saved(page)).heroes.mage.spellbook.learned).toEqual([id]);
  await buttons(page);
  await page.reload();
  expect((await saved(page)).gold).toBe(960);
});

test("controller camp, focused settings and combat hints fit six viewport widths", async ({
  page,
}) => {
  await setup(page);
  await connect(page);
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Settings", exact: true }).focus();
    await press(page, 0);
    await expect(page.locator("#controller-status")).toBeVisible();
    await press(page, 7);
    await expect(page.locator('[data-setting="sound"]')).toBeFocused();
    const rect = await page.locator(".modal").boundingBox();
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `output/screenshots/controller-settings-${width}.png`,
      animations: "disabled",
    });
    await press(page, 1);
  }
  await begin(page);
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.clock.runFor(120);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("#active-button kbd")).toHaveText("A / ×");
    await page.screenshot({
      path: `output/screenshots/controller-combat-${width}.png`,
      animations: "disabled",
    });
  }
});
