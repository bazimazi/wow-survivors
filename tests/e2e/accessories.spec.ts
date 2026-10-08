import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  freshSave,
  equip,
  gearComparison,
  SAVE_KEY,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { CLASSES, SLOTS } from "../../src/content";
import { ACCESSORY_GEAR } from "../../src/accessories";

test.use({ hasTouch: true });
const gear = (page: Page, id: string) => page.locator(`[data-gear-id="${id}"]`);
const discovery = (page: Page, id: string) =>
  page.locator(`[data-wardrobe-id="${id}"]`);
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.gold = 3000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const id of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[id] = 100;
  return s;
}
async function seed(page: Page, s: SaveData) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
async function field(page: Page, extra: string) {
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;window.__accessoryGame=this;${extra};`,
      ),
    });
  });
}
async function controlled(page: Page) {
  await page.clock.install({ time: new Date("2026-10-06T12:00:00Z") });
  await page.goto("/#camp");
  await page.clock.pauseAt(new Date("2026-10-06T12:00:01Z"));
}

test("legacy camp has fourteen empty-compatible sockets and both ring browsers use the same category", async ({
  page,
}) => {
  const s = ready(),
    before = structuredClone(s.heroes.mage.equipment);
  await seed(page, s);
  await page.goto("/#camp");
  await expect(page.locator(".equipment-socket")).toHaveCount(16);
  await page
    .getByRole("button", { name: "Empty ring ii slot", exact: true })
    .click();
  await expect(page.locator("#bag-slot")).toHaveValue("finger2");
  await expect(page.locator("#wardrobe-slot")).toHaveValue("finger1");
  await expect(page.locator(".wardrobe-card")).toHaveCount(12);
  await expect(discovery(page, "elwynn_ring")).toContainText("Elwynn Forest");
  await expect(discovery(page, "foundry_signet")).toContainText("Sneed");
  await page
    .getByRole("button", { name: "Browse wrists", exact: true })
    .click();
  await expect(page.locator("#wardrobe-slot")).toHaveValue("wrists");
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  await expect(page.locator(".wardrobe-card")).toHaveCount(12);
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment).toEqual(before);
});

test("real ring equips fill two slots; replacement previews match both deltas, cancellation is inert and selection saves", async ({
  page,
}) => {
  const s = ready();
  s.inventory.push("elwynn_ring", "westfall_ring", "tirisfal_ring");
  await seed(page, s);
  await page.goto("/#armory");
  await gear(page, "elwynn_ring")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await gear(page, "westfall_ring")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  const original = await saved(page);
  expect(original.heroes.mage.equipment.finger1).toBe("elwynn_ring");
  expect(original.heroes.mage.equipment.finger2).toBe("westfall_ring");
  await page.locator("#bag-slot").selectOption("finger2");
  await expect(page.locator(".gear-card")).toHaveCount(3);
  await gear(page, "tirisfal_ring")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose a ring to replace." }),
  ).toBeVisible();
  for (const slot of ["finger1", "finger2"] as const) {
    const review = page.locator(`[data-ring-slot="${slot}"]`),
      comparison = gearComparison(original, "tirisfal_ring", slot);
    await expect(review).toContainText(
      slot === "finger1" ? "Brookstone Band" : "Harvest Moon Ring",
    );
    for (const [key, value] of Object.entries(comparison)) {
      const text = `${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""}`;
      await expect(review.locator(".gear-comparison")).toContainText(text);
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.getByRole("dialog").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    await expect(page.locator("#toast-root .toast")).toHaveCount(0);
    for (const el of await page.getByRole("dialog").getByRole("button").all()) {
      const box = await el.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        width === 390 ? 844 : 1000,
      );
    }
    await mkdir("output/screenshots", { recursive: true });
    await page.screenshot({
      path: `output/screenshots/ring-review-${width}-0.24.png`,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page
    .getByRole("button", { name: "Keep current rings", exact: true })
    .click();
  expect((await saved(page)).heroes.mage.equipment).toEqual(
    original.heroes.mage.equipment,
  );
  await gear(page, "tirisfal_ring")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Replace Ring II", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const next = await saved(page);
  expect(next.heroes.mage.equipment.finger1).toBe("elwynn_ring");
  expect(next.heroes.mage.equipment.finger2).toBe("tirisfal_ring");
  expect(next.inventory).toContain("westfall_ring");
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment).toEqual(
    next.heroes.mage.equipment,
  );
});

test("malformed duplicate imports repair once and ring ii ownership protects sale/disenchant across heroes", async ({
  page,
}) => {
  const s = ready();
  s.inventory.push("elwynn_ring", "westfall_ring");
  s.heroes.mage.equipment.finger2 = "elwynn_ring";
  s.heroes.mage.equipment.finger1 = "elwynn_ring";
  s.heroes.warrior.equipment.finger2 = "westfall_ring";
  s.professions.enchanting = 100;
  s.training.enchanting = 2;
  await seed(page, s);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#import-file").setInputFiles({
    name: "paired-rings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page
    .getByRole("button", { name: "Import adventure", exact: true })
    .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  const repair = await saved(page);
  expect(repair.heroes.mage.equipment.finger1).toBe("elwynn_ring");
  expect(repair.heroes.mage.equipment.finger2).toBeUndefined();
  await expect(
    gear(page, "westfall_ring").getByRole("button", {
      name: "Disenchant Harvest Moon Ring",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    gear(page, "westfall_ring").locator('[data-action="sell"]'),
  ).toHaveCount(0);
  await page.locator("#hero-switch").selectOption("warrior");
  await page
    .getByRole("button", { name: "Unequip Harvest Moon Ring", exact: true })
    .click();
  await expect(
    gear(page, "westfall_ring").locator('[data-action="sell"]'),
  ).toBeVisible();
  await gear(page, "westfall_ring").locator('[data-action="sell"]').click();
  expect((await saved(page)).inventory).not.toContain("westfall_ring");
});

test("new crafting source links reach real Expert/Artisan recipes with exact grade costs and bracers equip", async ({
  page,
}) => {
  const s = ready();
  s.professions.tailoring = 225;
  s.training.tailoring = 4;
  await seed(page, s);
  await page.goto("/#armory");
  await page.getByRole("button", { name: "Plan your next discovery" }).click();
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  await page.locator("#wardrobe-slot").selectOption("wrists");
  await page.locator("#wardrobe-source").selectOption("craft");
  await expect(page.locator(".wardrobe-card")).toHaveCount(8);
  await expect(discovery(page, "expert_cloth_bracers")).toContainText(
    "8 Silk Cloth",
  );
  await expect(discovery(page, "artisan_cloth_bracers")).toContainText(
    "Artisan",
  );
  await expect(discovery(page, "artisan_plate_bracers")).toContainText(
    "Class restricted",
  );
  await discovery(page, "expert_cloth_bracers")
    .getByRole("button", { name: "View crafting", exact: true })
    .click();
  await expect(page.locator("#recipe-filter")).toHaveValue("tailoring");
  const before = await saved(page);
  await page
    .locator('[data-recipe-id="craft_expert_cloth_bracers"]')
    .locator('[data-action="craft"]')
    .click();
  const crafted = await saved(page);
  expect(crafted.gold).toBe(before.gold - 65);
  expect(crafted.materials.silk_cloth).toBe(before.materials.silk_cloth - 8);
  expect(crafted.materials.kingsblood).toBe(before.materials.kingsblood - 2);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await gear(page, "expert_cloth_bracers")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  expect((await saved(page)).heroes.mage.equipment.wrists).toBe(
    "expert_cloth_bracers",
  );
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page
    .locator('[data-recipe-id="craft_artisan_cloth_bracers"]')
    .locator('[data-action="craft"]')
    .click();
  const artisan = await saved(page);
  expect(artisan.inventory).toContain("artisan_cloth_bracers");
  expect(artisan.materials.mageweave_cloth).toBe(
    before.materials.mageweave_cloth - 8,
  );
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.wrists).toBe(
    "expert_cloth_bracers",
  );
});

for (const source of ["cache", "guardian"] as const)
  test(`actual ${source} combat earns a ring, settlement keeps it unequipped and a later camp equip persists`, async ({
    page,
  }) => {
    const s = ready();
    s.selectedZone = source === "cache" ? "elwynn" : "deadmines";
    s.clearedZones = ["westfall"];
    const id = source === "cache" ? "elwynn_ring" : "foundry_signet";
    await seed(page, s);
    await field(
      page,
      `this.rng.pick=(pool)=>pool.find(v=>v?.id==='${id}'||v==='${id}')||pool[0]`,
    );
    await controlled(page);
    await page
      .getByRole("button", { name: /Begin (Expedition|Dungeon)/ })
      .click();
    const reward = await page.evaluate((source) => {
      const g = (window as any).__accessoryGame;
      if (source === "cache") {
        const l = g.landmarks.find((l: any) => l.kind === "cache");
        g.player.x = l.x;
        g.player.y = l.y;
        g.interact();
        for (const id of l.guardIds) {
          const e = g.enemies.find((e: any) => e.id === id);
          Object.assign(e, { hp: 1, x: g.player.x + 20, y: g.player.y });
        }
      } else {
        g.dungeonStageTime = g.dungeonStage.duration - 0.01;
        g.update(1 / 60);
        Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
      }
      g.useBomb();
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      return g.loot;
    }, source);
    expect(reward).toEqual([id]);
    if (source === "guardian")
      await page
        .getByRole("button", {
          name: "Return to camp with secured rewards",
          exact: true,
        })
        .click();
    else {
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Return to camp", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Return to camp", exact: true })
      .click();
    const earned = await saved(page);
    expect(earned.inventory).toContain(id);
    expect(earned.heroes.mage.equipment.finger1).toBeUndefined();
    expect(earned.heroes.mage.equipment.finger2).toBeUndefined();
    await page.getByRole("button", { name: "Armory", exact: true }).click();
    await gear(page, id)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await page.reload();
    expect((await saved(page)).heroes.mage.equipment.finger1).toBe(id);
    expect((await saved(page)).history).toHaveLength(1);
  });

test("all nine classes and six widths fit sixteen-slot camp and accessory catalog with 44px controls", async ({
  page,
}) => {
  const s = ready();
  s.inventory.push(...ACCESSORY_GEAR.map((g) => g.id));
  for (const c of CLASSES) {
    s.selectedClass = c.id;
    equip(s, "elwynn_ring");
    equip(s, "westfall_ring");
    equip(s, `artisan_${c.armor}_bracers`);
  }
  s.selectedClass = "mage";
  await seed(page, s);
  await page.goto("/#camp");
  const reports = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const c of CLASSES) {
      await page
        .getByRole("button", { name: "Expedition", exact: true })
        .click();
      await page.locator(`.class-card[data-id="${c.id}"]`).click();
      await expect(page.locator(".equipment-socket")).toHaveCount(SLOTS.length);
      for (const el of await page.locator(".equipment-socket").all()) {
        const box = await el.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page.getByRole("button", { name: "Armory", exact: true }).click();
      const guide = page.getByRole("button", {
        name: "Plan your next discovery",
      });
      if ((await guide.getAttribute("aria-expanded")) !== "true")
        await guide.click();
      await page.locator("#wardrobe-slot").selectOption("finger1");
      await expect(page.locator(".wardrobe-card")).toHaveCount(12);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      reports.push({ width, classId: c.id, slots: SLOTS.length, rings: 12 });
    }
    if (width === 390 || width === 1440) {
      await mkdir("output/screenshots", { recursive: true });
      await page
        .locator(".wardrobe-section")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.screenshot({
        path: `output/screenshots/accessory-armory-${width}-0.24.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Expedition", exact: true })
        .click();
      await page
        .locator(".equipment-heading")
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.screenshot({
        path: `output/screenshots/accessory-camp-${width}-0.24.png`,
        animations: "disabled",
      });
    }
  }
  await writeFile(
    "output/accessory-layout-0.24.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
});
