import test from "node:test";
import { CLASS_TECHNIQUES } from "../src/spellbook";
import assert from "node:assert/strict";
import {
  CLASSES,
  CLASS_MAP,
  GEAR,
  GEAR_MAP,
  GEAR_SETS,
  RECIPES,
  SPELLS,
  ZONES,
} from "../src/content";
import type { ClassId, SpellBonus } from "../src/content";
import {
  canCraft,
  canLearnTalent,
  craft,
  equip,
  equippedSets,
  equipRestriction,
  freshSave,
  gearComparison,
  heroSpellBonuses,
  heroStats,
  learnTalent,
  recipeSkillGain,
  respec,
  spentTalents,
  validateSave,
} from "../src/progression";
import { GameEngine } from "../src/engine";

function trainTree(classId: ClassId, index: number) {
  const save = freshSave();
  save.selectedClass = classId;
  save.heroes[classId].level = 21;
  for (const n of CLASS_MAP[classId].trees[index].nodes)
    for (let i = 0; i < n.max; i++) assert.ok(learnTalent(save, n.id));
  return save;
}
function arena(
  classId: ClassId,
  spellId: string,
  spellBonuses: Record<string, SpellBonus> = {},
) {
  const game = new GameEngine({
    classId,
    zone: ZONES[0],
    stats: { ...heroStats(freshSave(), classId), power: 0, crit: 0, regen: 0 },
    spellBonuses,
    professions: {},
    seed: 123,
  });
  game.spells = [{ id: spellId, rank: 1, timer: 0, orbitTimer: 0 }];
  game.pets = game.pets.filter((p) => p.spellId === spellId);
  game.pets.forEach((p) => (p.timer = 0));
  game.enemies = [
    {
      ...game.enemies[0],
      x: 200,
      y: 0,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
      damage: 0,
    },
  ];
  game.pickups = [];
  return game;
}
test("expanded trees require specialization and every class keeps valid attack targets", () => {
  for (const c of CLASSES) {
    assert.equal(
      c.trees.reduce(
        (sum, t) => sum + t.nodes.reduce((s, n) => s + n.max, 0),
        0,
      ),
      42,
    );
    for (let i = 0; i < 3; i++) {
      const save = trainTree(c.id, i);
      assert.equal(spentTalents(save.heroes[c.id]), 14);
      for (const node of c.trees[(i + 1) % 3].nodes)
        for (let r = 0; r < node.max; r++) learnTalent(save, node.id);
      assert.equal(spentTalents(save.heroes[c.id]), 21);
      assert.equal(
        canLearnTalent(save, c.id, c.trees[(i + 2) % 3].nodes[0].id),
        false,
      );
      for (const id of Object.keys(heroSpellBonuses(save)))
        assert.ok(
          c.spells.includes(id) ||
            CLASS_TECHNIQUES.some(
              (t) => t.classId === c.id && t.spell.id === id,
            ),
        );
    }
  }
});
test("advanced talents affect their named attacks without inflating global stats, and respec removes them", () => {
  const s = trainTree("mage", 1),
    baseline = heroStats(freshSave());
  const bonuses = heroSpellBonuses(s);
  assert.equal(bonuses.fireball.power, 24);
  assert.equal(bonuses.fireball.haste, 18);
  assert.equal(bonuses.fireball.projectiles, 1);
  assert.equal(bonuses.frostbolt, undefined);
  // Only the original Flame Throwing node contributes global damage.
  assert.equal(heroStats(s).power, baseline.power + 18);
  respec(s);
  assert.deepEqual(heroSpellBonuses(s), {});
});
test("attack capabilities filter mastery effects and old talent allocations retain their meaning", () => {
  const druid = heroSpellBonuses(trainTree("druid", 0));
  assert.equal(druid.wrath.projectiles, 1);
  assert.equal(druid.wrath.area, undefined);
  assert.equal(druid.moonfire.area, 35);
  assert.equal(druid.moonfire.projectiles, undefined);
  const old = freshSave();
  old.heroes.mage.level = 7;
  old.heroes.mage.talents = { m_focus: 3, m_meditation: 3, m_power: 1 };
  const imported = validateSave(old);
  assert.deepEqual(imported.heroes.mage.talents, old.heroes.mage.talents);
  assert.deepEqual(imported.heroes.mage.equipment, old.heroes.mage.equipment);
});
test("crafted sets activate cumulatively and gear comparisons include broken set bonuses without mutation", () => {
  const s = freshSave();
  s.heroes.mage.level = 8;
  const baseline = heroStats(s);
  s.inventory.push(
    "spellweave_hands",
    "spellweave_head",
    "spellweave_chest",
    "azure_robe",
  );
  assert.ok(equip(s, "spellweave_hands"));
  assert.equal(heroStats(s).haste, baseline.haste);
  assert.ok(equip(s, "spellweave_head"));
  assert.equal(heroStats(s).haste, baseline.haste + 8);
  assert.ok(equip(s, "spellweave_chest"));
  assert.equal(equippedSets(s)[0].pieces, 3);
  const before = JSON.stringify(s),
    delta = gearComparison(s, "azure_robe");
  assert.equal(delta.power, -11);
  assert.equal(delta.magnet, -10);
  assert.equal(delta.health, 3);
  assert.equal(JSON.stringify(s), before);
  const stats = heroStats(s);
  assert.ok(equip(s, "azure_robe"));
  assert.equal(heroStats(s).power, stats.power + delta.power!);
  assert.equal(equippedSets(s)[0].pieces, 2);
});
test("character level and armor restrict new equipment and imports cannot bypass those gates", () => {
  const s = freshSave();
  s.inventory.push("spellweave_hands", "oathsteel_hands");
  assert.equal(equipRestriction(s, "spellweave_hands"), "Requires level 3");
  assert.equal(equip(s, "spellweave_hands"), false);
  s.heroes.mage.equipment.hands = "spellweave_hands";
  assert.equal(validateSave(s).heroes.mage.equipment.hands, undefined);
  s.heroes.mage.level = 3;
  assert.ok(equip(s, "spellweave_hands"));
  assert.equal(equipRestriction(s, "oathsteel_hands"), "Class restricted");
});
test("recipes unlock at skill milestones and trivial crafts no longer advance the profession", () => {
  const s = freshSave();
  s.professions.tailoring = 24;
  s.gold = 1000;
  s.materials.cloth = 100;
  s.materials.dust = 10;
  const before = JSON.stringify(s);
  assert.equal(craft(s, "craft_spellweave_hands"), null);
  assert.equal(JSON.stringify(s), before);
  assert.ok(craft(s, "robe"));
  assert.equal(s.professions.tailoring, 29);
  assert.ok(canCraft(s, "craft_spellweave_hands"));
  assert.ok(craft(s, "craft_spellweave_hands"));
  assert.ok(s.inventory.includes("spellweave_hands"));
  s.professions.tailoring = 100;
  assert.ok(craft(s, "robe"));
  assert.equal(s.professions.tailoring, 100);
  const recipe = RECIPES.find((r) => r.id === "robe")!;
  assert.equal(recipeSkillGain(recipe, 1), 5);
  assert.equal(recipeSkillGain(recipe, 26), 2);
  assert.equal(recipeSkillGain(recipe, 51), 1);
  assert.equal(recipeSkillGain(recipe, 76), 0);
});
test("all crafted set pieces have a recipe and unique content identifiers", () => {
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const set of GEAR_SETS)
    for (const item of GEAR.filter((g) => g.set === set.id)) {
      const recipe = RECIPES.find((r) => r.output === item.id);
      assert.ok(recipe);
      assert.equal(recipe.profession, set.profession);
    }
  for (const recipe of RECIPES)
    assert.ok(
      ["potions", "bombs", "food"].includes(recipe.output) ||
        GEAR_MAP[recipe.output],
    );
});
test("Fire mastery produces extra projectiles, damage and cast speed in the actual simulation", () => {
  const bonuses = heroSpellBonuses(trainTree("mage", 1));
  const ordinary = arena("mage", "fireball"),
    specialized = arena("mage", "fireball", bonuses);
  ordinary.update(1 / 60);
  specialized.update(1 / 60);
  assert.equal(ordinary.projectiles.length, 1);
  assert.equal(specialized.projectiles.length, 2);
  assert.equal(
    specialized.projectiles[0].damage,
    ordinary.projectiles[0].damage * 1.24,
  );
  assert.ok(specialized.spells[0].timer < ordinary.spells[0].timer);
  const untouched = arena("mage", "frostbolt", bonuses);
  untouched.update(1 / 60);
  assert.equal(untouched.projectiles.length, 1);
  assert.equal(untouched.projectiles[0].damage, SPELLS.frostbolt.damage);
});
test("area size, pierce and resource savings reach the appropriate combat behaviors", () => {
  const frost = heroSpellBonuses(trainTree("mage", 2));
  const storm = arena("mage", "blizzard", frost);
  storm.update(1 / 60);
  assert.equal(storm.areas[0].radius, SPELLS.blizzard.range * 1.3);
  const bolt = arena("mage", "frostbolt", frost);
  bolt.update(1 / 60);
  assert.equal(bolt.projectiles[0].pierce, 1);
  const plain = arena("mage", "arcane"),
    efficient = arena("mage", "arcane", heroSpellBonuses(trainTree("mage", 0)));
  plain.enemies[0].x = efficient.enemies[0].x = 50;
  plain.update(1 / 60);
  efficient.update(1 / 60);
  assert.equal(
    efficient.player.resource - plain.player.resource,
    SPELLS.arcane.cost! * 0.25,
  );
});
test("ground and pet damage retain their spell source and life steal heals only on dealt damage", () => {
  const bonuses = heroSpellBonuses(trainTree("warlock", 0));
  const g = arena("warlock", "corruption", bonuses);
  g.player.hp = 50;
  g.update(1 / 60);
  g.update(1 / 60);
  assert.ok(g.damageBySpell.corruption > 0);
  assert.equal(g.damageBySpell.area, undefined);
  assert.ok(Math.abs(g.player.hp - (50 + g.totalDamage * 0.03)) < 0.0001);
  const imp = arena(
    "warlock",
    "imp",
    heroSpellBonuses(trainTree("warlock", 1)),
  );
  imp.update(1 / 60);
  assert.equal(imp.projectiles.length, 2);
  assert.equal(imp.projectiles[0].spellId, "imp");
});
test("orbit haste and radius and additional chain targets change actual attacks", () => {
  const plain = arena("druid", "thorns"),
    feral = arena("druid", "thorns", heroSpellBonuses(trainTree("druid", 1)));
  plain.update(1 / 60);
  feral.update(1 / 60);
  assert.ok(feral.spells[0].orbitTimer < plain.spells[0].orbitTimer);
  assert.ok(
    Math.abs(
      Math.hypot(
        feral.orbitPositions(feral.spells[0])[0].x,
        feral.orbitPositions(feral.spells[0])[0].y,
      ) -
        (SPELLS.thorns.range + 7) * 1.3,
    ) < 0.0001,
  );
  const chain = arena(
    "shaman",
    "chainlightning",
    heroSpellBonuses(trainTree("shaman", 0)),
  );
  chain.enemies = Array.from({ length: 7 }, (_, i) => ({
    ...chain.enemies[0],
    id: i,
    x: 160 + i * 30,
  }));
  chain.update(1 / 60);
  assert.equal(chain.enemies.filter((e) => e.hp < e.maxHp).length, 6);
});
