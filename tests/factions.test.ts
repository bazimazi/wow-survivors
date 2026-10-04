import test from "node:test";
import assert from "node:assert/strict";
import { GEAR, GEAR_MAP, RECIPES } from "../src/content";
import {
  COMMISSIONS,
  FACTIONS,
  QUARTERMASTER_OFFERS,
  reputationStanding,
} from "../src/factions";
import {
  abandonCommission,
  acceptCommission,
  addReputation,
  buyOffer,
  canCraft,
  claimCommission,
  craft,
  equip,
  expeditionReputation,
  forgetProfession,
  freshSave,
  learnProfession,
  offerRestriction,
  settleRun,
  validateSave,
} from "../src/progression";
import type { RunRecord } from "../src/progression";

const run = (patch: Partial<RunRecord> = {}): RunRecord => ({
  id: "expedition-one",
  classId: "mage",
  zoneId: "elwynn",
  victory: false,
  time: 60,
  kills: 24,
  level: 2,
  gold: 20,
  xp: 15,
  materials: {},
  loot: [],
  date: "2026-10-02T10:00:00Z",
  encounters: 0,
  ...patch,
});

test("faction content has unique offers, legal crafting outputs and no ordinary cache drops", () => {
  assert.equal(new Set(FACTIONS.map((f) => f.zoneId)).size, 3);
  assert.equal(new Set(COMMISSIONS.map((c) => c.id)).size, 9);
  assert.equal(new Set(QUARTERMASTER_OFFERS.map((o) => o.id)).size, 12);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const offer of QUARTERMASTER_OFFERS) {
    assert.equal(Boolean(offer.gearId) !== Boolean(offer.recipeId), true);
    if (offer.gearId) {
      const gear = GEAR_MAP[offer.gearId];
      assert.ok(["rare", "epic"].includes(gear.rarity));
      assert.ok(gear.value / 2 < offer.gold);
    } else {
      const recipe = RECIPES.find((r) => r.id === offer.recipeId)!;
      assert.ok(recipe.requiresPattern);
      assert.equal(recipe.reputation?.faction, offer.faction);
      assert.ok(GEAR_MAP[recipe.output]);
      assert.ok(recipe.gold >= GEAR_MAP[recipe.output].value / 2);
    }
  }
});
test("standing thresholds and within-tier progress are correct at every boundary", () => {
  for (const [points, name] of [
    [0, "Neutral"],
    [149, "Neutral"],
    [150, "Friendly"],
    [499, "Friendly"],
    [500, "Honored"],
    [1099, "Honored"],
    [1100, "Revered"],
    [1999, "Revered"],
    [2000, "Exalted"],
  ] as const)
    assert.equal(reputationStanding(points).name, name);
  assert.equal(reputationStanding(325).progress, 0.5);
  assert.equal(reputationStanding(2000).next, undefined);
  const s = freshSave();
  assert.equal(addReputation(s, "argent", 1999), 1999);
  assert.equal(addReputation(s, "argent", 50), 1);
  assert.equal(addReputation(s, "argent", -20), 0);
});
test("legacy saves receive no retroactive reputation, commission or patterns", () => {
  const raw = JSON.parse(JSON.stringify(freshSave()));
  delete raw.reputation;
  delete raw.commission;
  delete raw.learnedRecipes;
  raw.totals.kills = 20000;
  raw.totals.wins = 25;
  raw.inventory.push("lionheart");
  raw.heroes.mage.level = 20;
  const restored = validateSave(raw);
  assert.deepEqual(restored.reputation, {
    timbermaw: 0,
    thorium: 0,
    argent: 0,
  });
  assert.equal(restored.commission, null);
  assert.deepEqual(restored.learnedRecipes, []);
  assert.equal(restored.heroes.mage.level, 20);
  assert.ok(restored.inventory.includes("lionheart"));
  assert.equal(restored.totals.commissions, 0);
});
test("import repairs faction fields, caps progress and only preserves real patterns", () => {
  const raw = JSON.parse(JSON.stringify(freshSave()));
  raw.reputation = {
    timbermaw: -50,
    thorium: Infinity,
    argent: 50000,
    unknown: 999,
  };
  raw.commission = { id: "timbermaw_survey", progress: 100 };
  raw.learnedRecipes = [
    "craft_trailguard",
    "craft_trailguard",
    "healing",
    "__proto__",
    7,
  ];
  const s = validateSave(raw);
  assert.deepEqual(s.reputation, { timbermaw: 0, thorium: 0, argent: 2000 });
  assert.deepEqual(s.commission, { id: "timbermaw_survey", progress: 3 });
  assert.deepEqual(s.learnedRecipes, ["craft_trailguard"]);
  raw.commission.id = "__proto__";
  assert.equal(validateSave(raw).commission, null);
});
test("expedition reputation includes contribution on defeat and caps each component", () => {
  assert.equal(expeditionReputation(run({ time: 0, kills: 0 })), 0);
  assert.equal(expeditionReputation(run()), 4);
  assert.equal(expeditionReputation(run({ encounters: 2 })), 34);
  assert.equal(
    expeditionReputation(
      run({ victory: true, time: 10000, kills: 10000, encounters: 500 }),
    ),
    242,
  );
  const s = freshSave();
  settleRun(s, run({ zoneId: "westfall", encounters: 1 }));
  assert.equal(s.reputation.thorium, 19);
  assert.equal(s.reputation.timbermaw, 0);
});
test("acceptance checks zone access, ignores past runs and permits only one commission", () => {
  const s = freshSave();
  settleRun(s, run({ kills: 100 }));
  assert.equal(acceptCommission(s, "thorium_patrol"), false);
  assert.equal(acceptCommission(s, "unknown"), false);
  assert.equal(acceptCommission(s, "timbermaw_patrol"), true);
  assert.equal(s.commission!.progress, 0);
  assert.equal(acceptCommission(s, "timbermaw_survey"), false);
});
test("commission accumulation is zone-specific, capped and duplicate settlement cannot reward twice", () => {
  const s = freshSave();
  acceptCommission(s, "timbermaw_survey");
  settleRun(s, run({ zoneId: "westfall", encounters: 3 }));
  assert.equal(s.commission!.progress, 0);
  settleRun(s, run({ id: "two", encounters: 1 }));
  assert.equal(s.commission!.progress, 1);
  const before = structuredClone(s);
  assert.equal(settleRun(s, run({ id: "two", encounters: 1 })), false);
  assert.deepEqual(s, before);
  settleRun(s, run({ id: "three", classId: "warrior", encounters: 4 }));
  assert.equal(s.commission!.progress, 3);
});
test("manual claims reward the selected hero once and repeat acceptance starts fresh", () => {
  const s = freshSave();
  acceptCommission(s, "timbermaw_patrol");
  assert.equal(claimCommission(s), false);
  settleRun(s, run({ kills: 200 }));
  s.selectedClass = "warrior";
  const gold = s.gold,
    rep = s.reputation.timbermaw,
    mageXp = s.heroes.mage.xp;
  assert.equal(claimCommission(s), true);
  assert.equal(s.gold, gold + 70);
  assert.equal(s.reputation.timbermaw, rep + 65);
  assert.equal(s.heroes.warrior.xp, 80);
  assert.equal(s.heroes.mage.xp, mageXp);
  assert.equal(s.totals.commissions, 1);
  assert.equal(s.commission, null);
  const claimed = structuredClone(s);
  assert.equal(claimCommission(s), false);
  assert.deepEqual(s, claimed);
  assert.equal(acceptCommission(s, "timbermaw_patrol"), true);
  assert.equal(s.commission!.progress, 0);
  assert.equal(settleRun(s, run({ kills: 200 })), false);
  assert.equal(s.commission!.progress, 0);
});
test("boss commissions require matching victory and abandonment preserves earned reputation", () => {
  const s = freshSave();
  acceptCommission(s, "timbermaw_boss");
  settleRun(s, run({ time: 360 }));
  assert.equal(s.commission!.progress, 0);
  settleRun(s, run({ id: "two", zoneId: "westfall", victory: true }));
  assert.equal(s.commission!.progress, 0);
  settleRun(s, run({ id: "three", victory: true }));
  assert.equal(s.commission!.progress, 1);
  const reputation = structuredClone(s.reputation);
  assert.equal(abandonCommission(s), true);
  assert.equal(abandonCommission(s), false);
  assert.deepEqual(s.reputation, reputation);
});
test("equipment purchases are atomic for standing, character level, gold and ownership", () => {
  const s = freshSave();
  let before = structuredClone(s);
  assert.equal(offerRestriction(s, "timbermaw_token"), "Requires Friendly");
  assert.equal(buyOffer(s, "timbermaw_token"), false);
  assert.deepEqual(s, before);
  s.reputation.timbermaw = 150;
  assert.equal(offerRestriction(s, "timbermaw_token"), "Requires level 5");
  s.heroes.mage.level = 5;
  s.gold = 139;
  before = structuredClone(s);
  assert.equal(buyOffer(s, "timbermaw_token"), false);
  assert.deepEqual(s, before);
  s.gold = 500;
  assert.equal(buyOffer(s, "timbermaw_token"), true);
  assert.equal(s.gold, 360);
  assert.equal(equip(s, "trail_token"), true);
  before = structuredClone(s);
  assert.equal(buyOffer(s, "timbermaw_token"), false);
  assert.deepEqual(s, before);
  assert.equal(buyOffer(s, "__proto__"), false);
});
test("patterns enforce profession, skill and reputation, persist when forgotten, and gate crafting", () => {
  const s = freshSave();
  s.reputation.timbermaw = 500;
  s.gold = 1000;
  for (const m of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[m] = 100;
  assert.equal(buyOffer(s, "timbermaw_pattern"), false);
  learnProfession(s, "leatherworking");
  s.professions.leatherworking = 124;
  assert.equal(buyOffer(s, "timbermaw_pattern"), false);
  s.professions.leatherworking = 125;
  assert.equal(canCraft(s, "craft_trailguard"), false);
  assert.equal(buyOffer(s, "timbermaw_pattern"), true);
  assert.equal(s.gold, 925);
  assert.equal(buyOffer(s, "timbermaw_pattern"), false);
  assert.equal(canCraft(s, "craft_trailguard"), true);
  s.reputation.timbermaw = 499;
  const before = structuredClone(s);
  assert.equal(craft(s, "craft_trailguard"), null);
  assert.deepEqual(s, before);
  s.reputation.timbermaw = 500;
  assert.equal(craft(s, "craft_trailguard"), "Trailguard Gloves");
  assert.equal(s.materials.heavy_leather, 86);
  assert.equal(s.materials.leather, 100);
  assert.equal(s.professions.leatherworking, 130);
  forgetProfession(s, "leatherworking");
  assert.equal(s.learnedRecipes.includes("craft_trailguard"), true);
  assert.equal(canCraft(s, "craft_trailguard"), false);
  learnProfession(s, "leatherworking");
  assert.equal(canCraft(s, "craft_trailguard"), false);
  assert.deepEqual(validateSave(s).learnedRecipes, ["craft_trailguard"]);
});
