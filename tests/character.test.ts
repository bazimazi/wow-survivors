import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, CLASS_MAP, GEAR, GEAR_MAP, ZONES } from "../src/content";
import {
  CLASS_TRIALS,
  TRIAL_CHAPTERS,
  trialRelicId,
} from "../src/class-trials";
import { ENCHANTMENTS } from "../src/enchanting";
import { GameEngine } from "../src/engine";
import {
  acceptClassTrial,
  applyEnchantment,
  claimClassTrial,
  classTrialReady,
  enchantmentRestriction,
  enchantmentSkillGain,
  equip,
  forgetProfession,
  freshSave,
  gearComparison,
  heroStats,
  learnProfession,
  sellGear,
  settleRun,
  trialAcceptanceRestriction,
  validateSave,
} from "../src/progression";
import type { RunRecord, SaveData } from "../src/progression";
import type { ClassProof } from "../src/class-trials";

function proof(chapter: number, partial: Partial<ClassProof> = {}): ClassProof {
  return {
    chapter,
    casts: 0,
    actives: 0,
    mastery: 0,
    elites: 0,
    evolutions: 0,
    bosses: 0,
    ...partial,
  };
}
let runIndex = 0;
function run(s: SaveData, p?: ClassProof): RunRecord {
  return {
    id: `character-${runIndex++}`,
    classId: s.selectedClass,
    zoneId: "elwynn",
    victory: false,
    time: 90,
    kills: 20,
    level: 4,
    gold: 5,
    xp: 10,
    materials: {},
    loot: [],
    date: new Date(0).toISOString(),
    ...(p ? { classProof: p } : {}),
  };
}
function enchanter() {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.professions.enchanting = 225;
  s.training.enchanting = 4;
  s.gold = 2000;
  for (const id of Object.keys(s.materials) as (keyof typeof s.materials)[])
    s.materials[id] = 100;
  return s;
}
function engine(s = freshSave(), chapter = 0) {
  const g = new GameEngine({
    classId: s.selectedClass,
    zone: ZONES[0],
    stats: { ...heroStats(s), health: 10000, crit: 0 },
    professions: {},
    seed: 7,
    trialChapter: chapter,
  });
  g.enemies = [
    {
      ...g.enemies[0],
      x: 55,
      y: 0,
      hp: 100000,
      maxHp: 100000,
      speed: 0,
      damage: 0,
    },
  ];
  g.nodes = [];
  g.spells[0].timer = 0;
  return g;
}
test("every class has a distinct trial and eligible exclusive relic with no normal drop source", () => {
  assert.equal(Object.keys(CLASS_TRIALS).length, 9);
  assert.equal(new Set(Object.values(CLASS_TRIALS).map((t) => t.name)).size, 9);
  assert.equal(GEAR.length, 384);
  for (const c of CLASSES) {
    const s = freshSave(),
      id = trialRelicId(c.id);
    s.selectedClass = c.id;
    s.heroes[c.id].level = 10;
    s.inventory.push(id);
    assert.equal(equip(s, id), true);
    assert.deepEqual(GEAR_MAP[id].classes, [c.id]);
    assert.equal(GEAR_MAP[id].dropZones, undefined);
    assert.equal(GEAR_MAP[id].level, 10);
  }
});
test("all nine heroes can complete three ordered chapters and claim exactly one relic", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    s.heroes[c.id].level = 10;
    for (let chapter = 0; chapter < 3; chapter++) {
      assert.equal(acceptClassTrial(s), true);
      assert.equal(acceptClassTrial(s), false);
      assert.equal(claimClassTrial(s), false);
      const r = run(s, proof(chapter, TRIAL_CHAPTERS[chapter].goals));
      assert.equal(settleRun(s, r), true);
      const after = JSON.stringify(s);
      assert.equal(settleRun(s, r), false);
      assert.equal(JSON.stringify(s), after);
      assert.equal(classTrialReady(s), true);
      assert.equal(claimClassTrial(s), true);
      const claimed = JSON.stringify(s);
      assert.equal(claimClassTrial(s), false);
      assert.equal(JSON.stringify(s), claimed);
    }
    assert.equal(s.heroes[c.id].classTrial.chapter, 3);
    assert.equal(acceptClassTrial(s), false);
    assert.equal(
      s.inventory.filter((id) => id === trialRelicId(c.id)).length,
      1,
    );
    assert.equal(s.materials.dust, 6);
    const loaded = validateSave(JSON.parse(JSON.stringify(s)));
    assert.equal(loaded.heroes[c.id].classTrial.chapter, 3);
    assert.ok(loaded.inventory.includes(trialRelicId(c.id)));
  }
});
test("trial chapters enforce character levels and keep each hero's progress independent", () => {
  const s = freshSave();
  acceptClassTrial(s);
  settleRun(s, run(s, proof(0, { casts: 40, actives: 2 })));
  claimClassTrial(s);
  assert.equal(trialAcceptanceRestriction(s), "Requires character level 5");
  assert.equal(acceptClassTrial(s), false);
  s.heroes.mage.level = 5;
  assert.equal(acceptClassTrial(s), true);
  s.selectedClass = "warrior";
  assert.equal(acceptClassTrial(s), true);
  settleRun(s, run(s, proof(0, { casts: 12, actives: 1 })));
  assert.deepEqual(s.heroes.mage.classTrial.progress, {});
  assert.equal(s.heroes.warrior.classTrial.progress.casts, 12);
  assert.equal(s.heroes.mage.classTrial.chapter, 1);
});
test("unaccepted, old and mismatched chapter runs grant no trial credit", () => {
  const s = freshSave();
  const old = run(s, proof(0, { casts: 40, actives: 2 }));
  settleRun(s, old);
  acceptClassTrial(s);
  assert.equal(settleRun(s, old), false);
  settleRun(s, run(s));
  settleRun(s, run(s, proof(1, { casts: 40, actives: 2 })));
  assert.deepEqual(s.heroes.mage.classTrial.progress, {});
  settleRun(s, run(s, proof(0, { casts: 21 })));
  settleRun(s, run(s, proof(0, { casts: 30, actives: 2 })));
  assert.deepEqual(s.heroes.mage.classTrial.progress, {
    casts: 40,
    actives: 2,
  });
});
test("mastery and guardian objectives accumulate across different failed or partial returns", () => {
  const s = freshSave();
  s.heroes.mage.level = 10;
  s.heroes.mage.classTrial.chapter = 1;
  acceptClassTrial(s);
  settleRun(s, run(s, proof(1, { mastery: 1 })));
  assert.equal(classTrialReady(s), false);
  settleRun(s, run(s, proof(1, { elites: 1 })));
  claimClassTrial(s);
  acceptClassTrial(s);
  settleRun(s, run(s, proof(2, { evolutions: 1 })));
  assert.equal(classTrialReady(s), false);
  const r = run(s, proof(2, { bosses: 1 }));
  r.zoneId = "deadmines";
  r.dungeonBosses = 1;
  settleRun(s, r);
  assert.equal(classTrialReady(s), true);
  assert.equal(s.totals.dungeonWins, 0);
});
test("old saves start unaccepted and malformed trial/proof/enchantment fields are bounded", () => {
  const old: any = freshSave();
  delete old.enchantments;
  for (const h of Object.values(old.heroes) as any[]) delete h.classTrial;
  const migrated = validateSave(old);
  assert.deepEqual(migrated.heroes.mage.classTrial, {
    chapter: 0,
    active: false,
    progress: {},
  });
  assert.deepEqual(migrated.enchantments, {});
  const raw: any = enchanter();
  raw.heroes.mage.classTrial = {
    chapter: 0,
    active: true,
    progress: { casts: Infinity, actives: 500, mastery: 1, hacked: 100 },
  };
  raw.heroes.warrior.classTrial = {
    chapter: 200,
    active: true,
    progress: { bosses: 999 },
  };
  raw.enchantments = {
    starter_mage: "weapon_force",
    cloth: "weapon_precision",
    unknown: "chest_ward",
    plate: "__proto__",
  };
  raw.history = [
    run(raw, proof(1, { mastery: 999, actives: -4, elites: NaN })),
  ];
  const loaded = validateSave(raw);
  assert.deepEqual(loaded.heroes.mage.classTrial.progress, {
    casts: 0,
    actives: 2,
  });
  assert.deepEqual(loaded.heroes.warrior.classTrial, {
    chapter: 3,
    active: false,
    progress: {},
  });
  assert.deepEqual(loaded.enchantments, { starter_mage: "weapon_force" });
  assert.equal(loaded.history[0].classProof?.mastery, 1);
  assert.equal(loaded.history[0].classProof?.actives, 0);
});
test("real successful casts and actives produce proof for every class; blocked input does not", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    const g = engine(s);
    g.update(1 / 60);
    assert.equal(g.result().classProof?.casts, 1, c.id);
    g.player.resource = 100;
    assert.equal(g.activate(), true);
    assert.equal(g.activate(), false);
    assert.equal(g.result().classProof?.actives, 1);
    const before = g.result().classProof;
    for (const field of ["paused", "choosing", "checkpoint"] as const) {
      g[field] = true;
      g.player.activeCooldown = 0;
      assert.equal(g.activate(), false);
      g.update(1);
      g[field] = false;
    }
    assert.deepEqual(g.result().classProof, before);
  }
  const g = engine();
  g.enemies = [];
  g.update(1 / 60);
  assert.equal(g.result().classProof?.casts, 0);
});
test("rank selections and real elite/boss kills record mastery and evolution without double counting", () => {
  const s = freshSave();
  const g = engine(s, 2);
  const focus = CLASS_MAP.mage.spells[1];
  for (let rank = 0; rank < 5; rank++) {
    g.xp = 1000;
    g.choosing = true;
    g.upgrades = [
      {
        id: focus,
        type: "spell",
        name: "Blizzard",
        description: "fixture",
        icon: "snow",
        color: "#fff",
        rank: rank + 1,
      },
    ];
    assert.equal(g.chooseUpgrade(focus), true);
  }
  assert.equal(g.result().classProof?.mastery, 1);
  assert.equal(g.result().classProof?.evolutions, 1);
  g.xp = 0;
  const elite = { ...g.enemies[0], elite: true, hp: 1 };
  g.enemies = [elite];
  g.spells = [{ id: "frostbolt", rank: 1, timer: 0, orbitTimer: 0 }];
  for (let i = 0; i < 45; i++) g.update(1 / 60);
  assert.equal(g.result().classProof?.elites, 1);
  const boss = {
    ...elite,
    id: 100,
    boss: true,
    hp: 1,
    maxHp: 1,
    dead: false,
    x: 55,
  };
  g.enemies = [boss];
  g.boss = boss;
  g.spells[0].timer = 0;
  for (let i = 0; i < 45; i++) g.update(1 / 60);
  assert.equal(g.result().classProof?.bosses, 1);
  assert.equal(g.result().classProof?.elites, 1);
  assert.equal(g.ended, true);
});
test("enchantment formulas cover valid supported slots with finite costs and bonuses", () => {
  assert.equal(ENCHANTMENTS.length, 24);
  assert.equal(new Set(ENCHANTMENTS.map((e) => e.id)).size, 24);
  assert.deepEqual(
    [...new Set(ENCHANTMENTS.map((e) => e.skill))],
    [1, 50, 125, 225],
  );
  assert.ok(
    ENCHANTMENTS.every(
      (e) =>
        e.gold > 0 &&
        Object.values(e.costs).every((v) => v > 0) &&
        Object.values(e.stats).every((v) => Number.isFinite(v) && v > 0),
    ),
  );
});
test("enchantment application checks profession, ownership, class, slot, level, skill and funds atomically", () => {
  const s = freshSave(),
    weapon = "starter_mage";
  const attempt = (item: string, formula: string) => {
    const before = JSON.stringify(s);
    assert.equal(applyEnchantment(s, item, formula), false);
    assert.equal(JSON.stringify(s), before);
  };
  attempt(weapon, "weapon_force");
  learnProfession(s, "enchanting");
  attempt("missing", "weapon_force");
  attempt("starter_warrior", "weapon_force");
  attempt("cloth", "weapon_force");
  attempt(weapon, "unknown");
  attempt(weapon, "weapon_precision");
  s.inventory.push("rigging_staff");
  attempt("rigging_staff", "weapon_force");
  s.gold = 0;
  attempt(weapon, "weapon_force");
  s.gold = 100;
  s.materials.dust = 0;
  attempt(weapon, "weapon_force");
  s.materials.dust = 2;
  assert.equal(applyEnchantment(s, weapon, "weapon_force"), true);
  assert.equal(s.gold, 85);
  assert.equal(s.materials.dust, 0);
  assert.equal(s.professions.enchanting, 6);
  attempt(weapon, "weapon_force");
});
test("replacement removes old bonuses, charges once and retains equipment/set membership", () => {
  const s = enchanter(),
    id = "starter_mage",
    before = heroStats(s);
  applyEnchantment(s, id, "weapon_force");
  assert.equal(heroStats(s).power, before.power + 6);
  const gold = s.gold,
    dust = s.materials.vision_dust;
  assert.equal(applyEnchantment(s, id, "weapon_precision"), true);
  assert.equal(heroStats(s).power, before.power);
  assert.equal(heroStats(s).crit, before.crit + 5);
  assert.equal(s.gold, gold - 45);
  assert.equal(s.materials.vision_dust, dust - 5);
  assert.equal(s.heroes.mage.equipment.weapon, id);
  s.inventory.push("spellweave_chest");
  equip(s, "spellweave_chest");
  applyEnchantment(s, "spellweave_chest", "chest_ward");
  assert.equal(GEAR_MAP.spellweave_chest.set, "spellweave");
});
test("shared item enchants affect every wearing hero and survive unlearning and reload", () => {
  const s = enchanter();
  const mage = heroStats(s),
    priest = heroStats(s, "priest");
  assert.equal(applyEnchantment(s, "cloth", "chest_vitality"), true);
  assert.equal(heroStats(s).health, mage.health + 12);
  assert.equal(heroStats(s, "priest").health, priest.health + 12);
  delete s.heroes.mage.equipment.chest;
  assert.equal(heroStats(s).health, mage.health - GEAR_MAP.cloth.stats.health!);
  equip(s, "cloth");
  forgetProfession(s, "enchanting");
  const loaded = validateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.enchantments.cloth, "chest_vitality");
  assert.equal(heroStats(loaded).health, mage.health + 12);
  assert.equal(
    enchantmentRestriction(loaded, "cloth", "chest_ward"),
    "Learn Enchanting in Professions",
  );
});
test("enchanted gear comparison includes lost enchants alongside set bonuses", () => {
  const s = enchanter();
  applyEnchantment(s, "cloth", "chest_vitality");
  s.inventory.push("azure_robe");
  const current = heroStats(s),
    delta = gearComparison(s, "azure_robe");
  equip(s, "azure_robe");
  const next = heroStats(s);
  assert.equal(delta.health || 0, next.health - current.health);
  assert.equal(
    next.health - current.health,
    (GEAR_MAP.azure_robe.stats.health || 0) -
      (GEAR_MAP.cloth.stats.health || 0) -
      12,
  );
});
test("selling or disenchanting destroys an enchantment and reacquired loot starts clean", () => {
  for (const disenchant of [false, true]) {
    const s = enchanter();
    s.inventory.push("azure_robe");
    applyEnchantment(s, "azure_robe", "chest_vitality");
    assert.equal(sellGear(s, "azure_robe", disenchant), true);
    assert.equal(s.enchantments.azure_robe, undefined);
    const r = run(s);
    r.loot = ["azure_robe"];
    settleRun(s, r);
    assert.ok(s.inventory.includes("azure_robe"));
    assert.equal(s.enchantments.azure_robe, undefined);
  }
});
test("enchantment and disenchant practice respect trained caps and diminishing difficulty", () => {
  const s = enchanter();
  s.professions.enchanting = 74;
  s.training.enchanting = 1;
  assert.equal(enchantmentSkillGain(s, "weapon_force"), 1);
  applyEnchantment(s, "starter_mage", "weapon_force");
  assert.equal(s.professions.enchanting, 75);
  s.inventory.push("spellweave_head");
  sellGear(s, "spellweave_head", true);
  assert.equal(s.professions.enchanting, 75);
  s.training.enchanting = 2;
  s.inventory.push("spellweave_head");
  sellGear(s, "spellweave_head", true);
  assert.equal(s.professions.enchanting, 78);
  assert.equal(enchantmentSkillGain(s, "weapon_force"), 0);
});
test("a permanent weapon enchant increases damage in real automatic combat", () => {
  const s = enchanter();
  s.selectedClass = "warrior";
  const before = engine(s);
  assert.equal(applyEnchantment(s, "starter_warrior", "weapon_force"), true);
  const after = engine(s);
  for (const g of [before, after]) g.update(1 / 60);
  const damage = [before, after].map((g) => 100000 - g.enemies[0].hp);
  assert.ok(damage[0] > 0);
  assert.ok(damage[1] > damage[0]);
  assert.ok(Math.abs(damage[1] / damage[0] - 1.11 / 1.05) < 0.00001);
});
