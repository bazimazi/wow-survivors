import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freshSave, acceptCampaign, SAVE_KEY } from "../../src/progression";
import type { SaveData } from "../../src/progression";
import {
  CAMPAIGNS,
  CAMPAIGN_FACTIONS,
  campaignCloakId,
  campaignTrinketId,
} from "../../src/campaigns";
import { ZONES } from "../../src/content";
import { dungeonRoute } from "../../src/dungeon";
const saved = (p: Page) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
function ready() {
  const s = freshSave();
  s.settings.sound = false;
  s.gold = 3000;
  s.totals.kills = 200;
  s.totals.wins = 1;
  s.clearedZones = ZONES.map((z) => z.id);
  s.supplies.bombs = 20;
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.reputation = { timbermaw: 2000, thorium: 2000, argent: 2000 };
  return s;
}
async function seed(p: Page, s: SaveData) {
  await p.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(s) },
  );
}
async function fixture(p: Page) {
  await p.route(/\/src\/engine\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch(),
      body = await response.text(),
      marker = "for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);";
    expect(body).toContain(marker);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `${marker}\nthis.spells=[];this.pets=[];this.enemies=[];this.xpNeeded=1e9;this.player.hp=this.player.maxHp=10000;window.__campaignGame=this;`,
      ),
    });
  });
}
async function clock(p: Page, hash = "outposts") {
  await p.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await p.goto(`/#${hash}`);
  await p.clock.pauseAt(new Date("2026-10-04T12:00:01Z"));
}
async function killGuardian(p: Page) {
  await p.evaluate(() => {
    const g = (window as any).__campaignGame;
    g.dungeonStageTime = g.dungeonStage.duration - 0.001;
  });
  await p.clock.runFor(150);
  await p.evaluate(() => {
    const g = (window as any).__campaignGame;
    if (!g.boss) throw Error("Missing guardian");
    g.enemies = [g.boss];
    Object.assign(g.boss, { hp: 1, x: 100, y: 0, speed: 0 });
  });
  await p.keyboard.press("e");
}

test("acceptance, real cache and shrine proof, pause preview, settled claim and reload form a complete patrol", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, ready());
  await fixture(page);
  await clock(page);
  const campaign = page.locator('[data-campaign="timbermaw"]');
  await campaign
    .getByRole("button", { name: "Accept chapter", exact: true })
    .click();
  expect((await saved(page)).campaigns.timbermaw.attempt).toBeTruthy();
  await campaign
    .getByRole("button", { name: "Prepare in Elwynn Forest", exact: true })
    .click();
  await expect(
    page.locator('[data-campaign-status="timbermaw"]'),
  ).toContainText("0 / 180");
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.evaluate(() => {
    const g = (window as any).__campaignGame,
      l = g.landmarks.find((l: any) => l.kind === "cache");
    Object.assign(g.player, { x: l.x, y: l.y });
  });
  await page.clock.runFor(150);
  await page.keyboard.press("f");
  await page.evaluate(() => {
    const g = (window as any).__campaignGame;
    for (let i = 0; i < 177; i++) g.spawnEnemy(120);
    for (const e of g.enemies)
      Object.assign(e, { hp: 1, x: g.player.x + 30, y: g.player.y, speed: 0 });
  });
  await page.keyboard.press("e");
  await page.clock.runFor(150);
  await page.evaluate(() => {
    const g = (window as any).__campaignGame,
      l = g.landmarks.find((l: any) => l.kind === "shrine");
    Object.assign(g.player, { x: l.x, y: l.y });
  });
  await page.clock.runFor(150);
  await page.keyboard.press("f");
  await page.locator('[data-action="blessing"][data-id="wind"]').click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog").locator('[data-campaign-status="timbermaw"]'),
  ).toContainText("180 / 180");
  await expect(
    page.getByRole("dialog").locator('[data-campaign-status="timbermaw"]'),
  ).toContainText("2 / 2");
  expect((await saved(page)).campaigns.timbermaw.progress.kills).toBe(0);
  await page.clock.runFor(1000);
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator('[data-campaign-status="timbermaw"]'),
  ).toContainText("CAMPAIGN READY");
  const returned = await saved(page);
  expect(returned.campaigns.timbermaw.progress).toMatchObject({
    kills: 180,
    encounters: 2,
  });
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Outposts", exact: true }).click();
  await expect(page.locator('[data-id="outposts"] .nav-count')).toHaveText("1");
  await campaign
    .getByRole("button", { name: "Review chapter rewards" })
    .click();
  await page.getByRole("button", { name: "Keep for later" }).click();
  expect((await saved(page)).campaigns.timbermaw.chapter).toBe(0);
  await campaign
    .getByRole("button", { name: "Review chapter rewards" })
    .click();
  await page.getByRole("button", { name: "Claim chapter rewards" }).click();
  const claimed = await saved(page);
  expect(claimed.gold).toBe(returned.gold + 80);
  expect(claimed.campaigns.timbermaw.chapter).toBe(1);
  expect(claimed.campaigns.timbermaw.attempt).toBeNull();
  await page.reload();
  expect((await saved(page)).gold).toBe(claimed.gold);
  await expect(campaign.locator(".campaign-timeline .complete")).toHaveCount(1);
  expect(errors).toEqual([]);
});
for (const faction of CAMPAIGN_FACTIONS)
  test(`${faction} secures real guardian proof from two partial dungeon returns`, async ({
    page,
  }) => {
    const s = ready();
    s.campaigns[faction].chapter = 2;
    acceptCampaign(s, faction);
    s.selectedZone = CAMPAIGNS[faction].chapters[2].zone;
    await seed(page, s);
    await fixture(page);
    await clock(page, "camp");
    for (let visit = 1; visit <= 2; visit++) {
      await page
        .getByRole("button", { name: "Begin Dungeon", exact: true })
        .click();
      await killGuardian(page);
      await expect(page.getByRole("dialog")).toContainText("Sharpened Resolve");
      await page.locator('[data-action="dungeon-return"]').click();
      await expect(
        page.getByRole("dialog").locator(`[data-campaign-status="${faction}"]`),
      ).toContainText(`${visit} / 2`);
      expect((await saved(page)).campaigns[faction].progress.guardians).toBe(
        visit,
      );
      await page
        .getByRole("button", { name: "Return to camp", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Outposts", exact: true }).click();
    await page.locator(`[data-action="faction"][data-id="${faction}"]`).click();
    await page.getByRole("button", { name: "Review chapter rewards" }).click();
    await page.getByRole("button", { name: "Claim chapter rewards" }).click();
    expect((await saved(page)).campaigns[faction].chapter).toBe(3);
    await page.reload();
    await page.locator(`[data-action="faction"][data-id="${faction}"]`).click();
    await expect(page.locator(".campaign-current")).toContainText("CHAPTER 4");
  });
test("abandonment reviews preserve claimed chapters and reset only the current attempt", async ({
  page,
}) => {
  const s = ready();
  s.campaigns.thorium.chapter = 1;
  acceptCampaign(s, "thorium");
  s.campaigns.thorium.progress.encounters = 2;
  await seed(page, s);
  await page.goto("/#outposts");
  await page.locator('[data-action="faction"][data-id="thorium"]').click();
  await page
    .getByRole("button", { name: "Abandon chapter", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("2 / 3");
  await page.getByRole("button", { name: "Keep chapter" }).click();
  expect((await saved(page)).campaigns.thorium.progress.encounters).toBe(2);
  await page
    .getByRole("button", { name: "Abandon chapter", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abandon chapter", exact: true })
    .click();
  const data = await saved(page);
  expect(data.campaigns.thorium.chapter).toBe(1);
  expect(data.campaigns.thorium.attempt).toBeNull();
  expect(data.reputation.thorium).toBe(2000);
  await page
    .getByRole("button", { name: "Accept chapter", exact: true })
    .click();
  expect((await saved(page)).campaigns.thorium.attempt).not.toBe(
    s.campaigns.thorium.attempt,
  );
  expect((await saved(page)).campaigns.thorium.progress.encounters).toBe(0);
});
test("a complete Shadowfang victory awards a reviewed cloak and opens the Exalted trinket purchase", async ({
  page,
}) => {
  const s = ready();
  s.campaigns.argent.chapter = 3;
  acceptCampaign(s, "argent");
  s.selectedZone = "shadowfang";
  await seed(page, s);
  await fixture(page);
  await clock(page, "camp");
  await page
    .getByRole("button", { name: "Begin Dungeon", exact: true })
    .click();
  const stages = dungeonRoute("shadowfang")!.stages.length;
  for (let i = 0; i < stages; i++) {
    await killGuardian(page);
    if (i < stages - 1)
      await page
        .locator('[data-action="dungeon-continue"][data-id="edge"]')
        .click();
  }
  await expect(page.getByRole("dialog")).toContainText("A legend begins.");
  await expect(
    page.getByRole("dialog").locator('[data-campaign-status="argent"]'),
  ).toContainText("1 / 1");
  await page
    .getByRole("button", { name: "Return to camp", exact: true })
    .click();
  await page.getByRole("button", { name: "Outposts", exact: true }).click();
  await page.locator('[data-action="faction"][data-id="argent"]').click();
  await page.getByRole("button", { name: "Review chapter rewards" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Dawnmere's Vigil Cloak",
  );
  await page.getByRole("button", { name: "Claim chapter rewards" }).click();
  await expect(page.locator(".campaign-completed")).toContainText(
    "Campaign complete",
  );
  const data = await saved(page);
  expect(data.inventory).toContain(campaignCloakId("argent"));
  const offer = page.locator('[data-offer="argent_exalted"]');
  await offer.getByRole("button", { name: "Buy equipment" }).click();
  expect((await saved(page)).gold).toBe(data.gold - 500);
  await expect(offer.getByRole("button")).toBeDisabled();
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  for (const id of [campaignCloakId("argent"), campaignTrinketId("argent")])
    await page
      .locator(`[data-gear-id="${id}"]`)
      .getByRole("button", { name: "Equip item", exact: true })
      .click();
  await page.reload();
  const equipped = (await saved(page)).heroes.mage.equipment;
  expect(equipped.back).toBe(campaignCloakId("argent"));
  expect(equipped.trinket).toBe(campaignTrinketId("argent"));
});
test("the acquisition guide links all three cloak campaigns and high standing alone cannot buy an Exalted reward", async ({
  page,
}) => {
  await seed(page, ready());
  await page.goto("/#armory");
  await page.getByRole("button", { name: /Plan your next discovery/ }).click();
  await page.locator("#wardrobe-source").selectOption("campaign");
  await expect(page.locator(".wardrobe-card")).toHaveCount(3);
  await page
    .locator(`[data-wardrobe-id="${campaignCloakId("thorium")}"]`)
    .getByRole("button", { name: "Visit envoy" })
    .click();
  await expect(page.locator('[data-campaign="thorium"]')).toBeVisible();
  const offer = page.locator('[data-offer="thorium_exalted"]');
  await expect(offer).toContainText("Complete all four campaign chapters");
  await expect(offer.getByRole("button")).toBeDisabled();
});
test("campaign timelines, reviews, equipment previews and four offers fit six viewport widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = ready();
  acceptCampaign(s, "timbermaw");
  s.campaigns.timbermaw.progress = {
    kills: 180,
    encounters: 2,
    guardians: 0,
    victories: 0,
  };
  s.campaigns.thorium.chapter = 4;
  await seed(page, s);
  await page.goto("/#outposts");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [360, 390, 760, 800, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    for (const faction of CAMPAIGN_FACTIONS) {
      await page
        .locator(`[data-action="faction"][data-id="${faction}"]`)
        .click();
      await page.locator(".campaign-rewards summary").click();
      await expect(page.locator(".campaign-timeline li")).toHaveCount(4);
      await expect(page.locator(".quartermaster-card")).toHaveCount(4);
      await expect(page.locator(".nav-link")).toHaveCount(8);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
    await page.locator('[data-action="faction"][data-id="timbermaw"]').click();
    await page.getByRole("button", { name: "Review chapter rewards" }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "Keep for later" }).click();
  }
  expect(errors).toEqual([]);
});
