import test from "node:test";
import assert from "node:assert/strict";
import { NECKLACE_GEAR, NECKLACE_SOURCES } from "../src/necklaces";
import { ACCESSORY_GEAR } from "../src/accessories";
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
import { ENCHANTMENTS, ENCHANTABLE_SLOTS } from "../src/enchanting";
import {
  freshSave,
  equip,
  gearComparison,
  heroStats,
  validateSave,
  applyEnchantment,
  enchantmentComparison,
  enchantmentRestriction,
  enchantmentSkillGain,
  forgetProfession,
  sellGear,
  settleRun,
  acceptProfessionQuest,
} from "../src/progression";
import {
  renderEnchantingTable,
  renderEnchantmentReview,
} from "../src/enchanting-ui";
import { WARDROBE_CATALOG, renderWardrobe } from "../src/wardrobe-ui";
import { GameEngine } from "../src/engine";
import { dungeonRoute } from "../src/dungeon";
import { tierForSkill } from "../src/resources";

const formulas = ENCHANTMENTS.filter((e) => e.slot === "wrists");
function ready(classId: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = classId;
  s.gold = 10000;
  for (const h of Object.values(s.heroes)) h.level = 21;
  for (const id of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
    s.materials[id] = 1000;
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  s.inventory.push(
    ...NECKLACE_GEAR.map((g) => g.id),
    ...ACCESSORY_GEAR.map((g) => g.id),
  );
  return s;
}
function field(zone: string, seed = 31, level = 21) {
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES.find((z) => z.id === zone)!,
    stats: { ...heroStats(freshSave()), health: 10000 },
    professions: {},
    characterLevel: level,
    seed,
    onConsume: () => true,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  return g;
}
function drain(g: GameEngine) {
  while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
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

test("eleven universal necklaces have unique local/guardian sources and keep jewelry outside crafting, sets and formulas", () => {
  assert.equal(GEAR.length, 384);
  assert.equal(SLOTS.length, 16);
  assert.equal(WARDROBE_CATALOG.length, 222);
  assert.equal(NECKLACE_GEAR.length, 11);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(RECIPES.length, 151);
  for (const g of NECKLACE_GEAR) {
    assert.equal(g.slot, "neck");
    assert.equal(g.armor, undefined);
    assert.equal(g.classes, undefined);
    assert.equal(g.set, undefined);
    assert.ok(!RECIPES.some((r) => r.output === g.id));
    const source = NECKLACE_SOURCES[g.id];
    if (source.type === "world") assert.deepEqual(g.dropZones, [source.zone]);
    else {
      assert.equal(g.dropZones, undefined);
      assert.ok(source.type === "dungeon");
      assert.ok(
        dungeonRoute(source.zone)!.stages[source.stage].loot.includes(g.id),
      );
    }
  }
  assert.ok(
    !ENCHANTABLE_SLOTS.has("neck") &&
      !ENCHANTABLE_SLOTS.has("finger1") &&
      !ENCHANTABLE_SLOTS.has("finger2"),
  );
  assert.equal(ENCHANTMENTS.length, 24);
  assert.equal(formulas.length, 4);
  assert.deepEqual(
    formulas.map((e) => e.skill),
    [1, 50, 125, 225],
  );
});

test("legacy equipment stays identical and imports retain only owned eligible necklaces and supported wrist effects", () => {
  const old = freshSave(),
    before = heroStats(old);
  assert.deepEqual(
    validateSave(old).heroes.mage.equipment,
    old.heroes.mage.equipment,
  );
  assert.deepEqual(heroStats(validateSave(old)), before);
  const s: any = ready();
  s.heroes.mage.equipment.neck = "moonlit_pendant";
  s.heroes.mage.equipment.finger1 = "elwynn_ring";
  s.heroes.mage.equipment.finger2 = "elwynn_ring";
  s.heroes.mage.equipment.wrists = "elwynn_wristwraps";
  s.heroes.priest.equipment.neck = "not_owned";
  s.heroes.warrior.level = 1;
  s.heroes.warrior.equipment.neck = "elwynn_necklace";
  s.enchantments = {
    elwynn_wristwraps: "wrists_focus",
    moonlit_pendant: "wrists_focus",
    elwynn_ring: "wrists_vigor",
  };
  const loaded = validateSave(s);
  assert.equal(loaded.heroes.mage.equipment.neck, "moonlit_pendant");
  assert.equal(loaded.heroes.mage.equipment.finger2, undefined);
  assert.equal(loaded.heroes.priest.equipment.neck, undefined);
  assert.equal(loaded.heroes.warrior.equipment.neck, undefined);
  assert.deepEqual(loaded.enchantments, { elwynn_wristwraps: "wrists_focus" });
  assert.deepEqual(validateSave(loaded), loaded);
});

test("all nine classes equip and replace necklaces with exact comparisons without accepting ring/wrist targets", () => {
  for (const c of CLASSES) {
    const s = ready(c.id);
    equip(s, "elwynn_necklace");
    equip(s, "elwynn_wristwraps");
    applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
    const before = heroStats(s),
      saved = structuredClone(s),
      changes = gearComparison(s, "moonlit_pendant");
    assert.deepEqual(s, saved);
    assert.ok(equip(s, "moonlit_pendant"));
    const after = heroStats(s);
    for (const key of Object.keys(before) as (keyof typeof before)[])
      assert.ok(
        Math.abs((changes[key] || 0) - (after[key] - before[key])) < 1e-8,
      );
    const next = structuredClone(s);
    for (const slot of ["wrists", "finger1", "finger2"] as const) {
      assert.equal(equip(s, "elwynn_necklace", slot), false);
      assert.deepEqual(s, next);
    }
    s.heroes[c.id].level = 3;
    assert.equal(equip(s, "elwynn_necklace"), false);
  }
});

test("real cache and elite kills reach all four local necklaces without leaking other regions or guardian rewards", () => {
  const seen = new Set<string>();
  for (const zone of ["elwynn", "westfall", "tirisfal", "duskwood"])
    for (let seed = 1; seed <= 120; seed++) {
      const id = cache(field(zone, seed * 7919));
      if (NECKLACE_SOURCES[id]) {
        assert.deepEqual(NECKLACE_SOURCES[id], { type: "world", zone });
        seen.add(id);
      }
      const g = field(zone, seed * 97),
        e = (g as any).spawnEnemy(20, true, 0, false, "gnoll");
      e.hp = 1;
      g.useBomb();
      const item = g.pickups.find((p) => p.kind === "chest")!.loot!;
      if (NECKLACE_SOURCES[item]) {
        assert.deepEqual(NECKLACE_SOURCES[item], { type: "world", zone });
        seen.add(item);
      }
    }
  assert.deepEqual(
    seen,
    new Set(NECKLACE_GEAR.filter((g) => g.dropZones).map((g) => g.id)),
  );
  for (let seed = 1; seed <= 30; seed++)
    assert.ok(!NECKLACE_SOURCES[cache(field("elwynn", seed, 3))]);
});

test("all seven necklaces are earned by actual kills in their recorded guardian rooms and settle only once", () => {
  for (const item of NECKLACE_GEAR.filter(
    (g) => NECKLACE_SOURCES[g.id].type === "dungeon",
  )) {
    const source = NECKLACE_SOURCES[item.id];
    assert.ok(source.type === "dungeon");
    const g = field(source.zone);
    (g as any).rng.pick = (pool: any[]) =>
      pool.find((v) => v?.id === item.id || v === item.id) || pool[0];
    for (let stage = 0; stage <= source.stage; stage++) {
      drain(g);
      g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
      g.update(1 / 60);
      drain(g);
      Object.assign(g.boss!, { hp: 1, x: g.player.x + 20, y: g.player.y });
      assert.ok(g.enemies.includes(g.boss!));
      assert.ok(g.useBomb());
      drain(g);
      if (stage < source.stage) assert.ok(g.continueDungeon("edge"));
    }
    assert.equal(g.lastDungeonReward, item.id);
    g.finish(false);
    const s = freshSave();
    s.heroes.mage.level = 21;
    const result = g.result();
    assert.ok(settleRun(s, result));
    const earned = structuredClone(s);
    assert.ok(s.inventory.includes(item.id));
    assert.equal(s.heroes.mage.equipment.neck, undefined);
    assert.equal(settleRun(s, result), false);
    assert.deepEqual(s, earned);
    assert.ok(equip(s, item.id));
  }
});

test("each wrist formula consumes its exact grade and fee and contributes its full equipped bonus", () => {
  const expected = [
    { dust: 3, herbs: 1 },
    { soul_dust: 4, tin_ore: 2 },
    { vision_dust: 6, kingsblood: 3 },
    { dream_dust: 8, sungrass: 4 },
  ];
  for (const [index, e] of formulas.entries()) {
    assert.deepEqual(e.costs, expected[index]);
    const s = ready();
    equip(s, "elwynn_wristwraps");
    const before = structuredClone(s),
      stats = heroStats(s),
      gain = enchantmentSkillGain(s, e.id);
    assert.ok(applyEnchantment(s, "elwynn_wristwraps", e.id));
    assert.equal(s.gold, before.gold - e.gold);
    for (const id of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
      assert.equal(s.materials[id], before.materials[id] - (e.costs[id] || 0));
    for (const [key, value] of Object.entries(e.stats))
      assert.ok(
        Math.abs(
          heroStats(s)[key as keyof typeof stats] -
            stats[key as keyof typeof stats] -
            value!,
        ) < 1e-8,
      );
    assert.equal(
      s.professions.enchanting,
      before.professions.enchanting! + gain,
    );
    assert.equal(tierForSkill(e.skill), index + 1);
  }
});

test("wrist formula rejection is atomic for ownership, class, level, skill, gold, grade and same-effect failures", () => {
  for (const change of [
    (s: ReturnType<typeof ready>) =>
      s.inventory.splice(s.inventory.indexOf("elwynn_wristwraps"), 1),
    (s: ReturnType<typeof ready>) => (s.heroes.mage.level = 1),
    (s: ReturnType<typeof ready>) => (s.professions.enchanting = 124),
    (s: ReturnType<typeof ready>) => (s.gold = 49),
    (s: ReturnType<typeof ready>) => (s.materials.vision_dust = 5),
    (s: ReturnType<typeof ready>) =>
      (s.enchantments.elwynn_wristwraps = "wrists_focus"),
  ]) {
    const s = ready();
    change(s);
    const before = structuredClone(s);
    assert.equal(
      applyEnchantment(s, "elwynn_wristwraps", "wrists_focus"),
      false,
    );
    assert.deepEqual(s, before);
  }
  const s = ready();
  const before = structuredClone(s);
  for (const id of [
    "elwynn_necklace",
    "elwynn_ring",
    "artisan_plate_bracers",
  ]) {
    assert.equal(applyEnchantment(s, id, "wrists_focus"), false);
    assert.deepEqual(s, before);
  }
});

test("Expert cap permits an eligible wrist formula without practice and Artisan training resumes capped practice", () => {
  const s = ready();
  s.training.enchanting = 3;
  assert.equal(
    enchantmentRestriction(s, "elwynn_wristwraps", "wrists_recovery"),
    null,
  );
  assert.equal(enchantmentSkillGain(s, "wrists_recovery"), 0);
  applyEnchantment(s, "elwynn_wristwraps", "wrists_recovery");
  assert.equal(s.professions.enchanting, 225);
  applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
  s.training.enchanting = 4;
  applyEnchantment(s, "elwynn_wristwraps", "wrists_recovery");
  assert.equal(s.professions.enchanting, 230);
  s.professions.enchanting = 299;
  applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
  applyEnchantment(s, "elwynn_wristwraps", "wrists_recovery");
  assert.equal(s.professions.enchanting, 300);
});

test("wrist applications count only accepted grade-matched guild work and duplicate application adds no credit", () => {
  for (const [chapter, e] of formulas.entries()) {
    const s = ready();
    s.professionQuests.enchanting.chapter = chapter;
    assert.ok(acceptProfessionQuest(s, "enchanting"));
    assert.ok(applyEnchantment(s, "elwynn_wristwraps", e.id));
    assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
    assert.equal(applyEnchantment(s, "elwynn_wristwraps", e.id), false);
    assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
  }
});

test("shared necklaces and enchanted bracers protect sales across heroes, survive unlearning/import and lose effects on sale", () => {
  const s = ready();
  for (const c of ["mage", "warrior"] as const) {
    s.selectedClass = c;
    equip(s, "elwynn_necklace");
    equip(s, "elwynn_wristwraps");
  }
  applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
  const old = heroStats(s, "mage");
  forgetProfession(s, "enchanting");
  const loaded = validateSave(s);
  assert.deepEqual(heroStats(loaded, "mage"), old);
  assert.equal(sellGear(loaded, "elwynn_necklace"), false);
  assert.equal(sellGear(loaded, "elwynn_wristwraps"), false);
  for (const h of Object.values(loaded.heroes)) {
    delete h.equipment.neck;
    delete h.equipment.wrists;
  }
  assert.ok(sellGear(loaded, "elwynn_wristwraps"));
  assert.equal(loaded.enchantments.elwynn_wristwraps, undefined);
  loaded.inventory.push("elwynn_wristwraps");
  equip(loaded, "elwynn_wristwraps");
  assert.equal(loaded.enchantments.elwynn_wristwraps, undefined);
});

test("neck acquisition and wrist review expose exact sources, costs, eligibility, counts and replacement changes", () => {
  const s = ready();
  const guide = renderWardrobe(s, {
    open: true,
    slot: "neck",
    source: "all",
    usable: true,
  });
  assert.ok(
    guide.includes("11 pieces") &&
      guide.includes("Goldshire Keepsake") &&
      guide.includes("Mr. Smite") &&
      guide.includes("Archmage Arugal"),
  );
  const table = renderEnchantingTable(s, "elwynn_wristwraps");
  assert.ok(
    table.includes("Browse all 24 formulas") &&
      table.includes("Dream Dust") &&
      table.includes("Sungrass"),
  );
  assert.ok(!table.includes('<option value="elwynn_necklace"'));
  assert.ok(!table.includes('<option value="elwynn_ring"'));
  applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
  assert.deepEqual(
    enchantmentComparison(s, "elwynn_wristwraps", "wrists_recovery"),
    { power: -4, haste: -2, health: 24, regen: 0.4 },
  );
  const review = renderEnchantmentReview(
    s,
    "elwynn_wristwraps",
    "wrists_recovery",
  );
  assert.ok(
    review.includes("-4% Damage") &&
      review.includes("24 Health") &&
      review.includes("95 G"),
  );
});

test("an enchanted bracer changes actual spell damage and retaining the old loadout restores its combat result", () => {
  const s = ready();
  equip(s, "elwynn_wristwraps");
  const old = heroStats(s);
  const damage = (stats: typeof old) => {
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
  const before = damage(old);
  applyEnchantment(s, "elwynn_wristwraps", "wrists_focus");
  assert.ok(damage(heroStats(s)) > before);
  delete s.enchantments.elwynn_wristwraps;
  assert.deepEqual(heroStats(s), old);
  assert.equal(damage(heroStats(s)), before);
});
