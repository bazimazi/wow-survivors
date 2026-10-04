import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import type { EngineConfig, Enemy } from "../src/engine";
import { CLASSES, GEAR, RECIPES, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import {
  DUSKWOOD_GEAR,
  DUSKWOOD_SPRITES,
  duskwoodRoster,
} from "../src/duskwood";
import { createLandmarks, telegraphContains } from "../src/expedition";
import { zoneResourceTier } from "../src/resources";
import { WARDROBE_CATALOG, WARDROBE_CATALOG_SOURCES } from "../src/wardrobe-ui";
import {
  freshSave,
  heroStats,
  zoneUnlocked,
  expeditionRestriction,
  validateSave,
  settleRun,
  claimQuest,
  questProgress,
  equip,
  canEquip,
  acceptCampaign,
  campaignSnapshots,
  acceptProfessionQuest,
  professionQuestSnapshots,
} from "../src/progression";

function make(
  classId: ClassId = "mage",
  seed = 42,
  extra: Partial<EngineConfig> = {},
) {
  const s = freshSave();
  s.selectedClass = classId;
  s.heroes[classId].level = 20;
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === "duskwood")!,
    characterLevel: 20,
    stats: { ...heroStats(s), health: 10000, regen: 0, armor: 0, crit: 0 },
    professions: {},
    seed,
    onConsume: () => true,
    ...extra,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.xpNeeded = 1e9;
  return g;
}
function frames(g: GameEngine, n: number) {
  for (let i = 0; i < n; i++) g.update(1 / 60);
}
function boss(g: GameEngine, phase = 1, attack = 0) {
  g.time = 540 - 0.001;
  g.update(1 / 60);
  const b = g.boss!;
  assert.ok(b);
  g.enemies = [b];
  Object.assign(b, { x: 220, y: 0, speed: 0, attackTimer: 0 });
  b.hp = b.maxHp * (phase === 2 ? 0.49 : 1);
  g.bossState.attackIndex = attack;
  frames(g, 1);
  b.attackTimer = 100;
  return b;
}
function corpse(g: GameEngine, type: string, elite = false): Enemy {
  const template = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: g.stats,
    professions: {},
  }).enemies[0];
  return {
    ...template,
    id: 999,
    type,
    x: g.player.x + 25,
    y: g.player.y,
    hp: 1,
    maxHp: 1,
    speed: 0,
    damage: 0,
    elite,
  };
}

test("Duskwood requires persistent Shadowfang proof and selected hero level twenty", () => {
  const s = freshSave();
  s.totals.kills = 100000;
  s.totals.wins = 99;
  assert.equal(zoneUnlocked(s, "duskwood"), false);
  s.clearedZones.push("shadowfang");
  assert.equal(zoneUnlocked(s, "duskwood"), true);
  s.heroes.warrior.level = 20;
  assert.equal(
    expeditionRestriction(s, "duskwood"),
    "Requires character level 20",
  );
  s.heroes.mage.level = 20;
  assert.equal(expeditionRestriction(s, "duskwood"), null);
  s.selectedZone = "duskwood";
  s.history = [];
  assert.equal(
    validateSave(JSON.parse(JSON.stringify(s))).selectedZone,
    "duskwood",
  );
  assert.equal(
    zoneUnlocked(validateSave(JSON.parse(JSON.stringify(s))), "duskwood"),
    true,
  );
});
test("old saves and unknown destinations cannot fabricate Duskwood access", () => {
  const s = freshSave();
  delete (s as any).clearedZones;
  const restored = validateSave(s);
  assert.equal(zoneUnlocked(restored, "duskwood"), false);
  assert.equal(zoneUnlocked(restored, "missing"), false);
  assert.equal(restored.version, 1);
});
test("the seven destinations retain their original order and thirteen equipment additions have unique sources", () => {
  assert.deepEqual(
    ZONES.map((z) => z.id),
    [
      "elwynn",
      "westfall",
      "tirisfal",
      "deadmines",
      "ragefire",
      "shadowfang",
      "duskwood",
    ],
  );
  assert.equal(GEAR.length, 189);
  assert.equal(RECIPES.length, 75);
  assert.equal(DUSKWOOD_GEAR.length, 13);
  assert.equal(Object.keys(DUSKWOOD_SPRITES).length, 9);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, 189);
  assert.equal(WARDROBE_CATALOG.length, 52);
  for (const g of DUSKWOOD_GEAR) {
    assert.equal(g.level, 20);
    if (["shoulders", "back", "waist", "legs"].includes(g.slot))
      assert.deepEqual(WARDROBE_CATALOG_SOURCES[g.id], {
        type: "world",
        zone: "duskwood",
      });
  }
  assert.equal(
    DUSKWOOD_GEAR.find((g) => g.id === "watchkeeper_oath")!.dropZones,
    undefined,
  );
});
test("Duskwood waves introduce all eight enemies at their intended time boundaries", () => {
  for (const [time, count] of [
    [0, 2],
    [34.99, 2],
    [35, 4],
    [149.99, 4],
    [150, 6],
    [299.99, 6],
    [300, 8],
  ]) {
    const g = make();
    g.time = time;
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      g.enemies = [];
      (g as any).spawnEnemy();
      seen.add(g.enemies[0].type);
    }
    assert.equal(seen.size, count);
    assert.deepEqual([...seen].sort(), duskwoodRoster(time).sort());
  }
});
test("Duskwood mages cast bounded hostile projectiles through the real enemy update", () => {
  const g = make();
  const e = corpse(g, "dusk_mage");
  Object.assign(e, { hp: 500, x: 200, attackTimer: 0 });
  g.enemies = [e];
  frames(g, 1);
  assert.equal(g.projectiles.length, 1);
  assert.equal(g.projectiles[0].enemy, true);
  assert.ok(Number.isFinite(g.projectiles[0].vx));
});
test("six local landmarks retain the shrine, cache and ritual sequence", () => {
  const ls = createLandmarks("duskwood");
  assert.equal(ls.length, 6);
  assert.deepEqual(
    ls.map((l) => l.kind),
    ["shrine", "cache", "ritual", "shrine", "cache", "ritual"],
  );
  assert.ok(ls.every((l) => l.id.startsWith("duskwood-")));
  assert.ok(ls.some((l) => l.name.includes("Raven Hill")));
  assert.ok(ls.some((l) => l.name.includes("Yorgen")));
});
test("wolves and worgen give level- and skill-bounded hides while spiders and undead give cloth", () => {
  for (const type of [
    "dusk_wolf",
    "dusk_worgen",
    "dusk_spider",
    "dusk_rotted",
    "dusk_raider",
    "dusk_mage",
    "dusk_ogre",
    "dusk_defias",
  ]) {
    const g = make("mage", 42, {
      professions: { skinning: 225 },
      gatheringCaps: { skinning: 300 },
    });
    g.time = 280;
    g.rng.next = () => 0;
    g.enemies = [corpse(g, type)];
    g.useBomb();
    const beast = ["dusk_wolf", "dusk_worgen"].includes(type);
    assert.equal(g.materials[beast ? "thick_leather" : "mageweave_cloth"], 1);
    assert.equal(
      g.materials[beast ? "mageweave_cloth" : "thick_leather"],
      undefined,
    );
    assert.equal(g.professionGains.skinning || 0, beast ? 1 : 0);
  }
  const g = make("mage", 42, {
    professions: { skinning: 225 },
    characterLevel: 5,
  });
  g.time = 280;
  g.rng.next = () => 0;
  g.enemies = [corpse(g, "dusk_wolf")];
  g.useBomb();
  assert.equal(g.materials.medium_leather, 1);
});
test("frontier herb nodes enforce skill and training caps before actual gathering", () => {
  assert.equal(zoneResourceTier("duskwood"), 4);
  for (const skill of [224, 225]) {
    const g = make("mage", 42, {
      professions: { herbalism: skill },
      gatheringCaps: { herbalism: 300 },
    });
    const node = g.nodes.find((n) => n.kind === "sungrass")!;
    assert.ok(node);
    g.player.x = node.x;
    g.player.y = node.y;
    frames(g, 1);
    assert.equal(node.depleted, skill === 225);
    assert.equal((g.materials.sungrass || 0) > 0, skill === 225);
  }
});
test("every class receives only eligible level twenty local gear from real cache completions", () => {
  const seen = new Set<string>();
  for (const c of CLASSES)
    for (let seed = 1; seed <= 80; seed++) {
      const g = make(c.id, seed);
      const l = g.landmarks.find((l) => l.kind === "cache")!;
      g.player.x = l.x;
      g.player.y = l.y;
      frames(g, 1);
      assert.ok(g.interact());
      assert.equal(g.enemies.filter((e) => e.guard).length, 3);
      for (const e of g.enemies.filter((e) => e.guard)) {
        e.hp = 1;
        e.x = g.player.x + 20;
        e.y = g.player.y;
      }
      g.useBomb();
      frames(g, 1);
      assert.equal(l.state, "complete");
      assert.equal(g.completedEncounters, 1);
      assert.equal(g.loot.length, 1);
      const id = g.loot[0];
      assert.ok(canEquip(c.id, id));
      assert.ok(DUSKWOOD_GEAR.some((x) => x.id === id && x.dropZones));
      seen.add(id);
    }
  assert.equal(seen.size, 12);
});
test("elite loot is local and class eligible and never awards the exclusive boss trophy", () => {
  const seen = new Set<string>();
  for (const c of CLASSES)
    for (let seed = 1; seed <= 80; seed++) {
      const g = make(c.id, seed);
      g.enemies = [corpse(g, "dusk_rotted", true)];
      g.useBomb();
      const id = g.pickups.find((p) => p.kind === "chest")!.loot!;
      assert.ok(canEquip(c.id, id));
      assert.ok(DUSKWOOD_GEAR.some((x) => x.id === id && x.dropZones));
      seen.add(id);
    }
  assert.equal(seen.size, 12);
});
test("cleaver fans capture direction and increase from three to five lanes below half health", () => {
  for (const phase of [1, 2]) {
    const g = make();
    const b = boss(g, phase);
    assert.equal(g.hazards.length, phase === 1 ? 3 : 5);
    assert.ok(g.hazards.every((h) => h.shape === "line" && h.warning > 1.3));
    const end = { ...g.hazards[0].end! };
    g.player.y = 300;
    const hp = g.player.hp;
    frames(g, 85);
    assert.equal(g.player.hp, hp);
    assert.deepEqual(g.hazards[0]?.end || end, end);
    assert.equal(b.x, 220);
    assert.ok(!g.victory);
  }
});
test("cleaver containment hits in its marked lane and resolves only once", () => {
  const g = make();
  boss(g);
  g.player.x = 80;
  g.player.y = 0;
  const hp = g.player.hp;
  frames(g, 90);
  assert.ok(g.player.hp < hp);
  const after = g.player.hp;
  frames(g, 30);
  assert.equal(g.player.hp, after);
});
test("poison captures one or two positions and ticks exactly four times during its lifetime", () => {
  for (const phase of [1, 2]) {
    const g = make();
    boss(g, phase, 1);
    const hp = g.player.hp;
    assert.equal(g.hazards.length, phase === 1 ? 1 : 2);
    const h = g.hazards[0];
    assert.equal(h.linger, 3.2);
    assert.equal(h.x, 0);
    assert.ok(h.warning > 1.6);
    frames(g, 98);
    assert.equal(g.player.hp, hp);
    frames(g, 210);
    assert.ok(g.player.hp < hp);
    assert.equal(g.hazards.length, 0);
    assert.ok(Math.abs(hp - g.player.hp - h.damage * 4) < 1e-6);
  }
});
test("leaving the captured cloud avoids all poison ticks", () => {
  const g = make();
  boss(g, 2, 1);
  g.player.x = -250;
  const hp = g.player.hp;
  assert.ok(g.hazards.every((h) => !telegraphContains(h, g.player)));
  frames(g, 310);
  assert.equal(g.player.hp, hp);
});
test("poison tick count stays stable across variable frame durations and the engine timestep clamp", () => {
  for (const dt of [1 / 30, 0.007, 0.027, 0.05, 0.15]) {
    const g = make();
    boss(g, 1, 1);
    const hp = g.player.hp,
      damage = g.hazards[0].damage;
    for (let i = 0; i < Math.ceil(5.1 / Math.min(dt, 0.05)); i++) g.update(dt);
    assert.equal(g.hazards.length, 0);
    assert.ok(Math.abs(hp - g.player.hp - 4 * damage) < 1e-6);
  }
});
test("pause, upgrades and shrines freeze both warning and active poison timers", () => {
  for (const resolved of [false, true])
    for (const mode of ["paused", "choosing", "shrineChoice"]) {
      const g = make();
      boss(g, 1, 1);
      if (resolved) frames(g, 105);
      const snapshot = JSON.stringify(g.hazards),
        time = g.time,
        hp = g.player.hp;
      (g as any)[mode] = mode === "shrineChoice" ? g.landmarks[0].id : true;
      frames(g, 200);
      assert.equal(JSON.stringify(g.hazards), snapshot);
      assert.equal(g.time, time);
      assert.equal(g.player.hp, hp);
    }
});
test("overlapping clouds share invulnerability and orphaned clouds disappear before damaging", () => {
  const g = make();
  boss(g, 1, 1);
  g.hazards.push({ ...g.hazards[0] });
  const hp = g.player.hp;
  frames(g, 105);
  assert.ok(Math.abs(hp - g.player.hp - g.hazards[0].damage) < 1e-6);
  g.boss!.dead = true;
  const after = g.player.hp;
  frames(g, 120);
  assert.equal(g.hazards.length, 0);
  assert.equal(g.player.hp, after);
});
test("edge casts stay finite and the forty-eight hazard limit holds under repeated casts", () => {
  const g = make();
  const b = boss(g, 2, 1);
  g.player.x = 2200;
  g.player.y = 2200;
  for (let i = 0; i < 40; i++) (g as any).castBossAttack(b);
  assert.equal(g.hazards.length, 48);
  assert.ok(
    g.hazards.every(
      (h) =>
        Number.isFinite(h.x + h.y + h.radius) &&
        (h.end ? Number.isFinite(h.end.x + h.end.y) : true),
    ),
  );
});
test("survival alone cannot finish Duskwood; actual Stitches death clears poison and settles one guaranteed trophy", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    s.heroes[c.id].level = 20;
    const g = make(c.id);
    g.finish(true);
    assert.equal(g.ended, false);
    const b = boss(g, 1, 1);
    b.hp = 1;
    b.x = g.player.x + 25;
    b.y = g.player.y;
    assert.ok(g.useBomb());
    assert.equal(g.victory, true);
    assert.equal(g.hazards.length, 0);
    assert.equal(g.loot.filter((x) => x === "watchkeeper_oath").length, 1);
    const r = g.result();
    assert.ok(settleRun(s, r));
    assert.ok(s.clearedZones.includes("duskwood"));
    assert.equal(questProgress(s, "nightwatch"), 1);
    assert.ok(equip(s, "watchkeeper_oath"));
    assert.equal(s.heroes[c.id].equipment.trinket, "watchkeeper_oath");
    const gold = s.gold;
    assert.ok(claimQuest(s, "nightwatch"));
    assert.equal(s.gold, gold + 250);
    assert.equal(s.materials.dream_dust, 6);
    assert.equal(claimQuest(s, "nightwatch"), false);
    assert.equal(settleRun(s, r), false);
    const copy = validateSave(JSON.parse(JSON.stringify(s)));
    assert.equal(copy.heroes[c.id].equipment.trinket, "watchkeeper_oath");
  }
});
test("Duskwood runs do not advance accepted campaigns belonging to the earlier outdoor destinations", () => {
  const s = freshSave();
  s.heroes.mage.level = 20;
  assert.ok(acceptCampaign(s, "timbermaw"));
  const g = make("mage", 42, { campaigns: campaignSnapshots(s) });
  g.kills = 200;
  g.finish(false);
  assert.ok(settleRun(s, g.result()));
  assert.deepEqual(s.campaigns.timbermaw.progress, {
    kills: 0,
    encounters: 0,
    guardians: 0,
    victories: 0,
  });
  assert.equal(s.reputation.timbermaw, 0);
});
test("Duskwood skinning practices the trade without advancing a guild delivery assigned elsewhere", () => {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.professions.skinning = 225;
  s.training.skinning = 4;
  s.professionQuests.skinning.chapter = 2;
  assert.ok(acceptProfessionQuest(s, "skinning"));
  const g = make("mage", 42, {
    professions: s.professions,
    gatheringCaps: { skinning: 300 },
    professionQuests: professionQuestSnapshots(s),
  });
  g.time = 280;
  g.rng.next = () => 0;
  g.enemies = [corpse(g, "dusk_worgen")];
  g.useBomb();
  g.finish(false);
  assert.equal(g.result().professionProof![0].gathered, 0);
  assert.ok(settleRun(s, g.result(), g.professionGains));
  assert.equal(s.professions.skinning, 226);
  assert.equal(s.professionQuests.skinning.progress.gathered, 0);
});
test("low-level engine fixtures cannot drop undefined local elite rewards or equip the trophy", () => {
  const g = make("mage", 42, { characterLevel: 19 });
  g.enemies = [corpse(g, "dusk_rotted", true)];
  g.useBomb();
  assert.equal(g.pickups.filter((p) => p.kind === "chest").length, 0);
  const s = freshSave();
  s.inventory.push("watchkeeper_oath");
  s.heroes.mage.level = 19;
  assert.equal(equip(s, "watchkeeper_oath"), false);
  s.heroes.mage.level = 20;
  assert.ok(equip(s, "watchkeeper_oath"));
});
test("repeated Duskwood trophies settle as duplicate gold without replacing another hero's equipment", () => {
  const s = freshSave();
  s.heroes.warrior.level = 20;
  s.selectedClass = "warrior";
  s.inventory.push("watchkeeper_oath");
  assert.ok(equip(s, "watchkeeper_oath"));
  s.selectedClass = "mage";
  const g = make();
  const b = boss(g);
  b.hp = 1;
  b.x = g.player.x + 25;
  b.y = g.player.y;
  g.useBomb();
  const gold = s.gold,
    r = g.result();
  assert.ok(settleRun(s, r));
  assert.equal(s.inventory.filter((x) => x === "watchkeeper_oath").length, 1);
  assert.equal(s.gold, gold + r.gold + 130);
  assert.equal(s.heroes.warrior.equipment.trinket, "watchkeeper_oath");
});
