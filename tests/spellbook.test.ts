import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, CLASS_MAP, SPELLS, ZONES } from "../src/content";
import type { ClassId, Stats } from "../src/content";
import { GameEngine } from "../src/engine";
import type { Enemy } from "../src/engine";
import {
  CLASS_TECHNIQUES,
  freshSpellbook,
  normalizeSpellbook,
  compatibleSpellBonus,
} from "../src/spellbook";
import {
  freshSave,
  validateSave,
  classTechniqueRestriction,
  trainClassTechnique,
  prepareClassSpell,
  restoreClassSpells,
  heroSpellBonuses,
} from "../src/progression";
import {
  acceptProfessionQuest,
  professionQuestSnapshots,
} from "../src/progression";

const stats: Stats = {
  health: 1000,
  power: 0,
  armor: 0,
  haste: 0,
  crit: 0,
  speed: 0,
  regen: 0,
  magnet: 0,
};
function target(id = 1000, x = 70, boss = false): Enemy {
  return {
    id,
    x,
    y: 0,
    type: "wolf",
    hp: 10000,
    maxHp: 10000,
    radius: 14,
    speed: 0,
    damage: 0,
    elite: false,
    boss,
    slowUntil: 0,
    slow: 1,
    frozenUntil: 0,
    flash: 0,
    attackTimer: 999,
    dead: false,
  };
}
function make(classId: ClassId, id?: string) {
  const c = CLASS_MAP[classId];
  const g = new GameEngine({
    classId,
    zone: ZONES[0],
    stats,
    professions: {},
    characterLevel: 21,
    spellbook: {
      learned: CLASS_TECHNIQUES.filter((t) => t.classId === classId).map(
        (t) => t.spell.id,
      ),
      prepared: [...c.spells],
    },
    seed: 123,
  });
  const e = target();
  g.enemies = [e];
  g.boss = e;
  g.nodes = [];
  g.landmarks = [];
  g.player.resource = 100;
  if (id) {
    g.spells = [{ id, rank: 1, timer: 0, orbitTimer: 0 }];
    g.pets = [];
  }
  return { g, e };
}
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60);
}
function near(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.00001,
    `${actual} expected ${expected}`,
  );
}

test("all nine classes have five complete, distinct trainer techniques and keep their original four", () => {
  assert.equal(Object.keys(SPELLS).length, 81);
  assert.equal(new Set(CLASS_TECHNIQUES.map((t) => t.spell.id)).size, 45);
  for (const c of CLASSES) {
    const choices = CLASS_TECHNIQUES.filter((t) => t.classId === c.id);
    assert.deepEqual(
      choices.map((t) => [t.level, t.gold]),
      [
        [5, 40],
        [12, 120],
        [20, 240],
        [30, 360],
        [40, 480],
      ],
    );
    assert.equal(c.spells.length, 4);
    for (const t of choices) {
      assert.ok(c.spells.includes(t.parent));
      assert.equal(SPELLS[t.spell.id], t.spell);
      assert.ok(t.spell.description && t.spell.evolution && t.spell.cost);
    }
  }
});
test("trainer transactions enforce hero, level and gold gates, charge once and leave preparation intact", () => {
  for (const t of CLASS_TECHNIQUES) {
    const s = freshSave();
    s.selectedClass = t.classId;
    const h = s.heroes[t.classId];
    const original = [...h.spellbook.prepared];
    h.level = t.level - 1;
    assert.match(classTechniqueRestriction(s, t.spell.id)!, /level/i);
    assert.equal(trainClassTechnique(s, t.spell.id), false);
    h.level = t.level;
    s.gold = t.gold - 1;
    assert.equal(trainClassTechnique(s, t.spell.id), false);
    s.gold = t.gold;
    assert.ok(trainClassTechnique(s, t.spell.id));
    assert.equal(s.gold, 0);
    assert.deepEqual(h.spellbook.prepared, original);
    assert.equal(trainClassTechnique(s, t.spell.id), false);
    assert.deepEqual(h.spellbook.learned, [t.spell.id]);
  }
  const s = freshSave();
  s.heroes.mage.level = 21;
  assert.equal(trainClassTechnique(s, "rend"), false);
  assert.equal(trainClassTechnique(s, "__proto__"), false);
  assert.equal(trainClassTechnique(s, "unknown"), false);
});
test("preparation uses only known personal abilities and protects starter and both class companions", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    s.heroes[c.id].level = 21;
    s.gold = 1000;
    const extra = CLASS_TECHNIQUES.filter((t) => t.classId === c.id);
    assert.equal(prepareClassSpell(s, c.spells[3], extra[0].spell.id), false);
    trainClassTechnique(s, extra[0].spell.id);
    assert.equal(prepareClassSpell(s, c.spells[0], extra[0].spell.id), false);
    if (["hunter", "warlock"].includes(c.id))
      assert.equal(prepareClassSpell(s, c.spells[2], extra[0].spell.id), false);
    assert.ok(prepareClassSpell(s, c.spells[3], extra[0].spell.id));
    assert.equal(prepareClassSpell(s, c.spells[1], extra[0].spell.id), false);
    assert.equal(prepareClassSpell(s, c.spells[1], "frostnova"), false);
    assert.equal(s.heroes[c.id].spellbook.prepared.length, 4);
    assert.ok(restoreClassSpells(s));
    assert.equal(restoreClassSpells(s), false);
    assert.deepEqual(s.heroes[c.id].spellbook.prepared, c.spells);
    assert.deepEqual(s.heroes[c.id].spellbook.learned, [extra[0].spell.id]);
  }
});
test("old saves migrate without losing gear, talents, gold, professions or achievements", () => {
  const s = freshSave();
  s.gold = 4321;
  s.heroes.mage.level = 12;
  s.heroes.mage.talents[CLASS_MAP.mage.trees[0].nodes[0].id] = 2;
  s.professions.mining = 50;
  s.totals.kills = 999;
  const raw = JSON.parse(JSON.stringify(s));
  for (const h of Object.values(raw.heroes) as Record<string, unknown>[])
    delete h.spellbook;
  const migrated = validateSave(raw)!;
  assert.equal(migrated.gold, 4321);
  assert.equal(migrated.totals.kills, 999);
  assert.equal(migrated.professions.mining, 50);
  assert.deepEqual(migrated.heroes.mage.talents, s.heroes.mage.talents);
  assert.deepEqual(migrated.heroes.mage.equipment, s.heroes.mage.equipment);
  for (const c of CLASSES)
    assert.deepEqual(migrated.heroes[c.id].spellbook, freshSpellbook(c.spells));
});
test("malformed imports repair unknown, foreign, duplicate, missing, oversized and under-level entries", () => {
  const c = CLASS_MAP.mage,
    raw = {
      learned: [
        "frostnova",
        "flamestrike",
        "rend",
        "frostnova",
        "constructor",
        5,
      ],
      prepared: [
        "rend",
        "frostnova",
        "frostnova",
        "flamestrike",
        "arcane",
        "fireball",
      ],
    };
  const at5 = normalizeSpellbook("mage", 5, raw, c.spells);
  assert.deepEqual(at5.learned, ["frostnova"]);
  assert.deepEqual(at5.prepared, [
    "frostbolt",
    "frostnova",
    "arcane",
    "fireball",
  ]);
  for (const malformed of [
    null,
    [],
    true,
    { learned: "rend", prepared: {} },
    {
      learned: Array(100000).fill("unknown"),
      prepared: Array(100000).fill("unknown"),
    },
  ])
    assert.deepEqual(
      normalizeSpellbook("mage", 21, malformed, c.spells),
      freshSpellbook(c.spells),
    );
  for (const id of ["hunter", "warlock"] as const) {
    const c = CLASS_MAP[id],
      t = CLASS_TECHNIQUES.filter((t) => t.classId === id).map(
        (t) => t.spell.id,
      );
    const result = normalizeSpellbook(
      id,
      21,
      { learned: t, prepared: [...t, c.spells[1], c.spells[3]] },
      c.spells,
    );
    assert.equal(result.prepared.length, 4);
    assert.ok(
      result.prepared.includes(c.spells[0]) &&
        result.prepared.includes(c.spells[2]),
    );
  }
});
test("run preparation is an immutable snapshot; upgrades cannot learn unprepared or foreign spells", () => {
  const book = {
    learned: ["frostnova", "flamestrike"],
    prepared: ["frostbolt", "fireball", "frostnova", "flamestrike"],
  };
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats,
    professions: {},
    characterLevel: 12,
    spellbook: book,
    seed: 42,
  });
  book.prepared[2] = "arcane";
  book.learned = [];
  assert.ok(Object.isFrozen(g.preparedSpells));
  assert.ok(g.preparedSpells.includes("frostnova"));
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++)
    for (const u of g.generateUpgrades())
      if (u.type === "spell") {
        assert.ok(g.preparedSpells.includes(u.id));
        seen.add(u.id);
      }
  assert.deepEqual([...seen].sort(), [...g.preparedSpells].sort());
  g.choosing = true;
  g.xp = 100;
  g.upgrades = [
    {
      id: "rend",
      type: "spell",
      name: "Forged",
      description: "",
      icon: "drop",
      color: "red",
    },
  ];
  assert.equal(g.chooseUpgrade("rend"), false);
  assert.equal(g.xp, 100);
  assert.equal(g.level, 1);
});
test("engine default and under-level spellbooks retain the original four and starting pets", () => {
  for (const c of CLASSES) {
    const g = new GameEngine({
      classId: c.id,
      zone: ZONES[0],
      stats,
      professions: {},
      characterLevel: 1,
      spellbook: {
        learned: CLASS_TECHNIQUES.map((t) => t.spell.id),
        prepared: CLASS_TECHNIQUES.map((t) => t.spell.id),
      },
      seed: 1,
    });
    assert.deepEqual(g.preparedSpells, c.spells);
    assert.equal(g.spells[0].id, c.spells[0]);
    assert.equal(g.pets.length, ["hunter", "warlock"].includes(c.id) ? 1 : 0);
  }
});
test("every trainer ability deals real damage or healing at ranks one and five", () => {
  for (const t of CLASS_TECHNIQUES.filter((t) => t.spell.kind !== "buff"))
    for (const rank of [1, 5]) {
      const { g, e } = make(t.classId, t.spell.id);
      g.spells[0].rank = rank;
      g.player.hp = 100;
      if (t.spell.executeBelow) e.hp = e.maxHp * 0.2;
      advance(g, 3);
      const amount =
        t.spell.kind === "heal"
          ? g.healingBySpell[t.spell.id]
          : g.damageBySpell[t.spell.id];
      assert.ok(amount > 0, `${t.spell.name} rank ${rank}`);
      assert.ok(Number.isFinite(g.player.hp) && g.player.hp <= g.player.maxHp);
      assert.ok(g.projectiles.length <= 500 && g.areas.length <= 30);
    }
});
test("periodic damage ticks the exact finite amount, never crits, and waits one interval before damage", () => {
  for (const t of CLASS_TECHNIQUES.filter(
    (t) => t.spell.kind === "dot" && !t.spell.impact && !t.spell.periodic!.ramp,
  )) {
    const { g, e } = make(t.classId, t.spell.id);
    g.stats.crit = 100;
    g.update(1 / 60);
    assert.equal(e.hp, e.maxHp);
    assert.equal(g.player.resource, 100 - t.spell.cost!);
    g.spells[0].timer = 100;
    advance(g, t.spell.periodic!.ticks * t.spell.periodic!.interval + 0.1);
    near(g.damageBySpell[t.spell.id], t.spell.damage * t.spell.periodic!.ticks);
    assert.equal(e.dots?.[t.spell.id], undefined);
  }
});
test("periodic casts spread to unmarked targets, never refresh active effects, and spend nothing without a target", () => {
  const { g, e } = make("hunter", "serpentsting"),
    other = target(1001, 100);
  g.enemies.push(other);
  g.update(1 / 60);
  const first = e.dots!.serpentsting;
  g.spells[0].timer = 0;
  g.update(1 / 60);
  assert.equal(e.dots!.serpentsting, first);
  assert.ok(other.dots!.serpentsting);
  g.player.resource = 100;
  g.spells[0].timer = 0;
  g.update(1 / 60);
  assert.equal(g.player.resource, 100);
  assert.equal(first.ticksLeft, 4);
});
test("Curse of Agony grows later ticks by 50 percent without stacking", () => {
  const { g } = make("warlock", "agony");
  g.update(1 / 60);
  g.spells[0].timer = 100;
  advance(g, 2.05);
  near(g.damageBySpell.agony, 9);
  advance(g, 10);
  near(g.damageBySpell.agony, 9 * (1 + 1.1 + 1.2 + 1.3 + 1.4 + 1.5));
  assert.equal(g.enemies[0].dots?.agony, undefined);
});
test("Holy Fire and Flame Shock apply impact immediately and preserve noncritical periodic ticks", () => {
  for (const id of ["holyfire", "flameshock"]) {
    const t = CLASS_TECHNIQUES.find((t) => t.spell.id === id)!;
    const { g } = make(t.classId, id);
    g.stats.crit = 100;
    g.update(1 / 60);
    const impact = g.damageBySpell[id];
    assert.ok(impact >= t.spell.damage * t.spell.impact!);
    g.spells[0].timer = 100;
    advance(g, t.spell.periodic!.ticks * t.spell.periodic!.interval + 0.1);
    near(
      g.damageBySpell[id] - impact,
      t.spell.damage * t.spell.periodic!.ticks,
    );
  }
});
test("healing techniques work without enemies, clamp overhealing, and wait at full health", () => {
  for (const t of CLASS_TECHNIQUES.filter((t) => t.spell.kind === "heal")) {
    const { g } = make(t.classId, t.spell.id);
    g.enemies = [];
    g.player.hp = g.player.maxHp;
    g.update(1 / 60);
    assert.equal(g.player.resource, 100);
    assert.equal(g.totalHealing, 0);
    g.player.hp -= 2;
    g.spells[0].timer = 0;
    g.update(1 / 60);
    g.spells[0].timer = 100;
    advance(
      g,
      Math.max(
        9,
        (t.spell.periodic?.ticks || 0) * (t.spell.periodic?.interval || 0) +
          0.1,
      ),
    );
    assert.equal(g.player.hp, g.player.maxHp);
    near(g.totalHealing, 2);
    assert.deepEqual(g.professionProof, []);
    assert.equal(Object.keys(g.healingEffects).length, 0);
  }
});
test("Renew and Rejuvenation pulse a finite amount, cannot stack or critically heal, and consume no supplies", () => {
  for (const id of ["renew", "rejuvenation"]) {
    const t = CLASS_TECHNIQUES.find((t) => t.spell.id === id)!;
    let consumed = 0;
    const { g } = make(t.classId, id);
    g.stats.crit = 100;
    g.player.hp = 100;
    g.update(1 / 60);
    const effect = g.healingEffects[id];
    assert.equal(g.player.hp, 100);
    g.spells[0].timer = 0;
    g.player.resource = 100;
    g.update(1 / 60);
    assert.equal(g.player.resource, 100);
    assert.equal(g.healingEffects[id], effect);
    g.spells[0].timer = 100;
    advance(g, 9);
    near(g.totalHealing, t.spell.damage * t.spell.periodic!.ticks);
    assert.equal(g.healingEffects[id], undefined);
    const isolated = new GameEngine({
      classId: t.classId,
      zone: ZONES[0],
      stats,
      professions: {},
      onConsume: () => {
        consumed++;
        return true;
      },
      seed: 1,
    });
    isolated.spells = [{ id, rank: 1, timer: 0, orbitTimer: 0 }];
    isolated.player.hp = 100;
    advance(isolated, 3);
    assert.equal(consumed, 0);
  }
});
test("Holy Light can critically heal and power, rank and resource talents modify healing", () => {
  const { g } = make("paladin", "holylight");
  g.player.hp = 100;
  g.stats.crit = 100;
  g.rng.next = () => 0;
  g.update(1 / 60);
  near(g.totalHealing, 21);
  const strong = new GameEngine({
    classId: "paladin",
    zone: ZONES[0],
    stats: { ...stats, power: 50 },
    spellBonuses: { holylight: { power: 20, costReduction: 50 } },
    professions: {},
    seed: 1,
  });
  strong.enemies = [];
  strong.spells = [{ id: "holylight", rank: 5, timer: 0, orbitTimer: 0 }];
  strong.player.hp = 100;
  strong.update(1 / 60);
  near(strong.totalHealing, 14 * 1.5 * 1.2 * 2.2 * 1.45);
  near(strong.player.resource, 91);
});
test("insufficient resource cannot apply, heal, root or damage with a new technique", () => {
  for (const t of CLASS_TECHNIQUES) {
    const { g, e } = make(t.classId, t.spell.id);
    g.player.resource = 0;
    g.player.hp = 100;
    e.hp = 1900;
    g.update(1 / 60);
    assert.equal(g.totalDamage, 0, t.spell.id);
    assert.equal(g.totalHealing, 0);
    assert.equal(Object.keys(e.dots || {}).length, 0);
    assert.equal(g.areas.length, 0);
    assert.equal(g.projectiles.length, 0);
    assert.equal(e.frozenUntil, 0);
  }
});
test("Heroic Strike and Eviscerate hit exactly one nearby enemy", () => {
  for (const id of ["heroicstrike", "eviscerate"]) {
    const t = CLASS_TECHNIQUES.find((t) => t.spell.id === id)!;
    const { g, e } = make(t.classId, id),
      other = target(1001, 85);
    g.enemies.push(other);
    g.spells[0].rank = 5;
    g.update(1 / 60);
    assert.ok(e.hp < e.maxHp);
    assert.equal(other.hp, other.maxHp);
  }
});
test("Frost Nova roots ordinary enemies but only slows bosses", () => {
  const { g, e } = make("mage", "frostnova"),
    boss = target(1001, 100, true);
  g.enemies.push(boss);
  g.update(1 / 60);
  near(e.frozenUntil, g.time + 1.2);
  assert.equal(boss.frozenUntil, 0);
  assert.equal(boss.slow, 0.6);
  assert.ok(boss.slowUntil > g.time);
  assert.ok(g.damageBySpell.frostnova > 0);
});
test("Hammer of Wrath spends resource and launches only at the twenty percent health threshold", () => {
  const { g, e } = make("paladin", "hammerwrath");
  e.hp = 2001;
  g.update(1 / 60);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.player.resource, 100);
  e.hp = 2000;
  g.spells[0].timer = 0;
  g.update(1 / 60);
  assert.equal(g.projectiles.length, 1);
  near(g.player.resource, 84);
  advance(g, 0.3);
  assert.ok(g.damageBySpell.hammerwrath > 0);
});
test("Flamestrike has an initial impact plus its ground patch; Volley damages through its area", () => {
  const { g } = make("mage", "flamestrike");
  g.update(1 / 60);
  assert.equal(g.areas.length, 1);
  assert.ok(g.damageBySpell.flamestrike >= 28 * 0.7);
  const before = g.damageBySpell.flamestrike;
  advance(g, 1);
  assert.ok(g.damageBySpell.flamestrike > before);
  const volley = make("hunter", "volley");
  advance(volley.g, 1);
  assert.ok(volley.g.damageBySpell.volley > 0);
});
test("periodic clocks freeze in all pause and decision states, resume once, and are discarded on finish", () => {
  const { g, e } = make("priest", "holyfire");
  g.spells.push({ id: "renew", rank: 1, timer: 0, orbitTimer: 0 });
  g.player.hp = 100;
  g.update(1 / 60);
  g.spells.forEach((s) => (s.timer = 100));
  const before = JSON.stringify([
    e.dots,
    g.healingEffects,
    g.totalHealing,
    g.totalDamage,
    g.time,
  ]);
  for (const mode of ["paused", "choosing", "checkpoint"] as const) {
    g[mode] = true;
    advance(g, 3);
    assert.equal(
      JSON.stringify([
        e.dots,
        g.healingEffects,
        g.totalHealing,
        g.totalDamage,
        g.time,
      ]),
      before,
    );
    g[mode] = false;
  }
  g.shrineChoice = { id: "test" } as typeof g.shrineChoice;
  advance(g, 3);
  assert.equal(
    JSON.stringify([
      e.dots,
      g.healingEffects,
      g.totalHealing,
      g.totalDamage,
      g.time,
    ]),
    before,
  );
  g.shrineChoice = null;
  advance(g, 2.1);
  assert.ok(g.totalHealing > 0 && g.totalDamage > 18);
  g.finish(false);
  assert.deepEqual(g.healingEffects, {});
  assert.equal(e.dots, undefined);
});
test("periodic damage can kill a target, credit its spell and apply once without harming a removed target", () => {
  const { g, e } = make("hunter", "serpentsting");
  e.hp = 5;
  g.update(1 / 60);
  g.spells[0].timer = 100;
  advance(g, 2.1);
  assert.equal(g.kills, 1);
  near(g.damageBySpell.serpentsting, 5);
  assert.equal(g.enemies.includes(e), false);
  const before = g.totalDamage;
  advance(g, 5);
  assert.equal(g.totalDamage, before);
});
test("trainer techniques inherit only supported named talent bonuses", () => {
  for (const c of CLASSES) {
    const s = freshSave();
    s.selectedClass = c.id;
    s.heroes[c.id].level = 21;
    for (const tree of c.trees)
      for (const n of tree.nodes) s.heroes[c.id].talents[n.id] = n.max;
    const bonuses = heroSpellBonuses(s);
    for (const t of CLASS_TECHNIQUES.filter((t) => t.classId === c.id)) {
      const parent = bonuses[t.parent] || {};
      for (const [key, value] of Object.entries(parent)) {
        if (compatibleSpellBonus(t.spell, key as keyof typeof parent))
          assert.equal(bonuses[t.spell.id]?.[key], value);
        else assert.equal(bonuses[t.spell.id]?.[key], undefined);
      }
    }
  }
  assert.equal(compatibleSpellBonus(SPELLS.renew, "crit"), false);
  assert.equal(compatibleSpellBonus(SPELLS.renew, "leech"), false);
  assert.equal(compatibleSpellBonus(SPELLS.holyfire, "crit"), true);
  assert.equal(compatibleSpellBonus(SPELLS.rend, "area"), false);
  assert.equal(compatibleSpellBonus(SPELLS.heroicstrike, "area"), false);
});
test("existing damage and healing ticks finish during mounted travel while new casts wait", () => {
  const g = new GameEngine({
    classId: "priest",
    zone: ZONES[0],
    stats,
    professions: {},
    travelId: "horse",
    seed: 1,
  });
  const e = target(1000, 400);
  g.enemies = [e];
  g.nodes = [];
  g.landmarks = [];
  g.spells = [
    { id: "holyfire", rank: 1, timer: 0, orbitTimer: 0 },
    { id: "renew", rank: 1, timer: 0, orbitTimer: 0 },
  ];
  g.player.hp = 100;
  g.update(1 / 60);
  assert.ok(g.toggleTravel());
  advance(g, 1.4);
  assert.ok(g.travelling);
  const damage = g.totalDamage,
    healing = g.totalHealing;
  g.spells.forEach((s) => (s.timer = 0));
  advance(g, 0.8);
  assert.ok(g.totalDamage > damage && g.totalHealing > healing);
  assert.ok(g.spells.every((s) => s.timer === 0));
  assert.ok(g.travelling);
});
test("a periodic guardian kill reaches real recovery and the next arena discards target effects", () => {
  const g = new GameEngine({
    classId: "warlock",
    zone: ZONES.find((z) => z.id === "deadmines")!,
    stats,
    professions: {},
    seed: 1,
  });
  const e = target(1000, 70, true);
  e.hp = 8;
  g.enemies = [e];
  g.boss = e;
  g.nodes = [];
  g.spells = [{ id: "agony", rank: 1, timer: 0, orbitTimer: 0 }];
  g.pets = [];
  g.update(1 / 60);
  advance(g, 2.1);
  assert.ok(g.checkpoint);
  assert.equal(g.dungeonBosses, 1);
  assert.equal(e.dots, undefined);
  const damage = g.totalDamage;
  advance(g, 5);
  assert.equal(g.totalDamage, damage);
  assert.ok(g.continueDungeon("guard"));
  assert.equal(g.dungeonStageIndex, 1);
  assert.ok(g.enemies.every((e) => !e.dots));
  assert.equal(g.spells[0].id, "agony");
});
test("class healing produces no profession supply-use credit or consumption", () => {
  const s = freshSave();
  s.selectedClass = "paladin";
  acceptProfessionQuest(s, "firstaid");
  let consumed = 0;
  const g = new GameEngine({
    classId: "paladin",
    zone: ZONES[0],
    stats,
    professions: {},
    professionQuests: professionQuestSnapshots(s),
    onConsume: () => {
      consumed++;
      return true;
    },
    seed: 1,
  });
  g.enemies = [];
  g.spells = [{ id: "holylight", rank: 1, timer: 0, orbitTimer: 0 }];
  g.player.hp = 100;
  advance(g, 1);
  assert.ok(g.totalHealing > 0);
  assert.equal(consumed, 0);
  assert.equal(
    g.result().professionProof?.find((p) => p.trade === "firstaid")?.uses,
    0,
  );
});
test("trainer rank-five upgrades evolve once and do not replace the core ability required by mastery trials", () => {
  for (const t of CLASS_TECHNIQUES) {
    const c = CLASS_MAP[t.classId],
      book = { learned: [t.spell.id], prepared: [...c.spells] };
    book.prepared[1] = t.spell.id;
    const g = new GameEngine({
      classId: c.id,
      zone: ZONES[0],
      stats,
      professions: {},
      characterLevel: Math.max(21, t.level),
      spellbook: book,
      trialChapter: 1,
      seed: 1,
    });
    g.spells = g.preparedSpells.map((id) => ({
      id,
      rank: id === t.spell.id ? 4 : 5,
      timer: 100,
      orbitTimer: 100,
    }));
    g.upgrades = g.generateUpgrades();
    g.choosing = true;
    g.xp = 14;
    const choice = g.upgrades.find((u) => u.id === t.spell.id)!;
    assert.ok(choice?.evolution);
    assert.equal(choice.name, t.spell.evolution);
    assert.ok(g.chooseUpgrade(t.spell.id));
    assert.equal(g.spells.find((s) => s.id === t.spell.id)!.rank, 5);
    assert.equal(g.chooseUpgrade(t.spell.id), false);
    assert.equal(g.result().classProof!.mastery, 0);
    assert.equal(g.result().classProof!.evolutions, 1);
    assert.equal(g.spells.length, 4);
  }
});
