import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, SAVE_KEY } from "../../src/progression";

async function setup(page: Page) {
  const save = freshSave();
  save.settings.sound = false;
  save.settings.screenShake = false;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.route(/\/src\/main\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    await route.fulfill({
      response,
      body: body.replace(
        "renderer.shake = save.settings.screenShake;",
        "renderer.shake = save.settings.screenShake;window.__artGame=game;window.__artRenderer=renderer;",
      ),
    });
  });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__artGame,
      r = (window as any).__artRenderer;
    await r.ready();
    g.enemies = [];
    g.spells = [];
    g.pets = [];
    g.spawnTimer = 1e9;
    g.xpNeeded = 1e9;
  });
}
test("mouse aiming follows the camera while the cursor stays still", async ({
  page,
}) => {
  await setup(page);
  await page.mouse.move(1100, 450);
  await page.keyboard.down("v");
  await page.keyboard.down("d");
  await page.clock.runFor(700);
  const report = await page.evaluate(() => {
    const g = (window as any).__artGame,
      r = (window as any).__artRenderer;
    const target = r.worldPoint(1100, 450);
    return {
      x: g.player.x,
      aim: g.battleArt.aim.x,
      error: Math.hypot(
        g.battleArt.aim.x - target.x,
        g.battleArt.aim.y - target.y,
      ),
    };
  });
  expect(report.x).toBeGreaterThan(20);
  expect(report.aim).toBeGreaterThan(400);
  expect(report.error).toBeLessThan(3);
  await page.keyboard.up("d");
  await page.keyboard.up("v");
});

test("disabling motion keeps the authored hero's appearance and a static pose", async ({
  page,
}) => {
  await setup(page);
  const report = await page.evaluate(() => {
    const g = (window as any).__artGame,
      r = (window as any).__artRenderer;
    const cells: string[] = [],
      draw = r.ctx.drawImage.bind(r.ctx);
    r.ctx.drawImage = (...args: any[]) => {
      if (args[0]?.dataset?.heroMotion) cells.push(args[0].toDataURL());
      return draw(...args);
    };
    r.animation = false;
    g.player.facing = 0;
    r.render();
    g.time += 1;
    r.render();
    return { drawn: cells.length, distinct: new Set(cells).size };
  });
  expect(report).toEqual({ drawn: 2, distinct: 1 });
});
test("mouse aim, charged release, piercing, cooldown and pause cancel operate in the real game", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.evaluate(() => {
    const g = (window as any).__artGame;
    for (const x of [120, 230, 340]) {
      const e = g.spawnEnemy(x, false, 0);
      Object.assign(e, { x, y: 0, hp: 1000, maxHp: 1000, speed: 0, damage: 0 });
    }
  });
  await page.mouse.move(1130, 500);
  await page.mouse.down();
  await page.clock.runFor(900);
  await expect(page.locator("#battle-art-button")).toHaveAttribute(
    "data-state",
    "charging",
  );
  await expect(page.locator("#battle-art-button b")).toHaveText("RELEASE!");
  await page.screenshot({ path: "output/combat-1.4/mage-charge.png" });
  await page.mouse.up();
  await page.clock.runFor(180);
  await page.screenshot({ path: "output/combat-1.4/mage-release.png" });
  await page.clock.runFor(300);
  const hits = await page.evaluate(() =>
    (window as any).__artGame.enemies.map((e: any) => ({
      hp: e.hp,
      frozen: e.frozenUntil,
    })),
  );
  expect(hits.filter((e: any) => e.hp < 1000)).toHaveLength(3);
  await expect(page.locator("#battle-art-button")).toHaveAttribute(
    "data-state",
    "cooldown",
  );
  await page.clock.runFor(4400);
  await page.keyboard.down("v");
  await page.clock.runFor(300);
  await page.keyboard.press("Escape");
  await page.keyboard.up("v");
  expect(
    await page.evaluate(() => (window as any).__artGame.battleArt.charging),
  ).toBe(false);
  expect(
    await page.evaluate(() => (window as any).__artGame.battleArt.cooldown),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test("all nine hero sheets decode and draw distinct run, windup and release poses in both facings", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { CLASSES } = await import("/src/content.ts");
    const { prepareHeroMotion, drawHeroMotion } =
      await import("/src/hero-motion.ts");
    const sheet = document.createElement("canvas");
    sheet.width = 1080;
    sheet.height = 1080;
    sheet.id = "motion-contact";
    sheet.style.cssText =
      "position:relative;z-index:100;width:1080px;height:1080px";
    const c = sheet.getContext("2d")!;
    c.fillStyle = "#111a24";
    c.fillRect(0, 0, 1080, 1080);
    const reports = [];
    for (const [row, hero] of CLASSES.entries()) {
      await prepareHeroMotion(hero.id);
      const hashes = [];
      const samples = [
        { frame: 0, phase: 0 },
        { frame: 2, phase: 0.26 },
        { frame: 4, phase: 0.51 },
        { frame: 6, phase: 0.76 },
        { frame: 8, phase: 0 },
        { frame: 9, phase: 0 },
        { frame: 10, phase: 0 },
        { frame: 12, phase: 0 },
      ];
      for (const [col, pose] of samples.entries()) {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 110;
        const ctx = canvas.getContext("2d")!;
        ctx.translate(60, 100);
        const ok = drawHeroMotion(
          ctx,
          hero.id,
          { ...pose, mirror: false },
          1,
          0,
        );
        if (!ok) throw new Error(hero.id + " motion missing");
        const data = ctx.getImageData(0, 0, 120, 110).data;
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++)
          hash = Math.imul(hash ^ data[i], 16777619);
        hashes.push(hash);
        c.drawImage(canvas, 110 + col * 120, row * 120 + 10);
      }
      c.fillStyle = "#d7c19a";
      c.font = "14px serif";
      c.fillText(hero.name, 8, row * 120 + 60);
      reports.push({ hero: hero.id, unique: new Set(hashes).size });
      if (
        !drawHeroMotion(
          c,
          hero.id,
          { frame: 10, phase: 0, mirror: false },
          1,
          -1,
        )
      )
        throw new Error("back missing");
    }
    document.body.replaceChildren(sheet);
    return reports;
  });
  for (const row of result)
    expect(row.unique, row.hero).toBeGreaterThanOrEqual(7);
  await page.setViewportSize({ width: 1100, height: 1120 });
  await page
    .locator("#motion-contact")
    .screenshot({ path: "output/combat-1.4/hero-contact-sheet.png" });
});

test("keyboard charge cancels into a dash without consuming the Battle Art", async ({
  page,
}) => {
  await setup(page);
  await page.keyboard.down("v");
  await page.clock.runFor(350);
  await page.keyboard.press("Space");
  await page.keyboard.up("v");
  await page.clock.runFor(100);
  const state = await page.evaluate(() => {
    const g = (window as any).__artGame;
    return {
      charge: g.battleArt.charging,
      cooldown: g.battleArt.cooldown,
      dash: g.player.dashCooldown,
      shots: g.projectiles.length,
    };
  });
  expect(state).toMatchObject({ charge: false, cooldown: 0, shots: 0 });
  expect(state.dash).toBeGreaterThan(0);
});

test.describe("touch Battle Art", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("held pause keys and a captured touch stick cannot restart movement after a dialog", async ({
    page,
  }) => {
    await setup(page);
    const box = (await page.locator("#touch-pad").boundingBox())!;
    const x = box.x + box.width / 2 + 25,
      y = box.y + box.height / 2;
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await page.clock.runFor(100);
    expect(
      await page.evaluate(() => (window as any).__artGame.input.x),
    ).toBeGreaterThan(0);
    await page.keyboard.down("Escape");
    await page.keyboard.down("Escape");
    expect(await page.evaluate(() => (window as any).__artGame.paused)).toBe(
      true,
    );
    await page.keyboard.up("Escape");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => (window as any).__artGame.paused)).toBe(
      false,
    );
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 5, y }],
    });
    await page.clock.runFor(100);
    expect(await page.evaluate(() => (window as any).__artGame.input)).toEqual({
      x: 0,
      y: 0,
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await page.clock.runFor(100);
    expect(
      await page.evaluate(() => (window as any).__artGame.input.x),
    ).toBeGreaterThan(0);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  });
  test("the phone button charges while held, releases, and fits above the screen edge", async ({
    page,
  }) => {
    await setup(page);
    const button = page.locator("#battle-art-button"),
      box = (await button.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    expect(box.width).toBeGreaterThanOrEqual(44);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await page.clock.runFor(900);
    await expect(button).toHaveAttribute("data-state", "charging");
    await page.screenshot({ path: "output/combat-1.4/phone-charge.png" });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.clock.runFor(200);
    await expect(button).toHaveAttribute("data-state", "cooldown");
    expect(
      await page.evaluate(() =>
        (window as any).__artGame.projectiles.some(
          (p: any) => p.battleArt === "mage",
        ),
      ),
    ).toBe(true);
  });
});

test("controller left trigger charges and the right stick aims before release", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      index: 0,
      id: "Combat controller",
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    (window as any).__artPad = pad;
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [pad],
      configurable: true,
    });
  });
  await setup(page);
  const press = async (index: number, down: boolean) => {
    await page.evaluate(
      ({ index, down }) => {
        (window as any).__artPad.buttons[index] = {
          pressed: down,
          value: down ? 1 : 0,
        };
      },
      { index, down },
    );
    await page.clock.runFor(100);
  };
  await press(0, true);
  await press(0, false);
  await page.evaluate(() => {
    (window as any).__artPad.axes[2] = 1;
  });
  await press(6, true);
  await page.clock.runFor(800);
  await expect(page.locator("#battle-art-button kbd")).toHaveText("LT / L2");
  await expect(page.locator("#battle-art-button")).toHaveAttribute(
    "data-state",
    "charging",
  );
  await press(6, false);
  const shot = await page.evaluate(() => {
    const p = (window as any).__artGame.projectiles.find(
      (p: any) => p.battleArt,
    );
    return p ? { vx: p.vx, vy: p.vy, charged: p.charged } : null;
  });
  expect(shot?.vx).toBeGreaterThan(800);
  expect(Math.abs(shot?.vy || 0)).toBeLessThan(1);
  expect(shot?.charged).toBe(true);
});
