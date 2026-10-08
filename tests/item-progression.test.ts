import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, GEAR, GEAR_MAP, MATERIALS, ZONES } from "../src/content";
import {
  freshSave,
  validateSave,
  heroStats,
  equip,
  unequip,
  trainWeaponType,
  trainDualWield,
  settleRun,
  applyEnchantment,
  sellGear,
  gearComparison,
  equippedSets,
  attuneEquipment as attuneItem,
  acceptProfessionQuest,
  swapWeaponHands,
} from "../src/progression";
import { WEAPON_TRAINING } from "../src/weapon-training";
import { ENCHANTMENTS } from "../src/enchanting";
import type { SaveData } from "../src/progression";
import {
  AFFIXES,
  affixQuote,
  itemCondition,
  itemAffixStats,
  equipmentSnapshot,
  weaponAccuracy,
  weaponSkillCap,
  repairQuote,
  repairItems,
  buyAmmunition,
} from "../src/item-progression";
import {
  renderEquipmentWorkshop,
  renderRepairReview,
  renderAttunementReview,
} from "../src/item-progression-ui";
import { GameEngine } from "../src/engine";

function ready(classId: SaveData["selectedClass"] = "warrior") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 2000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  s.inventory = GEAR.map((g) => g.id);
  s.professions = { enchanting: 225 };
  s.training.enchanting = 4;
  for (const m of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[m] = 100;
  return s;
}
function field(s = ready(), ammunition?: () => boolean) {
  const g = new GameEngine({
    classId: s.selectedClass,
    stats: heroStats(s),
    zone: ZONES[0],
    professions: {},
    characterLevel: s.heroes[s.selectedClass].level,
    equipment: equipmentSnapshot(s),
    onAmmunition: ammunition,
    seed: 123,
  });
  g.spells = [];
  g.pets = [];
  g.xpNeeded = 1e9;
  const target = g.enemies[0];
  target.x = 80;
  target.y = 0;
  target.hp = target.maxHp = 1e7;
  target.speed = 0;
  target.damage = 0;
  g.enemies = [target];
  g.update(0);
  return { g, target };
}
test("old saves retain every hero's exact build, migrate known accuracy and create no binding, wear or ammunition", () => {
  const raw = ready();
  delete (raw as any).itemStates;
  delete (raw as any).ammunition;
  for (const h of Object.values(raw.heroes)) delete (h as any).weaponSkills;
  const loaded = validateSave(raw);
  assert.deepEqual(loaded.itemStates, {});
  assert.equal(loaded.ammunition, 0);
  for (const c of CLASSES) {
    assert.deepEqual(heroStats(loaded, c.id), heroStats(raw, c.id));
    assert.ok(
      Object.values(loaded.heroes[c.id].weaponSkills).every(
        (value) => value === 105,
      ),
    );
    assert.equal(loaded.heroes[c.id].weaponSkills.axe, undefined);
  }
});
test("imports sanitize condition, ownership, affixes, ammo, unknown skills and forbidden shared placements", () => {
  const raw = ready();
  equip(raw, "copper_sword");
  raw.heroes.paladin.equipment.weapon = "copper_sword";
  raw.itemStates = {
    copper_sword: { condition: -9, owner: "warrior", affix: "force" },
    starter_warrior: { condition: 0, owner: "warrior", affix: "guard" },
    artisan_plate_legs: {
      condition: 999,
      owner: "mage" as any,
      affix: "__proto__" as any,
    },
    unknown: { condition: 0 },
  };
  raw.ammunition = Infinity;
  raw.heroes.warrior.weaponSkills = {
    greatsword: 999,
    axe: 300,
    dagger: -2,
    staff: NaN,
  };
  const s = validateSave(raw);
  assert.deepEqual(s.itemStates.copper_sword, {
    condition: 0,
    owner: "warrior",
    affix: "force",
  });
  assert.equal(s.heroes.paladin.equipment.weapon, undefined);
  assert.deepEqual(s.itemStates.starter_warrior, { condition: 100 });
  assert.equal(s.itemStates.unknown, undefined);
  assert.equal(s.ammunition, 0);
  assert.equal(s.heroes.warrior.weaponSkills.greatsword, 105);
  assert.equal(s.heroes.warrior.weaponSkills.axe, undefined);
  assert.equal(s.heroes.warrior.weaponSkills.dagger, 1);
});
test("every affix charges matching dust once, binds only the chosen hero and survives reviewed replacement and reload", () => {
  for (const affix of Object.keys(AFFIXES)) {
    const s = ready();
    equip(s, "artisan_duelist_blade");
    const quote = affixQuote(s, "artisan_duelist_blade", affix),
      before = heroStats(s),
      gold = s.gold,
      dust = s.materials[quote.dust];
    assert.equal(quote.dust, "dream_dust");
    assert.equal(quote.gold, 100);
    assert.ok(attuneItem(s, "artisan_duelist_blade", affix));
    assert.equal(s.gold, gold - 100);
    assert.equal(s.materials[quote.dust], dust - 6);
    for (const [key, value] of Object.entries(
      itemAffixStats(s, "artisan_duelist_blade"),
    ))
      assert.ok(
        Math.abs(
          heroStats(s)[key as keyof typeof before] -
            before[key as keyof typeof before] -
            value!,
        ) < 1e-8,
      );
    const unchanged = structuredClone(s);
    assert.equal(attuneItem(s, "artisan_duelist_blade", affix), false);
    assert.deepEqual(s, unchanged);
    assert.deepEqual(validateSave(s).itemStates, s.itemStates);
    s.selectedClass = "hunter";
    assert.equal(equip(s, "artisan_duelist_blade"), false);
  }
});
test("attunement rejects shared use, class/level/training restrictions, starters, insufficient costs and unknown IDs atomically", () => {
  for (const reason of [
    "shared",
    "class",
    "level",
    "training",
    "gold",
    "dust",
    "skill",
    "unknown",
    "affix",
    "starter",
  ] as const) {
    const s = ready();
    let id = "artisan_duelist_blade",
      affix = "force";
    if (reason === "shared") s.heroes.hunter.equipment.weapon = id;
    if (reason === "class") s.selectedClass = "mage";
    if (reason === "level") s.heroes.warrior.level = 1;
    if (reason === "training") id = "artisan_axe";
    if (reason === "gold") s.gold = 0;
    if (reason === "dust") s.materials.dream_dust = 0;
    if (reason === "skill") s.professions.enchanting = 1;
    if (reason === "unknown") id = "__proto__";
    if (reason === "affix") affix = "constructor";
    if (reason === "starter") id = "starter_warrior";
    const before = structuredClone(s);
    assert.equal(attuneItem(s, id, affix), false, reason);
    assert.deepEqual(s, before, reason);
  }
});
test("broken gear loses item, enchantment, affix and set bonuses; repair preserves them and exact comparisons", () => {
  const s = ready();
  equip(s, "copper_sword");
  applyEnchantment(s, "copper_sword", "weapon_force");
  attuneItem(s, "copper_sword", "force");
  const full = heroStats(s);
  s.itemStates.copper_sword.condition = 0;
  const broken = heroStats(s);
  assert.equal(
    full.power - broken.power,
    GEAR_MAP.copper_sword.stats.power! + 6 + 3,
  );
  const quote = repairQuote(s, ["copper_sword", "copper_sword", "unknown"]);
  assert.equal(quote.ids.length, 1);
  const before = structuredClone(s);
  assert.equal(repairItems(s, quote.ids, quote.gold + 1), false);
  assert.deepEqual(s, before);
  assert.ok(repairItems(s, quote.ids, quote.gold));
  assert.deepEqual(heroStats(s), full);
  assert.equal(s.itemStates.copper_sword.affix, "force");
  assert.equal(s.enchantments.copper_sword, "weapon_force");
  assert.equal(repairItems(s, quote.ids, quote.gold), false);
  const setItems = GEAR.filter(
    (g) => g.set === "ironwarden" && g.slot !== "offhand",
  );
  for (const g of setItems) equip(s, g.id);
  const count = equippedSets(s).find(
    (set) => set.definition.id === "ironwarden",
  )!.pieces;
  s.itemStates[setItems[0].id] = { condition: 0 };
  assert.equal(
    equippedSets(s).find((set) => set.definition.id === "ironwarden")!.pieces,
    count - 1,
  );
});
test("enchanted secondary affixes contribute exactly 50%; bindings stop hand swaps to another hero", () => {
  const s = ready();
  trainDualWield(s);
  trainWeaponType(s, "axe");
  equip(s, "copper_sword");
  equip(s, "artisan_axe", "offhand");
  applyEnchantment(s, "artisan_axe", "weapon_force");
  const before = heroStats(s);
  assert.ok(attuneItem(s, "artisan_axe", "force"));
  assert.equal(heroStats(s).power, before.power + 6);
  const delta = gearComparison(s, "artisan_axe", "weapon");
  const old = heroStats(s);
  assert.ok(equip(s, "artisan_axe", "weapon"));
  assert.equal(heroStats(s).power - old.power, delta.power);
});
test("sale and reacquisition destroy condition, binding, affix and enchantment together", () => {
  const s = ready();
  attuneItem(s, "copper_sword", "guard");
  applyEnchantment(s, "copper_sword", "weapon_force");
  assert.ok(sellGear(s, "copper_sword"));
  assert.equal(s.itemStates.copper_sword, undefined);
  assert.equal(s.enchantments.copper_sword, undefined);
  s.inventory.push("copper_sword");
  assert.equal(itemCondition(s, "copper_sword"), 100);
  assert.deepEqual(itemAffixStats(s, "copper_sword"), {});
});
test("real expedition snapshots wear only starting gear, preserve starters, distinguish voluntary returns and settle once", () => {
  const s = ready();
  equip(s, "copper_sword");
  const { g } = field(s);
  g.time = 180;
  g.finish(false);
  const result = g.result();
  result.loot = ["artisan_axe"];
  assert.ok(settleRun(s, result));
  assert.equal(itemCondition(s, "copper_sword"), 91);
  assert.equal(itemCondition(s, "artisan_axe"), 100);
  const after = structuredClone(s);
  assert.equal(settleRun(s, result), false);
  assert.deepEqual(s, after);
  const { g: defeated } = field(s);
  defeated.time = 60;
  defeated.player.hp = 0;
  defeated.finish(false);
  settleRun(s, defeated.result());
  assert.equal(itemCondition(s, "copper_sword"), 78);
  const { g: long } = field(s);
  long.time = 10000;
  long.finish(false);
  settleRun(s, long.result());
  assert.equal(itemCondition(s, "copper_sword"), 58);
});
test("successful real weapon hits practice their equipped family; misses, magic, pets, dots and supplies earn none", () => {
  const s = ready();
  equip(s, "copper_sword");
  s.heroes.warrior.weaponSkills.sword = 1;
  const { g, target } = field(s);
  (g.rng as any).next = () => 0;
  for (let i = 0; i < 16; i++) (g as any).damageEnemy(target, 1, "cleave");
  assert.equal(g.weaponHits.sword, 16);
  for (const source of ["frostbolt", "beast", "bomb", "rend"])
    (g as any).damageEnemy(target, 1, source, false);
  assert.equal(g.weaponHits.sword, 16);
  (g.rng as any).next = () => 0.99;
  const hp = target.hp;
  (g as any).damageEnemy(target, 100, "cleave");
  assert.equal(target.hp, hp);
  assert.equal(g.weaponHits.sword, 16);
  g.time = 1;
  g.finish(false);
  assert.ok(settleRun(s, g.result()));
  assert.equal(s.heroes.warrior.weaponSkills.sword, 3);
  assert.equal(s.heroes.hunter.weaponSkills.sword, 5);
});
test("practice raises accuracy during a run, stays capped and new training starts at one without changing spell stats", () => {
  const s = ready();
  const before = heroStats(s);
  assert.ok(trainWeaponType(s, "axe"));
  assert.equal(s.heroes.warrior.weaponSkills.axe, 1);
  assert.deepEqual(heroStats(s), before);
  const weapon = {
    item: "artisan_axe",
    type: "axe" as const,
    skill: 1,
    cap: 105,
  };
  assert.equal(weaponAccuracy(weapon), 0.85);
  assert.equal(weaponAccuracy(weapon, 832), 1);
  assert.equal(weaponSkillCap(60), 300);
});
test("Hunter arrows practice only a usable ranged family, never a melee pair or broken ranged item", () => {
  const s = ready("hunter");
  trainDualWield(s);
  equip(s, "artisan_duelist_blade", "weapon");
  equip(s, "expert_duelist_blade", "offhand");
  const { g: melee, target: meleeTarget } = field(s);
  melee.rng.next = () => 0;
  for (const source of ["shot", "multishot"])
    for (let i = 0; i < 8; i++)
      (melee as any).damageEnemy(meleeTarget, 1, source);
  assert.deepEqual(melee.weaponHits, {});
  equip(s, "artisan_thrown", "ranged");
  const { g: ranged, target } = field(s);
  ranged.rng.next = () => 0;
  for (const source of ["shot", "multishot"])
    for (let i = 0; i < 8; i++) (ranged as any).damageEnemy(target, 1, source);
  assert.deepEqual(ranged.weaponHits, { thrown: 16 });
  s.itemStates.artisan_thrown = { condition: 0 };
  const { g: broken, target: brokenTarget } = field(s);
  (broken as any).damageEnemy(brokenTarget, 1, "shot");
  assert.deepEqual(broken.weaponHits, {});
  const bow = ready("hunter");
  const { g: actual } = field(bow);
  actual.rng.next = () => 0;
  actual.spells = [{ id: "shot", rank: 1, timer: 0, orbitTimer: 0 }];
  for (let i = 0; i < 60; i++) actual.update(1 / 60);
  assert.ok(actual.damageBySpell.shot > 0);
  assert.ok(actual.weaponHits.bow! > 0);
});

test("weapon whirlwinds and blade orbits practice; magical Thorns orbits keep their damage without weapon misses or practice", () => {
  for (const [classId, source] of [
    ["warrior", "whirlwind"],
    ["rogue", "flurry"],
  ] as const) {
    const s = ready(classId),
      { g, target } = field(s);
    g.rng.next = () => 0;
    (g as any).damageEnemy(target, 1, source);
    assert.equal(g.weaponHits[g.equipment.primary!.type], 1);
  }
  const s = ready("druid"),
    { g, target } = field(s);
  g.stats.crit = 0;
  g.rng.next = () => 0.99;
  const hp = target.hp;
  (g as any).damageEnemy(target, 10, "thorns");
  assert.equal(target.hp, hp - 10);
  assert.deepEqual(g.weaponHits, {});
});

test("bow shots consume one arrow only on an accepted attack, respect cooldown/pauses and freeze equipment snapshots", () => {
  const s = ready("hunter");
  let arrows = 2;
  const { g, target } = field(s, () => (arrows > 0 ? (--arrows, true) : false));
  const hp = target.hp;
  assert.ok(g.shootEquipment());
  assert.equal(arrows, 1);
  assert.ok(target.hp < hp);
  assert.equal(g.shootEquipment(), false);
  assert.equal(arrows, 1);
  g.time = 3;
  g.paused = true;
  assert.equal(g.shootEquipment(), false);
  g.paused = false;
  g.choosing = true;
  assert.equal(g.shootEquipment(), false);
  g.choosing = false;
  assert.ok(g.shootEquipment());
  assert.equal(arrows, 0);
  g.time = 6;
  assert.equal(g.shootEquipment(), false);
  s.heroes.hunter.equipment.weapon = "artisan_duelist_blade";
  assert.equal(g.shootingWeapon?.item, "starter_hunter");
  assert.ok(Object.isFrozen(g.equipment));
});
test("wand and throwing shots need no ammo, no-target shots consume nothing and broken ranged gear cannot shoot", () => {
  for (const [classId, id] of [
    ["mage", "artisan_wand"],
    ["warrior", "artisan_thrown"],
  ] as const) {
    const s = ready(classId);
    equip(s, id);
    const { g } = field(s);
    assert.ok(g.shootEquipment());
    g.time = 3;
    g.enemies = [];
    g.update(0);
    assert.equal(g.shootEquipment(), false);
    assert.equal(g.shotReadyAt, 2.5);
    s.itemStates[id] = { condition: 0 };
    const { g: broken } = field(s);
    assert.equal(broken.shootEquipment(), false);
  }
});

test("casters can practice actual staves in melee without spending ammunition or practicing their magic", () => {
  const s = ready("mage");
  s.heroes.mage.weaponSkills.staff = 1;
  const { g, target } = field(s);
  g.rng.next = () => 0;
  target.x = 300;
  g.update(0);
  assert.equal(g.attackEquipment(), false);
  target.x = 80;
  g.update(0);
  for (let i = 0; i < 8; i++) {
    g.time = i * 3;
    assert.ok(g.attackEquipment());
    assert.equal(g.attackEquipment(), false);
  }
  assert.equal(g.weaponHits.staff, 8);
  assert.equal(s.ammunition, 0);
  g.finish(false);
  assert.ok(settleRun(s, g.result()));
  assert.equal(s.heroes.mage.weaponSkills.staff, 2);
});
test("ammo purchase caps, failed repairs and review rendering preserve explicit costs and binding consequences", () => {
  const s = ready();
  const gold = s.gold;
  assert.ok(buyAmmunition(s));
  assert.equal(s.ammunition, 50);
  assert.equal(s.gold, gold - 10);
  s.ammunition = 9950;
  const before = structuredClone(s);
  assert.equal(buyAmmunition(s), false);
  assert.deepEqual(s, before);
  s.itemStates.copper_sword = { condition: 0 };
  const quote = repairQuote(s, ["copper_sword"]);
  s.gold = 0;
  assert.equal(repairItems(s, quote.ids, quote.gold), false);
  assert.match(renderEquipmentWorkshop(s), /Personal weapon practice/);
  assert.match(renderRepairReview(s, quote.ids), /0 → 100/);
  assert.match(renderAttunementReview(s, "copper_sword"), /permanently binds/);
});

test("all four further families enforce personal training and exact hand/ranged fit on every eligible hero", () => {
  for (const type of ["greataxe", "fist", "gun", "crossbow"] as const)
    for (const classId of WEAPON_TRAINING[type].classes) {
      const s = ready(classId),
        id = `artisan_${type}`;
      assert.equal(equip(s, id), false);
      assert.ok(trainWeaponType(s, type));
      assert.ok(equip(s, id));
      const slot = type === "gun" || type === "crossbow" ? "ranged" : "weapon";
      assert.equal(s.heroes[classId].equipment[slot], id);
      assert.equal(s.heroes[classId].weaponSkills[type], 1);
      assert.equal(
        equipmentSnapshot(s)[slot === "ranged" ? "ranged" : "primary"]?.type,
        type,
      );
      assert.deepEqual(
        validateSave(s).heroes[classId].equipment,
        s.heroes[classId].equipment,
      );
      const { g } = field(s, () => true);
      if (slot === "ranged") assert.ok(g.shootEquipment());
    }
});
test("all eight cloak/off-hand formulas apply actual matching costs and survive repair; weapon formulas remain distinct", () => {
  for (const formula of ENCHANTMENTS.filter((e) =>
    ["back", "offhand"].includes(e.slot),
  )) {
    const s = ready(),
      id = formula.slot === "back" ? "lantern_cloak" : "artisan_shield";
    equip(s, "artisan_duelist_blade");
    equip(s, id);
    const before = heroStats(s),
      gold = s.gold;
    assert.ok(applyEnchantment(s, id, formula.id));
    assert.equal(s.gold, gold - formula.gold);
    for (const [key, value] of Object.entries(formula.stats))
      assert.ok(
        Math.abs(
          heroStats(s)[key as keyof typeof before] -
            before[key as keyof typeof before] -
            value!,
        ) < 1e-8,
      );
    s.itemStates[id] = { condition: 0 };
    const quote = repairQuote(s, [id]);
    assert.ok(repairItems(s, quote.ids, quote.gold));
    assert.equal(validateSave(s).enchantments[id], formula.id);
  }
  const s = ready("mage");
  equip(s, "duskwood_spellblade");
  equip(s, "artisan_focus");
  assert.ok(applyEnchantment(s, "artisan_focus", "offhand_ward_3"));
  assert.equal(applyEnchantment(s, "artisan_focus", "weapon_force"), false);
});
test("personal attunement practices only accepted matching-grade guild work and bound hands cannot be swapped by another hero", () => {
  const s = ready();
  s.professionQuests.enchanting.chapter = 3;
  assert.ok(acceptProfessionQuest(s, "enchanting"));
  assert.ok(attuneItem(s, "artisan_duelist_blade", "force"));
  assert.equal(s.professions.enchanting, 230);
  assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
  const before = structuredClone(s);
  assert.equal(attuneItem(s, "artisan_duelist_blade", "force"), false);
  assert.deepEqual(s, before);
  s.selectedClass = "hunter";
  trainDualWield(s);
  s.heroes.hunter.equipment = {
    weapon: "artisan_duelist_blade",
    offhand: "westfall_duelist_blade",
  };
  assert.equal(swapWeaponHands(s), false);
});
