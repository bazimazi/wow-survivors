import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  freshSave,
  SAVE_KEY,
  equip,
  applyEnchantment,
  gearComparison,
  heroStats,
  acceptProfessionQuest,
} from "../../src/progression";
import type { SaveData } from "../../src/progression";
import { CLASSES, MATERIALS, GEAR_MAP, SLOTS } from "../../src/content";
import type { ClassId } from "../../src/content";
import {
  OFFHAND_GEAR,
  SHIELD_CLASSES,
  FOCUS_CLASSES,
} from "../../src/offhands";

test.use({ hasTouch: true });
const gear = (page: Page, id: string) => page.locator(`[data-gear-id="${id}"]`);
const discovery = (page: Page, id: string) =>
  page.locator(`[data-wardrobe-id="${id}"]`);
const saved = (page: Page): Promise<SaveData> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready(classId: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = classId;
  s.settings.sound = false;
  s.gold = 3000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  s.professions.blacksmithing = 225;
  s.professions.enchanting = 225;
  s.training.blacksmithing = 4;
  s.training.enchanting = 4;
  s.inventory.push(...OFFHAND_GEAR.map((g) => g.id), "ember_staff");
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
async function guide(page: Page, slot = "offhand") {
  const toggle = page.getByRole("button", { name: "Plan your next discovery" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
  await page.locator("#wardrobe-slot").selectOption(slot);
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

test("legacy loadouts retain their stats with sixteen sockets and guide shows exact weapon/off-hand sources and fit", async ({
  page,
}) => {
  const s = freshSave();
  s.settings.sound = false;
  const before = heroStats(s);
  await seed(page, s);
  await page.goto("/#camp");
  await expect(page.locator(".equipment-socket")).toHaveCount(16);
  expect((await saved(page)).heroes.mage.equipment.offhand).toBeUndefined();
  expect(heroStats(await saved(page))).toEqual(before);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await expect(page.locator(".loadout-slot")).toHaveCount(16);
  await guide(page);
  await expect(page.locator(".wardrobe-card")).toHaveCount(11);
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  await expect(page.locator(".wardrobe-card")).toHaveCount(61);
  await expect(discovery(page, "artisan_shield")).toContainText(
    "Blacksmithing",
  );
  await expect(discovery(page, "artisan_shield")).toContainText(
    "6 Mithril Ore",
  );
  await expect(discovery(page, "artisan_focus")).toContainText("4 Dream Dust");
  await page.locator("#wardrobe-source").selectOption("dungeon");
  await expect(page.locator(".wardrobe-card")).toHaveCount(16);
  await expect(discovery(page, "tideglass_focus")).toContainText(
    "Edwin VanCleef",
  );
  await page.locator("#wardrobe-source").selectOption("all");
  await guide(page, "weapon");
  await expect(page.locator(".wardrobe-card")).toHaveCount(69);
  await expect(discovery(page, "duskwood_spellblade")).toContainText(
    "One-handed",
  );
  await expect(discovery(page, "twilight_staff")).toContainText("Two-handed");
  await page.reload();
  expect(heroStats(await saved(page))).toEqual(before);
});

for (const classId of ["mage", "warrior"] as const)
  test(`${classId} reviews exact two-handed loss, cancels freely and confirms ${classId === "mage" ? "by keyboard" : "by touch"} without clearing another hero`, async ({
    page,
  }) => {
    const s = ready(classId),
      shield = classId === "warrior",
      weapon = shield ? "duskwood_mace" : "duskwood_spellblade",
      held = shield ? "artisan_shield" : "artisan_focus",
      two = shield ? "starter_warrior" : "ember_staff",
      other = shield ? "paladin" : "priest";
    equip(s, weapon);
    equip(s, held);
    applyEnchantment(s, weapon, "weapon_force");
    s.heroes[other].equipment.weapon = weapon;
    s.heroes[other].equipment.offhand = held;
    if (shield) await page.setViewportSize({ width: 390, height: 1000 });
    await seed(page, s);
    await page.goto("/#armory");
    await expect(gear(page, weapon)).toContainText("One-handed");
    await expect(gear(page, two)).toContainText("occupies off-hand");
    const before = await saved(page),
      stats = heroStats(before),
      delta = gearComparison(before, two);
    const start = gear(page, two).getByRole("button", {
      name: "Equip item",
      exact: true,
    });
    await start.click();
    const review = page.getByRole("dialog");
    await expect(review).toBeFocused();
    await expect(review).toContainText(GEAR_MAP[held].name);
    await expect(review).toContainText("remain in your shared inventory");
    await expect(review).toContainText("INCLUDES ENCHANTMENTS");
    await page
      .getByRole("button", { name: "Keep current equipment", exact: true })
      .click();
    expect(await saved(page)).toEqual(before);
    await start.click();
    await expect(review).toBeFocused();
    await review.evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
    );
    await controls(review.locator("button"));
    await fits(page);
    await mkdir("output/screenshots", { recursive: true });
    await page.screenshot({
      path: `output/screenshots/offhand-review-${shield ? 390 : 1440}-0.26.png`,
      animations: "disabled",
    });
    const confirm = page.getByRole("button", {
      name: `Equip ${GEAR_MAP[two].name}`,
      exact: true,
    });
    if (shield) await confirm.tap();
    else {
      await confirm.focus();
      await page.keyboard.press("Enter");
    }
    const next = await saved(page);
    expect(next.heroes[classId].equipment.weapon).toBe(two);
    expect(next.heroes[classId].equipment.offhand).toBeUndefined();
    expect(next.heroes[other].equipment.offhand).toBe(held);
    expect(next.inventory).toContain(held);
    expect(next.enchantments[weapon]).toBe("weapon_force");
    for (const key of Object.keys(stats) as (keyof typeof stats)[])
      expect(heroStats(next)[key] - stats[key]).toBeCloseTo(delta[key] || 0, 8);
    await expect(gear(page, held).locator('[data-action="sell"]')).toHaveCount(
      0,
    );
    await expect(
      gear(page, held).locator('[data-action="disenchant"]'),
    ).toHaveCount(0);
    await expect(
      gear(page, held).getByRole("button", {
        name: "Equip a one-handed weapon",
        exact: true,
      }),
    ).toBeDisabled();
    await page.reload();
    expect(
      (await saved(page)).heroes[classId].equipment.offhand,
    ).toBeUndefined();
    await gear(page, weapon)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await gear(page, held)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: `Unequip ${GEAR_MAP[weapon].name}`,
        exact: true,
      })
      .click();
    const empty = await saved(page);
    expect(empty.heroes[classId].equipment.weapon).toBeUndefined();
    expect(empty.heroes[classId].equipment.offhand).toBeUndefined();
    expect(empty.inventory).toContain(held);
  });

test("file import repairs incompatible pairs in canonical order while shared valid held equipment and unlearned effects persist", async ({
  page,
}) => {
  const s = ready();
  s.heroes.mage.equipment = { offhand: "artisan_focus", weapon: "ember_staff" };
  s.heroes.priest.equipment = {
    offhand: "artisan_focus",
    weapon: "duskwood_spellblade",
  };
  s.heroes.warrior.equipment.offhand = "artisan_focus";
  s.enchantments.artisan_focus = "wrists_focus";
  await seed(page, freshSave());
  await page.goto("/#camp");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#import-file").setInputFiles({
    name: "off-hand-pairs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page
    .getByRole("button", { name: "Import adventure", exact: true })
    .click();
  const loaded = await saved(page);
  expect(loaded.heroes.mage.equipment.offhand).toBeUndefined();
  expect(loaded.heroes.mage.equipment.weapon).toBe("ember_staff");
  expect(loaded.heroes.priest.equipment.offhand).toBe("artisan_focus");
  expect(loaded.heroes.warrior.equipment.offhand).toBeUndefined();
  expect(loaded.enchantments.artisan_focus).toBeUndefined();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator("#hero-switch").selectOption("priest");
  await expect(page.locator(".loadout-panel")).toContainText(
    "Masterwork Starlight Focus",
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
  expect((await saved(page)).heroes.priest.equipment.offhand).toBe(
    "artisan_focus",
  );
  await expect(
    page.locator('#enchant-target option[value="artisan_focus"]'),
  ).toHaveCount(1);
});

test("guide links actual graded shield/focus crafting, guild credit and class-appropriate equip", async ({
  page,
}) => {
  const s = ready();
  s.inventory = s.inventory.filter(
    (id) => !["expert_focus", "artisan_shield"].includes(id),
  );
  s.professionQuests.enchanting.chapter = 2;
  expect(acceptProfessionQuest(s, "enchanting")).toBe(true);
  await seed(page, s);
  await page.goto("/#armory");
  await guide(page);
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  await page.locator("#wardrobe-source").selectOption("craft");
  await expect(page.locator(".wardrobe-card")).toHaveCount(20);
  await expect(discovery(page, "expert_focus")).toContainText("4 Vision Dust");
  await expect(discovery(page, "expert_focus")).toContainText("2 Kingsblood");
  await discovery(page, "expert_focus")
    .getByRole("button", { name: "View crafting", exact: true })
    .click();
  await expect(page.locator("#recipe-filter")).toHaveValue("enchanting");
  const before = await saved(page);
  await page
    .locator('[data-recipe-id="craft_expert_focus"] [data-action="craft"]')
    .click();
  const focus = await saved(page);
  expect(focus.materials.vision_dust).toBe(before.materials.vision_dust - 4);
  expect(focus.materials.kingsblood).toBe(before.materials.kingsblood - 2);
  expect(focus.gold).toBe(before.gold - 65);
  expect(focus.professionQuests.enchanting.progress.crafts).toBe(1);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await gear(page, "duskwood_spellblade")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await gear(page, "expert_focus")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await guide(page);
  await discovery(page, "artisan_shield")
    .getByRole("button", { name: "View crafting", exact: true })
    .click();
  await expect(page.locator("#recipe-filter")).toHaveValue("blacksmithing");
  const preShield = await saved(page);
  await page
    .locator('[data-recipe-id="craft_artisan_shield"] [data-action="craft"]')
    .click();
  const shield = await saved(page);
  expect(shield.gold).toBe(preShield.gold - 110);
  expect(shield.materials.mithril_ore).toBe(
    preShield.materials.mithril_ore - 6,
  );
  expect(shield.materials.thick_leather).toBe(
    preShield.materials.thick_leather - 2,
  );
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.locator("#hero-switch").selectOption("warrior");
  await page.locator("#bag-slot").selectOption("all");
  await gear(page, "duskwood_mace")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await gear(page, "artisan_shield")
    .getByRole("button", { name: "Equip item", exact: true })
    .click();
  await page.reload();
  expect((await saved(page)).heroes.warrior.equipment.offhand).toBe(
    "artisan_shield",
  );
  expect((await saved(page)).heroes.mage.equipment.offhand).toBe(
    "expert_focus",
  );
});

for (const source of ["cache", "guardian"] as const)
  test(`real ${source} combat awards an off-hand for a later legal camp pair and once-only settlement`, async ({
    page,
  }) => {
    const s = ready("warrior"),
      id = source === "cache" ? "elwynn_shield" : "shredder_guard";
    s.inventory = s.inventory.filter((v) => v !== id);
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
          `${marker}\nthis.spells=[];this.enemies=[];this.nodes=[];this.spawnTimer=1e6;window.__offhandGame=this;this.rng.pick=(pool)=>pool.find(v=>v?.id==='${id}'||v==='${id}')||pool[0];`,
        ),
      });
    });
    await page.clock.install({ time: new Date("2026-10-07T12:00:00Z") });
    await page.goto("/#camp");
    await page.clock.pauseAt(new Date("2026-10-07T12:00:01Z"));
    await page
      .getByRole("button", { name: /Begin (Expedition|Dungeon)/ })
      .click();
    const loot = await page.evaluate((source) => {
      const g = (window as any).__offhandGame;
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
    expect(
      (await saved(page)).heroes.warrior.equipment.offhand,
    ).toBeUndefined();
    expect((await saved(page)).inventory).toContain(id);
    await page.getByRole("button", { name: "Armory", exact: true }).click();
    await expect(
      gear(page, id).getByRole("button", {
        name: "Equip a one-handed weapon",
        exact: true,
      }),
    ).toBeDisabled();
    await gear(page, "elwynn_mace")
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await gear(page, id)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
    await page.reload();
    expect((await saved(page)).heroes.warrior.equipment.offhand).toBe(id);
    expect((await saved(page)).history).toHaveLength(1);
  });

test("all nine classes at six widths fit sixteen sockets and held/weapon catalogs with 44px controls", async ({
  page,
}) => {
  test.setTimeout(150000);
  const s = ready();
  for (const c of CLASSES) {
    s.selectedClass = c.id;
    if (SHIELD_CLASSES.includes(c.id)) {
      equip(s, "duskwood_mace");
      equip(s, "artisan_shield");
    } else if (FOCUS_CLASSES.includes(c.id)) {
      equip(s, "duskwood_spellblade");
      equip(s, "artisan_focus");
    }
  }
  s.selectedClass = "mage";
  await seed(page, s);
  await page.goto("/#camp");
  await mkdir("output/screenshots", { recursive: true });
  const reports = [];
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
          path: `output/screenshots/offhand-camp-${width}-0.26.png`,
          animations: "disabled",
        });
      }
      await page.getByRole("button", { name: "Armory", exact: true }).click();
      await guide(page);
      const all = page.getByRole("button", { name: "Showing class-usable" });
      if (await all.count()) await all.click();
      await expect(page.locator(".wardrobe-card")).toHaveCount(61);
      await fits(page);
      if (c.id === "mage" && [390, 1440].includes(width)) {
        await page
          .locator(".wardrobe-section")
          .evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: `output/screenshots/offhand-guide-${width}-0.26.png`,
          animations: "disabled",
        });
      }
      await guide(page, "weapon");
      await expect(page.locator(".wardrobe-card")).toHaveCount(69);
      await fits(page);
      if (c.id === "mage") {
        const weapon = gear(page, "ember_staff").getByRole("button", {
          name: "Equip item",
          exact: true,
        });
        await weapon.click();
        const review = page.getByRole("dialog");
        await expect(review).toBeFocused();
        await review.evaluate((el) =>
          Promise.all(
            el.getAnimations({ subtree: true }).map((a) => a.finished),
          ),
        );
        await controls(review.locator("button"));
        await fits(page);
        await page
          .getByRole("button", { name: "Keep current equipment", exact: true })
          .click();
      }
      reports.push({
        width,
        classId: c.id,
        sockets: 16,
        held: 22,
        weapons: 14,
        offhandEligible:
          SHIELD_CLASSES.includes(c.id) || FOCUS_CLASSES.includes(c.id),
      });
    }
  }
  await writeFile(
    "output/offhand-layout-0.26.json",
    JSON.stringify(reports, null, 2) + "\n",
  );
});
