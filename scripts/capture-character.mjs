import { openCaptureSession } from "./capture-session.mjs";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("output/screenshots", { recursive: true });
const session = await openCaptureSession({ args: ["--disable-gpu"] });
const browser = session.browser;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(session.url);
  await page.evaluate(async () => {
    const { freshSave, persist, equip, applyEnchantment } =
      await import("/src/progression.ts");
    const s = freshSave();
    s.heroes.mage.level = 20;
    s.gold = 2000;
    s.professions.enchanting = 225;
    s.training.enchanting = 4;
    for (const key of Object.keys(s.materials)) s.materials[key] = 100;
    s.inventory.push("spellweave_hands", "shadow_boots");
    equip(s, "spellweave_hands");
    applyEnchantment(s, "starter_mage", "weapon_force");
    applyEnchantment(s, "cloth", "chest_vitality");
    s.heroes.mage.classTrial = {
      chapter: 2,
      active: true,
      progress: { evolutions: 1 },
    };
    s.settings.sound = false;
    persist(s);
  });
  await page.goto(`${session.url}#journal`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".class-trial").screenshot({
    path: "output/screenshots/class-trial-progress.png",
    animations: "disabled",
  });
  const layout = [];
  // Model the final guardian return, then claim the relic through the real transaction.
  await page.evaluate(async () => {
    const { readSave, claimClassTrial, equip, persist } =
      await import("/src/progression.ts");
    const { save: s } = readSave();
    s.heroes.mage.classTrial.progress.bosses = 1;
    if (!claimClassTrial(s) || !equip(s, "trial_mage_relic"))
      throw new Error("Relic fixture could not claim/equip");
    persist(s);
  });
  await page.reload();
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["Journal", "Armory", "Professions", "Expedition"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      if (view === "Armory")
        await page.getByText("Browse all 12 formulas", { exact: true }).click();
      const result = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        nav: [...document.querySelectorAll(".nav-link")].map(
          (el) => el.getBoundingClientRect().height,
        ),
      }));
      assert.ok(result.page <= width, `${view} overflow at ${width}px`);
      if (width <= 760) assert.ok(result.nav.every((height) => height >= 44));
      layout.push({ width, view, page: result.page });
    }
  }
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await page.getByText("Browse all 12 formulas", { exact: true }).click();
  await page.locator(".enchanting-table").screenshot({
    path: "output/screenshots/enchanting-table-desktop.png",
    animations: "disabled",
  });
  await page.locator(".loadout-panel").screenshot({
    path: "output/screenshots/enchanted-loadout.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".enchanting-table").screenshot({
    path: "output/screenshots/enchanting-table-mobile.png",
    animations: "disabled",
  });
  await page.locator('[data-formula="weapon_precision"] button').click();
  await page.screenshot({
    path: "output/screenshots/enchantment-replacement-mobile.png",
    animations: "disabled",
  });
  const choices = await page
    .locator(".enchantment-review .save-actions .button")
    .evaluateAll((buttons) =>
      buttons.map((el) => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      })),
    );
  assert.ok(choices.every((box) => box.height >= 44 && box.width <= 350));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { layout, browserErrors: errors, screenshots: "output/screenshots" },
      null,
      2,
    ),
  );
} finally {
  await session.close();
}
