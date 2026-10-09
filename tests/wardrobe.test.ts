import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  GEAR,
  GEAR_MAP,
  GEAR_SETS,
  MATERIALS,
  RECIPES,
  SLOTS,
  ZONES,
} from "../src/content";
import type { ClassId, ProfessionId, Stats } from "../src/content";
import {
  WARDROBE_GEAR,
  WARDROBE_RECIPES,
  WARDROBE_SOURCES,
  WARDROBE_SLOTS,
} from "../src/wardrobe";
import { dungeonRoute, DUNGEONS } from "../src/dungeon";
import { GameEngine } from "../src/engine";
import { tierForSkill } from "../src/resources";
import { ENCHANTMENTS } from "../src/enchanting";
import {
  acceptProfessionQuest,
  applyEnchantment,
  canEquip,
  craft,
  craftRestriction,
  equip,
  equipRestriction,
  equippedSets,
  freshSave,
  gearComparison,
  heroStats,
  learnProfession,
  sellGear,
  settleRun,
  validateSave,
} from "../src/progression";
import type { RunRecord } from "../src/progression";

function prepared(classId: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = classId;
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.gold = 10000;
  for (const key of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[key] = 1000;
  return s;
}
function game(zone: string, level = 21, seed = 42, classId: ClassId = "mage") {
  const s = prepared(classId);
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === zone)!,
    stats: { ...heroStats(s), health: 10000 },
    characterLevel: level,
    professions: {},
    seed,
    onConsume: () => true,
  });
  g.spells = [];
  g.enemies = [];
  g.pets = [];
  return g;
}
function drain(g: GameEngine) {
  while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
}
function openCache(g: GameEngine) {
  const l = g.landmarks.find((l) => l.kind === "cache")!;
  Object.assign(g.player, { x: l.x, y: l.y });
  assert.equal(g.interact(), true);
  for (const id of l.guardIds) {
    const e = g.enemies.find((e) => e.id === id)!;
    e.hp = 1;
    e.x = g.player.x + 35;
    e.y = g.player.y;
  }
  assert.equal(g.useBomb(), true);
  g.update(1 / 60);
  assert.equal(l.state, "complete");
  return g.loot[0];
}
const run = (loot: string[], id = "wardrobe"): RunRecord => ({
  id,
  classId: "mage",
  zoneId: "elwynn",
  victory: false,
  time: 10,
  kills: 3,
  level: 1,
  gold: 0,
  xp: 0,
  materials: {},
  loot,
  date: "2026-10-04T00:00:00Z",
});

test("the forty additions have exactly one valid source and twenty affordable original recipes", () => {
  assert.equal(SLOTS.length, 16);
  assert.equal(GEAR.length, 384);
  assert.equal(RECIPES.length, 151);
  assert.equal(WARDROBE_GEAR.length, 40);
  assert.equal(WARDROBE_RECIPES.length, 20);
  assert.equal(Object.keys(WARDROBE_SOURCES).length, 47);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  for (const g of WARDROBE_GEAR) {
    assert.ok(
      WARDROBE_SLOTS.includes(g.slot as (typeof WARDROBE_SLOTS)[number]),
    );
    const source = WARDROBE_SOURCES[g.id];
    if (source.type === "world") assert.deepEqual(g.dropZones, [source.zone]);
    else assert.equal(g.dropZones, undefined);
    if (source.type === "dungeon")
      assert.ok(
        dungeonRoute(source.zone)!.stages[source.stage].loot.includes(g.id),
      );
    if (source.type === "craft") {
      const r = RECIPES.find((r) => r.id === source.recipe)!;
      assert.equal(r.output, g.id);
      assert.ok(r.gold > g.value / 2);
      for (const key of Object.keys(r.cost))
        assert.equal(
          MATERIALS[key as keyof typeof MATERIALS].tier,
          tierForSkill(r.skill),
        );
    }
  }
});
test("old version-one saves keep all six slots and gain no free gear or stats", () => {
  const s = prepared();
  for (const id of [
    "spellweave_head",
    "spellweave_hands",
    "spellweave_chest",
    "shadow_boots",
    "lionheart",
  ]) {
    s.inventory.push(id);
    equip(s, id);
  }
  const original = structuredClone(s),
    stats = heroStats(s),
    loaded = validateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(
    loaded.heroes.mage.equipment,
    original.heroes.mage.equipment,
  );
  assert.deepEqual(heroStats(loaded), stats);
  assert.deepEqual(loaded.inventory, s.inventory);
  assert.ok(
    WARDROBE_SLOTS.filter((slot) => slot !== "weapon").every(
      (slot) => !loaded.heroes.mage.equipment[slot],
    ),
  );
  assert.equal(loaded.version, 1);
});
test("new slots survive save import, while missing, misplaced, foreign and under-level gear is removed", () => {
  const s = prepared();
  for (const id of [
    "watchkeeper_mantle",
    "trailwatch_cloak",
    "hearthstitched_belt",
    "northshire_leggings",
  ]) {
    s.inventory.push(id);
    assert.ok(equip(s, id));
  }
  assert.deepEqual(
    validateSave(s).heroes.mage.equipment,
    s.heroes.mage.equipment,
  );
  s.heroes.mage.equipment.shoulders = "stonebound_spaulders";
  s.heroes.mage.equipment.back = "northshire_leggings";
  s.heroes.mage.equipment.waist = "shredder_drivebelt";
  s.inventory.push("shredder_drivebelt", "stonebound_spaulders");
  s.heroes.mage.level = 1;
  const h = validateSave(s).heroes.mage;
  assert.ok(
    WARDROBE_SLOTS.filter((slot) => slot !== "weapon").every(
      (slot) => !h.equipment[slot],
    ),
  );
});
test("four new pieces add their actual attributes and class/level gates block invalid equipment", () => {
  const s = prepared(),
    before = heroStats(s);
  const expected = { ...before };
  for (const id of [
    "watchkeeper_mantle",
    "trailwatch_cloak",
    "hearthstitched_belt",
    "northshire_leggings",
  ]) {
    s.inventory.push(id);
    assert.ok(equip(s, id));
    for (const [stat, value] of Object.entries(GEAR_MAP[id].stats))
      expected[stat as keyof Stats] += value!;
  }
  assert.deepEqual(heroStats(s), expected);
  s.inventory.push("smite_deckgreaves", "spiritwoven_leggings");
  assert.equal(equipRestriction(s, "smite_deckgreaves"), "Class restricted");
  assert.equal(equip(s, "smite_deckgreaves"), false);
  s.heroes.mage.level = 17;
  assert.equal(
    equipRestriction(s, "spiritwoven_leggings"),
    "Requires level 18",
  );
  assert.equal(equip(s, "spiritwoven_leggings"), false);
  for (const c of CLASSES)
    for (const g of WARDROBE_GEAR.filter((g) => !g.armor))
      assert.ok(canEquip(c.id, g.id));
});
test("all twenty recipes consume their exact graded costs, create one item and grant practice", () => {
  for (const r of WARDROBE_RECIPES) {
    const s = prepared(),
      profession = r.profession as ProfessionId;
    learnProfession(s, profession);
    s.professions[profession] = r.skill;
    s.training[profession] = r.trainingRank!;
    const before = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.gold, before.gold - r.gold);
    assert.equal(s.inventory.filter((id) => id === r.output).length, 1);
    for (const [key, n] of Object.entries(r.cost))
      assert.equal(
        s.materials[key as keyof typeof s.materials],
        before.materials[key as keyof typeof s.materials] - n!,
      );
    assert.equal(s.totals.crafts, 1);
    assert.equal(
      s.professions[profession],
      Math.min([0, 75, 150, 225, 300][r.trainingRank!], r.skill + 5),
    );
  }
});
test("failed new crafts leave saves unchanged across profession, skill, training, gold and material gates", () => {
  const s = prepared(),
    id = "craft_spellweave_shoulders";
  for (const restriction of [
    "Learn Tailoring",
    "Requires skill 125",
    "Train Expert",
    "More resources needed",
    "More resources needed",
  ]) {
    assert.equal(craftRestriction(s, id), restriction);
    const before = structuredClone(s);
    assert.equal(craft(s, id), null);
    assert.deepEqual(s, before);
    if (restriction === "Learn Tailoring") learnProfession(s, "tailoring");
    else if (restriction === "Requires skill 125")
      s.professions.tailoring = 125;
    else if (restriction === "Train Expert") {
      s.training.tailoring = 3;
      s.gold = 0;
    } else {
      s.gold = 1000;
      s.materials.silk_cloth = 0;
    }
  }
});
test("duplicate crafts lose gold, retain one shared item and still consume materials", () => {
  const s = prepared();
  learnProfession(s, "tailoring");
  s.professions.tailoring = 225;
  s.training.tailoring = 4;
  craft(s, "craft_runebound_drape");
  const before = structuredClone(s);
  assert.ok(craft(s, "craft_runebound_drape"));
  assert.equal(s.gold, before.gold - 75 + 70);
  assert.equal(
    s.materials.mageweave_cloth,
    before.materials.mageweave_cloth - 16,
  );
  assert.equal(s.inventory.filter((id) => id === "runebound_drape").length, 1);
});
for (const [setId, classId] of [
  ["spellweave", "mage"],
  ["pathfinder", "rogue"],
  ["ironwarden", "hunter"],
  ["oathsteel", "warrior"],
] as const) {
  test(`${setId} preserves its old bonuses and activates the sixth-piece bonus only when complete`, () => {
    const s = prepared(classId),
      baseline = heroStats(s),
      set = GEAR_SETS.find((s) => s.id === setId)!;
    const expected = { ...baseline };
    for (const [i, slot] of [
      "hands",
      "head",
      "chest",
      "shoulders",
      "waist",
      "legs",
    ].entries()) {
      const id = `${setId}_${slot}`;
      s.inventory.push(id);
      assert.ok(equip(s, id));
      const old =
        slot === "chest"
          ? GEAR_MAP[CLASSES.find((c) => c.id === classId)!.armor].stats
          : {};
      for (const [stat, value] of Object.entries(old))
        expected[stat as keyof Stats] -= value!;
      for (const [stat, value] of Object.entries(GEAR_MAP[id].stats))
        expected[stat as keyof Stats] += value!;
      for (const b of set.bonuses.filter((b) => b.pieces === i + 1))
        for (const [stat, value] of Object.entries(b.stats))
          expected[stat as keyof Stats] += value!;
      assert.deepEqual(heroStats(s), expected);
      assert.equal(equippedSets(s)[0].pieces, i + 1);
    }
    assert.deepEqual(
      validateSave(s).heroes[classId].equipment,
      s.heroes[classId].equipment,
    );
  });
}
test("replacing leggings compares and removes the sixth bonus without changing older bonuses or mutating saves", () => {
  const s = prepared();
  for (const slot of ["hands", "head", "chest", "shoulders", "waist", "legs"]) {
    const id = `spellweave_${slot}`;
    s.inventory.push(id);
    equip(s, id);
  }
  s.inventory.push("spiritwoven_leggings");
  const snapshot = structuredClone(s),
    before = heroStats(s),
    delta = gearComparison(s, "spiritwoven_leggings");
  assert.deepEqual(s, snapshot);
  assert.equal(delta.regen, -0.4);
  assert.equal(delta.magnet, -15);
  assert.ok(equip(s, "spiritwoven_leggings"));
  for (const [stat, value] of Object.entries(delta))
    assert.ok(
      Math.abs(
        heroStats(s)[stat as keyof Stats] -
          before[stat as keyof Stats] -
          value!,
      ) < 1e-6,
    );
  assert.equal(equippedSets(s)[0].pieces, 5);
});
test("shared new gear cannot be sold or disenchanted while any hero wears it", () => {
  const s = prepared();
  learnProfession(s, "enchanting");
  s.inventory.push("trailwatch_cloak");
  equip(s, "trailwatch_cloak");
  s.selectedClass = "warrior";
  assert.equal(sellGear(s, "trailwatch_cloak"), false);
  assert.equal(sellGear(s, "trailwatch_cloak", true), false);
  delete s.heroes.mage.equipment.back;
  const gold = s.gold;
  assert.equal(sellGear(s, "trailwatch_cloak"), true);
  assert.equal(s.gold, gold + 20);
});
test("new equipment disenchanting respects level grades and the existing formula slots", () => {
  const s = prepared();
  learnProfession(s, "enchanting");
  s.professions.enchanting = 300;
  s.training.enchanting = 4;
  for (const [id, dust, count] of [
    ["trailwatch_cloak", "dust", 2],
    ["gravewatch_cape", "vision_dust", 2],
    ["spiritwoven_leggings", "dream_dust", 4],
  ] as const) {
    s.inventory.push(id);
    const n = s.materials[dust];
    assert.equal(applyEnchantment(s, id, "chest_vitality"), false);
    assert.equal(sellGear(s, id, true), true);
    assert.equal(s.materials[dust], n + count);
  }
  assert.equal(ENCHANTMENTS.length, 24);
  assert.ok(
    ENCHANTMENTS.every(
      (e) =>
        e.slot === "offhand" ||
        e.slot === "back" ||
        e.slot === "wrists" ||
        e.slot === "weapon" ||
        !WARDROBE_SLOTS.includes(e.slot as (typeof WARDROBE_SLOTS)[number]),
    ),
  );
});
test("new Expert recipes advance only accepted grade-matched guild projects", () => {
  const s = prepared();
  learnProfession(s, "tailoring");
  s.professions.tailoring = 125;
  s.training.tailoring = 3;
  s.professionQuests.tailoring.chapter = 2;
  craft(s, "craft_spellweave_shoulders");
  assert.equal(s.professionQuests.tailoring.progress.crafts, 0);
  assert.ok(acceptProfessionQuest(s, "tailoring"));
  craft(s, "craft_spellweave_shoulders");
  assert.equal(s.professionQuests.tailoring.progress.crafts, 1);
  craft(s, "craft_linen_trail_cloak");
  assert.equal(s.professionQuests.tailoring.progress.crafts, 1);
});
test("actual cache guard defeats can yield all twelve outdoor additions, exclusively in their zones", () => {
  const seen = new Set<string>();
  for (const zone of ["elwynn", "westfall", "tirisfal"])
    for (let seed = 1; seed <= 160; seed++) {
      const g = game(zone, 21, seed * 7919),
        id = openCache(g),
        source = WARDROBE_SOURCES[id];
      assert.equal(g.loot.length, 1);
      if (source) {
        assert.equal(source.type, "world");
        assert.equal(source.type !== "craft" && source.zone, zone);
        seen.add(id);
      }
    }
  assert.equal(seen.size, 12);
});
test("level-one caches cannot award new gear and rewards remain one-time after real kills", () => {
  for (const zone of ["elwynn", "westfall", "tirisfal"]) {
    const g = game(zone, 1),
      id = openCache(g);
    assert.ok((GEAR_MAP[id].level || 1) <= 1);
    assert.equal(WARDROBE_SOURCES[id], undefined);
    drain(g);
    g.update(1 / 60);
    assert.equal(g.loot.length, 1);
  }
});
test("elite chest loot includes new local discoveries without leaking crafts or dungeon trophies", () => {
  const seen = new Set<string>();
  for (const zone of ["elwynn", "westfall", "tirisfal"])
    for (let seed = 1; seed <= 120; seed++) {
      const g = game(zone, 1, seed);
      // Constructor enemies are ordinary; create an elite using a public enemy fixture and kill it with a real bomb.
      g.enemies = [
        {
          id: 9000,
          x: g.player.x + 25,
          y: g.player.y,
          type: "gnoll",
          hp: 1,
          maxHp: 1,
          radius: 14,
          speed: 0,
          damage: 0,
          elite: true,
          boss: false,
          slowUntil: 0,
          slow: 1,
          frozenUntil: 0,
          flash: 0,
          attackTimer: 999,
          dead: false,
        },
      ];
      assert.ok(g.useBomb());
      const chest = g.pickups.find((p) => p.kind === "chest")!;
      assert.ok(chest);
      const source = WARDROBE_SOURCES[chest.loot!];
      if (source) {
        assert.equal(source.type, "world");
        assert.equal(source.type !== "craft" && source.zone, zone);
        seen.add(chest.loot!);
      }
    }
  assert.equal(seen.size, 12);
});
for (const route of DUNGEONS.filter((route) => route.id !== "scarlet")) {
  test(`${route.id} real guardian kills yield the new trophies only in their declared rooms and respect armor`, () => {
    const seen = new Set<string>();
    for (const classId of ["mage", "warrior"] as const)
      for (let seed = 1; seed <= 35; seed++) {
        const g = game(route.id, 10, seed * 7919, classId);
        for (let stage = 0; stage < route.stages.length; stage++) {
          drain(g);
          g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
          g.update(1 / 60);
          drain(g);
          assert.ok(g.boss);
          Object.assign(g.boss, { hp: 1, x: g.player.x + 25, y: g.player.y });
          assert.ok(g.useBomb());
          const id = g.lastDungeonReward!,
            source = WARDROBE_SOURCES[id];
          assert.ok(canEquip(classId, id));
          if (source) {
            assert.equal(source.type, "dungeon");
            if (source.type === "dungeon") {
              assert.equal(source.zone, route.id);
              assert.equal(source.stage, stage);
            }
            seen.add(id);
          }
          if (stage < route.stages.length - 1)
            assert.ok(g.continueDungeon("edge"));
        }
        assert.equal(g.loot.length, route.stages.length);
        assert.equal(g.victory, true);
      }
    assert.equal(
      seen.size,
      WARDROBE_GEAR.filter((g) => {
        const source = WARDROBE_SOURCES[g.id];
        return source.type === "dungeon" && source.zone === route.id;
      }).length,
    );
  });
}
test("new run loot stays unequipped, settles once and retains expedition duplicates as independent copies", () => {
  const s = prepared(),
    before = structuredClone(s.heroes.mage.equipment),
    n = s.gold;
  assert.ok(settleRun(s, run(["trailwatch_cloak", "trailwatch_cloak"])));
  assert.deepEqual(s.heroes.mage.equipment, before);
  assert.equal(s.inventory.filter((id) => id === "trailwatch_cloak").length, 1);
  assert.equal(s.gold, n);
  assert.equal(settleRun(s, run(["trailwatch_cloak"])), false);
  assert.equal(s.gold, n);
});
test("equipping new cloth legs and a restorative cape changes actual spell damage and combat healing", () => {
  const s = prepared(),
    base = heroStats(s);
  for (const id of ["mourningweave_leggings", "gravewatch_cape"]) {
    s.inventory.push(id);
    equip(s, id);
  }
  const results = [base, heroStats(s)].map((stats) => {
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 42,
    });
    const e = g.enemies[0];
    Object.assign(e, {
      x: 75,
      y: 0,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
      damage: 0,
    });
    g.enemies = [e];
    g.player.hp = 50;
    for (let i = 0; i < 120; i++) g.update(1 / 60);
    return { damage: 10000 - e.hp, hp: g.player.hp, stats: g.stats };
  });
  assert.ok(results[1].damage > results[0].damage);
  assert.ok(results[1].hp > results[0].hp);
  assert.equal(results[1].stats.armor, results[0].stats.armor + 9);
});
