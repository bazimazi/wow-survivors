import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage(),
  errors = [],
  layout = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:5176";
await fs.mkdir("output/screenshots", { recursive: true });
try {
  await page.goto(base);
  for (const state of ["available", "active", "ready", "completed"]) {
    await page.evaluate(async (state) => {
      const { freshSave, persist, acceptCampaign } =
        await import("/src/progression.ts");
      const { CAMPAIGN_FACTIONS, CAMPAIGNS } =
        await import("/src/campaigns.ts");
      const s = freshSave();
      s.gold = 5000;
      s.settings.sound = false;
      s.totals.kills = 500;
      s.totals.wins = 1;
      s.clearedZones = [
        "elwynn",
        "westfall",
        "tirisfal",
        "deadmines",
        "ragefire",
        "shadowfang",
      ];
      for (const h of Object.values(s.heroes)) h.level = 21;
      for (const faction of CAMPAIGN_FACTIONS) {
        s.reputation[faction] = 2000;
        s.campaigns[faction].chapter =
          state === "completed" ? 4 : state === "available" ? 0 : 3;
        if (state === "active" || state === "ready") {
          acceptCampaign(s, faction);
          if (state === "ready")
            Object.assign(
              s.campaigns[faction].progress,
              CAMPAIGNS[faction].chapters[3].goals,
            );
        }
      }
      persist(s);
    }, state);
    await page.goto(`${base}/#outposts`);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [360, 390, 760, 800, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
      for (const faction of ["timbermaw", "thorium", "argent"]) {
        await page
          .locator(`[data-action="faction"][data-id="${faction}"]`)
          .click();
        await page.locator(".campaign-rewards summary").click();
        const metrics = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          chapters: document.querySelectorAll(".campaign-timeline li").length,
          offers: document.querySelectorAll(".quartermaster-card").length,
          nav: document.querySelectorAll(".nav-link").length,
          readyBadge:
            document.querySelector('[data-id="outposts"] .nav-count')
              ?.textContent || null,
        }));
        if (
          metrics.scroll !== width ||
          metrics.chapters !== 4 ||
          metrics.offers !== 4 ||
          metrics.nav !== 8 ||
          (state === "ready" && metrics.readyBadge !== "3")
        )
          throw Error(JSON.stringify({ state, faction, ...metrics }));
        layout.push({ state, faction, ...metrics });
        if (
          (width === 390 || width === 1440) &&
          (state === "available" || state === "ready" || state === "completed")
        )
          await page.screenshot({
            path: `output/screenshots/campaign-${state}-${faction}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });
      }
      if (state === "ready") {
        await page
          .getByRole("button", { name: "Review chapter rewards" })
          .click();
        if (
          (await page.evaluate(() => document.documentElement.scrollWidth)) !==
          width
        )
          throw Error(`Review overflow: ${width}`);
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `output/screenshots/campaign-review-${width}.png`,
            animations: "disabled",
          });
        await page.getByRole("button", { name: "Keep for later" }).click();
      }
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    "output/campaign-layout-0.15.json",
    JSON.stringify({ layout, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      layouts: layout.length,
      widths: 6,
      states: 4,
      factions: 3,
      errors,
    }),
  );
} finally {
  await browser.close();
}
