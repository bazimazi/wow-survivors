import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("output/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:5176");
// A separate browser context with a progressed fixture; this does not modify
// the player's save. It makes the new build and recipe states reviewable.
const counts = await page.evaluate(async () => {
  const { CLASSES, CLASS_MAP, GEAR, RECIPES } = await import("/src/content.ts");
  const { freshSave, learnTalent, equip, persist } =
    await import("/src/progression.ts");
  const save = freshSave();
  save.heroes.mage.level = 14;
  save.gold = 800;
  save.professions = { tailoring: 75, enchanting: 50 };
  save.materials.cloth = 100;
  save.materials.dust = 10;
  save.materials.wool_cloth = 100;
  save.materials.soul_dust = 10;
  for (const n of CLASS_MAP.mage.trees[1].nodes)
    for (let i = 0; i < n.max; i++) learnTalent(save, n.id);
  for (const slot of ["hands", "head", "chest"]) {
    const id = `spellweave_${slot}`;
    save.inventory.push(id);
    equip(save, id);
  }
  save.inventory.push("azure_robe", "field_goggles");
  persist(save);
  return {
    gear: GEAR.length,
    recipes: RECIPES.length,
    talents: CLASSES.reduce(
      (sum, c) => sum + c.trees.reduce((s, t) => s + t.nodes.length, 0),
      0,
    ),
  };
});
await page.reload();
await page.goto("http://127.0.0.1:5176/#talents");
if (
  !(await page.locator(".progression-banner").textContent()).includes(
    "Level 14",
  )
)
  throw Error("Progressed screenshot fixture was not loaded");
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: "output/screenshots/talents-specialization.png",
  fullPage: true,
  timeout: 60000,
});
await page.getByRole("button", { name: "Armory", exact: true }).click();
await page.screenshot({
  path: "output/screenshots/armory-sets.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Professions", exact: true }).click();
await page.locator("#recipe-filter").selectOption("tailoring");
await page.screenshot({
  path: "output/screenshots/profession-milestones.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Armory", exact: true }).click();
await page
  .locator(".loadout-panel")
  .screenshot({ path: "output/screenshots/equipment-mobile.png" });
await browser.close();
console.log("Progressed-build screenshots saved.", JSON.stringify(counts));
