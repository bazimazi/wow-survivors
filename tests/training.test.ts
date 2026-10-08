import test from "node:test";
import assert from "node:assert/strict";
import { GEAR, GEAR_MAP, PROFESSIONS, RECIPES, ZONES } from "../src/content";
import { SPECIALIZATIONS, TRAINING_RANKS } from "../src/training";
import type { TradeId } from "../src/training";
import {
  actualCraftSkillGain,
  canCraft,
  craft,
  craftRestriction,
  equip,
  forgetProfession,
  freshSave,
  grantProfessionSkill,
  heroStats,
  learnProfession,
  settleRun,
  specializeProfession,
  specializationRestriction,
  tradeSkill,
  trainProfession,
  trainingInfo,
  trainingRestriction,
  validateSave,
} from "../src/progression";
import type { RunRecord, SaveData } from "../src/progression";
import { GameEngine } from "../src/engine";

function prepared(): SaveData {
  const s = freshSave();
  for (const hero of Object.values(s.heroes)) hero.level = 60;
  s.gold = 1_000_000;
  for (const m of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[m] = 1_000_000;
  return s;
}
const record = (id = "one"): RunRecord => ({
  id,
  classId: "mage",
  zoneId: "elwynn",
  victory: false,
  time: 60,
  kills: 10,
  level: 1,
  gold: 5,
  xp: 10,
  materials: { herbs: 2 },
  loot: [],
  date: "2026-10-02T10:00:00Z",
});

test("new primary and secondary trades start Apprentice, with independent caps", () => {
  const s = freshSave();
  for (const id of ["cooking", "firstaid", "fishing"] as const)
    assert.equal(trainingInfo(s, id).cap, 75);
  assert.equal(learnProfession(s, "herbalism"), true);
  assert.equal(s.training.herbalism, 1);
  assert.equal(grantProfessionSkill(s, "herbalism", 300), 74);
  assert.equal(s.professions.herbalism, 75);
  assert.equal(grantProfessionSkill(s, "mining", 20), 0);
  assert.equal(trainingRestriction(s, "mining"), "Learn Mining");
  assert.equal(
    trainingRestriction(s, "__proto__" as TradeId),
    "Unknown profession",
  );
});
test("training is atomic, checks skill, selected-hero level and gold, and raises only the next cap", () => {
  const s = freshSave();
  learnProfession(s, "tailoring");
  const before = structuredClone(s);
  assert.equal(trainProfession(s, "tailoring"), false);
  assert.deepEqual(s, before);
  s.professions.tailoring = 50;
  assert.equal(
    trainingRestriction(s, "tailoring"),
    "Requires character level 5",
  );
  s.heroes.mage.level = 5;
  s.gold = 29;
  assert.equal(trainProfession(s, "tailoring"), false);
  s.gold = 500;
  assert.equal(trainProfession(s, "tailoring"), true);
  assert.equal(s.gold, 470);
  assert.equal(s.professions.tailoring, 50);
  assert.equal(trainingInfo(s, "tailoring").cap, 150);
  assert.equal(trainProfession(s, "tailoring"), false);
  s.selectedClass = "warrior";
  assert.equal(trainingInfo(s, "tailoring").name, "Journeyman");
  s.professions.tailoring = 125;
  assert.equal(
    trainingRestriction(s, "tailoring"),
    "Requires character level 10",
  );
  s.heroes.warrior.level = 10;
  assert.equal(trainProfession(s, "tailoring"), true);
  assert.equal(trainingInfo(s, "tailoring").cap, 225);
  s.professions.tailoring = 200;
  s.heroes.warrior.level = 20;
  assert.equal(trainProfession(s, "tailoring"), true);
  assert.equal(trainingInfo(s, "tailoring").cap, 300);
  const done = structuredClone(s);
  assert.equal(trainProfession(s, "tailoring"), false);
  assert.deepEqual(s, done);
});
test("craft skill previews clamp partial gains at the cap, while outputs still work", () => {
  const s = prepared();
  learnProfession(s, "tailoring");
  s.professions.tailoring = 74;
  const recipe = RECIPES.find((r) => r.id === "craft_spellweave_head")!;
  assert.equal(actualCraftSkillGain(s, recipe), 1);
  assert.ok(craft(s, recipe.id));
  assert.equal(s.professions.tailoring, 75);
  assert.equal(actualCraftSkillGain(s, recipe), 0);
  assert.ok(craft(s, recipe.id));
  assert.equal(s.professions.tailoring, 75);
  assert.equal(trainProfession(s, "tailoring"), true);
  assert.equal(actualCraftSkillGain(s, recipe), 2);
  assert.ok(craft(s, recipe.id));
  assert.equal(s.professions.tailoring, 77);
});
test("old saves retain every earned skill and infer the minimum rank that can hold it", () => {
  const raw = JSON.parse(JSON.stringify(freshSave()));
  delete raw.training;
  delete raw.professionSpecializations;
  raw.professions = { alchemy: 80, tailoring: 230 };
  raw.secondary = { firstaid: 75, cooking: 150, fishing: 300 };
  raw.learnedRecipes = ["craft_lantern_hood"];
  const s = validateSave(raw);
  assert.equal(s.professions.alchemy, 80);
  assert.equal(s.training.alchemy, 2);
  assert.equal(s.professions.tailoring, 230);
  assert.equal(s.training.tailoring, 4);
  assert.equal(s.training.firstaid, 1);
  assert.equal(s.training.cooking, 2);
  assert.equal(s.training.fishing, 4);
  assert.deepEqual(s.professionSpecializations, {});
  assert.deepEqual(s.learnedRecipes, ["craft_lantern_hood"]);
});
test("import repairs rank conflicts and rejects unrelated or ineligible specializations", () => {
  const raw = JSON.parse(JSON.stringify(freshSave()));
  raw.professions = { blacksmithing: 150, engineering: 149 };
  raw.training = {
    blacksmithing: 3,
    engineering: 99,
    fishing: -1,
    tailoring: 4,
  };
  raw.professionSpecializations = {
    blacksmithing: "armorsmith",
    engineering: "goblin",
    tailoring: "tribal",
  };
  assert.deepEqual(validateSave(raw).professionSpecializations, {});
  raw.heroes.warrior.level = 12;
  const s = validateSave(raw);
  assert.deepEqual(s.professionSpecializations, {
    blacksmithing: "armorsmith",
  });
  assert.equal(s.training.engineering, 3);
  assert.equal(s.training.tailoring, undefined);
  raw.professionSpecializations.blacksmithing = "gnomish";
  assert.deepEqual(validateSave(raw).professionSpecializations, {});
  raw.professions.blacksmithing = 226;
  raw.training.blacksmithing = 1;
  assert.equal(validateSave(raw).training.blacksmithing, 4);
});
test("gathering gains settle within trained capacity and cannot be credited twice", () => {
  const s = prepared();
  learnProfession(s, "herbalism");
  s.professions.herbalism = 74;
  s.secondary.fishing = 75;
  assert.equal(
    settleRun(s, record(), { herbalism: 10, fishing: 10, mining: 10 }),
    true,
  );
  assert.equal(s.professions.herbalism, 75);
  assert.equal(s.secondary.fishing, 75);
  assert.equal(s.professions.mining, undefined);
  const after = structuredClone(s);
  assert.equal(settleRun(s, record(), { herbalism: 10, fishing: 10 }), false);
  assert.deepEqual(s, after);
  trainProfession(s, "herbalism");
  trainProfession(s, "fishing");
  settleRun(s, record("two"), { herbalism: 10, fishing: 10 });
  assert.equal(s.professions.herbalism, 85);
  assert.equal(s.secondary.fishing, 85);
});
test("real expedition gathering keeps materials at a skill cap and practices after training", () => {
  const s = prepared();
  learnProfession(s, "herbalism");
  s.professions.herbalism = 75;
  for (let i = 0; i < 2; i++) {
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats: heroStats(s),
      professions: s.professions,
      characterLevel: 60,
      gatheringCaps: { herbalism: trainingInfo(s, "herbalism").cap },
      seed: 7 + i,
    });
    g.nodes = [{ id: 900, kind: "briarthorn", x: 0, y: 0, depleted: false }];
    g.update(1 / 60);
    assert.equal(g.materials.briarthorn, 2);
    assert.equal(g.professionGains.herbalism || 0, i ? 1 : 0);
    g.finish(false);
    settleRun(s, g.result(), g.professionGains);
    assert.equal(s.professions.herbalism, i ? 76 : 75);
    if (!i) assert.equal(trainProfession(s, "herbalism"), true);
  }
});
test("all seven crafting paths gate their recipe, create legal output and charge once", () => {
  for (const spec of SPECIALIZATIONS) {
    const s = prepared();
    learnProfession(s, spec.profession);
    s.professions[spec.profession] = 150;
    s.training[spec.profession] = 3;
    s.selectedClass =
      spec.profession === "blacksmithing"
        ? "warrior"
        : spec.profession === "leatherworking"
          ? "hunter"
          : "mage";
    assert.equal(canCraft(s, spec.recipeId), false);
    assert.equal(specializeProfession(s, spec.id), true);
    const gold = s.gold;
    assert.equal(specializeProfession(s, spec.id), false);
    assert.equal(s.gold, gold);
    const recipe = RECIPES.find((r) => r.id === spec.recipeId)!;
    const stats = heroStats(s);
    assert.ok(craft(s, spec.recipeId));
    assert.equal(s.professions[spec.profession], 155);
    if (GEAR_MAP[recipe.output]) {
      assert.equal(equip(s, recipe.output), true);
      assert.notDeepEqual(heroStats(s), stats);
    } else assert.equal(s.supplies.bombs, 10);
    for (const other of SPECIALIZATIONS.filter(
      (p) => p.profession === spec.profession && p.id !== spec.id,
    ))
      assert.equal(canCraft(s, other.recipeId), false);
  }
});
test("specialization requirements reject insufficient skill, rank, hero level and gold atomically", () => {
  const s = freshSave();
  learnProfession(s, "engineering");
  assert.equal(specializationRestriction(s, "goblin"), "Requires skill 150");
  s.professions.engineering = 150;
  assert.equal(specializationRestriction(s, "goblin"), "Train Expert");
  s.training.engineering = 3;
  assert.equal(
    specializationRestriction(s, "goblin"),
    "Requires character level 12",
  );
  s.heroes.mage.level = 12;
  s.gold = 99;
  const before = structuredClone(s);
  assert.equal(specializeProfession(s, "goblin"), false);
  assert.deepEqual(s, before);
  assert.equal(specializeProfession(s, "__proto__"), false);
});
test("changing paths and forgetting a trade keep crafted items and faction patterns", () => {
  const s = prepared();
  learnProfession(s, "leatherworking");
  s.professions.leatherworking = 150;
  s.training.leatherworking = 3;
  s.learnedRecipes.push("craft_trailguard");
  specializeProfession(s, "tribal");
  craft(s, "craft_spirit_talisman");
  const skill = s.professions.leatherworking,
    rank = s.training.leatherworking;
  specializeProfession(s, "elemental");
  assert.equal(canCraft(s, "craft_spirit_talisman"), false);
  assert.equal(s.professions.leatherworking, skill);
  assert.equal(s.training.leatherworking, rank);
  assert.ok(s.inventory.includes("spirit_talisman"));
  assert.equal(equip(s, "spirit_talisman"), true);
  assert.equal(
    validateSave(s).professionSpecializations.leatherworking,
    "elemental",
  );
  forgetProfession(s, "leatherworking");
  assert.equal(s.training.leatherworking, undefined);
  assert.equal(s.professionSpecializations.leatherworking, undefined);
  assert.ok(s.learnedRecipes.includes("craft_trailguard"));
  learnProfession(s, "leatherworking");
  assert.equal(s.professions.leatherworking, 1);
  assert.equal(trainingInfo(s, "leatherworking").cap, 75);
  assert.equal(canCraft(s, "craft_stormhide_hood"), false);
});
test("every crafting trade and both crafting secondary skills can progress from 1 to 300", () => {
  const trades = [
    ...PROFESSIONS.filter((p) => p.type === "Crafting").map((p) => p.id),
    "firstaid",
    "cooking",
  ] as TradeId[];
  for (const id of trades) {
    const s = prepared();
    if (id !== "firstaid" && id !== "cooking") learnProfession(s, id);
    for (let step = 0; step < 400 && tradeSkill(s, id) < 300; step++) {
      if (!trainingRestriction(s, id)) trainProfession(s, id);
      const spec = SPECIALIZATIONS.find((p) => p.profession === id);
      if (spec && !specializationRestriction(s, spec.id))
        specializeProfession(s, spec.id);
      const recipe = RECIPES.filter(
        (r) =>
          r.profession === id &&
          canCraft(s, r.id) &&
          actualCraftSkillGain(s, r) > 0,
      ).sort((a, b) => b.skill - a.skill)[0];
      assert.ok(recipe, `${id} stalled at ${tradeSkill(s, id)}`);
      craft(s, recipe.id);
      // Model consuming the batches across expeditions, so storage does not stop practice.
      s.supplies = { potions: 0, bombs: 0, food: 0 };
    }
    assert.equal(tradeSkill(s, id), 300, id);
    assert.equal(trainingInfo(s, id).rank, 4);
  }
});
test("Artisan recipes enforce the trained rank and supply storage rejects wasted batches", () => {
  const s = prepared();
  learnProfession(s, "alchemy");
  s.professions.alchemy = 225;
  s.training.alchemy = 3;
  assert.equal(craftRestriction(s, "artisan_healing_batch"), "Train Artisan");
  const before = structuredClone(s);
  assert.equal(craft(s, "artisan_healing_batch"), null);
  assert.deepEqual(s, before);
  trainProfession(s, "alchemy");
  s.supplies.potions = 988;
  assert.equal(
    craftRestriction(s, "artisan_healing_batch"),
    "Supply storage full",
  );
  const full = structuredClone(s);
  assert.equal(craft(s, "artisan_healing_batch"), null);
  assert.deepEqual(s, full);
  s.supplies.potions = 987;
  assert.ok(craft(s, "artisan_healing_batch"));
  assert.equal(s.supplies.potions, 999);
  assert.equal(s.professions.alchemy, 230);
});
test("new recipes have valid outputs, safe vendor refunds and unique content IDs", () => {
  assert.equal(GEAR.length, 353);
  assert.equal(RECIPES.length, 127);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const r of RECIPES.filter((r) => r.trainingRank)) {
    if (GEAR_MAP[r.output]) {
      assert.ok(r.gold > GEAR_MAP[r.output].value / 2, r.id);
      assert.ok(
        ["uncommon", "rare", "epic"].includes(GEAR_MAP[r.output].rarity),
      );
    } else assert.ok(["potions", "bombs", "food"].includes(r.output));
  }
  assert.deepEqual(
    TRAINING_RANKS.map((r) => r.cap),
    [75, 150, 225, 300],
  );
});

test("a crafted Weaponsmith weapon changes damage and attack timing in the combat simulation", () => {
  const s = prepared();
  s.selectedClass = "warrior";
  const baseline = heroStats(s);
  learnProfession(s, "blacksmithing");
  s.professions.blacksmithing = 150;
  s.training.blacksmithing = 3;
  specializeProfession(s, "weaponsmith");
  craft(s, "craft_tempered_edge");
  equip(s, "tempered_edge");
  const upgraded = heroStats(s);
  const games = [baseline, upgraded].map((stats) => {
    const game = new GameEngine({
      classId: "warrior",
      zone: ZONES[0],
      stats: { ...stats, crit: 0 },
      professions: {},
      seed: 7,
    });
    game.enemies = [
      {
        ...game.enemies[0],
        x: 50,
        y: 0,
        hp: 10000,
        maxHp: 10000,
        speed: 0,
        damage: 0,
      },
    ];
    game.spells = [{ id: "cleave", rank: 1, timer: 0, orbitTimer: 0 }];
    game.nodes = [];
    game.pickups = [];
    game.update(1 / 60);
    return game;
  });
  const before = 10000 - games[0].enemies[0].hp,
    after = 10000 - games[1].enemies[0].hp;
  assert.ok(before > 0);
  assert.ok(after > before);
  assert.ok(
    Math.abs(
      after / before - (1 + upgraded.power / 100) / (1 + baseline.power / 100),
    ) < 0.0001,
  );
  assert.ok(games[1].spells[0].timer < games[0].spells[0].timer);
});
