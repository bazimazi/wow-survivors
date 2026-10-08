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
  await fs.mkdir("output/screenshots", { recursive: true });
  const base = session.url;
  await page.goto(base);
  await page.evaluate(async () => {
    const {
      freshSave,
      persist,
      trainClassTechnique,
      prepareClassSpell,
      learnTalent,
    } = await import("/src/progression.ts");
    const { CLASS_MAP } = await import("/src/content.ts");
    const s = freshSave();
    s.gold = 1500;
    s.settings.sound = false;
    for (const h of Object.values(s.heroes)) h.level = 21;
    trainClassTechnique(s, "frostnova");
    prepareClassSpell(s, "arcane", "frostnova");
    s.heroes.mage.classTrial.chapter = 1;
    s.heroes.mage.classTrial.active = true;
    for (const n of CLASS_MAP.mage.trees[0].nodes)
      for (let i = 0; i < n.max; i++) learnTalent(s, n.id);
    persist(s);
  });
  await page.goto(`${base}/#spellbook`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const layout = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      cards: document.querySelectorAll(".spellbook-card").length,
      slots: document.querySelectorAll(".spellbook-slot").length,
      nav: document.querySelectorAll(".nav-link").length,
      minimumControlHeight: Math.min(
        ...[
          ...document.querySelectorAll(
            ".spellbook-card button,.spellbook-preparation button",
          ),
        ].map((el) => el.getBoundingClientRect().height),
      ),
    }));
    if (
      metrics.width !== metrics.scroll ||
      metrics.cards !== 6 ||
      metrics.slots !== 4 ||
      metrics.nav !== 8 ||
      metrics.minimumControlHeight < 44
    )
      throw Error(JSON.stringify(metrics));
    layout.push(metrics);
    if (width === 390)
      await page.screenshot({
        path: "output/screenshots/spellbook-mobile.png",
        fullPage: true,
        animations: "disabled",
      });
  }
  await page.screenshot({
    path: "output/screenshots/spellbook-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator(
      '.spellbook-card[data-spell="flamestrike"] [data-action="review-technique"]',
    )
    .click();
  await page.screenshot({
    path: "output/screenshots/spellbook-learning-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/screenshots/spellbook-learning-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .locator(
      '.spellbook-card[data-spell="arcane"] [data-action="review-prepare"]',
    )
    .click();
  await page.screenshot({
    path: "output/screenshots/spellbook-preparation-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep current preparation" })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const heroes = [];
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
    const metrics = await page.evaluate(() => ({
      mentor: document.querySelector(".spellbook-mentor h2").textContent,
      abilities: [...document.querySelectorAll(".spellbook-card h3")].map(
        (el) => el.textContent,
      ),
      prepared: [...document.querySelectorAll(".spellbook-slot")].map(
        (el) => el.dataset.prepared,
      ),
    }));
    if (metrics.abilities.length !== 6 || metrics.prepared.length !== 4)
      throw Error(id);
    heroes.push({ class: id, ...metrics });
  }
  // Keep a ready reward badge visible while checking all eight camp destinations.
  await page.evaluate(async () => {
    const { readSave, persist } = await import("/src/progression.ts");
    const s = readSave().save;
    s.professions = { mining: 300, engineering: 150 };
    s.training.mining = 4;
    s.training.engineering = 3;
    s.professionQuests.mining = {
      chapter: 3,
      attempt: "capture-mining",
      progress: { gathered: 16, crafts: 0, uses: 0 },
    };
    for (const id of Object.keys(s.materials)) s.materials[id] = 24;
    persist(s);
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const campPages = [];
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    for (const id of [
      "camp",
      "talents",
      "spellbook",
      "armory",
      "professions",
      "outposts",
      "journal",
      "stable",
    ]) {
      await page.locator(`.nav-link[data-id="${id}"]`).click();
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        nav: document.querySelectorAll(".nav-link").length,
        badges: document.querySelectorAll(".nav-count").length,
      }));
      if (
        metrics.width !== metrics.scroll ||
        metrics.nav !== 8 ||
        !metrics.badges
      )
        throw Error(JSON.stringify({ page: id, ...metrics }));
      campPages.push({ page: id, ...metrics });
    }
  }
  await page.locator("#hero-switch").selectOption("priest");
  await page.evaluate(async () => {
    const { readSave, persist, trainClassTechnique, prepareClassSpell } =
      await import("/src/progression.ts");
    const s = readSave().save;
    trainClassTechnique(s, "renew");
    trainClassTechnique(s, "holyfire");
    prepareClassSpell(s, "holynova", "renew");
    prepareClassSpell(s, "mindblast", "holyfire");
    persist(s);
  });
  // Starting ranks, target and injury are capture fixtures; casting and ticks use the actual engine.
  await page.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    if (!body.includes(marker)) throw Error("Engine fixture marker missing");
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.enemies=[{id:9000,x:90,y:0,type:'wolf',hp:2000,maxHp:2000,radius:14,speed:0,damage:0,elite:false,boss:false,slowUntil:0,slow:1,frozenUntil:0,flash:0,attackTimer:999,dead:false}];this.boss=this.enemies[0];this.nodes=[];this.landmarks=[];this.player.hp=25;this.spells=this.preparedSpells.map(id=>({id,rank:1,timer:['renew','holyfire'].includes(id)?0:999,orbitTimer:999}));window.__spellbookGame=this;`,
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.goto(`${base}/`);
  await page.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
  await page.getByRole("button", { name: /Begin Expedition/ }).click();
  await page.clock.runFor(2200);
  const combat = await page.evaluate(() => ({
    healing: window.__spellbookGame.totalHealing,
    damage: window.__spellbookGame.damageBySpell.holyfire,
    dots: Object.keys(window.__spellbookGame.enemies[0].dots || {}),
    hots: Object.keys(window.__spellbookGame.healingEffects),
    prepared: window.__spellbookGame.preparedSpells,
  }));
  if (!(
    combat.healing > 0 &&
    combat.damage > 18 &&
    combat.dots.includes("holyfire") &&
    combat.hots.includes("renew")
  ))
    throw Error(JSON.stringify(combat));
  await page.screenshot({
    path: "output/screenshots/spellbook-combat-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(200);
  await page.screenshot({
    path: "output/screenshots/spellbook-combat-mobile.png",
  });
  await fs.writeFile(
    "output/spellbook-layout-0.12.json",
    JSON.stringify({ layout, campPages, heroes, combat, errors }, null, 2),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({ layout, heroes: heroes.length, combat, errors }, null, 2),
  );
} finally {
  await session.close();
}
