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
  OFFHAND_GEAR,
  OFFHAND_RECIPES,
  OFFHAND_SOURCES,
  SHIELD_CLASSES,
  FOCUS_CLASSES,
} from "../src/offhands";
import {
  freshSave,
  equip,
  unequip,
  equipRestriction,
  heroStats,
  gearComparison,
  validateSave,
  craft,
  craftRestriction,
  sellGear,
  applyEnchantment,
  acceptProfessionQuest,
  settleRun,
  forgetProfession,
} from "../src/progression";
import { ENCHANTMENTS } from "../src/enchanting";
import {
  WARDROBE_CATALOG,
  WARDROBE_CATALOG_SOURCES,
  renderWardrobe,
} from "../src/wardrobe-ui";
import { renderWeaponReview } from "../src/equipment-ui";
import { renderEnchantingTable } from "../src/enchanting-ui";
import { renderDungeonPreview } from "../src/dungeon-ui";
import { renderDuskwoodPreview } from "../src/duskwood-ui";
import {
  hasOneHandedWeapon,
  displacedOffhand,
  gearFitsSlot,
  gearUseLabel,
} from "../src/equipment";
import { tierForSkill } from "../src/resources";
import { GameEngine } from "../src/engine";
import { dungeonRoute } from "../src/dungeon";
function ready(classId: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 10000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 1000;
  s.professions.blacksmithing = 225;
  s.professions.enchanting = 225;
  s.training.blacksmithing = 4;
  s.training.enchanting = 4;
  s.inventory.push(
    ...OFFHAND_GEAR.map((g) => g.id),
    "copper_sword",
    "ember_staff",
    "defias_blade",
  );
  return s;
}
function deltaEquals(before: Stats, after: Stats, changes: Partial<Stats>) {
  for (const k of Object.keys(before) as (keyof Stats)[])
    assert.ok(Math.abs(after[k] - before[k] - (changes[k] || 0)) < 1e-8, k);
}
function field(zone: string, classId: ClassId = "mage", seed = 31, level = 21) {
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
function cache(g: GameEngine) {
  const l = g.landmarks.find((l) => l.kind === "cache")!;
  g.player.x = l.x;
  g.player.y = l.y;
  assert.ok(g.interact());
  for (const id of l.guardIds)
    Object.assign(
      g.enemies.find((e) => e.id === id)!,
      { hp: 1, x: g.player.x + 20, y: g.player.y },
    );
  assert.ok(g.useBomb());
  g.update(1 / 60);
  assert.equal(l.state, "complete");
  return g.loot[0];
}

test("thirty unique additions have explicit sources, four-grade crafts and complete weapon fit with separate off-hand formulas and no new set pieces", () => {
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(SLOTS.length, 16);
  assert.equal(OFFHAND_GEAR.length, 30);
  assert.equal(OFFHAND_RECIPES.length, 8);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(new Set(WARDROBE_CATALOG.map((g) => g.id)).size, 222);
  assert.equal(GEAR.filter((g) => g.slot === "weapon").length, 91);
  for (const g of GEAR.filter((g) => g.slot === "weapon"))
    assert.ok(g.weaponHands === 1 || g.weaponHands === 2);
  assert.equal(GEAR_MAP.starter_priest.weaponHands, 1);
  assert.equal(GEAR_MAP.starter_mage.weaponHands, 2);
  assert.equal(GEAR_MAP.starter_warrior.weaponHands, 2);
  assert.equal(GEAR_MAP.dockmaster_maul.weaponHands, 2);
  assert.equal(ENCHANTMENTS.length, 24);
  assert.equal(ENCHANTMENTS.filter((e) => e.slot === "offhand").length, 4);
  for (const g of OFFHAND_GEAR) {
    const source = OFFHAND_SOURCES[g.id];
    assert.deepEqual(WARDROBE_CATALOG_SOURCES[g.id], source);
    assert.equal(g.set, undefined);
    assert.deepEqual(
      g.classes,
      g.offhandType === "shield" || g.id.endsWith("_mace")
        ? SHIELD_CLASSES
        : FOCUS_CLASSES,
    );
    if (source.type === "world") assert.deepEqual(g.dropZones, [source.zone]);
    else assert.equal(g.dropZones, undefined);
    if (source.type === "dungeon")
      assert.ok(
        dungeonRoute(source.zone)!.stages[source.stage].loot.includes(g.id),
      );
    if (source.type === "craft")
      assert.equal(RECIPES.find((r) => r.id === source.recipe)!.output, g.id);
  }
});

test("old version-one saves retain exact equipment and stats with no off-hand migration rewards", () => {
  const s = freshSave();
  for (const c of CLASSES) s.heroes[c.id].level = 21;
  const old = structuredClone(s),
    stats = CLASSES.map((c) => heroStats(s, c.id)),
    loaded = validateSave(s);
  assert.equal(loaded.version, 1);
  assert.deepEqual(loaded.inventory, old.inventory);
  for (const [i, c] of CLASSES.entries()) {
    assert.deepEqual(loaded.heroes[c.id].equipment, old.heroes[c.id].equipment);
    assert.equal(loaded.heroes[c.id].equipment.offhand, undefined);
    assert.deepEqual(heroStats(loaded, c.id), stats[i]);
  }
});

test("all nine classes obey shield/focus eligibility and exact pair comparisons while untrained Rogue/Hunter cannot fill a secondary weapon position", () => {
  for (const c of CLASSES) {
    const s = ready(c.id),
      shield = SHIELD_CLASSES.includes(c.id),
      focus = FOCUS_CLASSES.includes(c.id),
      weapon = shield ? "duskwood_mace" : "duskwood_spellblade",
      held = shield ? "artisan_shield" : "artisan_focus";
    const original = structuredClone(s);
    if (!shield && !focus) {
      assert.equal(equip(s, held), false);
      assert.equal(equip(s, weapon), false);
      assert.deepEqual(s, original);
    } else {
      assert.ok(equip(s, weapon));
      const before = heroStats(s),
        saved = structuredClone(s),
        changes = gearComparison(s, held);
      assert.deepEqual(s, saved);
      assert.ok(equip(s, held));
      deltaEquals(before, heroStats(s), changes);
      assert.ok(hasOneHandedWeapon(s.heroes[c.id].equipment));
      assert.equal(
        equip(s, shield ? "artisan_focus" : "artisan_shield"),
        false,
      );
      assert.ok(unequip(s, "offhand"));
      assert.deepEqual(heroStats(s), before);
    }
    for (const id of ["defias_blade", "duskwood_mace", "duskwood_spellblade"]) {
      assert.equal(
        gearFitsSlot(GEAR_MAP[id], "offhand"),
        id !== "duskwood_spellblade",
      );
      assert.equal(equip(s, id, "offhand"), false);
    }
  }
});

test("off-hand ownership, class, level, missing/two-handed main weapons and wrong positions reject atomically", () => {
  const cases = [
    (s: ReturnType<typeof ready>) => {},
    (s: ReturnType<typeof ready>) => delete s.heroes.mage.equipment.weapon,
    (s: ReturnType<typeof ready>) => {
      s.inventory = s.inventory.filter((id) => id !== "artisan_focus");
    },
    (s: ReturnType<typeof ready>) => {
      s.heroes.mage.level = 17;
      equip(s, "elwynn_spellblade");
    },
  ];
  for (const setup of cases) {
    const s = ready();
    setup(s);
    const before = structuredClone(s);
    assert.equal(equip(s, "artisan_focus"), false);
    assert.deepEqual(s, before);
    assert.deepEqual(gearComparison(s, "artisan_focus"), {});
  }
  const s = ready();
  equip(s, "elwynn_spellblade");
  const before = structuredClone(s);
  for (const slot of ["weapon", "neck", "wrists", "finger1"] as const) {
    assert.equal(equip(s, "elwynn_focus", slot), false);
    assert.deepEqual(s, before);
  }
});

test("two-handed candidate and actual equip remove only this hero's off-hand and include both current/new weapon enchantments", () => {
  const s = ready();
  equip(s, "duskwood_spellblade");
  equip(s, "artisan_focus");
  applyEnchantment(s, "duskwood_spellblade", "weapon_force");
  applyEnchantment(s, "ember_staff", "weapon_swiftness");
  s.heroes.priest.equipment.weapon = "duskwood_spellblade";
  s.heroes.priest.equipment.offhand = "artisan_focus";
  const before = heroStats(s),
    snapshot = structuredClone(s),
    changes = gearComparison(s, "ember_staff");
  assert.equal(
    displacedOffhand(s.heroes.mage.equipment, GEAR_MAP.ember_staff),
    "artisan_focus",
  );
  assert.deepEqual(s, snapshot);
  const html = renderWeaponReview(s, "ember_staff");
  assert.ok(
    html.includes("Masterwork Starlight Focus") &&
      html.includes("Two-handed") &&
      html.includes("Keep current equipment"),
  );
  assert.ok(equip(s, "ember_staff"));
  assert.equal(s.heroes.mage.equipment.offhand, undefined);
  deltaEquals(before, heroStats(s), changes);
  assert.equal(s.heroes.priest.equipment.offhand, "artisan_focus");
  assert.ok(s.inventory.includes("artisan_focus"));
  assert.equal(s.enchantments.duskwood_spellblade, "weapon_force");
  assert.equal(sellGear(s, "artisan_focus"), false);
  assert.equal(sellGear(s, "artisan_focus", true), false);
});

test("one-handed replacement preserves the off-hand, while removing the main weapon clears its dependent slot and keeps inventory", () => {
  const s = ready();
  equip(s, "elwynn_spellblade");
  equip(s, "elwynn_focus");
  const before = heroStats(s),
    changes = gearComparison(s, "duskwood_spellblade");
  assert.ok(equip(s, "duskwood_spellblade"));
  deltaEquals(before, heroStats(s), changes);
  assert.equal(s.heroes.mage.equipment.offhand, "elwynn_focus");
  assert.ok(unequip(s, "weapon"));
  assert.equal(s.heroes.mage.equipment.offhand, undefined);
  assert.ok(s.inventory.includes("elwynn_focus"));
  const empty = structuredClone(s);
  assert.equal(unequip(s, "weapon"), false);
  assert.equal(unequip(s, "__proto__" as any), false);
  assert.deepEqual(s, empty);
  assert.equal(
    equipRestriction(s, "elwynn_focus"),
    "Equip a one-handed weapon",
  );
});

test("imports keep canonical main-hand priority, repair incompatible pairs independent of property order and retain only owned eligible held gear", () => {
  const s = ready();
  s.heroes.mage.equipment = { offhand: "artisan_focus", weapon: "ember_staff" };
  s.heroes.priest.equipment = {
    offhand: "artisan_focus",
    weapon: "duskwood_spellblade",
  };
  s.heroes.warrior.equipment.offhand = "artisan_focus";
  s.heroes.shaman.equipment.offhand = "not_owned";
  s.heroes.druid.equipment = {
    weapon: "elwynn_spellblade",
    offhand: "artisan_focus",
  };
  s.heroes.druid.level = 2;
  s.enchantments.artisan_focus = "wrists_focus";
  const first = validateSave(s),
    second = validateSave({
      ...s,
      heroes: {
        ...s.heroes,
        mage: {
          ...s.heroes.mage,
          equipment: { weapon: "ember_staff", offhand: "artisan_focus" },
        },
      },
    });
  assert.deepEqual(first, second);
  assert.equal(first.heroes.mage.equipment.weapon, "ember_staff");
  assert.equal(first.heroes.mage.equipment.offhand, undefined);
  assert.equal(first.heroes.priest.equipment.offhand, "artisan_focus");
  for (const c of ["warrior", "shaman", "druid"] as const)
    assert.equal(first.heroes[c].equipment.offhand, undefined);
  assert.equal(first.enchantments.artisan_focus, undefined);
  assert.deepEqual(validateSave(first), first);
});

test("direct stat calculation ignores an incompatible or weaponless off-hand before import repair", () => {
  const s = ready(),
    before = heroStats(s);
  s.heroes.mage.equipment.offhand = "artisan_focus";
  assert.deepEqual(heroStats(s), before);
  delete s.heroes.mage.equipment.weapon;
  const withHeld = heroStats(s);
  delete s.heroes.mage.equipment.offhand;
  assert.deepEqual(heroStats(s), withHeld);
});

test("all eight actual shield/focus recipes spend exact grade/fee, grant capped practice and accepted grade-matched guild credit once per craft", () => {
  for (const r of OFFHAND_RECIPES) {
    const s = ready(r.profession === "blacksmithing" ? "warrior" : "mage"),
      p = r.profession as "blacksmithing" | "enchanting",
      grade = tierForSkill(r.skill);
    s.inventory = s.inventory.filter((id) => id !== r.output);
    s.professions[p] = r.skill;
    s.training[p] = r.trainingRank!;
    s.professionQuests[p].chapter = grade - 1;
    assert.ok(acceptProfessionQuest(s, p));
    for (const id of Object.keys(r.cost))
      assert.equal(MATERIALS[id as keyof typeof MATERIALS].tier, grade);
    assert.deepEqual(
      r.cost,
      p === "blacksmithing"
        ? [
            { ore: 6, leather: 2 },
            { tin_ore: 6, medium_leather: 2 },
            { iron_ore: 6, heavy_leather: 2 },
            { mithril_ore: 6, thick_leather: 2 },
          ][grade - 1]
        : [
            { dust: 4, herbs: 2 },
            { soul_dust: 4, briarthorn: 2 },
            { vision_dust: 4, kingsblood: 2 },
            { dream_dust: 4, sungrass: 2 },
          ][grade - 1],
    );
    const before = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.ok(s.inventory.includes(r.output));
    assert.equal(s.gold, before.gold - r.gold);
    for (const [m, n] of Object.entries(before.materials))
      assert.equal(
        s.materials[m as keyof typeof MATERIALS],
        n - (r.cost[m as keyof typeof MATERIALS] || 0),
      );
    assert.ok(s.professions[p]! > r.skill);
    assert.equal(s.professionQuests[p].progress.crafts, 1);
    equip(s, p === "blacksmithing" ? "duskwood_mace" : "duskwood_spellblade");
    assert.ok(equip(s, r.output));
    const costed = s.gold;
    assert.equal(craft(s, r.id), r.name);
    assert.equal(
      s.gold,
      costed - r.gold + Math.floor(GEAR_MAP[r.output].value / 2),
    );
    assert.equal(s.professionQuests[p].progress.crafts, 2);
    assert.ok(r.gold > GEAR_MAP[r.output].value / 2);
  }
});

test("rank/skill/wrong-grade/gold craft failures are atomic and crafting remains independent of equip class/level", () => {
  const recipe = OFFHAND_RECIPES.find((r) => r.id === "craft_artisan_focus")!;
  for (const setup of [
    (s: ReturnType<typeof ready>) => {
      s.training.enchanting = 3;
    },
    (s: ReturnType<typeof ready>) => {
      s.professions.enchanting = 224;
    },
    (s: ReturnType<typeof ready>) => {
      s.materials.dream_dust = 3;
    },
    (s: ReturnType<typeof ready>) => {
      s.gold = 109;
    },
  ]) {
    const s = ready();
    setup(s);
    const before = structuredClone(s);
    assert.ok(craftRestriction(s, recipe.id));
    assert.equal(craft(s, recipe.id), null);
    assert.deepEqual(s, before);
  }
  const s = ready("rogue");
  s.heroes.rogue.level = 1;
  assert.ok(craft(s, recipe.id));
  assert.equal(equip(s, recipe.output), false);
});

test("all sixteen local additions are reachable by real cache/elite kills with local class rules and level-one cache exclusion", () => {
  const seen = new Set<string>();
  for (const zone of ["elwynn", "westfall", "tirisfal", "duskwood"])
    for (const classId of ["mage", "warrior"] as const)
      for (let seed = 1; seed <= 120; seed++) {
        const id = cache(field(zone, classId, seed * 7919));
        if (OFFHAND_SOURCES[id]) {
          assert.deepEqual(OFFHAND_SOURCES[id], { type: "world", zone });
          seen.add(id);
        }
        const g = field(zone, classId, seed * 97),
          e = (g as any).spawnEnemy(20, true, 0, false, "gnoll");
        e.hp = 1;
        assert.ok(g.useBomb());
        const loot = g.pickups.find((p) => p.kind === "chest")!.loot!;
        if (OFFHAND_SOURCES[loot]) {
          assert.deepEqual(OFFHAND_SOURCES[loot], { type: "world", zone });
          seen.add(loot);
        }
      }
  assert.deepEqual(
    seen,
    new Set(OFFHAND_GEAR.filter((g) => g.dropZones).map((g) => g.id)),
  );
  for (let seed = 1; seed <= 30; seed++)
    assert.ok(!OFFHAND_SOURCES[cache(field("elwynn", "mage", seed, 1))]);
});

test("all six guardian off-hands are earned in their recorded rooms and settle unequipped only once", () => {
  for (const item of OFFHAND_GEAR.filter(
    (g) => OFFHAND_SOURCES[g.id].type === "dungeon",
  )) {
    const source = OFFHAND_SOURCES[item.id];
    assert.ok(source.type === "dungeon");
    const g = field(
      source.zone,
      item.offhandType === "shield" ? "warrior" : "mage",
    );
    (g as any).rng.pick = (pool: any[]) =>
      pool.find((v) => v?.id === item.id || v === item.id) || pool[0];
    for (let stage = 0; stage <= source.stage; stage++) {
      g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
      g.update(1 / 60);
      Object.assign(g.boss!, { hp: 1, x: g.player.x + 20, y: g.player.y });
      assert.ok(g.useBomb());
      if (stage < source.stage) assert.ok(g.continueDungeon("edge"));
    }
    assert.equal(g.lastDungeonReward, item.id);
    g.finish(false);
    const s = freshSave(),
      result = g.result();
    assert.ok(settleRun(s, result));
    assert.ok(s.inventory.includes(item.id));
    assert.equal(s.heroes[result.classId].equipment.offhand, undefined);
    const before = structuredClone(s);
    assert.equal(settleRun(s, result), false);
    assert.deepEqual(s, before);
  }
});

test("off-hands survive unlearning their crafting trade, shared sale/disenchant guards, clean reacquisition and support separate off-hand formulas", () => {
  const s = ready();
  equip(s, "duskwood_spellblade");
  equip(s, "artisan_focus");
  s.heroes.priest.equipment.weapon = "duskwood_spellblade";
  s.heroes.priest.equipment.offhand = "artisan_focus";
  const stats = heroStats(s);
  assert.ok(forgetProfession(s, "enchanting"));
  assert.deepEqual(heroStats(validateSave(s)), stats);
  assert.equal(sellGear(s, "artisan_focus"), false);
  unequip(s, "offhand");
  assert.equal(sellGear(s, "artisan_focus"), false);
  delete s.heroes.priest.equipment.offhand;
  assert.ok(sellGear(s, "artisan_focus"));
  s.inventory.push("artisan_focus");
  assert.equal(s.enchantments.artisan_focus, undefined);
  const table = renderEnchantingTable(s, "artisan_focus");
  assert.ok(table.includes('<option value="artisan_focus"'));
  assert.equal(applyEnchantment(s, "artisan_focus", "weapon_force"), false);
});

test("acquisition guide includes all weapon/off-hand sources, exact grade/rank names and handedness", () => {
  const s = ready();
  const held = renderWardrobe(s, {
    open: true,
    slot: "offhand",
    source: "all",
    usable: false,
  });
  assert.equal((held.match(/class="wardrobe-card"/g) || []).length, 61);
  assert.ok(
    held.includes("Masterwork Starlight Focus") &&
      held.includes("4 Dream Dust") &&
      held.includes("Artisan") &&
      held.includes("one-handed weapon"),
  );
  assert.ok(gearUseLabel(GEAR_MAP.starter_priest).includes("One-handed"));
  assert.ok(gearUseLabel(GEAR_MAP.ember_staff).includes("Two-handed"));
  const weapons = renderWardrobe(s, {
    open: true,
    slot: "weapon",
    source: "all",
    usable: false,
  });
  assert.equal((weapons.match(/class="wardrobe-card"/g) || []).length, 69);
  for (const zone of ["deadmines", "ragefire", "shadowfang", "duskwood"]) {
    s.selectedZone = zone;
    const preview =
      zone === "duskwood" ? renderDuskwoodPreview(s) : renderDungeonPreview(s);
    assert.ok(preview.includes("Shield · requires one-handed weapon"));
    assert.ok(preview.includes("Held focus · requires one-handed weapon"));
    assert.ok(preview.includes("Two-handed · occupies off-hand"));
  }
});

test("actual spell damage and incoming contact damage use held bonuses and a two-handed switch removes them", () => {
  const mage = ready();
  equip(mage, "duskwood_spellblade");
  const old = heroStats(mage);
  equip(mage, "artisan_focus");
  const held = heroStats(mage);
  const damage = (stats: Stats) => {
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 31,
    });
    g.enemies = [];
    const e = (g as any).spawnEnemy(100, false, 0, false, "gnoll");
    e.hp = e.maxHp = 10000;
    for (let i = 0; i < 110; i++) g.update(1 / 60);
    return 10000 - e.hp;
  };
  assert.ok(damage(held) > damage(old));
  const warrior = ready("warrior");
  equip(warrior, "duskwood_mace");
  const before = heroStats(warrior);
  equip(warrior, "artisan_shield");
  const after = heroStats(warrior);
  assert.equal(after.armor - before.armor, 8);
  assert.equal(after.health - before.health, 28);
  const hit = (stats: Stats) => {
    const g = new GameEngine({
      classId: "warrior",
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 31,
    });
    g.spells = [];
    g.enemies = [];
    const e = (g as any).spawnEnemy(1, false, 0, false, "gnoll");
    Object.assign(e, {
      x: g.player.x,
      y: g.player.y,
      hp: 1000,
      damage: 50,
      attackTimer: 0,
    });
    const hp = g.player.hp;
    g.update(1 / 60);
    return hp - g.player.hp;
  };
  assert.ok(hit(after) < hit(before));
  equip(mage, "ember_staff");
  assert.equal(mage.heroes.mage.equipment.offhand, undefined);
  const noHeld = heroStats(mage);
  mage.heroes.mage.equipment.offhand = "artisan_focus";
  assert.deepEqual(heroStats(mage), noHeld);
});
