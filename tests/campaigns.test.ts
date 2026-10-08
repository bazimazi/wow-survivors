import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMPAIGNS,
  CAMPAIGN_FACTIONS,
  CAMPAIGN_GEAR,
  CAMPAIGN_SOURCES,
  campaignCloakId,
  campaignTrinketId,
  campaignRunCounts,
  validateCampaignProof,
} from "../src/campaigns";
import type { CampaignSnapshot } from "../src/campaigns";
import { CLASSES, GEAR, GEAR_MAP, RECIPES, ZONES } from "../src/content";
import { dungeonRoute } from "../src/dungeon";
import { GameEngine } from "../src/engine";
import { QUARTERMASTER_OFFERS } from "../src/factions";
import {
  acceptCampaign,
  abandonCampaign,
  campaignAcceptRestriction,
  campaignReady,
  campaignSnapshots,
  campaignProgressPreview,
  claimCampaign,
  freshSave,
  validateSave,
  settleRun,
  heroStats,
  equip,
  sellGear,
  buyOffer,
  offerRestriction,
  acceptCommission,
} from "../src/progression";
import type { SaveData, RunRecord } from "../src/progression";
import type { FactionId } from "../src/factions";
import { WARDROBE_CATALOG, WARDROBE_CATALOG_SOURCES } from "../src/wardrobe-ui";

function ready() {
  const s = freshSave();
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.gold = 10000;
  s.totals.kills = 10000;
  s.totals.wins = 1;
  s.clearedZones = ZONES.map((z) => z.id);
  s.reputation = { timbermaw: 2000, thorium: 2000, argent: 2000 };
  return s;
}
function snapshot(s: SaveData, faction: FactionId): CampaignSnapshot {
  return campaignSnapshots(s).find((p) => p.faction === faction)!;
}
let id = 0;
function run(q: CampaignSnapshot, patch: Partial<RunRecord> = {}): RunRecord {
  const c = CAMPAIGNS[q.faction].chapters[q.chapter];
  const r: RunRecord = {
    id: `campaign-test-${id++}`,
    classId: "mage",
    zoneId: c.zone,
    victory: false,
    kills: 180,
    encounters: 2,
    dungeonBosses: 0,
    time: 60,
    level: 2,
    gold: 0,
    xp: 0,
    loot: [],
    materials: {},
    date: "2026-10-04T00:00:00Z",
    ...patch,
  };
  r.campaignProof = [{ ...q, progress: campaignRunCounts(q, r) }];
  return r;
}
function engine(s: SaveData, faction: FactionId) {
  const q = s.campaigns[faction],
    zone = CAMPAIGNS[faction].chapters[q.chapter].zone;
  const g = new GameEngine({
    classId: s.selectedClass,
    zone: ZONES.find((z) => z.id === zone)!,
    stats: { ...heroStats(s), health: 10000, crit: 0 },
    professions: {},
    characterLevel: s.heroes[s.selectedClass].level,
    campaigns: campaignSnapshots(s),
    seed: 42,
    onConsume: () => true,
  });
  g.spells = [];
  g.pets = [];
  g.enemies = [];
  g.xpNeeded = 1e9;
  return g;
}
function guardian(g: GameEngine) {
  g.dungeonStageTime = g.dungeonStage!.duration - 0.001;
  g.update(1 / 60);
  assert.ok(g.boss);
  g.enemies = [g.boss];
  Object.assign(g.boss, { hp: 1, x: 100, y: 0, speed: 0 });
  assert.equal(g.useBomb(), true);
}

test("three original campaigns have twelve ordered destinations and six exclusive universal rewards", () => {
  assert.equal(CAMPAIGN_FACTIONS.length, 3);
  assert.equal(CAMPAIGN_GEAR.length, 6);
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(WARDROBE_CATALOG.length, 222);
  for (const f of CAMPAIGN_FACTIONS) {
    const cs = CAMPAIGNS[f].chapters;
    assert.equal(cs.length, 4);
    assert.equal(cs[0].zone, cs[1].zone);
    assert.equal(cs[2].zone, cs[3].zone);
    assert.ok(dungeonRoute(cs[2].zone));
    assert.deepEqual(CAMPAIGN_SOURCES[campaignCloakId(f)], {
      type: "campaign",
      faction: f,
      chapter: 3,
    });
    assert.deepEqual(
      WARDROBE_CATALOG_SOURCES[campaignCloakId(f)],
      CAMPAIGN_SOURCES[campaignCloakId(f)],
    );
    for (const id of [campaignCloakId(f), campaignTrinketId(f)]) {
      const g = GEAR_MAP[id];
      assert.ok(g);
      assert.equal(g.classes, undefined);
      assert.equal(g.armor, undefined);
      assert.equal(g.dropZones, undefined);
      assert.ok(!RECIPES.some((r) => r.output === id));
    }
    assert.ok(
      QUARTERMASTER_OFFERS.find((o) => o.gearId === campaignTrinketId(f))
        ?.campaign === f,
    );
  }
});
for (const faction of CAMPAIGN_FACTIONS) {
  test(`${faction} completes four sequential chapters with permanent, once-only rewards for every class`, () => {
    for (const hero of CLASSES) {
      const s = ready();
      s.selectedClass = hero.id;
      const initialGold = s.gold;
      for (let chapter = 0; chapter < 4; chapter++) {
        assert.equal(acceptCampaign(s, faction), true);
        const q = snapshot(s, faction),
          c = CAMPAIGNS[faction].chapters[chapter];
        assert.equal(acceptCampaign(s, faction), false);
        const r = run(q, {
          classId: hero.id,
          encounters: 3,
          victory: chapter === 1 || chapter === 3,
          dungeonBosses:
            chapter === 3
              ? dungeonRoute(c.zone)!.stages.length
              : chapter === 2
                ? 2
                : 0,
        });
        assert.equal(settleRun(s, r), true);
        assert.equal(campaignReady(s, faction), true);
        assert.equal(claimCampaign(s, faction, q, hero.id), true);
        assert.equal(claimCampaign(s, faction, q, hero.id), false);
        assert.equal(settleRun(s, r), false);
        assert.equal(s.campaigns[faction].chapter, chapter + 1);
      }
      assert.equal(s.gold, initialGold + 540);
      assert.equal(acceptCampaign(s, faction), false);
      assert.equal(
        s.inventory.filter((id) => id === campaignCloakId(faction)).length,
        1,
      );
      assert.equal(equip(s, campaignCloakId(faction)), true);
      assert.deepEqual(
        validateSave(s).campaigns[faction],
        s.campaigns[faction],
      );
    }
  });
  test(`${faction} real dungeon kills credit partial returns and a complete final victory`, () => {
    const s = ready();
    s.campaigns[faction].chapter = 2;
    assert.ok(acceptCampaign(s, faction));
    let g = engine(s, faction);
    guardian(g);
    assert.equal(g.dungeonBosses, 1);
    assert.equal(g.victory, false);
    assert.equal(g.result().campaignProof![0].progress.guardians, 1);
    assert.ok(settleRun(s, g.result()));
    assert.equal(campaignReady(s, faction), false);
    // A second partial visit contributes its actual first guardian, without a fabricated clear.
    g = engine(s, faction);
    guardian(g);
    assert.ok(settleRun(s, g.result()));
    assert.equal(campaignReady(s, faction), true);
    assert.ok(claimCampaign(s, faction, snapshot(s, faction)));
    assert.ok(acceptCampaign(s, faction));
    g = engine(s, faction);
    const total = dungeonRoute(g.zone.id)!.stages.length;
    for (let i = 0; i < total; i++) {
      guardian(g);
      if (i < total - 1) {
        assert.equal(g.result().campaignProof![0].progress.victories, 0);
        assert.ok(g.continueDungeon("edge"));
      }
    }
    assert.equal(g.victory, true);
    assert.equal(g.result().campaignProof![0].progress.victories, 1);
    assert.ok(settleRun(s, g.result()));
    assert.ok(claimCampaign(s, faction, snapshot(s, faction)));
  });
}
test("acceptance checks level, standing and persistent destination access before changing state", () => {
  const s = freshSave();
  assert.ok(acceptCampaign(s, "timbermaw"));
  assert.equal(acceptCampaign(s, "timbermaw"), false);
  s.campaigns.timbermaw.chapter = 1;
  s.campaigns.timbermaw.attempt = null;
  const before = JSON.stringify(s);
  assert.match(campaignAcceptRestriction(s, "timbermaw")!, /level 5/);
  assert.equal(acceptCampaign(s, "timbermaw"), false);
  assert.equal(JSON.stringify(s), before);
  s.heroes.mage.level = 5;
  assert.match(campaignAcceptRestriction(s, "timbermaw")!, /Friendly/);
  s.reputation.timbermaw = 150;
  assert.equal(acceptCampaign(s, "timbermaw"), true);
  s.campaigns.timbermaw.chapter = 2;
  s.campaigns.timbermaw.attempt = null;
  s.heroes.mage.level = 10;
  s.reputation.timbermaw = 500;
  assert.match(campaignAcceptRestriction(s, "timbermaw")!, /Westfall/);
  s.clearedZones.push("westfall");
  assert.ok(acceptCampaign(s, "timbermaw"));
  s.campaigns.argent.chapter = 2;
  s.reputation.argent = 500;
  assert.match(campaignAcceptRestriction(s, "argent")!, /level 15/);
  s.heroes.mage.level = 15;
  assert.match(campaignAcceptRestriction(s, "argent")!, /Ragefire/);
});
test("old history, existing reputation and unaccepted runs cannot supply campaign progress", () => {
  const s = ready(),
    q: CampaignSnapshot = {
      faction: "timbermaw",
      chapter: 0,
      attempt: "old-run",
    },
    r = run(q);
  assert.ok(settleRun(s, r));
  assert.equal(s.campaigns.timbermaw.progress.kills, 0);
  const raw = structuredClone(s) as Partial<SaveData>;
  delete raw.campaigns;
  const old = validateSave(raw);
  assert.equal(old.campaigns.timbermaw.attempt, null);
  assert.equal(old.campaigns.timbermaw.chapter, 0);
  assert.ok(acceptCampaign(old, "timbermaw"));
  assert.deepEqual(old.campaigns.timbermaw.progress, {
    kills: 0,
    encounters: 0,
    guardians: 0,
    victories: 0,
  });
  assert.equal(settleRun(old, r), false);
});
test("independent faction attempts and repeatable commissions share only matching future destinations", () => {
  const s = ready();
  for (const f of CAMPAIGN_FACTIONS) assert.ok(acceptCampaign(s, f));
  assert.ok(acceptCommission(s, "timbermaw_patrol"));
  const r = run(snapshot(s, "timbermaw"));
  r.campaignProof = campaignSnapshots(s).map((q) => ({
    ...q,
    progress: campaignRunCounts(q, r),
  }));
  assert.ok(settleRun(s, r));
  assert.equal(s.commission!.progress, 150);
  assert.ok(campaignReady(s, "timbermaw"));
  assert.equal(s.campaigns.thorium.progress.kills, 0);
  assert.equal(s.campaigns.argent.progress.kills, 0);
});
test("abandoning and reaccepting rejects old proof and stale claim or abandonment reviews", () => {
  const s = ready();
  acceptCampaign(s, "timbermaw");
  const old = snapshot(s, "timbermaw"),
    r = run(old);
  assert.ok(abandonCampaign(s, "timbermaw", old));
  assert.ok(acceptCampaign(s, "timbermaw"));
  const current = snapshot(s, "timbermaw");
  assert.notEqual(current.attempt, old.attempt);
  settleRun(s, r);
  assert.equal(s.campaigns.timbermaw.progress.kills, 0);
  assert.equal(abandonCampaign(s, "timbermaw", old), false);
  assert.equal(claimCampaign(s, "timbermaw", old), false);
  settleRun(s, run(current));
  assert.ok(campaignReady(s, "timbermaw"));
  const before = JSON.stringify(s);
  assert.equal(
    claimCampaign(s, "timbermaw", { ...current, chapter: 1 }),
    false,
  );
  assert.equal(claimCampaign(s, "timbermaw", current, "warrior"), false);
  assert.equal(JSON.stringify(s), before);
  assert.ok(claimCampaign(s, "timbermaw", current));
});
test("claims grant XP to the reviewed selected hero while other roster members can earn field proof", () => {
  const s = ready();
  s.heroes.warrior.level = 1;
  acceptCampaign(s, "timbermaw");
  const q = snapshot(s, "timbermaw");
  settleRun(s, run(q));
  const mage = structuredClone(s.heroes.mage);
  s.selectedClass = "warrior";
  assert.ok(claimCampaign(s, "timbermaw", q, "warrior"));
  assert.deepEqual(s.heroes.mage, mage);
  assert.ok(s.heroes.warrior.xp > 0 || s.heroes.warrior.level > 1);
});
test("run snapshots are copied, deduplicated and never mutate from later save changes", () => {
  const s = ready();
  acceptCampaign(s, "timbermaw");
  const q = snapshot(s, "timbermaw"),
    inputs = [q, q, { ...q, faction: "unknown" }];
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(s),
    professions: {},
    campaigns: inputs as CampaignSnapshot[],
    seed: 42,
  });
  q.attempt = "changed";
  q.chapter = 3;
  assert.equal(g.result().campaignProof!.length, 1);
  assert.equal(g.result().campaignProof![0].chapter, 0);
  assert.notEqual(g.result().campaignProof![0].attempt, "changed");
  const result = g.result();
  result.campaignProof![0].progress.kills = 180;
  assert.equal(g.result().campaignProof![0].progress.kills, 0);
});
test("preview is read-only and settlement caps proof against destination and actual counters", () => {
  const s = ready();
  acceptCampaign(s, "timbermaw");
  const q = snapshot(s, "timbermaw"),
    r = run(q, { kills: 5, encounters: 1 });
  r.campaignProof![0].progress = {
    kills: 99999,
    encounters: 99999,
    guardians: 99999,
    victories: 1,
  };
  const before = JSON.stringify(s);
  assert.equal(campaignProgressPreview(s, "timbermaw", r).kills, 5);
  assert.equal(JSON.stringify(s), before);
  settleRun(s, r);
  assert.equal(s.campaigns.timbermaw.progress.kills, 5);
  assert.equal(s.campaigns.timbermaw.progress.encounters, 1);
  const wrong = run(q, { zoneId: "tirisfal", kills: 1000 });
  wrong.campaignProof![0].progress.kills = 180;
  settleRun(s, wrong);
  assert.equal(s.campaigns.timbermaw.progress.kills, 5);
});
test("save import bounds malformed campaigns and proof, resets inactive counters and preserves completion", () => {
  const raw = ready() as unknown as Record<string, unknown>;
  raw.campaigns = {
    timbermaw: {
      chapter: 0,
      attempt: "valid",
      progress: {
        kills: 1e20,
        encounters: Infinity,
        guardians: 50,
        victories: 3,
      },
    },
    thorium: { chapter: 4, attempt: "old", progress: { kills: 999 } },
    argent: { chapter: 1, attempt: "<script>", progress: { encounters: 3 } },
  };
  const s = validateSave(raw);
  assert.equal(s.campaigns.timbermaw.progress.kills, 180);
  assert.equal(s.campaigns.timbermaw.progress.encounters, 0);
  assert.equal(s.campaigns.timbermaw.progress.guardians, 0);
  assert.equal(s.campaigns.thorium.chapter, 4);
  assert.equal(s.campaigns.thorium.attempt, null);
  assert.equal(s.campaigns.argent.attempt, null);
  assert.equal(s.campaigns.argent.progress.encounters, 0);
  assert.ok(!s.inventory.includes(campaignCloakId("thorium")));
  assert.equal(
    validateCampaignProof([
      null,
      { faction: "__proto__", chapter: 0, attempt: "a" },
    ]).length,
    0,
  );
  const q: CampaignSnapshot = {
    faction: "timbermaw",
    chapter: 0,
    attempt: "x",
  };
  assert.equal(
    validateCampaignProof([
      { ...q, progress: { kills: -1, encounters: 999 } },
      q,
    ]).length,
    1,
  );
  const r = run(q);
  raw.history = [r];
  assert.deepEqual(validateSave(raw).history[0].campaignProof, r.campaignProof);
});
test("real cache guards and shrine interaction contribute completed landmarks only once", () => {
  const s = ready();
  acceptCampaign(s, "timbermaw");
  const g = engine(s, "timbermaw"),
    l = g.landmarks.find((l) => l.kind === "cache")!;
  Object.assign(g.player, { x: l.x, y: l.y });
  assert.ok(g.interact());
  assert.equal(g.result().campaignProof![0].progress.encounters, 0);
  for (const guard of g.enemies.filter((e) => l.guardIds.includes(e.id)))
    Object.assign(guard, { hp: 1, x: l.x + 30, y: l.y });
  assert.ok(g.useBomb());
  g.update(1 / 60);
  assert.equal(l.state, "complete");
  assert.equal(g.result().campaignProof![0].progress.encounters, 1);
  const shrine = g.landmarks.find((l) => l.kind === "shrine")!;
  Object.assign(g.player, { x: shrine.x, y: shrine.y });
  assert.ok(g.interact());
  assert.ok(g.chooseBlessing("might"));
  assert.equal(g.result().campaignProof![0].progress.encounters, 2);
  assert.equal(g.interact(), false);
  settleRun(s, g.result());
  assert.equal(s.campaigns.timbermaw.progress.encounters, 2);
});
test("premature dungeon victory cannot advance a final chapter or settle other rewards", () => {
  const s = ready();
  s.campaigns.argent.chapter = 3;
  acceptCampaign(s, "argent");
  const before = JSON.stringify(s),
    r = run(snapshot(s, "argent"), { victory: true, dungeonBosses: 3 });
  assert.equal(settleRun(s, r), false);
  assert.equal(JSON.stringify(s), before);
});
test("Exalted purchases require completion, standing, level and funds and support safe shared equipment", () => {
  for (const faction of CAMPAIGN_FACTIONS)
    for (const c of CLASSES) {
      const s = ready();
      s.selectedClass = c.id;
      const offer = `${faction}_exalted`,
        gear = campaignTrinketId(faction);
      assert.match(offerRestriction(s, offer)!, /four campaign/);
      assert.equal(buyOffer(s, offer), false);
      s.campaigns[faction].chapter = 4;
      s.reputation[faction] = 1999;
      assert.match(offerRestriction(s, offer)!, /Exalted/);
      s.reputation[faction] = 2000;
      s.heroes[c.id].level = 19;
      assert.match(offerRestriction(s, offer)!, /20/);
      s.heroes[c.id].level = 20;
      s.gold = 499;
      assert.equal(buyOffer(s, offer), false);
      s.gold = 500;
      assert.ok(buyOffer(s, offer));
      assert.equal(s.gold, 0);
      assert.equal(buyOffer(s, offer), false);
      assert.ok(equip(s, gear));
      assert.equal(sellGear(s, gear), false);
      s.heroes[c.id].equipment.trinket = undefined;
      assert.ok(sellGear(s, gear));
      assert.equal(s.gold, GEAR_MAP[gear].value);
      s.gold = 500;
      assert.ok(buyOffer(s, offer));
      assert.equal(s.inventory.filter((id) => id === gear).length, 1);
    }
});

for (const faction of CAMPAIGN_FACTIONS)
  test(`${faction} real outdoor final-boss defeat completes the reclamation chapter`, () => {
    const s = ready();
    s.campaigns[faction].chapter = 1;
    assert.ok(acceptCampaign(s, faction));
    s.campaigns[faction].progress.encounters = 3;
    const g = engine(s, faction);
    g.time = g.zone.duration - 0.001;
    g.update(1 / 60);
    assert.ok(g.boss);
    Object.assign(g.boss, { hp: 1, x: 100, y: 0, speed: 0 });
    g.enemies = [g.boss];
    assert.ok(g.useBomb());
    assert.equal(g.victory, true);
    assert.equal(g.result().campaignProof![0].progress.victories, 1);
    assert.ok(settleRun(s, g.result()));
    assert.ok(campaignReady(s, faction));
    assert.ok(claimCampaign(s, faction, snapshot(s, faction)));
    assert.equal(s.campaigns[faction].chapter, 2);
  });

test("Exalted offense equipment increases real noncritical automatic melee damage", () => {
  const s = ready();
  s.selectedClass = "warrior";
  function combat() {
    const g = new GameEngine({
      classId: "warrior",
      zone: ZONES[0],
      stats: { ...heroStats(s), health: 10000, crit: 0 },
      professions: {},
      seed: 7,
    });
    g.enemies = [
      {
        ...g.enemies[0],
        x: 55,
        y: 0,
        hp: 100000,
        maxHp: 100000,
        speed: 0,
        damage: 0,
      },
    ];
    g.spells[0].timer = 0;
    return g;
  }
  const before = combat(),
    originalPower = heroStats(s).power;
  s.campaigns.argent.chapter = 4;
  assert.ok(buyOffer(s, "argent_exalted"));
  assert.ok(equip(s, campaignTrinketId("argent")));
  const after = combat();
  before.update(1 / 60);
  after.update(1 / 60);
  const damage = [before, after].map((g) => 100000 - g.enemies[0].hp);
  assert.ok(damage[0] > 0);
  assert.ok(damage[1] > damage[0]);
  assert.ok(
    Math.abs(
      damage[1] / damage[0] -
        (100 + originalPower + 14) / (100 + originalPower),
    ) < 1e-6,
  );
});
