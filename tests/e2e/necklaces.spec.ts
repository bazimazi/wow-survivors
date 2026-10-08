import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  freshSave,
  equip,
  heroStats,
  gearComparison,
  SAVE_KEY,
  acceptProfessionQuest,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { CLASSES, SLOTS, MATERIALS } from "../../src/content";
import { NECKLACE_GEAR } from "../../src/necklaces";
import { ACCESSORY_GEAR } from "../../src/accessories";

test.use({ hasTouch: true });
const gear = (page: Page, id: string) => page.locator(`[data-gear-id="${id}"]`);
const formula = (page: Page, id: string) =>
  page.locator(`[data-formula="${id}"]`);
const saved = (page: Page): Promise<SaveData> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.gold = 3000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const id of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
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
async function guide(page: Page) {
  const toggle = page.getByRole("button", { name: "Plan your next discovery" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
  await page.locator("#wardrobe-slot").selectOption("neck");
}
async function controls(elements: Locator) {
  for (const el of await elements.all()) {
    const box = await el.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}

test("legacy saves retain their loadout with an empty necklace socket and eleven sourced necklaces", async ({
  page,
}) => {
  const s = ready();
  const before = heroStats(s);
  await seed(page, s);
  await page.goto("/#camp");
  await expect(page.locator(".equipment-socket")).toHaveCount(16);
  expect((await saved(page)).heroes.mage.equipment).toEqual(
    s.heroes.mage.equipment,
  );
  expect(heroStats(await saved(page))).toEqual(before);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await guide(page);
  await expect(page.locator(".wardrobe-card")).toHaveCount(11);
  await page.locator("#wardrobe-source").selectOption("world");
  await expect(page.locator(".wardrobe-card")).toHaveCount(4);
  await expect(
    page.locator('[data-wardrobe-id="duskwood_necklace"]'),
  ).toContainText("20");
  await page.locator("#wardrobe-source").selectOption("dungeon");
  await expect(page.locator(".wardrobe-card")).toHaveCount(7);
  await expect(page.locator('[data-wardrobe-id="smite_torque"]')).toContainText(
    "Mr. Smite",
  );
  await expect(
    page.locator('[data-wardrobe-id="moonlit_pendant"]'),
  ).toContainText("Arugal");
  await page.reload();
  expect(heroStats(await saved(page))).toEqual(before);
});

test("necklace equip and replacement compare exact stats, persist and protect shared ownership", async ({
  page,
}) => {
  const s = ready();
  s.inventory.push("elwynn_necklace", "moonlit_pendant");
  s.heroes.warrior.equipment.neck = "elwynn_necklace";
  await seed(page, s);
  await page.goto("/#armory");
  await page.locator("#bag-slot").selectOption("neck");
  await expect(page.locator(".gear-card")).toHaveCount(2);
  await gear(page, "elwynn_necklace")
    .getByRole("button", { name: "Equip item", exact: true })
    .tap();
  const before = await saved(page),
    stats = heroStats(before),
    delta = gearComparison(before, "moonlit_pendant");
  await gear(page, "moonlit_pendant")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  const after = await saved(page);
  for (const key of Object.keys(stats) as (keyof typeof stats)[])
    expect(heroStats(after)[key] - stats[key]).toBeCloseTo(delta[key] || 0, 8);
  await expect(
    gear(page, "elwynn_necklace").locator('[data-action="sell"]'),
  ).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).heroes.mage.equipment.neck).toBe(
    "moonlit_pendant",
  );
  await page.locator("#hero-switch").selectOption("warrior");
  await page
    .getByRole("button", { name: "Unequip Goldshire Keepsake", exact: true })
    .click();
  await gear(page, "elwynn_necklace").locator('[data-action="sell"]').click();
  expect((await saved(page)).inventory).not.toContain("elwynn_necklace");
  expect((await saved(page)).heroes.mage.equipment.neck).toBe(
    "moonlit_pendant",
  );
});

test("wrist reviews use exact graded costs, cancel freely, apply with keyboard and replace by touch across heroes", async ({
  page,
}) => {
  const s = ready();
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  s.inventory.push(
    "elwynn_wristwraps",
    "artisan_plate_bracers",
    "elwynn_necklace",
    "elwynn_ring",
  );
  s.heroes.mage.equipment.wrists = s.heroes.warrior.equipment.wrists =
    "elwynn_wristwraps";
  s.professionQuests.enchanting.chapter = 2;
  expect(acceptProfessionQuest(s, "enchanting")).toBe(true);
  await seed(page, s);
  await page.goto("/#armory");
  const options = await page
    .locator("#enchant-target option")
    .evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
  for (const id of ["artisan_plate_bracers", "elwynn_necklace", "elwynn_ring"])
    expect(options).not.toContain(id);
  expect(options).toContain("elwynn_wristwraps");
  await page.locator("#enchant-target").selectOption("elwynn_wristwraps");
  await expect(page.locator(".enchantment-card")).toHaveCount(4);
  await expect(formula(page, "wrists_vigor")).toContainText(
    "12 G · 3 Strange Dust · 1 Peacebloom",
  );
  await expect(formula(page, "wrists_guard")).toContainText(
    "25 G · 4 Soul Dust · 2 Tin Ore",
  );
  await expect(formula(page, "wrists_focus")).toContainText(
    "50 G · 6 Vision Dust · 3 Kingsblood",
  );
  await expect(formula(page, "wrists_recovery")).toContainText(
    "95 G · 8 Dream Dust · 4 Sungrass",
  );
  await page.getByText("Browse all 24 formulas", { exact: true }).click();
  await expect(page.locator(".enchantment-catalog p")).toHaveCount(24);
  const before = await saved(page);
  await formula(page, "wrists_focus")
    .getByRole("button", { name: "Review enchantment" })
    .click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await page.getByRole("button", { name: "Keep current item" }).click();
  expect(await saved(page)).toEqual(before);
  await formula(page, "wrists_focus")
    .getByRole("button", { name: "Review enchantment" })
    .click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await page
    .getByRole("button", {
      name: "Apply Spellthread Focus · 50 G",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  const focused = await saved(page);
  expect(focused.enchantments.elwynn_wristwraps).toBe("wrists_focus");
  expect(focused.gold).toBe(before.gold - 50);
  expect(focused.materials.vision_dust).toBe(before.materials.vision_dust - 6);
  expect(focused.materials.kingsblood).toBe(before.materials.kingsblood - 3);
  expect(focused.professionQuests.enchanting.progress.crafts).toBe(1);
  await expect(
    formula(page, "wrists_focus").getByRole("button"),
  ).toBeDisabled();
  for (const c of ["mage", "warrior"] as const) {
    expect(heroStats(focused, c).power - heroStats(before, c).power).toBe(4);
    expect(heroStats(focused, c).haste - heroStats(before, c).haste).toBe(2);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await formula(page, "wrists_recovery")
    .getByRole("button", { name: "Review replacement" })
    .tap();
  const review = page.getByRole("dialog");
  await expect(review).toContainText("Spellthread Focus will be removed");
  await expect(review).toContainText("-4% Damage");
  await expect(review).toContainText("-2% Attack speed");
  await review.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
  );
  await mkdir("output/screenshots", { recursive: true });
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await controls(review.locator("button"));
    await fits(page);
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: `output/screenshots/wrist-replacement-${width}-0.25.png`,
        animations: "disabled",
      });
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page
    .getByRole("button", {
      name: "Apply Evergreen Recovery · 95 G",
      exact: true,
    })
    .tap();
  const recovered = await saved(page);
  expect(recovered.enchantments.elwynn_wristwraps).toBe("wrists_recovery");
  expect(recovered.gold).toBe(before.gold - 145);
  expect(recovered.materials.dream_dust).toBe(before.materials.dream_dust - 8);
  expect(recovered.materials.sungrass).toBe(before.materials.sungrass - 4);
  await page.locator("#hero-switch").selectOption("warrior");
  await expect(page.locator(".loadout-panel")).toContainText(
    "Evergreen Recovery",
  );
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  const profession = page.locator(".profession-card").filter({
    has: page.getByRole("heading", { name: "Enchanting", exact: true }),
  });
  await profession
    .getByRole("button", { name: "Unlearn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unlearn profession", exact: true })
    .click();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.reload();
  expect((await saved(page)).enchantments.elwynn_wristwraps).toBe(
    "wrists_recovery",
  );
  await expect(page.locator(".loadout-panel")).toContainText(
    "Evergreen Recovery",
  );
});

test("low-level heroes cannot target advanced bracers or apply higher-skill wrist formulas", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.level = 3;
  s.professions.enchanting = 1;
  s.training.enchanting = 1;
  s.inventory.push(
    "elwynn_wristwraps",
    "artisan_cloth_bracers",
    "elwynn_necklace",
  );
  await seed(page, s);
  await page.goto("/#armory");
  await expect(
    gear(page, "elwynn_necklace").locator('[data-action="equip"]'),
  ).toBeDisabled();
  await expect(
    page.locator('#enchant-target option[value="artisan_cloth_bracers"]'),
  ).toHaveCount(0);
  await page.locator("#enchant-target").selectOption("elwynn_wristwraps");
  await expect(formula(page, "wrists_vigor").getByRole("button")).toBeEnabled();
  for (const id of ["wrists_guard", "wrists_focus", "wrists_recovery"])
    await expect(formula(page, id).getByRole("button")).toBeDisabled();
});

for (const source of ["cache", "guardian"] as const)
  test(`actual ${source} combat earns a necklace and one settlement preserves it for later equip`, async ({
    page,
  }) => {
    const s = ready(),
      id = source === "cache" ? "elwynn_necklace" : "smite_torque";
    s.selectedZone = source === "cache" ? "elwynn" : "deadmines";
    s.clearedZones = ["westfall"];
    s.supplies.bombs = 3;
    await seed(page, s);
    await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
      const response = await route.fetch(),
        body = await response.text(),
        marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
      expect(body).toContain(marker);
      await route.fulfill({
        response,
        body: body.replace(
          marker,
          `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;window.__necklaceGame=this;this.rng.pick=(pool)=>pool.find(v=>v?.id==='${id}'||v==='${id}')||pool[0];`,
        ),
      });
    });
    await page.clock.install({ time: new Date("2026-10-07T12:00:00Z") });
    await page.goto("/#camp");
    await page.clock.pauseAt(new Date("2026-10-07T12:00:01Z"));
    await page
      .getByRole("button", { name: /Begin (Expedition|Dungeon)/ })
      .click();
    let loot = await page.evaluate((source) => {
      const g = (window as any).__necklaceGame;
      const drain = () => {
        while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      };
      const kill = () => {
        g.dungeonStageTime = g.dungeonStage.duration - 0.01;
        g.update(1 / 60);
        drain();
        Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
        g.useBomb();
        drain();
      };
      if (source === "cache") {
        const l = g.landmarks.find((l: any) => l.kind === "cache");
        g.player.x = l.x;
        g.player.y = l.y;
        g.interact();
        for (const id of l.guardIds)
          Object.assign(
            g.enemies.find((e: any) => e.id === id),
            { hp: 1, x: g.player.x + 20, y: g.player.y },
          );
        g.useBomb();
        g.update(1 / 60);
        drain();
      } else {
        kill();
      }
      return g.loot;
    }, source);
    if (source === "guardian") {
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
      loot = await page.evaluate(() => {
        const g = (window as any).__necklaceGame;
        g.dungeonStageTime = g.dungeonStage.duration - 0.01;
        g.update(1 / 60);
        while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
        Object.assign(g.boss, { hp: 1, x: g.player.x + 20, y: g.player.y });
        g.useBomb();
        return g.loot;
      });
    }
    expect(loot).toContain(id);
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
    expect((await saved(page)).inventory).toContain(id);
    expect((await saved(page)).heroes.mage.equipment.neck).toBeUndefined();
    await page.getByRole("button", { name: "Armory", exact: true }).click();
    await gear(page, id)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await page.reload();
    expect((await saved(page)).heroes.mage.equipment.neck).toBe(id);
    expect((await saved(page)).history).toHaveLength(1);
  });

test("nine classes at six widths fit sixteen sockets, eleven necklaces and four wrist formulas with 44px controls", async ({
  page,
}) => {
  test.setTimeout(150000);
  const s = ready();
  s.inventory.push(
    ...NECKLACE_GEAR.map((g) => g.id),
    ...ACCESSORY_GEAR.map((g) => g.id),
  );
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  for (const c of CLASSES) {
    s.selectedClass = c.id;
    equip(s, "moonlit_pendant");
    equip(s, `artisan_${c.armor}_bracers`);
  }
  s.selectedClass = "mage";
  await seed(page, s);
  await page.goto("/#camp");
  const reports = [];
  await mkdir("output/screenshots", { recursive: true });
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const c of CLASSES) {
      await page
        .getByRole("button", { name: "Expedition", exact: true })
        .click();
      await page.locator(`.class-card[data-id="${c.id}"]`).click();
      await expect(page.locator(".equipment-socket")).toHaveCount(SLOTS.length);
      await controls(page.locator(".equipment-socket"));
      await fits(page);
      if (c.id === "mage" && [390, 1440].includes(width)) {
        await page
          .locator(".equipment-heading")
          .evaluate((el) => el.scrollIntoView({ block: "center" }));
        await page.screenshot({
          path: `output/screenshots/necklace-camp-${width}-0.25.png`,
          animations: "disabled",
        });
      }
      await page.getByRole("button", { name: "Armory", exact: true }).click();
      await guide(page);
      await expect(page.locator(".wardrobe-card")).toHaveCount(11);
      await fits(page);
      if (c.id === "mage" && [390, 1440].includes(width)) {
        await page
          .locator(".wardrobe-section")
          .evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: `output/screenshots/necklace-guide-${width}-0.25.png`,
          animations: "disabled",
        });
      }
      await page
        .locator("#enchant-target")
        .selectOption(`artisan_${c.armor}_bracers`);
      await expect(page.locator(".enchantment-card")).toHaveCount(4);
      await controls(page.locator(".enchantment-card button"));
      await fits(page);
      if (c.id === "mage" && [390, 1440].includes(width)) {
        await page
          .locator(".enchanting-table")
          .evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: `output/screenshots/wrist-formulas-${width}-0.25.png`,
          animations: "disabled",
        });
      }
      reports.push({
        width,
        classId: c.id,
        slots: SLOTS.length,
        necklaces: 11,
        wristFormulas: 4,
      });
    }
  }
  await writeFile(
    "output/necklace-layout-0.25.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
});
