import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  GEAR,
  GEAR_MAP,
  MATERIALS,
  RECIPES,
  SLOTS,
  ZONES,
} from "../src/content";
import type { ClassId, Stats } from "../src/content";
import {
  RANGED_GEAR,
  RANGED_RECIPES,
  RANGED_SOURCES,
  RANGED_CLASSES,
  LEGACY_RANGED,
  rangedClass,
} from "../src/ranged";
import {
  freshSave,
  validateSave,
  heroStats,
  equip,
  unequip,
  gearComparison,
  trainDualWield,
  applyEnchantment,
  craft,
  sellGear,
  forgetProfession,
  learnProfession,
  acceptProfessionQuest,
  settleRun,
  itemEnchantment,
  enchantmentComparison,
} from "../src/progression";
import { gearFitsSlot, rangedMultiplier } from "../src/equipment";
import { renderRangedReview } from "../src/equipment-ui";
import { renderEnchantingTable } from "../src/enchanting-ui";
import { WARDROBE_CATALOG, renderWardrobe } from "../src/wardrobe-ui";
import { ENCHANTMENTS } from "../src/enchanting";
import { tierForSkill } from "../src/resources";
import { GameEngine } from "../src/engine";
function ready(classId: ClassId = "hunter") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 10000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 1000;
  for (const p of ["enchanting", "engineering"] as const) {
    s.professions[p] = 225;
    s.training[p] = 4;
  }
  s.inventory.push(
    ...RANGED_GEAR.map((g) => g.id),
    ...Object.keys(LEGACY_RANGED).filter((id) => !s.inventory.includes(id)),
    "duskwood_duelist_blade",
    "artisan_duelist_blade",
    "duskwood_spellblade",
    "artisan_focus",
  );
  return s;
}
function deltaEquals(before: Stats, after: Stats, delta: Partial<Stats>) {
  for (const k of Object.keys(before) as (keyof Stats)[])
    assert.ok(Math.abs(after[k] - before[k] - (delta[k] || 0)) < 1e-8, k);
}
function field(zone: string, classId: ClassId, seed: number, level = 21) {
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === zone)!,
    stats: { ...heroStats(freshSave(), classId), health: 10000 },
    professions: {},
    characterLevel: level,
    seed,
    onConsume: () => true,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.xpNeeded = 1e9;
  return g;
}
test("twenty-two ranged rewards have explicit class/source/grade identities and eight existing weapons retain their legacy fit", () => {
  assert.equal(GEAR.length, 384);
  assert.equal(RECIPES.length, 151);
  assert.equal(SLOTS.length, 16);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(ENCHANTMENTS.length, 24);
  assert.equal(RANGED_GEAR.length, 22);
  assert.equal(RANGED_RECIPES.length, 8);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  for (const g of RANGED_GEAR) {
    assert.equal(g.slot, "ranged");
    assert.equal(g.weaponHands, undefined);
    assert.equal(g.set, undefined);
    assert.deepEqual(
      g.classes,
      RANGED_CLASSES[g.rangedType as "wand" | "thrown"],
    );
    assert.ok(gearFitsSlot(g, "ranged"));
    assert.ok(!gearFitsSlot(g, "weapon"));
    assert.ok(!gearFitsSlot(g, "offhand"));
    const source = RANGED_SOURCES[g.id];
    assert.ok(source);
    assert.deepEqual(
      g.dropZones,
      source.type === "world" ? [source.zone] : undefined,
    );
    if (source.type === "craft")
      assert.equal(RECIPES.find((r) => r.id === source.recipe)?.output, g.id);
  }
  for (const [id, kind] of Object.entries(LEGACY_RANGED)) {
    const g = GEAR_MAP[id];
    assert.equal(g.slot, "weapon");
    assert.equal(g.rangedType, kind);
    assert.equal(g.weaponHands, kind === "bow" ? 2 : 1);
    assert.ok(gearFitsSlot(g, "ranged"));
  }
});
test("all nine legacy saves keep exact builds/stats and no ranged migration reward", () => {
  for (const c of CLASSES) {
    const s = ready(c.id),
      before = structuredClone(s);
    const loaded = validateSave(s);
    assert.deepEqual(
      loaded.heroes[c.id].equipment,
      before.heroes[c.id].equipment,
    );
    assert.deepEqual(heroStats(loaded), heroStats(s));
    assert.equal(loaded.heroes[c.id].equipment.ranged, undefined);
    assert.deepEqual(loaded.inventory, s.inventory);
  }
});
test("all six eligible classes equip independent ranged bonuses beside two-handed primaries or valid shield/focus/dual-wield pairs", () => {
  for (const c of CLASSES) {
    const s = ready(c.id),
      kind = RANGED_CLASSES.wand.includes(c.id) ? "wand" : "thrown",
      id = `artisan_${kind}`,
      before = heroStats(s),
      original = structuredClone(s);
    assert.equal(equip(s, id), rangedClass(c.id));
    if (!rangedClass(c.id)) {
      assert.deepEqual(s, original);
      continue;
    }
    assert.equal(s.heroes[c.id].equipment.weapon, `starter_${c.id}`);
    assert.equal(heroStats(s).power - before.power, 18);
    assert.equal(rangedMultiplier(c.id, s.heroes[c.id]), 1);
    if (RANGED_CLASSES.wand.includes(c.id)) {
      assert.ok(equip(s, "duskwood_spellblade"));
      assert.ok(equip(s, "artisan_focus"));
    } else {
      assert.ok(trainDualWield(s));
      assert.ok(equip(s, "duskwood_duelist_blade"));
      assert.ok(equip(s, "artisan_duelist_blade", "offhand"));
    }
    const pair = { ...s.heroes[c.id].equipment };
    assert.ok(unequip(s, "ranged"));
    const { ranged, ...hands } = pair;
    assert.equal(ranged, id);
    assert.deepEqual(s.heroes[c.id].equipment, hands);
    assert.ok(equip(s, id));
    assert.ok(unequip(s, "weapon"));
    assert.equal(s.heroes[c.id].equipment.ranged, id);
    assert.equal(s.heroes[c.id].equipment.offhand, undefined);
  }
});
test("reviewed legacy moves count each item once and exact comparisons include dependent off-hand and enchantment removal", () => {
  const s = ready("priest");
  assert.ok(equip(s, "artisan_focus"));
  assert.ok(applyEnchantment(s, "starter_priest", "weapon_force"));
  const before = heroStats(s),
    delta = gearComparison(s, "starter_priest", "ranged"),
    review = renderRangedReview(s, "starter_priest");
  assert.ok(
    review.includes("Removes") && review.includes(GEAR_MAP.artisan_focus.name),
  );
  assert.ok(equip(s, "starter_priest", "ranged"));
  deltaEquals(before, heroStats(s), delta);
  assert.equal(s.heroes.priest.equipment.weapon, undefined);
  assert.equal(s.heroes.priest.equipment.offhand, undefined);
  assert.equal(itemEnchantment(s, "starter_priest")?.id, "weapon_force");
  assert.ok(equip(s, "duskwood_spellblade"));
  assert.ok(equip(s, "artisan_focus"));
  const back = heroStats(s),
    change = gearComparison(s, "starter_priest", "weapon");
  assert.ok(equip(s, "starter_priest", "weapon"));
  deltaEquals(back, heroStats(s), change);
  assert.equal(s.heroes.priest.equipment.ranged, undefined);
  assert.equal(s.heroes.priest.equipment.offhand, "artisan_focus");
  const h = ready();
  trainDualWield(h);
  equip(h, "duskwood_duelist_blade");
  equip(h, "artisan_duelist_blade", "offhand");
  equip(h, "ravenhill_bow", "ranged");
  const pair = heroStats(h),
    d = gearComparison(h, "ravenhill_bow", "weapon");
  assert.ok(
    renderRangedReview(h, "ravenhill_bow").includes("Masterwork Duelist Blade"),
  );
  assert.ok(equip(h, "ravenhill_bow", "weapon"));
  deltaEquals(pair, heroStats(h), d);
  assert.equal(h.heroes.hunter.equipment.offhand, undefined);
  assert.equal(h.heroes.hunter.equipment.ranged, undefined);
});
test("unowned, underlevel, wrong-class and wrong-position ranged placements reject atomically", () => {
  for (const reason of ["unowned", "level", "class", "slot"]) {
    const s = ready();
    if (reason === "unowned")
      s.inventory = s.inventory.filter((id) => id !== "artisan_thrown");
    if (reason === "level") s.heroes.hunter.level = 17;
    if (reason === "class") s.selectedClass = "mage";
    const before = structuredClone(s);
    assert.equal(
      equip(s, "artisan_thrown", reason === "slot" ? "weapon" : "ranged"),
      false,
    );
    assert.deepEqual(s, before);
  }
});
test("canonical imports preserve independent pairs and repair duplicate, forbidden, underlevel and unowned ranged placements; direct stats ignore invalid pairs", () => {
  const s = ready();
  trainDualWield(s);
  equip(s, "duskwood_duelist_blade");
  equip(s, "artisan_duelist_blade", "offhand");
  equip(s, "ravenhill_bow", "ranged");
  s.heroes.hunter.equipment = {
    ranged: "ravenhill_bow",
    ...s.heroes.hunter.equipment,
  };
  assert.deepEqual(heroStats(validateSave(s)), heroStats(s));
  for (const reason of ["duplicate", "class", "level", "unowned", "slot"]) {
    const raw = structuredClone(s);
    if (reason === "duplicate")
      raw.heroes.hunter.equipment.weapon = "ravenhill_bow";
    if (reason === "class") raw.heroes.hunter.equipment.ranged = "artisan_wand";
    if (reason === "level") raw.heroes.hunter.level = 10;
    if (reason === "unowned")
      raw.inventory = raw.inventory.filter((id) => id !== "ravenhill_bow");
    if (reason === "slot")
      raw.heroes.hunter.equipment.ranged = "duskwood_duelist_blade";
    const loaded = validateSave(raw);
    assert.equal(loaded.heroes.hunter.equipment.ranged, undefined);
    assert.deepEqual(validateSave(loaded), loaded);
    if (reason !== "unowned") {
      const without = structuredClone(raw);
      delete without.heroes.hunter.equipment.ranged;
      assert.deepEqual(heroStats(raw), heroStats(without));
    }
  }
});
test("weapon formulas apply fully to ranged crafts, remain shared after unlearning and import, and are exposed at the enchanting table", () => {
  const s = ready("mage");
  equip(s, "artisan_wand");
  const before = heroStats(s);
  assert.deepEqual(
    enchantmentComparison(s, "artisan_wand", "weapon_precision"),
    { crit: 5 },
  );
  assert.ok(applyEnchantment(s, "artisan_wand", "weapon_precision"));
  assert.equal(heroStats(s).crit - before.crit, 5);
  s.heroes.priest.equipment.ranged = "artisan_wand";
  const shared = heroStats(s, "priest");
  assert.ok(
    renderEnchantingTable(s, "artisan_wand").includes(
      'data-formula="weapon_precision"',
    ),
  );
  forgetProfession(s, "enchanting");
  assert.deepEqual(heroStats(validateSave(s), "priest"), shared);
  assert.equal(sellGear(s, "artisan_wand"), false);
  unequip(s, "ranged");
  assert.equal(sellGear(s, "artisan_wand"), false);
  delete s.heroes.priest.equipment.ranged;
  assert.ok(learnProfession(s, "enchanting"));
  assert.ok(sellGear(s, "artisan_wand", true));
  s.inventory.push("artisan_wand");
  assert.equal(s.enchantments.artisan_wand, undefined);
});
test("all eight actual crafts spend exact grades/fees and grant practice, duplicate refunds and accepted project credit", () => {
  for (const r of RANGED_RECIPES) {
    const s = ready("mage"),
      grade = tierForSkill(r.skill);
    s.inventory = s.inventory.filter((id) => id !== r.output);
    s.professions[r.profession] = r.skill;
    s.training[r.profession] = r.trainingRank!;
    s.professionQuests[r.profession].chapter = grade - 1;
    assert.ok(acceptProfessionQuest(s, r.profession));
    const ore = ["ore", "tin_ore", "iron_ore", "mithril_ore"][grade - 1],
      other = (
        r.profession === "enchanting"
          ? ["dust", "soul_dust", "vision_dust", "dream_dust"]
          : ["cloth", "wool_cloth", "silk_cloth", "mageweave_cloth"]
      )[grade - 1];
    assert.deepEqual(
      r.cost,
      r.profession === "enchanting"
        ? { [other]: 4, [ore]: 2 }
        : { [ore]: 6, [other]: 2 },
    );
    const before = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.gold, before.gold - r.gold);
    for (const [m, n] of Object.entries(before.materials))
      assert.equal(
        s.materials[m as keyof typeof MATERIALS],
        n - (r.cost[m as keyof typeof MATERIALS] || 0),
      );
    assert.equal(s.professionQuests[r.profession].progress.crafts, 1);
    assert.ok(s.professions[r.profession]! > r.skill);
    const paid = s.gold;
    assert.equal(craft(s, r.id), r.name);
    assert.equal(
      s.gold,
      paid - r.gold + Math.floor(GEAR_MAP[r.output].value * 0.5),
    );
    assert.equal(s.inventory.filter((id) => id === r.output).length, 1);
    const cap = [0, 75, 150, 225, 300][r.trainingRank!];
    s.professions[r.profession] = cap;
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.professions[r.profession], cap);
  }
});
test("all eight ranged crafts reject missing rank, skill, gold or graded materials without mutation", () => {
  for (const r of RANGED_RECIPES)
    for (const reason of ["rank", "skill", "gold", "material"]) {
      const s = ready();
      s.professions[r.profession] = r.skill;
      s.training[r.profession] = r.trainingRank!;
      if (reason === "rank") {
        if (r.trainingRank === 1) delete s.professions[r.profession];
        else s.training[r.profession] = (r.trainingRank! - 1) as any;
      }
      if (reason === "skill") s.professions[r.profession] = r.skill - 1;
      if (reason === "gold") s.gold = r.gold - 1;
      if (reason === "material")
        s.materials[Object.keys(r.cost)[0] as keyof typeof MATERIALS] = 0;
      const before = structuredClone(s);
      assert.equal(craft(s, r.id), null);
      assert.deepEqual(s, before);
    }
});
test("real cache and elite combat reaches all eight local ranged items across six classes and excludes craft/guardian leakage and novice cache loot", () => {
  const seen = new Set<string>();
  for (const c of CLASSES.filter((c) => rangedClass(c.id)))
    for (const zone of ["elwynn", "westfall", "tirisfal", "duskwood"])
      for (let seed = 1; seed <= 80; seed++) {
        const g = field(zone, c.id, seed * 7919),
          l = g.landmarks.find((l) => l.kind === "cache")!;
        g.player.x = l.x;
        g.player.y = l.y;
        assert.ok(g.interact());
        for (const id of l.guardIds)
          Object.assign(
            g.enemies.find((e) => e.id === id)!,
            { hp: 1, x: g.player.x + 20, y: g.player.y },
          );
        assert.ok(g.useBomb());
        const elite = (g as any).spawnEnemy(5, true, 0, false, "gnoll");
        Object.assign(elite, { hp: 1, x: g.player.x + 20, y: g.player.y });
        assert.ok(g.useBomb());
        for (const id of [
          ...g.loot,
          ...g.pickups.filter((p) => p.kind === "chest").map((p) => p.loot!),
        ])
          if (RANGED_SOURCES[id]) {
            assert.equal(RANGED_SOURCES[id].type, "world");
            assert.deepEqual(GEAR_MAP[id].dropZones, [zone]);
            seen.add(id);
          }
      }
  assert.equal(seen.size, 8);
  for (const c of ["hunter", "mage"] as const)
    for (let seed = 1; seed <= 30; seed++) {
      const g = field("elwynn", c, seed, 1),
        l = g.landmarks.find((l) => l.kind === "cache")!;
      g.player.x = l.x;
      g.player.y = l.y;
      g.interact();
      for (const id of l.guardIds)
        Object.assign(
          g.enemies.find((e) => e.id === id)!,
          { hp: 1, x: g.player.x + 20, y: g.player.y },
        );
      g.useBomb();
      assert.ok(!g.loot.some((id) => RANGED_SOURCES[id]));
    }
});
test("actual guardian rooms secure all six ranged rewards and settle shared ownership once; the guide finds existing bows without duplicate catalog entries", () => {
  for (const item of RANGED_GEAR.filter(
    (g) => RANGED_SOURCES[g.id].type === "dungeon",
  )) {
    const source = RANGED_SOURCES[item.id];
    if (source.type !== "dungeon") continue;
    const g = field(
      source.zone,
      item.rangedType === "wand" ? "mage" : "hunter",
      31,
    );
    (g as any).rng.pick = (pool: any[]) =>
      pool.find((v) => v === item.id || v?.id === item.id) || pool[0];
    for (let stage = 0; stage <= source.stage; stage++) {
      g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
      g.update(1 / 60);
      Object.assign(g.boss!, { hp: 1, x: g.player.x + 20, y: g.player.y });
      assert.ok(g.useBomb());
      if (stage < source.stage) assert.ok(g.continueDungeon("edge"));
    }
    assert.equal(g.lastDungeonReward, item.id);
    g.finish(false);
    const s = freshSave();
    assert.ok(settleRun(s, g.result()));
    assert.ok(s.inventory.includes(item.id));
    const before = structuredClone(s);
    assert.equal(settleRun(s, g.result()), false);
    assert.deepEqual(s, before);
  }
  const guide = renderWardrobe(ready(), {
    open: true,
    slot: "ranged",
    source: "all",
    usable: false,
  });
  assert.equal((guide.match(/class="wardrobe-card"/g) || []).length, 46);
  assert.ok(
    guide.includes("Moonhowl Longbow") && guide.includes("Raven Hill Longbow"),
  );
  assert.equal(new Set(WARDROBE_CATALOG.map((g) => g.id)).size, 222);
});
test("independent ranged gear changes actual Hunter and Mage damage without inventing another spell family", () => {
  for (const c of ["hunter", "mage"] as const) {
    const s = ready(c),
      before = heroStats(s);
    equip(s, c === "hunter" ? "artisan_thrown" : "artisan_wand");
    const after = heroStats(s);
    const damage = (stats: Stats) => {
      const g = new GameEngine({
        classId: c,
        zone: ZONES[0],
        stats,
        professions: {},
        seed: 31,
      });
      g.enemies = [];
      g.pets = [];
      const ids = g.spells.map((sp) => sp.id),
        e = (g as any).spawnEnemy(100, false, 0, false, "gnoll");
      Object.assign(e, {
        hp: 10000,
        maxHp: 10000,
        x: g.player.x + 120,
        y: g.player.y,
        speed: 0,
      });
      for (let i = 0; i < 110; i++) g.update(1 / 60);
      assert.deepEqual(
        g.spells.map((sp) => sp.id),
        ids,
      );
      return 10000 - e.hp;
    };
    assert.ok(damage(after) > damage(before));
    unequip(s, "ranged");
    assert.deepEqual(heroStats(s), before);
  }
});
