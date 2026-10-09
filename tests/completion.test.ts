import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  CLASS_MAP,
  GEAR_MAP,
  RECIPES,
  SPELLS,
  ZONES,
} from "../src/content";
import { CLASSIC_TREES, classicTalentBudget } from "../src/classic-talents";
import {
  freshSave,
  changeTalentMode,
  availableTalents,
  learnTalent,
  canLearnTalent,
  validateSave,
  talentRequirement,
  heroStats,
  awardGear,
  equip,
  heroAttributes,
  heroResistances,
  craft,
  settleRun,
  acceptEpilogue,
  claimEpilogue,
  applyEnchantment,
  sellGear,
  buyOffer,
  claimClassTrial,
  claimCampaign,
  claimProfessionQuest,
} from "../src/progression";
import { itemRoll, repairItems, repairQuote } from "../src/item-progression";
import { resistanceMultiplier } from "../src/attributes";
import { GameEngine } from "../src/engine";
import type { Enemy, Hazard } from "../src/engine";
import type { ClassId, SpellDef } from "../src/content";
import type { TradeId } from "../src/training";
import {
  EPILOGUES,
  journeySnapshots,
  journeyComplete,
} from "../src/final-journey";
import { ENDGAME_GEAR } from "../src/endgame";
import { dungeonRoute } from "../src/dungeon";
import { TRIAL_CHAPTERS } from "../src/class-trials";

test("copy enchantments and disenchant cleanup never change the other owned copy", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  s.gold = 1000;
  s.professions.enchanting = 300;
  s.training.enchanting = 4;
  s.materials.dream_dust = 100;
  s.materials.mageweave_cloth = 100;
  awardGear(s, "cathedral_ring", "first");
  const copy = awardGear(s, "cathedral_ring", "second")!;
  // Rings have no permanent enchant formula: a copied cloak exercises the real slot formula.
  awardGear(s, "cathedral_cloak", "first");
  const cloak = awardGear(s, "cathedral_cloak", "second")!;
  const roll = s.itemStates[cloak].roll;
  assert.ok(applyEnchantment(s, cloak, "back_ward_4"));
  assert.equal(s.enchantments.cathedral_cloak, undefined);
  assert.equal(s.itemStates[cloak].roll, roll);
  assert.ok(sellGear(s, cloak, true));
  assert.equal(s.enchantments[cloak], undefined);
  assert.equal(s.itemStates[cloak], undefined);
  assert.ok(s.inventory.includes("cathedral_cloak"));
  assert.ok(s.inventory.includes(copy));
});

test("co-op shared equipment wears once at the greater actor wear while both personal skills advance", () => {
  const s = freshSave();
  s.heroes.warrior.level = s.heroes.rogue.level = 60;
  s.inventory.push("defias_blade");
  const g = engine("mage"),
    r = {
      ...g.result(),
      id: "shared-wear",
      classId: "warrior" as const,
      time: 120,
      gold: 0,
      xp: 0,
      loot: [],
      equipmentProof: { items: ["defias_blade"], weaponHits: { dagger: 16 } },
      party: {
        classId: "rogue" as const,
        equipmentProof: {
          items: ["defias_blade"],
          weaponHits: { dagger: 24 },
          defeated: true,
        },
      },
    };
  const warrior = s.heroes.warrior.weaponSkills.dagger!,
    rogue = s.heroes.rogue.weaponSkills.dagger!;
  assert.ok(settleRun(s, r));
  assert.equal(s.itemStates.defias_blade.condition, 84);
  assert.equal(s.heroes.warrior.weaponSkills.dagger, warrior + 2);
  assert.equal(s.heroes.rogue.weaponSkills.dagger, rogue + 3);
});

test("full satchels reject purchases and permanent reward turn-ins before spending or advancing", () => {
  const s = freshSave();
  s.gold = 10000;
  s.heroes.mage.level = 60;
  s.inventory = Array.from(
    { length: 1000 },
    (_, i) => `cathedral_ring~${i + 1}`,
  );
  s.reputation.argent = 2000;
  const trial = s.heroes.mage.classTrial;
  trial.chapter = 2;
  trial.active = true;
  trial.progress = { ...TRIAL_CHAPTERS[2].goals };
  s.campaigns.argent.chapter = 3;
  s.campaigns.argent.attempt = "full-bag";
  Object.assign(s.campaigns.argent.progress, {
    kills: 1e5,
    encounters: 1e5,
    guardians: 1e5,
    victories: 1e5,
  });
  s.professions.enchanting = 300;
  s.training.enchanting = 4;
  s.professionQuests.enchanting = {
    chapter: 3,
    attempt: "full-bag",
    progress: { gathered: 1e5, crafts: 1e5, uses: 1e5 },
  } as typeof s.professionQuests.enchanting;
  s.materials.dream_dust = 100;
  const before = structuredClone(s);
  assert.equal(buyOffer(s, "argent_token"), false);
  assert.equal(claimClassTrial(s), false);
  assert.equal(
    claimCampaign(s, "argent", {
      faction: "argent",
      chapter: 3,
      attempt: "full-bag",
    }),
    false,
  );
  assert.equal(claimProfessionQuest(s, "enchanting"), false);
  assert.deepEqual(s, before);
});

function engine(
  classId: ClassId = "mage",
  partner: boolean | ClassId = false,
  zone = "elwynn",
) {
  const s = freshSave();
  s.heroes[classId].level = 60;
  const stats = { ...heroStats(s, classId), health: 1000, crit: 0, regen: 0 };
  const g = new GameEngine({
    classId,
    stats,
    professions: {},
    characterLevel: 60,
    zone: ZONES.find((z) => z.id === zone)!,
    seed: 25,
    ...(partner
      ? {
          partner: {
            classId:
              typeof partner === "string" ? partner : ("warrior" as ClassId),
            stats: { ...stats, power: 30 },
            characterLevel: 60,
          },
        }
      : {}),
  });
  g.enemies = [];
  g.nodes = [];
  g.landmarks = [];
  g.spells = [];
  g.pets = [];
  return g;
}
function enemy(id = 900): Enemy {
  return {
    id,
    x: 100,
    y: 0,
    hp: 10000,
    maxHp: 10000,
    radius: 20,
    speed: 0,
    damage: 0,
    elite: false,
    boss: false,
    slowUntil: 0,
    slow: 1,
    frozenUntil: 0,
    flash: 0,
    attackTimer: 999,
    dead: false,
    type: "wolf",
  };
}
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) {
    g.update(1 / 60);
    if (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
  }
}
type Internals = {
  castSpell(def: SpellDef, rank: number): boolean;
  hurtPlayer(damage: number, school?: string): boolean;
  damageEnemy(e: Enemy, damage: number, source: string, crit?: boolean): void;
  castBossAttack(e: Enemy): void;
};
const internal = (g: GameEngine) => g as unknown as Internals;

test("Classic signature talents learn their named technique free and retained learning survives a reset", () => {
  const s = freshSave();
  s.selectedClass = "warrior";
  s.heroes.warrior.level = 60;
  s.gold = 0;
  changeTalentMode(s, "classic");
  const tree = CLASSIC_TREES.warrior[0],
    signature = tree.nodes.find(
      (node) => node.grantsTechnique === "mortalstrike",
    )!;
  while (!canLearnTalent(s, "warrior", signature.id)) {
    const next = tree.nodes.find(
      (node) =>
        node.id !== signature.id && canLearnTalent(s, "warrior", node.id),
    );
    assert.ok(next);
    learnTalent(s, next.id);
  }
  assert.ok(learnTalent(s, signature.id));
  assert.ok(s.heroes.warrior.spellbook.learned.includes("mortalstrike"));
  assert.equal(s.gold, 0);
  assert.ok(changeTalentMode(s, "survivor"));
  assert.ok(
    validateSave(s).heroes.warrior.spellbook.learned.includes("mortalstrike"),
  );
});
test("every guild conclusion uses a witnessed real frontier victory and pays its exact Artisan delivery once", () => {
  for (const q of EPILOGUES.filter((q) => q.trade)) {
    const s = freshSave(),
      trade = q.trade!;
    s.heroes.mage.level = 60;
    s.professionQuests[trade].chapter = 4;
    s.training[trade] = 4;
    if (["firstaid", "cooking", "fishing"].includes(trade))
      s.secondary[trade as keyof typeof s.secondary] = 225;
    else s.professions[trade as keyof typeof s.professions] = 225;
    s.materials[q.material!] = 8;
    assert.ok(acceptEpilogue(s, q.id));
    const g = new GameEngine({
      classId: "mage",
      characterLevel: 60,
      zone: ZONES.find((z) => z.id === "plaguelands")!,
      stats: { ...heroStats(s), health: 10000 },
      professions: {},
      journey: journeySnapshots(s),
      seed: 40,
    });
    g.spells = [];
    g.pets = [];
    g.nodes = [];
    g.time = g.zone.duration;
    g.update(1 / 60);
    assert.ok(g.boss);
    internal(g).damageEnemy(g.boss!, 1000000, "frostbolt", false);
    assert.ok(g.victory);
    assert.ok(settleRun(s, g.result()));
    const gold = s.gold;
    const materials = s.materials[q.material!];
    assert.ok(claimEpilogue(s, q.id));
    assert.equal(s.gold, gold + q.gold);
    assert.equal(s.materials[q.material!], materials - 6);
    assert.equal(claimEpilogue(s, q.id), false);
  }
});

test("Classic structure covers 27 trees and 432 talents, preserving Vanilla rank caps and explicit dependencies", () => {
  assert.equal(Object.values(CLASSIC_TREES).flat().length, 27);
  assert.equal(
    Object.values(CLASSIC_TREES)
      .flat()
      .flatMap((t) => t.nodes).length,
    432,
  );
  for (const c of CLASSES)
    for (const tree of CLASSIC_TREES[c.id])
      for (const node of tree.nodes) {
        assert.ok(node.max >= 1 && node.max <= 5);
        assert.equal(node.required, (node.row - 1) * 5);
        if (node.requires) {
          const parent = tree.nodes.find((n) => n.id === node.requires!.id)!;
          assert.ok(parent);
          assert.ok(node.requires.rank <= parent.max);
        }
      }
  assert.deepEqual(
    [1, 9, 10, 30, 60, 100].map(classicTalentBudget),
    [0, 0, 1, 21, 51, 51],
  );
});
test("every Classic build can legally spend 51 points and imports cannot exceed its budget or bypass dependencies", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    s.heroes[c.id].level = 60;
    assert.ok(changeTalentMode(s, "classic"));
    while (availableTalents(s.heroes[c.id]) > 0) {
      const next = CLASSIC_TREES[c.id]
        .flatMap((t) => t.nodes)
        .find((n) => canLearnTalent(s, c.id, n.id));
      assert.ok(next);
      assert.ok(learnTalent(s, next.id));
    }
    const imported = validateSave(s);
    assert.equal(availableTalents(imported.heroes[c.id]), 0);
    assert.deepEqual(imported.heroes[c.id].talents, s.heroes[c.id].talents);
    const forged = structuredClone(s);
    for (const tree of CLASSIC_TREES[c.id])
      for (const node of tree.nodes) forged.heroes[c.id].talents[node.id] = 999;
    assert.equal(availableTalents(validateSave(forged).heroes[c.id]), 0);
  }
});
test("switching paths is gated, refunds all ranks, and old saves retain compact builds", () => {
  const s = freshSave(),
    h = s.heroes.mage;
  assert.equal(changeTalentMode(s, "classic"), false);
  h.talents.mage_frost_1 = 1;
  h.level = 10;
  assert.ok(changeTalentMode(s, "classic"));
  assert.deepEqual(h.talents, {});
  assert.equal(availableTalents(h), 1);
  assert.ok(changeTalentMode(s, "survivor"));
  assert.equal(availableTalents(h), 10);
  const raw = structuredClone(s) as unknown as Record<string, unknown>;
  const heroes = raw.heroes as Record<string, Record<string, unknown>>;
  delete heroes.mage.talentMode;
  assert.equal(validateSave(raw).heroes.mage.talentMode, "survivor");
});
test("Classic prerequisite ranks are required in addition to lower-row points", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  changeTalentMode(s, "classic");
  const tree = CLASSIC_TREES.mage.find((t) => t.nodes.some((n) => n.requires))!,
    node = tree.nodes.find((n) => n.requires)!;
  for (const lower of tree.nodes.filter(
    (n) => n.row < node.row && n.id !== node.requires!.id,
  ))
    s.heroes.mage.talents[lower.id] = lower.max;
  assert.match(talentRequirement(s, "mage", node.id)!, /Requires/);
  s.heroes.mage.talents[node.requires!.id] = node.requires!.rank;
  assert.equal(talentRequirement(s, "mage", node.id), null);
});
test("duplicate rewards create independent bounded rolls and two rings can equip, repair and import independently", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  assert.equal(awardGear(s, "cathedral_ring", "first"), "cathedral_ring");
  const copy = awardGear(s, "cathedral_ring", "second")!;
  assert.equal(copy, "cathedral_ring~1");
  assert.ok(itemRoll(s, copy));
  assert.ok(equip(s, "cathedral_ring", "finger1"));
  assert.ok(equip(s, copy, "finger2"));
  const before = heroStats(s);
  s.itemStates[copy].condition = 0;
  assert.ok(heroStats(s).health < before.health);
  s.gold = 10000;
  assert.ok(repairItems(s, [copy], repairQuote(s, [copy]).gold));
  assert.equal(s.itemStates[copy].condition, 100);
  const roundtrip = validateSave(s);
  assert.deepEqual(roundtrip.itemStates[copy], s.itemStates[copy]);
  assert.deepEqual(heroStats(roundtrip), heroStats(s));
  assert.equal(GEAR_MAP["constructor"], undefined);
  assert.equal(GEAR_MAP["cathedral_ring~0"], undefined);
  assert.equal(GEAR_MAP["starter_mage~1"], undefined);
});
test("explicit copied crafts pay full costs, retain separate rolls, and reject a full satchel atomically", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  s.professions.tailoring = 300;
  s.training.tailoring = 4;
  s.gold = 10000;
  for (const key of Object.keys(s.materials))
    s.materials[key as keyof typeof s.materials] = 100;
  const r = RECIPES.find((r) => r.id === "craft_dawnward_cloth_head")!;
  assert.ok(craft(s, r.id, true));
  const gold = s.gold;
  assert.ok(craft(s, r.id, true));
  assert.equal(s.gold, gold - r.gold);
  assert.ok(s.inventory.includes(`${r.output}~1`));
  s.inventory = Array.from(
    { length: 1000 },
    (_, i) => `cathedral_ring~${i + 1}`,
  );
  const before = structuredClone(s);
  assert.equal(craft(s, r.id, true), null);
  assert.deepEqual(s, before);
});
test("attributes affect actual stats and school resistance changes damage with a 60 percent cap", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  s.inventory.push("cathedral_ring");
  const baseline = heroStats(s);
  equip(s, "cathedral_ring", "finger1");
  assert.equal(heroAttributes(s).stamina, 8);
  assert.equal(heroResistances(s).fire, 12);
  assert.ok(heroStats(s).health >= baseline.health + 24);
  assert.deepEqual(
    [-5, 20, 60, 999].map(resistanceMultiplier),
    [1, 0.8, 0.4, 0.4],
  );
  const g = new GameEngine({
    classId: "mage",
    stats: { ...baseline, armor: 0 },
    professions: {},
    zone: ZONES[0],
    resistances: { fire: 50 },
    seed: 1,
  });
  const hp = g.player.hp;
  internal(g).hurtPlayer(100, "fire");
  assert.equal(g.player.hp, hp - 50);
  g.player.invulnerable = 0;
  internal(g).hurtPlayer(100, "frost");
  assert.equal(g.player.hp, hp - 150);
});
test("support techniques need nearby enemies, cannot stack, and expire without erasing run upgrades", () => {
  const g = engine(),
    def = SPELLS.arcanepower;
  assert.equal(internal(g).castSpell(def, 1), false);
  g.enemies = [enemy()];
  g.update(1 / 60);
  assert.ok(internal(g).castSpell(def, 1));
  const increased = g.stats.power;
  g.stats.power += 12;
  assert.equal(internal(g).castSpell(def, 1), false);
  const before = g.time;
  g.paused = true;
  advance(g, 9);
  assert.equal(g.time, before);
  g.paused = false;
  advance(g, 8.1);
  assert.equal(g.stats.power, increased - 25 + 12);
  assert.equal(g.timedBuffs.arcanepower, undefined);
});
test("endgame catalog has 31 distinct items, two chained destinations and a complete four-room route", () => {
  assert.equal(ENDGAME_GEAR.length, 31);
  assert.equal(new Set(ENDGAME_GEAR.map((g) => g.id)).size, 31);
  const route = dungeonRoute("scarlet")!;
  assert.equal(route.stages.length, 4);
  assert.equal(route.prerequisite, "duskwood");
  for (const stage of route.stages)
    for (const id of stage.loot) assert.ok(GEAR_MAP[id]);
  assert.equal(
    ZONES.find((z) => z.id === "plaguelands")!.prerequisite,
    "scarlet",
  );
});
test("Whitemane revives the commander at half health and cannot fall until he is defeated", () => {
  const g = engine("mage", false, "scarlet");
  g.dungeonStageIndex = 3;
  const boss = {
    ...enemy(),
    boss: true,
    type: "dusk_mage",
    hp: 1000,
    maxHp: 1000,
  };
  g.enemies = [boss];
  g.boss = boss;
  internal(g).damageEnemy(boss, 100000, "frostbolt", false);
  assert.equal(boss.hp, 500);
  const commander = g.enemies.find((e) => e !== boss)!;
  assert.ok(commander.guard);
  internal(g).damageEnemy(boss, 100000, "frostbolt", false);
  assert.equal(boss.hp, 1);
  assert.equal(g.victory, false);
  internal(g).damageEnemy(commander, 100000, "frostbolt", false);
  g.dungeonBosses = 3;
  internal(g).damageEnemy(boss, 100000, "frostbolt", false);
  assert.ok(g.victory);
  assert.equal(g.dungeonBosses, 4);
});
test("endgame attacks publish different schools, readable warnings and finite lingering clouds", () => {
  const g = engine("mage", false, "plaguelands"),
    boss = { ...enemy(), boss: true };
  g.boss = boss;
  g.enemies = [boss];
  internal(g).castBossAttack(boss);
  assert.ok(g.hazards.every((h) => h.school === "shadow" && h.warning > 1));
  g.hazards = [];
  internal(g).castBossAttack(boss);
  assert.ok(g.hazards.every((h) => h.school === "nature" && h.linger === 5));
  advance(g, 7);
  assert.ok(g.hazards.every((h) => h.life > 0));
});
test("epilogues witness only a victory after acceptance, reject stale proof, and claim exact once-only deliveries", () => {
  const s = freshSave();
  s.heroes.mage.level = 60;
  s.campaigns.argent.chapter = 4;
  assert.ok(acceptEpilogue(s, "faction_argent"));
  const g = engine("mage", false, "plaguelands"),
    snapshot = journeySnapshots(s)[0];
  const r = {
    ...g.result(),
    id: "epilogue-run",
    victory: true,
    journeyProof: [{ ...snapshot, attempt: "stale" }],
  };
  assert.ok(settleRun(s, r));
  assert.equal(s.journey.faction_argent.complete, false);
  assert.ok(
    settleRun(s, { ...r, id: "correct-run", journeyProof: [snapshot] }),
  );
  assert.ok(claimEpilogue(s, "faction_argent"));
  const gold = s.gold;
  assert.equal(claimEpilogue(s, "faction_argent"), false);
  assert.equal(s.gold, gold);
  assert.ok(s.inventory.includes("epilogue_argent"));
  for (const q of EPILOGUES)
    s.journey[q.id] = { attempt: null, complete: false, claimed: true };
  s.clearedZones.push("scarlet", "plaguelands");
  assert.ok(journeyComplete(validateSave(s)));
});
test("local co-op moves independently, uses the second class, pauses together and keeps the party in view", () => {
  const g = engine("mage", true);
  assert.ok(g.partner);
  const p = g.partner!;
  g.setInput(-1, 0);
  g.setPartnerInput(1, 0);
  advance(g, 0.3);
  assert.ok(g.player.x < 0 && p.player.x > 90);
  const before = [g.player.x, p.player.x, g.time];
  g.paused = true;
  advance(g, 1);
  assert.deepEqual([g.player.x, p.player.x, g.time], before);
  g.paused = false;
  advance(g, 4);
  assert.ok(
    Math.hypot(g.player.x - p.player.x, g.player.y - p.player.y) <= 480.01,
  );
  assert.equal(g.classDef.id, "mage");
  assert.equal(p.classDef.id, "warrior");
});
test("downed heroes stop moving and casting, an ally revives by proximity, and both downed ends the expedition", () => {
  const g = engine("mage", true),
    p = g.partner!;
  g.player.hp = 0;
  g.player.x = p.player.x;
  g.setInput(1, 0);
  p.spells = [];
  advance(g, 2.9);
  assert.equal(g.player.hp, 0);
  assert.equal(g.ended, false);
  advance(g, 0.2);
  assert.ok(g.player.hp > 0);
  assert.equal(g.classDef.id, "mage");
  g.player.hp = 0;
  p.player.hp = 0;
  advance(g, 0.1);
  assert.ok(g.ended);
  assert.equal(g.victory, false);
});
test("secondary attacks deal real damage and settlement gives XP to both heroes with one treasure payout", () => {
  const g = engine("mage", true),
    e = enemy();
  e.x = 110;
  g.enemies = [e];
  advance(g, 1);
  assert.ok(g.damageBySpell.cleave > 0);
  assert.equal(g.classDef.id, "mage");
  const s = freshSave(),
    r = { ...g.result(), gold: 30, xp: 100, loot: ["cathedral_ring"] };
  const gold = s.gold;
  assert.ok(settleRun(s, r));
  assert.equal(s.gold, gold + 30);
  assert.ok(s.heroes.mage.xp > 0 || s.heroes.mage.level > 1);
  assert.ok(s.heroes.warrior.xp > 0 || s.heroes.warrior.level > 1);
  const once = structuredClone(s);
  assert.equal(settleRun(s, r), false);
  assert.deepEqual(s, once);
});
test("enemy projectiles and hazards hit the partner independently without damaging a distant primary", () => {
  const g = engine("mage", true),
    p = g.partner!;
  g.player.x = -250;
  p.player.x = 100;
  p.spells = [];
  const hp = p.player.hp,
    primary = g.player.hp;
  g.projectiles.push({
    x: p.player.x,
    y: p.player.y,
    vx: 0,
    vy: 0,
    damage: 20,
    radius: 5,
    color: "#fff",
    life: 1,
    pierce: 0,
    slow: 1,
    hit: new Set(),
    enemy: true,
  });
  g.update(1 / 60);
  assert.ok(p.player.hp < hp);
  assert.equal(g.player.hp, primary);
  p.player.invulnerable = 0;
  g.hazards.push({
    x: p.player.x,
    y: p.player.y,
    radius: 30,
    warning: 0.01,
    life: 1,
    damage: 20,
  } as Hazard);
  g.update(1 / 60);
  assert.ok(p.player.hp < hp - 20);
});

test("a partner's final guardian kill restores primary identity before publishing the end event", () => {
  const g = engine("mage", true, "plaguelands");
  let observed: ReturnType<GameEngine["result"]> | undefined;
  (
    g as unknown as { config: { onEvent: (event: { type: string }) => void } }
  ).config.onEvent = (event) => {
    if (event.type === "end") observed = g.result();
  };
  g.time = g.zone.duration;
  g.update(1 / 60);
  internal(g).damageEnemy(g.boss!, 1e9, "cleave", false);
  assert.ok(observed);
  assert.equal(observed.classId, "mage");
  assert.equal(observed.party?.classId, "warrior");
  assert.equal(observed.victory, true);
  assert.ok(observed.loot.includes("dawnward_plate_head"));
  assert.equal(g.classDef.id, "mage");
});

test("party separation adapts to phone dimensions and a fallen ally remains anchored", () => {
  const g = engine("mage", true),
    buddy = g.partner!;
  g.setViewport(390, 844);
  g.setInput(-1, 0);
  g.setPartnerInput(1, 0);
  advance(g, 3);
  assert.ok(
    Math.hypot(g.player.x - buddy.player.x, g.player.y - buddy.player.y) <=
      280.01,
  );
  buddy.player.hp = 0;
  const body = { x: buddy.player.x, y: buddy.player.y };
  advance(g, 3);
  assert.equal(buddy.player.x, body.x);
  assert.equal(buddy.player.y, body.y);
  assert.ok(
    Math.hypot(g.player.x - buddy.player.x, g.player.y - buddy.player.y) <=
      280.01,
  );
});
test("downed allies cannot revive through an upgrade, life steal, healing spell or a pickup when both have fallen", () => {
  const g = engine("mage", true),
    buddy = g.partner!;
  g.player.hp = 0;
  buddy.player.x = 250;
  g.choosing = true;
  g.xp = g.xpNeeded;
  g.upgrades = [
    {
      id: "stat_health",
      type: "stat",
      name: "Endurance",
      icon: "heart",
      color: "#fff",
      description: "Health",
      stat: "health",
      value: 25,
    },
  ];
  assert.ok(g.chooseUpgrade("stat_health"));
  assert.equal(g.player.hp, 0);
  const config = (
    g as unknown as {
      config: { spellBonuses: Record<string, { leech: number }> };
    }
  ).config;
  config.spellBonuses = { frostbolt: { leech: 50 } };
  internal(g).damageEnemy(enemy(), 20, "frostbolt", false);
  (
    g as unknown as { healPlayer: (amount: number, source: string) => void }
  ).healPlayer(100, "renew");
  assert.equal(g.player.hp, 0);
  buddy.player.hp = 0;
  g.pickups = [{ id: 500, x: 0, y: 0, kind: "heal", value: 100 }];
  g.update(1 / 60);
  assert.equal(g.player.hp, 0);
  assert.equal(g.ended, true);
});
test("either living player collects shared treasure and healing reaches the collecting hero", () => {
  const g = engine("mage", true),
    buddy = g.partner!;
  g.player.x = -200;
  buddy.player.x = 100;
  buddy.player.hp -= 50;
  g.pickups = [
    { id: 500, x: 100, y: 0, kind: "xp", value: 10 },
    { id: 501, x: 100, y: 0, kind: "heal", value: 20 },
    { id: 502, x: 100, y: 0, kind: "chest", value: 0, loot: "cathedral_ring" },
  ];
  g.update(1 / 60);
  assert.equal(g.xp, 10);
  assert.equal(buddy.player.hp, buddy.player.maxHp - 30);
  assert.deepEqual(g.loot, ["cathedral_ring"]);
  assert.equal(g.pickups.length, 0);
});
test("secondary orbit hits use their actual blade positions and Shaman totems unlock with their prepared slot", () => {
  const g = engine("mage", "rogue"),
    buddy = g.partner!;
  g.level = 3;
  const state = { id: "flurry", rank: 1, timer: 0, orbitTimer: 0 };
  buddy.spells = [state];
  const position = g.orbitPositions(
      state,
      buddy.player,
      buddy.config.spellBonuses,
    )[0],
    blade = { ...enemy(900), ...position },
    center = { ...enemy(901), x: buddy.player.x, y: buddy.player.y };
  g.enemies = [blade, center];
  g.update(1 / 60);
  assert.ok(blade.hp < blade.maxHp);
  assert.equal(center.hp, center.maxHp);
  const shaman = engine("mage", "shaman");
  assert.equal(shaman.partner!.pet, undefined);
  assert.deepEqual(
    shaman.partner!.spells.map((spell) => spell.id),
    ["lightning"],
  );
  shaman.level = 6;
  shaman.update(1 / 60);
  assert.equal(shaman.partner!.pet?.spellId, "totem");
  assert.ok(shaman.partner!.spells.some((spell) => spell.id === "totem"));
});
