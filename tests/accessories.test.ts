import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCESSORY_GEAR,
  ACCESSORY_RECIPES,
  ACCESSORY_SOURCES,
} from "../src/accessories";
import {
  CLASSES,
  GEAR,
  GEAR_MAP,
  MATERIALS,
  RECIPES,
  SLOTS,
  ZONES,
} from "../src/content";
import type { ClassId } from "../src/content";
import {
  craft,
  craftRestriction,
  equip,
  equipmentTarget,
  equipRestriction,
  freshSave,
  gearComparison,
  heroStats,
  sellGear,
  settleRun,
  validateSave,
} from "../src/progression";
import type { RunRecord } from "../src/progression";
import { gearFitsSlot, gearSlotLabel } from "../src/equipment";
import { renderDuskwoodPreview } from "../src/duskwood-ui";
import { renderDungeonPreview } from "../src/dungeon-ui";
import {
  WARDROBE_CATALOG,
  WARDROBE_CATALOG_SOURCES,
  renderWardrobe,
} from "../src/wardrobe-ui";
import { renderRingReview } from "../src/equipment-ui";
import { GameEngine } from "../src/engine";
import { DUNGEONS, dungeonRoute } from "../src/dungeon";
import { tierForSkill } from "../src/resources";
import { ENCHANTMENTS } from "../src/enchanting";

const rings = [
  "elwynn_ring",
  "westfall_ring",
  "tirisfal_ring",
  "mooncurse_ring",
];
function ready(classId: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = classId;
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.gold = 10000;
  for (const id of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[id] = 1000;
  s.inventory.push(...ACCESSORY_GEAR.map((g) => g.id));
  return s;
}
test("twenty-four additions have unique source identities, eight graded recipes and no accidental set/enchant/ring craft", () => {
  assert.equal(SLOTS.length, 16);
  assert.equal(ACCESSORY_GEAR.length, 24);
  assert.equal(ACCESSORY_RECIPES.length, 8);
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  for (const g of ACCESSORY_GEAR) {
    const source = ACCESSORY_SOURCES[g.id];
    assert.deepEqual(WARDROBE_CATALOG_SOURCES[g.id], source);
    assert.equal(g.set, undefined);
    if (g.slot !== "wrists")
      assert.ok(!ENCHANTMENTS.some((e) => e.slot === g.slot));
    if (source.type === "world") assert.deepEqual(g.dropZones, [source.zone]);
    else assert.equal(g.dropZones, undefined);
    if (source.type === "dungeon")
      assert.ok(
        dungeonRoute(source.zone)!.stages[source.stage].loot.includes(g.id),
      );
    if (g.slot === "finger1") {
      assert.equal(g.armor, undefined);
      assert.ok(!RECIPES.some((r) => r.output === g.id));
    }
  }
  for (const r of ACCESSORY_RECIPES) {
    assert.ok(r.gold > GEAR_MAP[r.output!].value / 2);
    assert.equal(r.trainingRank, r.skill === 125 ? 3 : 4);
    for (const id of Object.keys(r.cost))
      assert.equal(
        MATERIALS[id as keyof typeof MATERIALS].tier,
        tierForSkill(r.skill),
      );
  }
});
test("legacy saves and fresh characters retain ten-slot stats with all three added positions empty", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    const before = heroStats(s),
      equipment = structuredClone(s.heroes[c.id].equipment),
      loaded = validateSave(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(heroStats(loaded), before);
    assert.deepEqual(loaded.heroes[c.id].equipment, equipment);
    for (const slot of ["wrists", "finger1", "finger2"] as const)
      assert.equal(loaded.heroes[c.id].equipment[slot], undefined);
    assert.ok(!ACCESSORY_GEAR.some((g) => loaded.inventory.includes(g.id)));
  }
});
test("rings fill empty positions once, both full requires a target, and rejected requests are inert", () => {
  const s = ready(),
    hero = s.heroes.mage;
  assert.equal(gearSlotLabel("finger1"), "Ring");
  assert.equal(gearSlotLabel("finger2"), "Ring");
  assert.equal(equipmentTarget(s, rings[0]), "finger1");
  assert.ok(equip(s, rings[0]));
  assert.equal(equipmentTarget(s, rings[1]), "finger2");
  assert.ok(equip(s, rings[1]));
  assert.ok(equip(s, rings[0]));
  assert.deepEqual(
    [hero.equipment.finger1, hero.equipment.finger2],
    rings.slice(0, 2),
  );
  const before = structuredClone(s);
  assert.equal(equipmentTarget(s, rings[2]), null);
  assert.equal(equip(s, rings[2]), false);
  assert.deepEqual(gearComparison(s, rings[2]), {});
  for (const [id, slot] of [
    [rings[2], "wrists"],
    ["elwynn_wristwraps", "finger2"],
    ["bad", "finger1"],
    [rings[2], "bad"],
  ])
    assert.equal(equip(s, id, slot as any), false);
  assert.deepEqual(s, before);
  assert.equal(gearFitsSlot(GEAR_MAP[rings[0]], "finger2"), true);
  assert.equal(gearFitsSlot(GEAR_MAP[rings[0]], "__proto__"), false);
});
test("targeted ring comparisons equal real resulting stats for replacement and moving", () => {
  for (const c of CLASSES)
    for (const target of ["finger1", "finger2"] as const) {
      const s = ready(c.id);
      equip(s, rings[0]);
      equip(s, rings[1]);
      for (const id of [rings[2], rings[0]]) {
        const state = structuredClone(s),
          before = heroStats(state),
          comparison = gearComparison(state, id, target);
        assert.deepEqual(state, s);
        assert.ok(equip(state, id, target));
        const after = heroStats(state);
        for (const key of Object.keys(before) as (keyof typeof before)[])
          assert.ok(
            Math.abs((comparison[key] || 0) - (after[key] - before[key])) <
              1e-9,
          );
        assert.equal(
          Object.values(state.heroes[c.id].equipment).filter(
            (value) => value === id,
          ).length,
          1,
        );
      }
    }
});
test("moving a worn ring clears its old position rather than duplicating its bonuses", () => {
  const s = ready();
  equip(s, rings[0]);
  equip(s, rings[1]);
  const before = heroStats(s);
  assert.ok(equip(s, rings[0], "finger2"));
  assert.equal(s.heroes.mage.equipment.finger1, undefined);
  assert.equal(s.heroes.mage.equipment.finger2, rings[0]);
  const after = heroStats(s);
  assert.equal(after.regen, before.regen - 0.2);
  assert.equal(after.magnet, before.magnet - 8);
});
test("import repairs duplicate rings deterministically and rejects wrong positions, ownership and level/class violations", () => {
  const s = ready();
  s.heroes.mage.equipment = {
    finger2: rings[0],
    finger1: rings[0],
    wrists: "expert_plate_bracers",
    head: rings[1],
  };
  s.heroes.warrior.equipment = { finger2: "bad", wrists: "elwynn_wristwraps" };
  s.heroes.warrior.level = 1;
  s.heroes.priest.equipment = { finger1: rings[3] };
  s.heroes.priest.level = 10;
  s.heroes.druid.equipment = { finger2: rings[2] };
  s.inventory = s.inventory.filter((id) => id !== rings[2]);
  const loaded = validateSave(s);
  assert.equal(loaded.heroes.mage.equipment.finger1, rings[0]);
  assert.equal(loaded.heroes.mage.equipment.finger2, undefined);
  assert.equal(loaded.heroes.mage.equipment.wrists, undefined);
  assert.equal(loaded.heroes.mage.equipment.head, undefined);
  assert.deepEqual(loaded.heroes.warrior.equipment, {});
  assert.deepEqual(loaded.heroes.priest.equipment, {});
  assert.deepEqual(loaded.heroes.druid.equipment, {});
  const valid = ready();
  equip(valid, rings[0], "finger2");
  assert.deepEqual(
    validateSave(valid).heroes.mage.equipment,
    valid.heroes.mage.equipment,
  );
});
test("all classes can use both ring positions and only eligible bracer armor at its level", () => {
  for (const c of CLASSES) {
    const s = ready(c.id);
    for (const g of ACCESSORY_GEAR) {
      const armor = ["cloth", "leather", "mail", "plate"],
        allowed = !g.armor || armor.indexOf(g.armor) <= armor.indexOf(c.armor);
      assert.equal(equipRestriction(s, g.id) === null, allowed);
      if (g.slot === "finger1") assert.ok(equip(s, g.id, "finger2"));
      s.heroes[c.id].level = g.level! - 1;
      assert.equal(equip(s, g.id, g.slot), false);
      s.heroes[c.id].level = 21;
    }
  }
});
test("eight real bracer crafts charge exact gold and graded materials, require trained caps and refund owned duplicates", () => {
  for (const r of ACCESSORY_RECIPES) {
    const s = ready("warrior");
    s.inventory = s.inventory.filter((id) => id !== r.output);
    s.professions[r.profession as any] = r.skill;
    s.training[r.profession as any] = r.trainingRank;
    const before = structuredClone(s);
    assert.ok(craft(s, r.id));
    assert.equal(s.gold, before.gold - r.gold);
    assert.ok(s.inventory.includes(r.output!));
    for (const [id, amount] of Object.entries(r.cost))
      assert.equal(
        s.materials[id as keyof typeof s.materials],
        before.materials[id as keyof typeof s.materials] - amount!,
      );
    const gold = s.gold;
    assert.ok(craft(s, r.id));
    assert.equal(
      s.gold,
      gold - r.gold + Math.floor(GEAR_MAP[r.output!].value / 2),
    );
    const locked = structuredClone(before);
    locked.training[r.profession as any] = r.trainingRank === 4 ? 3 : 2;
    const unchanged = structuredClone(locked);
    assert.ok(craftRestriction(locked, r.id));
    assert.equal(craft(locked, r.id), null);
    assert.deepEqual(locked, unchanged);
    const wrong = structuredClone(before);
    for (const id of Object.keys(r.cost))
      wrong.materials[id as keyof typeof wrong.materials] = 0;
    const stock = structuredClone(wrong);
    assert.equal(craft(wrong, r.id), null);
    assert.deepEqual(wrong, stock);
  }
});
test("rings in either position on any hero block sale/disenchant; settlement duplicates remain once-only refunds", () => {
  const s = ready();
  s.professions.enchanting = 100;
  equip(s, rings[0], "finger2");
  s.selectedClass = "warrior";
  assert.equal(sellGear(s, rings[0]), false);
  assert.equal(sellGear(s, rings[0], true), false);
  equip(s, rings[0]);
  delete s.heroes.mage.equipment.finger2;
  assert.equal(sellGear(s, rings[0]), false);
  delete s.heroes.warrior.equipment.finger1;
  assert.ok(sellGear(s, rings[0]));
  const run: RunRecord = {
    id: "accessory",
    classId: "mage",
    zoneId: "elwynn",
    victory: false,
    time: 0,
    kills: 0,
    level: 1,
    gold: 0,
    xp: 0,
    materials: {},
    loot: [rings[1], rings[1]],
    date: "2026-10-06T00:00:00Z",
  };
  const gold = s.gold;
  assert.ok(settleRun(s, run));
  assert.equal(s.gold, gold + 2 * Math.floor(GEAR_MAP[rings[1]].value / 2));
  assert.equal(settleRun(s, run), false);
  assert.equal(s.gold, gold + 2 * Math.floor(GEAR_MAP[rings[1]].value / 2));
});
function field(
  zone: string,
  seed: number,
  classId: ClassId = "mage",
  level = 21,
) {
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === zone)!,
    characterLevel: level,
    stats: { ...heroStats(ready(classId)), health: 10000 },
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
test("actual guarded caches and elite kills reach all eight new world items and never leak craft/guardian rings", () => {
  const seen = new Set<string>();
  for (const zone of ["elwynn", "westfall", "tirisfal", "duskwood"])
    for (let seed = 1; seed <= 120; seed++) {
      const g = field(zone, seed * 7919),
        l = g.landmarks.find((l) => l.kind === "cache")!;
      g.player.x = l.x;
      g.player.y = l.y;
      assert.ok(g.interact());
      for (const id of l.guardIds) {
        const e = g.enemies.find((e) => e.id === id)!;
        e.hp = 1;
        e.x = g.player.x + 20;
        e.y = g.player.y;
      }
      assert.ok(g.useBomb());
      g.update(1 / 60);
      const id = g.loot[0],
        source = ACCESSORY_SOURCES[id];
      if (source) {
        assert.deepEqual(source, { type: "world", zone });
        seen.add(id);
      }
      assert.equal(l.state, "complete");
      const elite = field(zone, seed * 97);
      const e = (elite as any).spawnEnemy(20, true, 0, false, "gnoll");
      e.hp = 1;
      elite.useBomb();
      const chest = elite.pickups.find((p) => p.kind === "chest")!;
      const origin = ACCESSORY_SOURCES[chest.loot!];
      if (origin) {
        assert.deepEqual(origin, { type: "world", zone });
        seen.add(chest.loot!);
      }
    }
  assert.deepEqual(
    seen,
    new Set(ACCESSORY_GEAR.filter((g) => g.dropZones).map((g) => g.id)),
  );
  const novice = field("elwynn", 3, "mage", 1),
    l = novice.landmarks.find((l) => l.kind === "cache")!;
  novice.player.x = l.x;
  novice.player.y = l.y;
  novice.interact();
  for (const id of l.guardIds) {
    const e = novice.enemies.find((e) => e.id === id)!;
    e.hp = 1;
    e.x = novice.player.x + 20;
    e.y = novice.player.y;
  }
  novice.useBomb();
  novice.update(1 / 60);
  assert.ok((GEAR_MAP[novice.loot[0]].level || 1) <= 1);
});
test("real guardian victories reach all eight rings only in their declared rooms with no mid-run equipment changes", () => {
  const seen = new Set<string>();
  for (const route of DUNGEONS)
    for (let seed = 1; seed <= 45; seed++) {
      const g = field(route.id, seed * 7919);
      for (let stage = 0; stage < route.stages.length; stage++) {
        drain(g);
        g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
        g.update(1 / 60);
        drain(g);
        Object.assign(g.boss!, { hp: 1, x: g.player.x + 20, y: g.player.y });
        g.useBomb();
        const id = g.lastDungeonReward!,
          source = ACCESSORY_SOURCES[id];
        if (source) {
          assert.deepEqual(source, { type: "dungeon", zone: route.id, stage });
          seen.add(id);
        }
        if (stage < route.stages.length - 1)
          assert.ok(g.continueDungeon("edge"));
      }
      assert.ok(g.victory);
    }
  assert.deepEqual(
    seen,
    new Set(
      ACCESSORY_GEAR.filter(
        (g) => ACCESSORY_SOURCES[g.id].type === "dungeon",
      ).map((g) => g.id),
    ),
  );
});
test("acquisition families and ring review expose exact source costs and both replacement deltas", () => {
  const s = ready();
  equip(s, rings[0]);
  equip(s, rings[1]);
  const guide = renderWardrobe(s, {
    open: true,
    slot: "finger1",
    source: "all",
    usable: true,
  });
  assert.ok(guide.includes("12 pieces"));
  assert.ok(guide.includes("Ring"));
  assert.ok(guide.includes("VanCleef"));
  assert.ok(!guide.includes('data-wardrobe-id="expert_cloth_bracers"'));
  const wrists = renderWardrobe(s, {
    open: true,
    slot: "wrists",
    source: "craft",
    usable: true,
  });
  assert.ok(wrists.includes("8 Silk Cloth"));
  assert.ok(wrists.includes("Artisan"));
  const review = renderRingReview(s, rings[2]);
  assert.ok(
    review.includes("Brookstone Band") && review.includes("Harvest Moon Ring"),
  );
  assert.ok(
    review.includes('data-slot="finger1"') &&
      review.includes('data-slot="finger2"'),
  );
  assert.ok(review.includes("+12 Health"));
  s.selectedZone = "duskwood";
  const outdoor = renderDuskwoodPreview(s);
  assert.ok(outdoor.includes("Nightwatch Wristwraps"));
  assert.ok(outdoor.includes("Ravenhill Band"));
  assert.ok(outdoor.includes("Wrists · level 18"));
  assert.ok(outdoor.includes("Ring · level 19"));
  const restrictedOutdoor = GEAR.find(
    (g) => g.dropZones?.includes("duskwood") && g.classes?.length && !g.armor,
  );
  assert.ok(restrictedOutdoor);
  assert.ok(
    outdoor.includes(`<b>${restrictedOutdoor.name}</b><small>Class restricted`),
  );
  s.selectedZone = "deadmines";
  const dungeon = renderDungeonPreview(s);
  assert.ok(dungeon.includes("Foundry Signet"));
  assert.ok(dungeon.includes("Ring · level 10"));
  assert.ok(!dungeon.includes("finger1"));
  const restrictedDungeon = GEAR.find(
    (g) =>
      g.classes?.length && !g.armor && dungeon.includes(`<b>${g.name}</b>`),
  );
  assert.ok(restrictedDungeon);
  assert.ok(
    dungeon.includes(`<b>${restrictedDungeon.name}</b><small>Class restricted`),
  );
});
test("adding legal accessories changes real damage and restores an existing loadout on removal", () => {
  const s = ready();
  s.heroes.mage.equipment = { weapon: "starter_mage", chest: "cloth" };
  const before = heroStats(s),
    old = structuredClone(s.heroes.mage.equipment);
  const damage = (stats: ReturnType<typeof heroStats>) => {
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 31,
    });
    g.enemies = [];
    g.pets = [];
    const e = (g as any).spawnEnemy(100, false, 0, false, "wolf");
    e.hp = e.maxHp = 10000;
    e.speed = 0;
    g.spells[0].timer = 0;
    for (let i = 0; i < 90; i++) g.update(1 / 60);
    return 10000 - e.hp;
  };
  const baseline = damage(before);
  equip(s, "artisan_cloth_bracers");
  equip(s, "elwynn_ring");
  equip(s, "emberheart_band");
  assert.ok(damage(heroStats(s)) > baseline);
  s.heroes.mage.equipment = old;
  assert.deepEqual(heroStats(s), before);
  assert.equal(damage(heroStats(s)), baseline);
});
