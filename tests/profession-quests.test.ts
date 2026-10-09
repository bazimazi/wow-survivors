import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, CLASS_MAP, GEAR, RECIPES, ZONES } from "../src/content";
import { ENCHANTMENTS } from "../src/enchanting";
import { GameEngine } from "../src/engine";
import type { EngineConfig } from "../src/engine";
import {
  PROFESSION_QUESTS,
  PROFESSION_TRADES,
  PROFESSION_PROJECTS,
  PROFESSION_MASTERY_GEAR,
  professionGoals,
  professionDelivery,
  masteryGearId,
} from "../src/profession-quests";
import type { ProfessionProof } from "../src/profession-quests";
import {
  acceptProfessionQuest,
  abandonProfessionQuest,
  claimProfessionQuest,
  professionProjectRestriction,
  professionQuestClaimRestriction,
  professionQuestSnapshots,
  professionQuestReady,
  freshSave,
  validateSave,
  validateProfessionProof,
  learnProfession,
  forgetProfession,
  heroStats,
  craft,
  canCraft,
  applyEnchantment,
  settleRun,
  equip,
  sellGear,
  grantProfessionSkill,
  trainProfession,
} from "../src/progression";
import type { SaveData, RunRecord } from "../src/progression";
import type { TradeId } from "../src/training";
import { SECONDARY_TRADES } from "../src/training";
import { tierForSkill } from "../src/resources";

function skill(s: SaveData, trade: TradeId, value: number) {
  if (trade === "firstaid" || trade === "cooking" || trade === "fishing")
    s.secondary[trade] = value;
  else s.professions[trade] = value;
}
function prepared(trade: TradeId, value = 300) {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.heroes.warrior.level = 20;
  s.gold = 100000;
  skill(s, trade, value);
  s.training[trade] = 4;
  for (const id of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[id] = 1000;
  s.learnedRecipes = RECIPES.filter((r) => r.requiresPattern).map((r) => r.id);
  s.reputation = { timbermaw: 10000, thorium: 10000, argent: 10000 };
  if (trade === "engineering")
    s.professionSpecializations.engineering = "gnomish";
  return s;
}
let nextId = 0;
function run(
  s: SaveData,
  proof: ProfessionProof[],
  partial: Partial<RunRecord> = {},
): RunRecord {
  return {
    id: `guild-${nextId++}`,
    classId: s.selectedClass,
    zoneId: "elwynn",
    victory: false,
    time: 90,
    kills: 0,
    level: 1,
    gold: 0,
    xp: 0,
    materials: {},
    loot: [],
    date: new Date(0).toISOString(),
    professionProof: proof,
    ...partial,
  };
}
function proof(
  s: SaveData,
  trade: TradeId,
  values: Partial<ProfessionProof> = {},
): ProfessionProof {
  const q = s.professionQuests[trade];
  return {
    trade,
    chapter: q.chapter,
    attempt: q.attempt!,
    gathered: 0,
    uses: 0,
    ...values,
  };
}
function engine(s: SaveData, overrides: Partial<EngineConfig> = {}) {
  const g = new GameEngine({
    classId: s.selectedClass,
    zone: ZONES[0],
    stats: { ...heroStats(s), health: 10000, crit: 0 },
    professions: s.professions,
    fishingSkill: s.secondary.fishing,
    gatheringCaps: { herbalism: 300, mining: 300, skinning: 300, fishing: 300 },
    characterLevel: s.heroes[s.selectedClass].level,
    professionQuests: professionQuestSnapshots(s),
    seed: 17,
    onConsume: () => true,
    ...overrides,
  });
  g.enemies = [];
  g.nodes = [];
  g.spells = [];
  return g;
}
test("twelve original chains contain 48 projects and twelve permanent level-20 epic rewards", () => {
  assert.equal(PROFESSION_TRADES.length, 12);
  assert.equal(PROFESSION_PROJECTS.length, 4);
  assert.equal(PROFESSION_MASTERY_GEAR.length, 12);
  assert.equal(GEAR.length, 384);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  for (const trade of PROFESSION_TRADES) {
    assert.equal(PROFESSION_QUESTS[trade].projects.length, 4);
    assert.equal(
      PROFESSION_MASTERY_GEAR.filter((g) => g.id === masteryGearId(trade))
        .length,
      1,
    );
    const gear = PROFESSION_MASTERY_GEAR.find(
      (g) => g.id === masteryGearId(trade),
    )!;
    assert.equal(gear.level, 20);
    assert.equal(gear.rarity, "epic");
    assert.equal(gear.dropZones, undefined);
    assert.ok(!freshSave().inventory.includes(gear.id));
    if (!PROFESSION_QUESTS[trade].gathering)
      for (let chapter = 0; chapter < 4; chapter++)
        assert.ok(
          RECIPES.some(
            (r) =>
              r.profession === trade && tierForSkill(r.skill) === chapter + 1,
          ),
          `${trade} ${chapter} has a reachable recipe`,
        );
  }
});
test("old version-1 saves preserve mastery-level trades but start all quests unaccepted", () => {
  const s = prepared("enchanting");
  s.inventory.push("greater_charm");
  s.enchantments.starter_mage = "weapon_force";
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.professionQuests;
  const loaded = validateSave(raw);
  for (const q of Object.values(loaded.professionQuests))
    assert.deepEqual(q, {
      chapter: 0,
      attempt: null,
      progress: { gathered: 0, crafts: 0, uses: 0 },
    });
  assert.equal(loaded.professions.enchanting, 300);
  assert.deepEqual(loaded.inventory, s.inventory);
  assert.deepEqual(loaded.materials, s.materials);
  assert.deepEqual(loaded.enchantments, s.enchantments);
});
test("mastery rewards offer a stat choice instead of being strictly worse than an existing shared trinket", () => {
  const stats = [
    "health",
    "armor",
    "power",
    "haste",
    "crit",
    "speed",
    "regen",
    "magnet",
  ] as const;
  for (const mastery of PROFESSION_MASTERY_GEAR) {
    const dominated = GEAR.filter(
      (g) =>
        g.slot === "trinket" &&
        !g.classes &&
        !g.id.startsWith("mastery_") &&
        (g.level || 1) <= 20 &&
        stats.every(
          (stat) => (g.stats[stat] || 0) >= (mastery.stats[stat] || 0),
        ) &&
        stats.some((stat) => (g.stats[stat] || 0) > (mastery.stats[stat] || 0)),
    );
    assert.deepEqual(
      dominated.map((g) => g.id),
      [],
      mastery.id,
    );
  }
});
test("acceptance checks learned trade, acting hero, skill and trained rank without blocking trainers", () => {
  const s = freshSave();
  assert.equal(acceptProfessionQuest(s, "alchemy"), false);
  learnProfession(s, "alchemy");
  assert.equal(acceptProfessionQuest(s, "alchemy"), true);
  assert.equal(acceptProfessionQuest(s, "alchemy"), false);
  abandonProfessionQuest(s, "alchemy");
  s.professionQuests.alchemy.chapter = 1;
  s.professions.alchemy = 50;
  s.heroes.mage.level = 5;
  assert.match(professionProjectRestriction(s, "alchemy")!, /Journeyman/);
  assert.equal(trainProfession(s, "alchemy"), true);
  assert.equal(acceptProfessionQuest(s, "alchemy"), true);
  s.selectedClass = "warrior";
  assert.equal(professionQuestSnapshots(s).length, 0);
  s.heroes.warrior.level = 5;
  assert.equal(professionQuestSnapshots(s).length, 1);
});
test("all twelve chains can complete in order with actual grade-matched crafts and validated returns", () => {
  for (const trade of PROFESSION_TRADES) {
    const s = prepared(trade);
    for (let chapter = 0; chapter < 4; chapter++) {
      assert.equal(s.professionQuests[trade].chapter, chapter);
      assert.equal(acceptProfessionQuest(s, trade), true);
      const goals = professionGoals(trade, chapter),
        material = professionDelivery(trade, chapter);
      if (goals.crafts) {
        const r = RECIPES.find(
          (r) =>
            r.profession === trade &&
            tierForSkill(r.skill) === chapter + 1 &&
            canCraft(s, r.id),
        )!;
        assert.ok(r, `${trade} ${chapter}`);
        for (let i = 0; i < goals.crafts; i++)
          assert.equal(craft(s, r.id), r.name);
      }
      assert.equal(
        settleRun(
          s,
          run(
            s,
            [proof(s, trade, { gathered: goals.gathered, uses: goals.uses })],
            {
              zoneId:
                PROFESSION_QUESTS[trade].destinations?.[chapter][0] || "elwynn",
              materials: { [material]: goals.gathered },
            },
          ),
        ),
        true,
      );
      // Meals require two different expeditions in the later projects.
      if (PROFESSION_QUESTS[trade].field === "meals" && goals.uses > 1)
        settleRun(s, run(s, [proof(s, trade, { uses: 1 })]));
      assert.equal(
        professionQuestReady(s, trade),
        true,
        `${trade} ${chapter}: ${professionQuestClaimRestriction(s, trade)}`,
      );
      const before = s.materials[material],
        gold = s.gold;
      assert.equal(claimProfessionQuest(s, trade), true);
      assert.equal(
        s.materials[material],
        before - PROFESSION_PROJECTS[chapter].delivery,
      );
      assert.equal(s.gold, gold + PROFESSION_PROJECTS[chapter].gold);
      assert.equal(claimProfessionQuest(s, trade), false);
    }
    assert.equal(
      s.inventory.filter((id) => id === masteryGearId(trade)).length,
      1,
    );
    assert.equal(acceptProfessionQuest(s, trade), false);
    assert.equal(validateSave(s).professionQuests[trade].chapter, 4);
  }
});
test("final mastery needs skill 300 and exact delivery stock; rejected claims are atomic", () => {
  const s = prepared("mining", 225);
  s.professionQuests.mining.chapter = 3;
  acceptProfessionQuest(s, "mining");
  settleRun(
    s,
    run(s, [proof(s, "mining", { gathered: 16 })], {
      zoneId: "tirisfal",
      materials: { mithril_ore: 16 },
    }),
  );
  const before = JSON.stringify(s);
  assert.match(professionQuestClaimRestriction(s, "mining")!, /300/);
  assert.equal(claimProfessionQuest(s, "mining"), false);
  assert.equal(JSON.stringify(s), before);
  grantProfessionSkill(s, "mining", 75);
  s.materials.mithril_ore = 5;
  assert.equal(claimProfessionQuest(s, "mining"), false);
  s.materials.mithril_ore = 6;
  assert.equal(claimProfessionQuest(s, "mining"), true);
  assert.equal(s.materials.mithril_ore, 0);
});
test("craft credit uses exact recipe grade and counts transactions, not output units or old totals", () => {
  const s = prepared("alchemy");
  s.totals.crafts = 1000;
  acceptProfessionQuest(s, "alchemy");
  const low = RECIPES.find(
    (r) => r.profession === "alchemy" && tierForSkill(r.skill) === 1,
  )!;
  const high = RECIPES.find(
    (r) => r.profession === "alchemy" && tierForSkill(r.skill) === 2,
  )!;
  craft(s, high.id);
  assert.equal(s.professionQuests.alchemy.progress.crafts, 0);
  craft(s, low.id);
  assert.equal(s.professionQuests.alchemy.progress.crafts, 1);
  s.materials.herbs = 0;
  assert.equal(craft(s, low.id), null);
  assert.equal(s.professionQuests.alchemy.progress.crafts, 1);
});
test("equipment enchants count accepted grade-matched applications; same/failed formula grants nothing", () => {
  const s = prepared("enchanting");
  acceptProfessionQuest(s, "enchanting");
  const formulas = ENCHANTMENTS.filter((e) => tierForSkill(e.skill) === 1);
  assert.equal(formulas.length, 5);
  assert.equal(applyEnchantment(s, "starter_mage", formulas[0].id), true);
  assert.equal(applyEnchantment(s, "starter_mage", formulas[0].id), false);
  assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
  assert.equal(applyEnchantment(s, "cloth", formulas[1].id), true);
  assert.equal(s.professionQuests.enchanting.progress.crafts, 2);
});
test("equipment formula applications support all four quest grades, including Artisan work", () => {
  for (let chapter = 0; chapter < 4; chapter++) {
    const s = prepared("enchanting");
    s.inventory.push("spellweave_hands");
    s.professionQuests.enchanting.chapter = chapter;
    acceptProfessionQuest(s, "enchanting");
    const formula = ENCHANTMENTS.find(
      (e) =>
        tierForSkill(e.skill) === chapter + 1 &&
        ["weapon", "hands"].includes(e.slot),
    )!;
    const item =
      formula.slot === "weapon" ? "starter_mage" : "spellweave_hands";
    assert.equal(applyEnchantment(s, item, formula.id), true);
    assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
    assert.equal(applyEnchantment(s, item, formula.id), false);
    assert.equal(s.professionQuests.enchanting.progress.crafts, 1);
  }
});
test("direct node collections count exact grade and region, even when skill practice is trivial", () => {
  for (const trade of ["herbalism", "mining", "fishing"] as const) {
    const s = prepared(trade);
    acceptProfessionQuest(s, trade);
    const material = professionDelivery(trade, 0);
    const g = engine(s);
    g.nodes = Array.from({ length: 4 }, (_, id) => ({
      id,
      kind: material,
      x: 0,
      y: 0,
      depleted: false,
    }));
    g.update(1 / 60);
    assert.equal(g.result().professionProof![0].gathered, 8);
    assert.equal(g.professionGains[trade] || 0, 0);
    settleRun(s, g.result(), g.professionGains);
    assert.equal(professionQuestReady(s, trade), true);
    const wrong = engine(s, { zone: ZONES.find((z) => z.id === "westfall")! });
    wrong.nodes = [{ id: 0, kind: material, x: 0, y: 0, depleted: false }];
    wrong.update(1 / 60);
    assert.equal(wrong.result().professionProof![0].gathered, 0);
  }
});
test("wolf skinning counts direct hides and stays independent from stored material totals", () => {
  const s = prepared("skinning", 1);
  acceptProfessionQuest(s, "skinning");
  const g = engine(s);
  g.rng.next = () => 0;
  const base = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(s),
    professions: {},
    seed: 1,
  }).enemies[0];
  g.enemies = Array.from({ length: 8 }, (_, id) => ({
    ...base,
    id,
    type: "wolf",
    x: 0,
    y: 0,
    hp: 1,
    maxHp: 1,
    speed: 0,
    damage: 0,
  }));
  assert.equal(g.useBomb(), true);
  assert.equal(g.result().professionProof![0].gathered, 8);
  g.materials.leather = (g.materials.leather || 0) + 30;
  assert.equal(g.result().professionProof![0].gathered, 8);
});
test("cache and humanoid cloth rewards never grant direct gathering evidence", () => {
  const s = prepared("herbalism", 1);
  acceptProfessionQuest(s, "herbalism");
  const g = engine(s);
  g.rng.next = () => 0;
  const cache = g.landmarks.find((l) => l.kind === "cache")!;
  cache.state = "active";
  cache.guardIds = [];
  g.update(1 / 60);
  assert.equal(cache.state, "complete");
  assert.equal(g.materials.herbs, 3);
  assert.equal(g.result().professionProof![0].gathered, 0);
  while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
  const base = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(s),
    professions: {},
    seed: 1,
  }).enemies[0];
  g.enemies = [
    {
      ...base,
      type: "gnoll",
      x: 0,
      y: 0,
      hp: 1,
      maxHp: 1,
      speed: 0,
      damage: 0,
    },
  ];
  g.useBomb();
  assert.equal(g.materials.cloth, 1);
  assert.equal(g.result().professionProof![0].gathered, 0);
});
test("exact-grade node evidence waits for dismount and rejects higher or lower material grades", () => {
  const s = prepared("mining");
  s.professionQuests.mining.chapter = 1;
  acceptProfessionQuest(s, "mining");
  const g = engine(s, {
    zone: ZONES.find((z) => z.id === "westfall")!,
    travelId: "horse",
  });
  g.nodes = [
    { id: 0, kind: "ore", x: 0, y: 0, depleted: false },
    { id: 1, kind: "iron_ore", x: 0, y: 0, depleted: false },
    { id: 2, kind: "tin_ore", x: 0, y: 0, depleted: false },
  ];
  assert.equal(g.toggleTravel(), true);
  for (let i = 0; i < 80; i++) g.update(1 / 60);
  assert.equal(g.travelling, true);
  assert.equal(g.result().professionProof![0].gathered, 0);
  assert.ok(g.nodes.every((n) => !n.depleted));
  g.toggleTravel();
  g.update(0.02);
  assert.equal(g.result().professionProof![0].gathered, 2);
  assert.equal(g.materials.ore, 2);
  assert.equal(g.materials.iron_ore, 2);
});
test("Expert Fishing accumulates twelve direct trout across two actual Deadmines third-room visits", () => {
  const s = prepared("fishing", 125);
  s.professionQuests.fishing.chapter = 2;
  acceptProfessionQuest(s, "fishing");
  for (let visit = 0; visit < 2; visit++) {
    const g = engine(s, { zone: ZONES.find((z) => z.id === "deadmines")! });
    for (let room = 0; room < 2; room++) {
      g.dungeonStageTime = g.dungeonStage!.duration;
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      const guardian = g.enemies.find((e) => e.boss)!;
      guardian.x = g.player.x;
      guardian.y = g.player.y;
      guardian.hp = 1;
      assert.equal(g.useBomb(), true);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      assert.equal(g.checkpoint, true);
      assert.equal(g.continueDungeon("stride"), true);
    }
    g.spells = [];
    const pools = g.nodes.filter((n) => n.kind === "mithril_trout");
    assert.equal(pools.length, 3);
    for (const pool of pools) {
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      g.player.x = pool.x;
      g.player.y = pool.y;
      g.update(1 / 60);
    }
    assert.equal(g.result().professionProof![0].gathered, 6);
    assert.equal(g.result().dungeonBosses, 2);
    settleRun(s, g.result(), g.professionGains);
    assert.equal(s.professionQuests.fishing.progress.gathered, (visit + 1) * 6);
  }
  assert.equal(professionQuestReady(s, "fishing"), true);
});
test("healing requires an injured hero and accepted consumption, recording Alchemy and First Aid together", () => {
  const s = prepared("alchemy");
  acceptProfessionQuest(s, "alchemy");
  acceptProfessionQuest(s, "firstaid");
  const g = engine(s);
  assert.equal(g.usePotion(), false);
  g.player.hp -= 100;
  g.paused = true;
  assert.equal(g.usePotion(), false);
  g.paused = false;
  assert.equal(g.usePotion(), true);
  assert.deepEqual(
    g.result().professionProof!.map((p) => p.uses),
    [1, 1],
  );
  const noSupply = engine(s, { onConsume: () => false });
  noSupply.player.hp -= 100;
  assert.equal(noSupply.usePotion(), false);
  assert.ok(noSupply.result().professionProof!.every((p) => p.uses === 0));
});
test("bomb fieldwork requires damage to a live enemy, not empty throws or dead targets", () => {
  const s = prepared("engineering");
  acceptProfessionQuest(s, "engineering");
  const g = engine(s);
  assert.equal(g.useBomb(), true);
  assert.equal(g.result().professionProof![0].uses, 0);
  const base = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(s),
    professions: {},
    seed: 1,
  }).enemies[0];
  g.enemies = [
    {
      ...base,
      x: 0,
      y: 0,
      hp: 1000,
      maxHp: 1000,
      speed: 0,
      damage: 0,
      dead: true,
    },
  ];
  g.useBomb();
  assert.equal(g.result().professionProof![0].uses, 0);
  g.enemies[0].dead = false;
  g.useBomb();
  assert.equal(g.result().professionProof![0].uses, 1);
});
test("meals count only after 60 simulated seconds, once per expedition, with pause and partial-return rules", () => {
  const s = prepared("cooking");
  s.professionQuests.cooking.chapter = 2;
  acceptProfessionQuest(s, "cooking");
  const g = engine(s, { food: true });
  g.time = 59.99;
  g.paused = true;
  g.update(1);
  assert.equal(g.result().professionProof![0].uses, 0);
  g.paused = false;
  g.update(0.02);
  assert.equal(g.result().professionProof![0].uses, 1);
  g.update(1);
  assert.equal(g.result().professionProof![0].uses, 1);
  settleRun(s, g.result());
  assert.equal(s.professionQuests.cooking.progress.uses, 1);
  const noMeal = engine(s);
  noMeal.time = 60;
  noMeal.update(0.02);
  assert.equal(noMeal.result().professionProof![0].uses, 0);
  settleRun(s, run(s, [proof(s, "cooking", { uses: 2 })], { time: 59 }));
  assert.equal(s.professionQuests.cooking.progress.uses, 1);
});
test("run snapshots are independent and result previews never mutate saved progress", () => {
  const s = prepared("mining");
  acceptProfessionQuest(s, "mining");
  const snapshots = professionQuestSnapshots(s),
    g = engine(s, { professionQuests: snapshots });
  snapshots[0].attempt = "changed";
  const result = g.result();
  result.professionProof![0].gathered = 8;
  assert.notEqual(g.result().professionProof![0].attempt, "changed");
  assert.equal(g.result().professionProof![0].gathered, 0);
  assert.equal(s.professionQuests.mining.progress.gathered, 0);
});
test("abandoning, reaccepting or forgetting rejects stale returns while retaining claimed chapters", () => {
  const s = prepared("mining");
  s.professionQuests.mining.chapter = 1;
  acceptProfessionQuest(s, "mining");
  const old = proof(s, "mining", { gathered: 10 });
  abandonProfessionQuest(s, "mining");
  acceptProfessionQuest(s, "mining");
  assert.notEqual(old.attempt, s.professionQuests.mining.attempt);
  settleRun(
    s,
    run(s, [old], { zoneId: "westfall", materials: { tin_ore: 10 } }),
  );
  assert.equal(s.professionQuests.mining.progress.gathered, 0);
  const current = proof(s, "mining", { gathered: 10 });
  forgetProfession(s, "mining");
  learnProfession(s, "mining");
  skill(s, "mining", 300);
  s.training.mining = 4;
  acceptProfessionQuest(s, "mining");
  settleRun(
    s,
    run(s, [current], { zoneId: "westfall", materials: { tin_ore: 10 } }),
  );
  assert.equal(s.professionQuests.mining.chapter, 1);
  assert.equal(s.professionQuests.mining.progress.gathered, 0);
});
test("duplicate settlement, wrong chapters, wrong zones and evidence beyond returned stock grant no extra progress", () => {
  const s = prepared("mining");
  acceptProfessionQuest(s, "mining");
  const r = run(s, [proof(s, "mining", { gathered: 8 })], {
    materials: { ore: 2 },
  });
  settleRun(s, r);
  assert.equal(s.professionQuests.mining.progress.gathered, 2);
  assert.equal(settleRun(s, r), false);
  assert.equal(s.professionQuests.mining.progress.gathered, 2);
  settleRun(
    s,
    run(s, [proof(s, "mining", { chapter: 1, gathered: 8 })], {
      materials: { ore: 8 },
    }),
  );
  settleRun(
    s,
    run(s, [proof(s, "mining", { gathered: 8 })], {
      zoneId: "tirisfal",
      materials: { ore: 8 },
    }),
  );
  assert.equal(s.professionQuests.mining.progress.gathered, 2);
});
test("mastery trinkets equip across eligible heroes and cannot be sold or disenchanted after forgetting", () => {
  const s = prepared("enchanting");
  const id = masteryGearId("enchanting");
  s.inventory.push(id);
  s.professionQuests.enchanting.chapter = 4;
  for (const c of CLASSES) {
    s.selectedClass = c.id;
    s.heroes[c.id].level = 19;
    assert.equal(equip(s, id), false);
    s.heroes[c.id].level = 20;
    assert.equal(equip(s, id), true);
    delete s.heroes[c.id].equipment.trinket;
  }
  assert.equal(sellGear(s, id), false);
  assert.equal(sellGear(s, id, true), false);
  forgetProfession(s, "enchanting");
  const loaded = validateSave(s);
  assert.ok(loaded.inventory.includes(id));
  assert.equal(loaded.professionQuests.enchanting.chapter, 4);
  assert.equal(sellGear(loaded, id), false);
});
test("earned mastery equipment changes derived stats and damage in actual automatic combat", () => {
  const s = prepared("enchanting"),
    plain = engine(s);
  s.inventory.push(masteryGearId("enchanting"));
  equip(s, masteryGearId("enchanting"));
  const improved = engine(s);
  assert.equal(improved.stats.power - plain.stats.power, 22);
  assert.equal(improved.stats.regen - plain.stats.regen, 0.5);
  const base = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(s),
    professions: {},
    seed: 1,
  }).enemies[0];
  for (const g of [plain, improved]) {
    g.spells = [
      { id: CLASS_MAP.mage.spells[0], rank: 1, timer: 0, orbitTimer: 0 },
    ];
    g.enemies = [
      { ...base, x: 60, y: 0, hp: 100000, maxHp: 100000, speed: 0, damage: 0 },
    ];
    for (let i = 0; i < 30; i++) g.update(1 / 60);
  }
  assert.ok(improved.totalDamage > plain.totalDamage);
  assert.ok(plain.totalDamage > 0);
});
test("save import bounds every quest and proof, rejects unknown trades/tokens and discards inactive evidence", () => {
  const s = prepared("mining");
  const raw = JSON.parse(JSON.stringify(s));
  raw.professionQuests = {
    mining: {
      chapter: 0,
      attempt: "valid-token",
      progress: { gathered: 999, crafts: 999, uses: 999 },
    },
    alchemy: { chapter: 0, attempt: "valid-token", progress: { crafts: 999 } },
    fishing: {
      chapter: 99,
      attempt: "bad<>token",
      progress: { gathered: 999 },
    },
    firstaid: { chapter: 0, attempt: "x".repeat(65), progress: { crafts: 1 } },
    fake: { chapter: 4 },
  };
  const loaded = validateSave(raw);
  assert.equal(Object.keys(loaded.professionQuests).length, 12);
  assert.deepEqual(loaded.professionQuests.mining.progress, {
    gathered: 8,
    crafts: 0,
    uses: 0,
  });
  assert.equal(loaded.professionQuests.alchemy.attempt, null);
  assert.equal(loaded.professionQuests.fishing.chapter, 4);
  assert.equal(loaded.professionQuests.firstaid.attempt, null);
  assert.deepEqual(
    validateProfessionProof([
      { trade: "fake", chapter: 0, attempt: "ok" },
      { trade: "mining", chapter: 9, attempt: "ok" },
      { trade: "mining", chapter: 0, attempt: "bad<>" },
      { trade: "mining", chapter: 0, attempt: "ok", gathered: 999, uses: 999 },
      { trade: "mining", chapter: 0, attempt: "ok", gathered: 1 },
    ]),
    [{ trade: "mining", chapter: 0, attempt: "ok", gathered: 8, uses: 0 }],
  );
  assert.ok(SECONDARY_TRADES.every((t) => loaded.professionQuests[t.id]));
});
