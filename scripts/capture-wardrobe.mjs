import { openCaptureSession } from "./capture-session.mjs";
import fs from "node:fs/promises";
const session = await openCaptureSession({ headless: true });
const browser = session.browser;
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = session.url;
  await fs.mkdir("output/screenshots", { recursive: true });
  await page.goto(base);
  await page.evaluate(async () => {
    const { freshSave, persist, equip, craft, learnProfession } =
      await import("/src/progression.ts");
    const s = freshSave();
    s.gold = 10000;
    s.settings.sound = false;
    for (const h of Object.values(s.heroes)) h.level = 21;
    for (const m of Object.keys(s.materials)) s.materials[m] = 1000;
    learnProfession(s, "tailoring");
    s.professions.tailoring = 225;
    s.training.tailoring = 4;
    for (const slot of [
      "head",
      "hands",
      "chest",
      "shoulders",
      "waist",
      "legs",
    ]) {
      const id = `spellweave_${slot}`;
      if (!craft(s, `craft_${id}`)) throw Error(id);
      equip(s, id);
    }
    craft(s, "craft_runebound_drape");
    equip(s, "runebound_drape");
    for (const id of [
      "ember_staff",
      "shadow_boots",
      "lionheart",
      "spiritwoven_leggings",
    ]) {
      s.inventory.push(id);
      if (id !== "spiritwoven_leggings") equip(s, id);
    }
    s.totals.kills = 200;
    s.totals.runs = 3;
    s.totals.wins = 1;
    s.totals.bestTime = 360;
    s.clearedZones = ["elwynn", "westfall", "tirisfal", "ragefire"];
    s.selectedZone = "shadowfang";
    persist(s);
  });
  await page.goto(`${base}/#armory`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: /Plan your next discovery/ }).click();
  await page.getByRole("button", { name: "Showing class-usable" }).click();
  const layout = [],
    campPages = [],
    classes = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      cards: document.querySelectorAll(".wardrobe-card").length,
      slots: document.querySelectorAll(".loadout-slot").length,
      nav: document.querySelectorAll(".nav-link").length,
      minimumControlHeight: Math.min(
        ...[
          ...document.querySelectorAll(
            ".wardrobe-section button,.wardrobe-section select,#bag-slot,.loadout-slot button",
          ),
        ].map((el) => el.getBoundingClientRect().height),
      ),
    }));
    if (
      metrics.width !== metrics.scroll ||
      metrics.cards !== 52 ||
      metrics.slots !== 10 ||
      metrics.nav !== 8 ||
      metrics.minimumControlHeight < 44
    )
      throw Error(JSON.stringify(metrics));
    layout.push(metrics);
    for (const name of [
      "Expedition",
      "Talents",
      "Spellbook",
      "Armory",
      "Professions",
      "Outposts",
      "Journal",
      "Stable",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      const scroll = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      if (scroll !== width) throw Error(`${name}: ${width}/${scroll}`);
      campPages.push({ page: name, width, scroll });
    }
    await page.getByRole("button", { name: "Armory", exact: true }).click();
  }
  await page.getByRole("button", { name: "Showing all classes" }).click();
  for (const id of [
    "warrior",
    "mage",
    "rogue",
    "hunter",
    "paladin",
    "priest",
    "shaman",
    "warlock",
    "druid",
  ]) {
    await page.locator("#hero-switch").selectOption(id);
    classes.push({
      class: id,
      eligible: await page.locator(".wardrobe-card").count(),
    });
  }
  await page.locator("#hero-switch").selectOption("mage");
  await page.locator("#wardrobe-source").selectOption("craft");
  await page.locator("#wardrobe-slot").selectOption("shoulders");
  await page.locator("#bag-slot").selectOption("legs");
  await page.screenshot({
    path: "output/screenshots/wardrobe-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector(".wardrobe-section").getBoundingClientRect().top +
        scrollY -
        80,
    ),
  );
  await page.screenshot({
    path: "output/screenshots/wardrobe-catalog-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#wardrobe-source").selectOption("all");
  await page.locator("#wardrobe-slot").selectOption("back");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "output/screenshots/wardrobe-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector(".wardrobe-section").getBoundingClientRect().top +
        scrollY -
        80,
    ),
  );
  await page.screenshot({
    path: "output/screenshots/wardrobe-catalog-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  await page.screenshot({
    path: "output/screenshots/wardrobe-camp-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  if (errors.length) throw Error(errors.join("\n"));
  const result = { layout, classes, campPages, errors };
  await fs.writeFile(
    "output/wardrobe-layout-0.16.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      widths: layout.length,
      classes: classes.length,
      campPages: campPages.length,
      errors,
    }),
  );
} finally {
  await session.close();
}
