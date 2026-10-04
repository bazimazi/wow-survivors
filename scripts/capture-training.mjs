import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("output/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--disable-gpu"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5176/");
  // This fixture is isolated from the player's browser and local save.
  await page.evaluate(async () => {
    const { freshSave, specializeProfession, craft, equip, persist } =
      await import("/src/progression.ts");
    const s = freshSave();
    s.selectedClass = "warrior";
    s.heroes.warrior.level = 20;
    s.professions = { blacksmithing: 150, engineering: 150 };
    s.training.blacksmithing = 3;
    s.training.engineering = 3;
    s.gold = 2000;
    for (const key of Object.keys(s.materials)) s.materials[key] = 100;
    specializeProfession(s, "weaponsmith");
    specializeProfession(s, "gnomish");
    craft(s, "craft_tempered_edge");
    craft(s, "craft_precision_goggles");
    equip(s, "tempered_edge");
    equip(s, "precision_goggles");
    s.secondary = { cooking: 225, firstaid: 75, fishing: 150 };
    s.training.cooking = 3;
    s.training.firstaid = 1;
    s.training.fishing = 2;
    persist(s);
  });
  await page.goto("http://127.0.0.1:5176/#professions");
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  for (const [selector, name] of [
    [".profession-grid", "profession-trainers-desktop"],
    [".secondary-training", "secondary-trainers-desktop"],
    [".trade-specializations", "profession-paths-desktop"],
  ]) {
    await page.locator(selector).screenshot({
      animations: "disabled",
      path: `output/screenshots/${name}.png`,
    });
  }
  await page.locator("#recipe-filter").selectOption("blacksmithing");
  await page.locator(".recipe-grid").screenshot({
    animations: "disabled",
    path: "output/screenshots/specialized-recipes.png",
  });
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "output/screenshots/crafted-specialization-gear.png",
  });
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  await page.locator("#recipe-filter").selectOption("all");
  assert.equal(await page.locator(".recipe-card").count(), 55);
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.evaluate(() => ({
      width: innerWidth,
      page: document.documentElement.scrollWidth,
      learned: [...document.querySelectorAll(".profession-card.learned")].map(
        (el) => el.getBoundingClientRect().width,
      ),
    }));
    assert.ok(result.page <= width, `Overflow at ${width}px`);
    if (width <= 480)
      assert.ok(
        result.learned.every((card) => card >= width - 40),
        "Learned trainer cards need a full phone row",
      );
    layout.push({ width, page: result.page });
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        layout,
        browserErrors: errors,
        catalogRecipes: 55,
        screenshots: "output/screenshots",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
