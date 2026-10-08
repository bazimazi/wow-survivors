import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  GEAR,
  GEAR_MAP,
  MATERIALS,
  RECIPES,
  ZONES,
} from "../src/content";
import type { ClassId, Stats } from "../src/content";
import {
  ADVANCED_WEAPON_TYPES,
  WEAPON_TRAINING,
  TRAINED_WEAPON_GEAR,
  TRAINED_WEAPON_RECIPES,
  TRAINED_WEAPON_SOURCES,
  advancedWeaponType,
  trainedWeaponRanged,
  trainedWeaponOneHanded,
  normalizeWeaponTraining,
} from "../src/weapon-training";
import {
  freshSave,
  validateSave,
  heroStats,
  trainWeaponType,
  weaponTrainingRestriction,
  equip,
  equipRestriction,
  unequip,
  gearComparison,
  trainDualWield,
  swapWeaponHands,
  applyEnchantment,
  enchantmentComparison,
  craft,
  sellGear,
  forgetProfession,
  respec,
  acceptProfessionQuest,
  settleRun,
  canEquip,
} from "../src/progression";
import { offhandMultiplier, gearFitsSlot } from "../src/equipment";
import { WARDROBE_CATALOG, renderWardrobe } from "../src/wardrobe-ui";
import {
  renderWeaponTraining,
  renderWeaponTrainingReview,
} from "../src/weapon-training-ui";
import { renderWeaponReview } from "../src/equipment-ui";
import { ENCHANTMENTS } from "../src/enchanting";
import { tierForSkill, materialFor } from "../src/resources";
import { GameEngine } from "../src/engine";

function ready(classId: ClassId = "warrior") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 10000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 1000;
  s.professions = { blacksmithing: 225, enchanting: 225 };
  s.training.blacksmithing = s.training.enchanting = 4;
  s.inventory = GEAR.map((g) => g.id);
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

test("all 135 weapons have explicit families; 66 trained rewards retain handedness, classes and exact sources", () => {
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(ENCHANTMENTS.length, 24);
  assert.equal(TRAINED_WEAPON_GEAR.length, 66);
  assert.equal(TRAINED_WEAPON_RECIPES.length, 24);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  const weapons = GEAR.filter(
    (g) => g.slot === "weapon" || g.slot === "ranged",
  );
  assert.equal(weapons.length, 135);
  assert.ok(weapons.every((g) => g.weaponType));
  assert.equal(GEAR_MAP.starter_priest.weaponType, "wand");
  assert.equal(GEAR_MAP.starter_druid.weaponType, "staff");
  assert.equal(GEAR_MAP.starter_paladin.weaponType, "mace");
  for (const g of TRAINED_WEAPON_GEAR) {
    const t = g.weaponType as (typeof ADVANCED_WEAPON_TYPES)[number],
      source = TRAINED_WEAPON_SOURCES[g.id];
    assert.equal(
      g.weaponHands,
      trainedWeaponRanged(t) ? undefined : trainedWeaponOneHanded(t) ? 1 : 2,
    );
    assert.deepEqual(g.classes, WEAPON_TRAINING[t].classes);
    assert.equal(g.slot, trainedWeaponRanged(t) ? "ranged" : "weapon");
    assert.equal(g.set, undefined);
    assert.equal(gearFitsSlot(g, "weapon"), !trainedWeaponRanged(t));
    assert.equal(gearFitsSlot(g, "ranged"), trainedWeaponRanged(t));
    assert.equal(gearFitsSlot(g, "offhand"), trainedWeaponOneHanded(t));
    assert.deepEqual(
      g.dropZones,
      source.type === "world" ? [source.zone] : undefined,
    );
    if (source.type === "craft")
      assert.equal(RECIPES.find((r) => r.id === source.recipe)?.output, g.id);
  }
});
test("missing training fields preserve every old class-eligible weapon, its stats and legacy positions", () => {
  for (const c of CLASSES) {
    const s = ready(c.id);
    for (const g of GEAR.filter(
      (g) =>
        g.slot === "weapon" &&
        !advancedWeaponType(g.weaponType) &&
        canEquip(c.id, g.id),
    )) {
      assert.ok(equip(s, g.id));
      const stats = heroStats(s),
        raw = structuredClone(s);
      for (const h of Object.values(raw.heroes))
        delete (h as any).weaponTraining;
      const loaded = validateSave(raw);
      assert.deepEqual(loaded.heroes[c.id].equipment, s.heroes[c.id].equipment);
      assert.deepEqual(heroStats(loaded), stats);
      assert.deepEqual(loaded.heroes[c.id].weaponTraining, []);
      assert.deepEqual(loaded.inventory, s.inventory);
    }
  }
});
test("all twenty-one class/family purchases charge once, stay personal and survive respec/trade unlearning", () => {
  let purchases = 0;
  for (const type of ADVANCED_WEAPON_TYPES)
    for (const c of WEAPON_TRAINING[type].classes) {
      const s = ready(c),
        before = structuredClone(s),
        stats = heroStats(s);
      assert.equal(weaponTrainingRestriction(s, type), null);
      assert.ok(trainWeaponType(s, type));
      purchases++;
      assert.equal(s.gold, before.gold - WEAPON_TRAINING[type].gold);
      assert.deepEqual(heroStats(s), stats);
      assert.deepEqual(s.inventory, before.inventory);
      for (const other of CLASSES.filter((v) => v.id !== c))
        assert.deepEqual(s.heroes[other.id], before.heroes[other.id]);
      const paid = structuredClone(s);
      assert.equal(trainWeaponType(s, type), false);
      assert.deepEqual(s, paid);
      respec(s);
      forgetProfession(s, "blacksmithing");
      assert.deepEqual(validateSave(s).heroes[c].weaponTraining, [type]);
    }
  assert.equal(purchases, 21);
  const s = ready();
  trainWeaponType(s, "polearm");
  trainWeaponType(s, "axe");
  assert.deepEqual(s.heroes.warrior.weaponTraining, ["axe", "polearm"]);
});
test("unknown, unsupported, underlevel and unaffordable training rejects atomically", () => {
  for (const type of [
    "axe",
    "polearm",
    "wand",
    "__proto__",
    "constructor",
    "",
  ]) {
    for (const reason of ["class", "level", "gold"]) {
      const s = ready(reason === "class" ? "mage" : "warrior");
      if (reason === "level") s.heroes.warrior.level = 1;
      if (reason === "gold") s.gold = 0;
      const before = structuredClone(s);
      assert.ok(weaponTrainingRestriction(s, type));
      assert.equal(trainWeaponType(s, type), false);
      assert.deepEqual(s, before);
    }
  }
});
test("imports sanitize training before equipment, repair dependencies and never grant new families", () => {
  const s = ready();
  trainDualWield(s);
  trainWeaponType(s, "axe");
  equip(s, "duskwood_axe");
  equip(s, "artisan_axe", "offhand");
  equip(s, "artisan_thrown");
  const raw = structuredClone(s);
  (raw.heroes.warrior as any).weaponTraining = [
    "polearm",
    "axe",
    "axe",
    "wand",
    {},
    1,
  ];
  raw.heroes.warrior.equipment = {
    ranged: "artisan_thrown",
    offhand: "artisan_axe",
    weapon: "duskwood_axe",
  };
  const valid = validateSave(raw);
  assert.deepEqual(valid.heroes.warrior.weaponTraining, ["axe", "polearm"]);
  assert.deepEqual(
    valid.heroes.warrior.equipment,
    raw.heroes.warrior.equipment,
  );
  for (const malformed of [
    undefined,
    null,
    "axe",
    { axe: true },
    [true, "__proto__"],
  ]) {
    (raw.heroes.warrior as any).weaponTraining = malformed;
    const loaded = validateSave(raw);
    assert.deepEqual(loaded.heroes.warrior.weaponTraining, []);
    assert.deepEqual(loaded.heroes.warrior.equipment, {
      ranged: "artisan_thrown",
    });
  }
  assert.deepEqual(normalizeWeaponTraining("shaman", 21, ["polearm", "axe"]), [
    "axe",
  ]);
  assert.deepEqual(normalizeWeaponTraining("warrior", 4, ["polearm", "axe"]), [
    "axe",
  ]);
  assert.deepEqual(normalizeWeaponTraining("mage", 21, ["polearm", "axe"]), []);
  raw.heroes.warrior.weaponTraining = ["axe"];
  raw.heroes.warrior.equipment = {
    weapon: "artisan_axe",
    offhand: "artisan_axe",
    ranged: "artisan_thrown",
  };
  assert.deepEqual(validateSave(raw).heroes.warrior.equipment, {
    weapon: "artisan_axe",
    ranged: "artisan_thrown",
  });
});
test("trained axes support shields and exact enchanted secondary bonuses without granting Shaman/Paladin dual wield", () => {
  for (const c of WEAPON_TRAINING.axe.classes) {
    const s = ready(c),
      original = structuredClone(s);
    assert.match(equipRestriction(s, "artisan_axe")!, /Train One-handed axes/);
    assert.equal(equip(s, "artisan_axe"), false);
    assert.deepEqual(s, original);
    trainWeaponType(s, "axe");
    applyEnchantment(s, "artisan_axe", "weapon_force");
    const before = heroStats(s),
      delta = gearComparison(s, "artisan_axe");
    assert.ok(equip(s, "artisan_axe"));
    deltaEquals(before, heroStats(s), delta);
    if (c === "warrior" || c === "hunter") {
      trainDualWield(s);
      equip(s, "duskwood_axe");
      const b = heroStats(s),
        d = gearComparison(s, "artisan_axe", "offhand");
      assert.ok(equip(s, "artisan_axe", "offhand"));
      deltaEquals(b, heroStats(s), d);
      assert.equal(d.power, 16);
      assert.equal(d.crit, 2);
      assert.equal(offhandMultiplier(c, s.heroes[c]), 0.5);
      assert.ok(swapWeaponHands(s));
    } else {
      assert.ok(equip(s, "artisan_shield"));
      assert.equal(offhandMultiplier(c, s.heroes[c]), 1);
      assert.equal(trainDualWield(s), false);
      assert.equal(equip(s, "duskwood_axe", "offhand"), false);
    }
    assert.deepEqual(heroStats(validateSave(s)), heroStats(s));
  }
});
test("trained polearms review exact two-handed removal while retaining ranged equipment and shared effects", () => {
  for (const c of WEAPON_TRAINING.polearm.classes) {
    const s = ready(c);
    trainWeaponType(s, "axe");
    trainWeaponType(s, "polearm");
    equip(s, "duskwood_axe");
    if (c === "hunter") {
      trainDualWield(s);
      equip(s, "artisan_axe", "offhand");
    } else equip(s, "artisan_shield");
    if (c !== "paladin") equip(s, "artisan_thrown");
    applyEnchantment(s, "artisan_polearm", "weapon_precision");
    const before = heroStats(s),
      delta = gearComparison(s, "artisan_polearm"),
      held = s.heroes[c].equipment.offhand!;
    assert.ok(
      renderWeaponReview(s, "artisan_polearm").includes(GEAR_MAP[held].name),
    );
    assert.ok(equip(s, "artisan_polearm"));
    deltaEquals(before, heroStats(s), delta);
    assert.equal(s.heroes[c].equipment.offhand, undefined);
    assert.equal(
      s.heroes[c].equipment.ranged,
      c === "paladin" ? undefined : "artisan_thrown",
    );
    assert.ok(s.inventory.includes(held));
    assert.equal(s.enchantments.artisan_polearm, "weapon_precision");
    assert.equal(equip(s, "artisan_axe", "offhand"), false);
    assert.deepEqual(heroStats(validateSave(s)), heroStats(s));
  }
});
test("direct stats ignore untrained, forbidden, unowned, wrong-position and underlevel new weapons and dependent off-hands", () => {
  const s = ready();
  trainWeaponType(s, "axe");
  trainDualWield(s);
  equip(s, "duskwood_axe");
  equip(s, "artisan_axe", "offhand");
  applyEnchantment(s, "duskwood_axe", "weapon_force");
  const empty = structuredClone(s);
  empty.heroes.warrior.equipment = {};
  for (const reason of [
    "training",
    "class",
    "ownership",
    "level",
    "position",
  ]) {
    const bad = structuredClone(s);
    if (reason === "training") bad.heroes.warrior.weaponTraining = [];
    if (reason === "class") {
      bad.selectedClass = "mage";
      bad.heroes.mage = structuredClone(bad.heroes.warrior);
    }
    if (reason === "ownership")
      bad.inventory = bad.inventory.filter((id) => id !== "duskwood_axe");
    if (reason === "level") bad.heroes.warrior.level = 10;
    if (reason === "position")
      bad.heroes.warrior.equipment = {
        chest: "duskwood_axe",
        offhand: "artisan_axe",
      };
    const clean = structuredClone(bad);
    delete clean.heroes[bad.selectedClass].equipment.weapon;
    delete clean.heroes[bad.selectedClass].equipment.offhand;
    if (reason === "position")
      delete clean.heroes[bad.selectedClass].equipment.chest;
    assert.deepEqual(heroStats(bad), heroStats(clean), reason);
  }
  const before = structuredClone(s);
  s.heroes.warrior.weaponTraining = [];
  assert.equal(swapWeaponHands(s), false);
  s.heroes.warrior.weaponTraining = before.heroes.warrior.weaponTraining;
  const d = enchantmentComparison(s, "artisan_axe", "weapon_precision");
  assert.equal(d.crit, 5);
  const enhanced = heroStats(s);
  assert.ok(applyEnchantment(s, "artisan_axe", "weapon_precision"));
  assert.equal(heroStats(s).crit - enhanced.crit, 2.5);
});
test("all twenty-four real Blacksmith/Engineering crafts use exact grades, fees, practice caps, duplicate refunds and project credit independently of weapon training", () => {
  for (const r of TRAINED_WEAPON_RECIPES) {
    const s = ready("mage");
    s.inventory = s.inventory.filter((id) => id !== r.output);
    const trade = r.profession as "blacksmithing" | "engineering";
    s.professions = { enchanting: 225, [trade]: r.skill };
    s.training[trade] = r.trainingRank!;
    s.professionQuests[trade].chapter = tierForSkill(r.skill) - 1;
    acceptProfessionQuest(s, trade);
    const tier = tierForSkill(r.skill),
      type = GEAR_MAP[r.output]
        .weaponType as (typeof ADVANCED_WEAPON_TYPES)[number],
      oneHanded = trainedWeaponOneHanded(type);
    assert.deepEqual(
      r.cost,
      oneHanded
        ? { [materialFor("ore", tier)]: 8, [materialFor("leather", tier)]: 2 }
        : {
            [materialFor("ore", tier)]: trainedWeaponRanged(type) ? 8 : 10,
            [materialFor("cloth", tier)]: 2,
          },
    );
    const before = structuredClone(s);
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.gold, before.gold - r.gold);
    for (const [m, n] of Object.entries(before.materials))
      assert.equal(
        s.materials[m as keyof typeof MATERIALS],
        n - (r.cost[m as keyof typeof MATERIALS] || 0),
      );
    assert.equal(s.professionQuests[trade].progress.crafts, 1);
    assert.ok(s.professions[trade]! > r.skill);
    assert.equal(equip(s, r.output), false);
    const paid = s.gold;
    assert.equal(craft(s, r.id), r.name);
    assert.equal(
      s.gold,
      paid - r.gold + Math.floor(GEAR_MAP[r.output].value * 0.5),
    );
    assert.equal(s.inventory.filter((id) => id === r.output).length, 1);
    const cap = [0, 75, 150, 225, 300][r.trainingRank!];
    s.professions[trade] = cap;
    assert.equal(craft(s, r.id), r.name);
    assert.equal(s.professions[trade], cap);
    for (const reason of ["rank", "skill", "gold", "material"]) {
      const bad = structuredClone(before);
      if (reason === "rank") {
        if (r.trainingRank === 1) delete bad.professions[trade];
        else bad.training[trade] = (r.trainingRank! - 1) as any;
      }
      if (reason === "skill") bad.professions[trade] = r.skill - 1;
      if (reason === "gold") bad.gold = r.gold - 1;
      if (reason === "material")
        bad.materials[Object.keys(r.cost)[0] as keyof typeof MATERIALS] = 0;
      const original = structuredClone(bad);
      assert.equal(craft(bad, r.id), null);
      assert.deepEqual(bad, original);
    }
  }
});
test("actual cache/elite combat finds all twenty-four local weapons before training with no source, class or novice-cache leakage", () => {
  const seen = new Set<string>();
  for (const c of WEAPON_TRAINING.axe.classes)
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
          g.loot[0],
          g.pickups.find((p) => p.kind === "chest")?.loot,
        ])
          if (id && TRAINED_WEAPON_SOURCES[id]) {
            assert.deepEqual(TRAINED_WEAPON_SOURCES[id], {
              type: "world",
              zone,
            });
            assert.ok(canEquip(c, id));
            seen.add(id);
          }
      }
  assert.deepEqual(
    seen,
    new Set(TRAINED_WEAPON_GEAR.filter((g) => g.dropZones).map((g) => g.id)),
  );
  for (let seed = 1; seed <= 60; seed++) {
    const g = field("elwynn", "warrior", seed, 1),
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
    assert.ok(!TRAINED_WEAPON_SOURCES[g.loot[0]]);
  }
});
test("all eighteen actual guardian rewards secure untrained weapons, settle once and allow training after return", () => {
  for (const item of TRAINED_WEAPON_GEAR.filter(
    (g) => TRAINED_WEAPON_SOURCES[g.id].type === "dungeon",
  )) {
    const source = TRAINED_WEAPON_SOURCES[item.id];
    if (source.type !== "dungeon") continue;
    const g = field(source.zone, "warrior", 31);
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
    const s = ready();
    s.inventory = s.inventory.filter((id) => id !== item.id);
    assert.ok(settleRun(s, g.result()));
    assert.ok(s.inventory.includes(item.id));
    const before = structuredClone(s);
    assert.equal(settleRun(s, g.result()), false);
    assert.deepEqual(s, before);
    assert.equal(equip(s, item.id), false);
    assert.ok(trainWeaponType(s, item.weaponType!));
    assert.ok(equip(s, item.id));
  }
});
test("shared trained weapons retain effects and sale protections, while guide and trainer expose missing training", () => {
  const s = ready();
  trainWeaponType(s, "axe");
  equip(s, "artisan_axe");
  applyEnchantment(s, "artisan_axe", "weapon_force");
  s.selectedClass = "shaman";
  trainWeaponType(s, "axe");
  equip(s, "artisan_axe");
  const stats = heroStats(s);
  forgetProfession(s, "blacksmithing");
  assert.deepEqual(heroStats(validateSave(s)), stats);
  assert.equal(sellGear(s, "artisan_axe", true), false);
  unequip(s, "weapon");
  assert.equal(sellGear(s, "artisan_axe"), false);
  delete s.heroes.warrior.equipment.weapon;
  assert.ok(sellGear(s, "artisan_axe", true));
  s.inventory.push("artisan_axe");
  assert.equal(s.enchantments.artisan_axe, undefined);
  s.selectedClass = "paladin";
  const guide = renderWardrobe(s, {
    open: true,
    slot: "weapon",
    source: "all",
    usable: true,
  });
  assert.ok(guide.includes("Train One-handed axes first"));
  assert.ok(
    guide.includes('data-action="review-weapon-training" data-id="axe"'),
  );
  assert.ok(guide.includes("10 Mithril Ore"));
  assert.ok(renderWeaponTraining(s).includes("Established training:"));
  assert.ok(renderWeaponTrainingReview(s, "polearm").includes("55 G"));
});
