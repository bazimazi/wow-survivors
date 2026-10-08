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
  DUAL_WIELD_GEAR,
  DUAL_WIELD_RECIPES,
  DUAL_WIELD_SOURCES,
  DUAL_WIELD_RULES,
  dualWieldClass,
} from "../src/dual-wield";
import {
  freshSave,
  validateSave,
  heroStats,
  trainDualWield,
  dualWieldRestriction,
  equip,
  unequip,
  equipRestriction,
  gearComparison,
  swapWeaponHands,
  weaponSwapComparison,
  applyEnchantment,
  craft,
  sellGear,
  forgetProfession,
  learnProfession,
  respec,
  acceptProfessionQuest,
  settleRun,
} from "../src/progression";
import { offhandMultiplier } from "../src/equipment";
import {
  renderDualWieldPanel,
  renderWeaponHandReview,
  renderHandSwapReview,
} from "../src/equipment-ui";
import { renderWardrobe, WARDROBE_CATALOG } from "../src/wardrobe-ui";
import { ENCHANTMENTS } from "../src/enchanting";
import { tierForSkill } from "../src/resources";
import { GameEngine } from "../src/engine";
function ready(classId: ClassId = "warrior") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 1000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  s.professions.blacksmithing = 225;
  s.training.blacksmithing = 4;
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  s.inventory.push(
    ...DUAL_WIELD_GEAR.map((g) => g.id),
    "duskwood_mace",
    "artisan_shield",
    "copper_sword",
  );
  return s;
}
function changes(before: Stats, after: Stats, delta: Partial<Stats>) {
  for (const k of Object.keys(before) as (keyof Stats)[])
    assert.ok(Math.abs(after[k] - before[k] - (delta[k] || 0)) < 1e-8, k);
}
function pair(classId: ClassId = "warrior") {
  const s = ready(classId);
  assert.ok(trainDualWield(s));
  assert.ok(equip(s, "duskwood_duelist_blade"));
  assert.ok(equip(s, "artisan_duelist_blade", "offhand"));
  return s;
}
test("eleven blades have unique explicit sources, four matching-grade recipes, one-handed class fit and no new formulas or sets", () => {
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(SLOTS.length, 16);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(DUAL_WIELD_GEAR.length, 11);
  assert.equal(DUAL_WIELD_RECIPES.length, 4);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(ENCHANTMENTS.length, 24);
  for (const g of DUAL_WIELD_GEAR) {
    assert.equal(g.weaponHands, 1);
    assert.equal(g.slot, "weapon");
    assert.deepEqual(g.classes, DUAL_WIELD_RULES.classes);
    assert.equal(g.set, undefined);
    const source = DUAL_WIELD_SOURCES[g.id];
    assert.ok(source);
    assert.deepEqual(
      g.dropZones,
      source.type === "world" ? [source.zone] : undefined,
    );
    if (source.type === "craft")
      assert.equal(RECIPES.find((r) => r.id === source.recipe)?.output, g.id);
  }
});
test("all nine legacy imports retain exact stats/equipment without free training, including malformed flags and forbidden classes", () => {
  for (const c of CLASSES) {
    const s = ready(c.id),
      before = heroStats(s);
    assert.equal(s.heroes[c.id].dualWield, false);
    const raw: any = structuredClone(s);
    for (const h of Object.values(raw.heroes) as any[]) delete h.dualWield;
    const loaded = validateSave(raw);
    assert.deepEqual(heroStats(loaded), before);
    assert.deepEqual(loaded.heroes[c.id].equipment, s.heroes[c.id].equipment);
    for (const bad of [1, "true", {}, null]) {
      raw.heroes[c.id].dualWield = bad;
      assert.equal(validateSave(raw).heroes[c.id].dualWield, false);
    }
    raw.heroes[c.id].dualWield = true;
    assert.equal(
      validateSave(raw).heroes[c.id].dualWield,
      dualWieldClass(c.id),
    );
    raw.heroes[c.id].level = 9;
    assert.equal(validateSave(raw).heroes[c.id].dualWield, false);
  }
});
test("personal training charges exactly once at level ten, rejects class/level/gold atomically and survives unlearning/respec/import", () => {
  for (const c of CLASSES) {
    const s = ready(c.id),
      before = structuredClone(s);
    assert.equal(trainDualWield(s), dualWieldClass(c.id));
    if (!dualWieldClass(c.id)) {
      assert.deepEqual(s, before);
      continue;
    }
    assert.equal(s.gold, before.gold - 60);
    assert.equal(s.heroes[c.id].dualWield, true);
    for (const other of CLASSES.filter((v) => v.id !== c.id))
      assert.equal(s.heroes[other.id].dualWield, false);
    const paid = structuredClone(s);
    assert.equal(trainDualWield(s), false);
    assert.deepEqual(s, paid);
    assert.ok(forgetProfession(s, "blacksmithing"));
    respec(s);
    assert.equal(validateSave(s).heroes[c.id].dualWield, true);
    for (const reason of ["level", "gold"]) {
      const bad = ready(c.id);
      if (reason === "level") bad.heroes[c.id].level = 9;
      else bad.gold = 59;
      const original = structuredClone(bad);
      assert.ok(dualWieldRestriction(bad));
      assert.equal(trainDualWield(bad), false);
      assert.deepEqual(bad, original);
    }
    const entry = ready(c.id);
    entry.heroes[c.id].level = 10;
    entry.gold = 60;
    assert.ok(trainDualWield(entry));
    assert.equal(entry.gold, 0);
  }
});
test("all trained eligible classes use half secondary item and enchantment bonuses, with exact placement/swap comparisons and preserved other heroes", () => {
  for (const classId of DUAL_WIELD_RULES.classes) {
    const s = ready(classId);
    trainDualWield(s);
    equip(s, "duskwood_duelist_blade");
    applyEnchantment(s, "duskwood_duelist_blade", "weapon_force");
    applyEnchantment(s, "artisan_duelist_blade", "weapon_precision");
    const before = heroStats(s),
      delta = gearComparison(s, "artisan_duelist_blade", "offhand");
    assert.ok(equip(s, "artisan_duelist_blade", "offhand"));
    changes(before, heroStats(s), delta);
    assert.equal(heroStats(s).power - before.power, 13);
    assert.equal(heroStats(s).crit - before.crit, 4.5);
    assert.equal(offhandMultiplier(classId, s.heroes[classId]), 0.5);
    const untouched = structuredClone(s.heroes.mage),
      stats = heroStats(s),
      swap = weaponSwapComparison(s),
      owned = [...s.inventory],
      effects = { ...s.enchantments };
    assert.ok(swapWeaponHands(s));
    changes(stats, heroStats(s), swap);
    assert.deepEqual(s.heroes.mage, untouched);
    assert.deepEqual(s.inventory, owned);
    assert.deepEqual(s.enchantments, effects);
    assert.equal(s.heroes[classId].equipment.weapon, "artisan_duelist_blade");
    assert.ok(swapWeaponHands(s));
    assert.deepEqual(heroStats(s), stats);
  }
});
test("invalid placements and swaps reject atomically while one-handed replacement, secondary movement and dependent unequip keep legal pairs", () => {
  for (const reason of [
    "untrained",
    "missing",
    "twohand",
    "duplicate",
    "unowned",
    "level",
    "wrongslot",
    "primaryclass",
    "primarylevel",
    "primaryowned",
  ]) {
    const s = pair();
    if (reason === "untrained") s.heroes.warrior.dualWield = false;
    if (reason === "missing") delete s.heroes.warrior.equipment.weapon;
    if (reason === "twohand")
      s.heroes.warrior.equipment.weapon = "starter_warrior";
    if (reason === "unowned")
      s.inventory = s.inventory.filter((id) => id !== "expert_duelist_blade");
    if (reason === "level") s.heroes.warrior.level = 9;
    if (reason === "primaryclass")
      s.heroes.warrior.equipment.weapon = "starter_priest";
    if (reason === "primarylevel") s.heroes.warrior.level = 10;
    if (reason === "primaryowned")
      s.inventory = s.inventory.filter((id) => id !== "duskwood_duelist_blade");
    const id =
        reason === "duplicate"
          ? "duskwood_duelist_blade"
          : "expert_duelist_blade",
      original = structuredClone(s);
    assert.equal(
      equip(s, id, reason === "wrongslot" ? "chest" : "offhand"),
      false,
    );
    assert.deepEqual(s, original);
  }
  for (const c of CLASSES.filter((c) => !dualWieldClass(c.id))) {
    const s = ready(c.id);
    s.heroes[c.id].dualWield = true;
    const original = structuredClone(s);
    assert.equal(equip(s, "elwynn_duelist_blade", "offhand"), false);
    assert.equal(swapWeaponHands(s), false);
    assert.deepEqual(s, original);
  }
  const s = pair();
  assert.ok(equip(s, "expert_duelist_blade"));
  assert.equal(s.heroes.warrior.equipment.offhand, "artisan_duelist_blade");
  assert.ok(equip(s, "artisan_duelist_blade"));
  assert.equal(s.heroes.warrior.equipment.offhand, undefined);
  assert.ok(equip(s, "expert_duelist_blade", "offhand"));
  assert.ok(unequip(s, "weapon"));
  assert.equal(s.heroes.warrior.equipment.offhand, undefined);
  assert.ok(equip(s, "duskwood_duelist_blade"));
  assert.ok(equip(s, "expert_duelist_blade", "offhand"));
  assert.ok(equip(s, "starter_warrior"));
  assert.equal(s.heroes.warrior.equipment.offhand, undefined);
  const held = ready();
  equip(held, "duskwood_mace");
  equip(held, "artisan_shield");
  const heldBefore = structuredClone(held);
  assert.equal(swapWeaponHands(held), false);
  assert.deepEqual(held, heldBefore);
});
test("canonical imports repair invalid/duplicate pairs and direct stats ignore incompatible secondary bonuses", () => {
  const s = pair("rogue"),
    stats = heroStats(s);
  s.heroes.rogue.equipment = {
    offhand: "artisan_duelist_blade",
    ...s.heroes.rogue.equipment,
  };
  assert.deepEqual(heroStats(validateSave(s)), stats);
  for (const reason of [
    "untrained",
    "duplicate",
    "unowned",
    "missing",
    "twohand",
  ]) {
    const raw: any = structuredClone(s);
    if (reason === "untrained") raw.heroes.rogue.dualWield = false;
    if (reason === "duplicate")
      raw.heroes.rogue.equipment.offhand = raw.heroes.rogue.equipment.weapon;
    if (reason === "unowned")
      raw.inventory = raw.inventory.filter(
        (id: string) => id !== "artisan_duelist_blade",
      );
    if (reason === "missing") delete raw.heroes.rogue.equipment.weapon;
    if (reason === "twohand") {
      raw.selectedClass = "hunter";
      raw.heroes.hunter.dualWield = true;
      raw.heroes.hunter.equipment = {
        offhand: "artisan_duelist_blade",
        weapon: "starter_hunter",
      };
    }
    const loaded = validateSave(raw),
      id = raw.selectedClass as ClassId;
    assert.equal(loaded.heroes[id].equipment.offhand, undefined);
    if (reason !== "unowned") {
      const without = structuredClone(raw);
      delete without.heroes[id].equipment.offhand;
      assert.deepEqual(heroStats(raw, id), heroStats(without, id));
    }
    assert.deepEqual(validateSave(loaded), loaded);
  }
});
test("four actual blade crafts spend exact grades/fees, award capped practice and accepted grade-matched project credit", () => {
  for (const r of DUAL_WIELD_RECIPES) {
    const s = ready("mage"),
      grade = tierForSkill(r.skill);
    s.inventory = s.inventory.filter((id) => id !== r.output);
    s.professions.blacksmithing = r.skill;
    s.training.blacksmithing = r.trainingRank!;
    s.professionQuests.blacksmithing.chapter = grade - 1;
    assert.ok(acceptProfessionQuest(s, "blacksmithing"));
    assert.deepEqual(
      r.cost,
      [
        { ore: 8, leather: 2 },
        { tin_ore: 8, medium_leather: 2 },
        { iron_ore: 8, heavy_leather: 2 },
        { mithril_ore: 8, thick_leather: 2 },
      ][grade - 1],
    );
    const before = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.gold, before.gold - r.gold);
    for (const [m, n] of Object.entries(before.materials))
      assert.equal(
        s.materials[m as keyof typeof MATERIALS],
        n - (r.cost[m as keyof typeof MATERIALS] || 0),
      );
    assert.ok(s.inventory.includes(r.output));
    assert.equal(s.professionQuests.blacksmithing.progress.crafts, 1);
    assert.ok(s.professions.blacksmithing! > r.skill);
    const owns = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.inventory.filter((id) => id === r.output).length, 1);
    assert.equal(
      s.gold,
      owns.gold - r.gold + Math.floor(GEAR_MAP[r.output].value * 0.5),
    );
  }
});
test("blade crafts reject missing training, skill, matching grade or gold without mutation", () => {
  for (const r of DUAL_WIELD_RECIPES)
    for (const reason of ["rank", "skill", "material", "gold"]) {
      const s = ready();
      s.professions.blacksmithing = r.skill;
      s.training.blacksmithing = r.trainingRank!;
      if (reason === "rank") {
        if (r.trainingRank === 1) delete s.professions.blacksmithing;
        else s.training.blacksmithing = (r.trainingRank! - 1) as any;
      }
      if (reason === "skill") {
        if (r.skill === 1) delete s.professions.blacksmithing;
        else s.professions.blacksmithing = r.skill - 1;
      }
      if (reason === "material")
        s.materials[Object.keys(r.cost)[0] as keyof typeof MATERIALS] = 0;
      if (reason === "gold") s.gold = r.gold - 1;
      const before = structuredClone(s);
      assert.equal(craft(s, r.id), null);
      assert.deepEqual(s, before);
    }
});
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
test("real local cache and elite kills reach all four blades without craft/guardian leakage and respect novice cache gates", () => {
  const seen = new Set<string>();
  for (const c of DUAL_WIELD_RULES.classes)
    for (const zone of ["elwynn", "westfall", "tirisfal", "duskwood"])
      for (let seed = 1; seed <= 80; seed++) {
        const g = field(zone, c, seed * 7919),
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
          if (DUAL_WIELD_SOURCES[id]) {
            assert.equal(DUAL_WIELD_SOURCES[id].type, "world");
            assert.deepEqual(GEAR_MAP[id].dropZones, [zone]);
            seen.add(id);
          }
      }
  assert.equal(seen.size, 4);
  for (let seed = 1; seed <= 30; seed++) {
    const g = field("elwynn", "hunter", seed, 1),
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
    assert.ok(!g.loot.some((id) => DUAL_WIELD_SOURCES[id]));
  }
});
test("actual guardian rooms secure all three new blades and settle shared ownership exactly once", () => {
  for (const item of DUAL_WIELD_GEAR.filter(
    (g) => DUAL_WIELD_SOURCES[g.id].type === "dungeon",
  )) {
    const source = DUAL_WIELD_SOURCES[item.id];
    if (source.type !== "dungeon") continue;
    const g = field(source.zone, "hunter", 31);
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
});
test("shared off-hand weapons protect sale/destruction, preserve effects after unlearning and expose exact placement/swap/guide rules", () => {
  const s = pair();
  applyEnchantment(s, "artisan_duelist_blade", "weapon_force");
  s.heroes.rogue.dualWield = true;
  s.heroes.rogue.equipment = {
    weapon: "duskwood_duelist_blade",
    offhand: "artisan_duelist_blade",
  };
  assert.equal(sellGear(s, "artisan_duelist_blade", true), false);
  unequip(s, "offhand");
  assert.equal(sellGear(s, "artisan_duelist_blade"), false);
  const before = heroStats(s, "rogue");
  forgetProfession(s, "enchanting");
  assert.deepEqual(heroStats(validateSave(s), "rogue"), before);
  delete s.heroes.rogue.equipment.offhand;
  assert.ok(learnProfession(s, "enchanting"));
  assert.ok(sellGear(s, "artisan_duelist_blade", true));
  s.inventory.push("artisan_duelist_blade");
  assert.equal(s.enchantments.artisan_duelist_blade, undefined);
  equip(s, "artisan_duelist_blade", "offhand");
  assert.ok(renderWeaponHandReview(s, "expert_duelist_blade").includes("50%"));
  assert.ok(renderHandSwapReview(s).includes("Masterwork Duelist Blade"));
  assert.ok(renderDualWieldPanel(s).includes("Trained"));
  const guide = renderWardrobe(s, {
    open: true,
    slot: "offhand",
    source: "all",
    usable: false,
  });
  assert.equal((guide.match(/class="wardrobe-card"/g) || []).length, 61);
  assert.ok(
    guide.includes("8 Mithril Ore") &&
      guide.includes("140 G") &&
      guide.includes("50% item/enchantment"),
  );
});
test("a legal secondary blade changes real attacks without introducing another attack stream and removing it restores older stats", () => {
  const s = pair("hunter"),
    withSecondary = heroStats(s);
  unequip(s, "offhand");
  const without = heroStats(s);
  assert.equal(withSecondary.power - without.power, 13);
  assert.equal(withSecondary.crit - without.crit, 2);
  const damage = (stats: Stats) => {
    const g = new GameEngine({
      classId: "hunter",
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 31,
    });
    g.enemies = [];
    g.pets = [];
    const e = (g as any).spawnEnemy(100, false, 0, false, "gnoll");
    Object.assign(e, {
      x: g.player.x + 120,
      y: g.player.y,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
    });
    for (let i = 0; i < 110; i++) g.update(1 / 60);
    return 10000 - e.hp;
  };
  assert.ok(damage(withSecondary) > damage(without));
});
