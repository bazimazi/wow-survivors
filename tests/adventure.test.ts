import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import type { Enemy, EngineConfig } from "../src/engine";
import { ZONES, CLASSES } from "../src/content";
import {
  freshSave,
  validateSave,
  heroStats,
  settleRun,
} from "../src/progression";
import {
  freshAdventure,
  adventureStats,
  claimMilestone,
  relicUnlocked,
  KEYSTONES,
  CONTRACTS,
  OATHS,
  nextChapter,
} from "../src/adventure";

function make(extra: Partial<EngineConfig> = {}) {
  return new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    seed: 42,
    adventure: { difficulty: "adventurer", oath: "balanced", relic: "" },
    ...extra,
  });
}
function foe(g: GameEngine, hp = 100, x = 10, y = 0): Enemy {
  const enemy = {
    ...g.enemies[0],
    id: g.enemies.length + 100,
    hp,
    maxHp: hp,
    x,
    y,
    elite: false,
    boss: false,
    dead: false,
  };
  g.enemies.push(enemy);
  return enemy;
}
function hit(g: GameEngine, enemy: Enemy, damage: number, crit = false) {
  (g as any).damageEnemy(enemy, damage, "test_hit", crit);
}
function hurt(g: GameEngine, damage: number) {
  g.player.invulnerable = 0;
  return (g as any).hurtPlayer(damage);
}

test("legacy saves get neutral adventure defaults and preserve character builds", () => {
  const s = freshSave(),
    before = CLASSES.map((c) => heroStats(s, c.id));
  delete (s as any).adventure;
  delete (s.settings as any).largeText;
  delete (s.settings as any).highContrast;
  const repaired = validateSave(s);
  assert.deepEqual(repaired.adventure, freshAdventure());
  assert.deepEqual(
    CLASSES.map((c) => heroStats(repaired, c.id)),
    before,
  );
  assert.equal(repaired.settings.largeText, false);
});
test("malformed adventure values, duplicate claims, locked relics and proofs are repaired", () => {
  const s = freshSave() as any;
  s.adventure = {
    difficulty: "__proto__",
    oath: "cheat",
    relic: "aegis",
    contracts: NaN,
    bestStreak: -5,
    claimed: ["hunter", "hunter", "fake"],
  };
  const p = validateSave(s).adventure;
  assert.deepEqual(p, { ...freshAdventure(), claimed: ["hunter"] });
  s.settings.largeText = "true";
  s.settings.highContrast = true;
  assert.equal(validateSave(s).settings.largeText, false);
  assert.equal(validateSave(s).settings.highContrast, true);
});
test("oaths apply exact trade-offs on a copy and protect minimum health and armor", () => {
  for (const c of CLASSES)
    for (const oath of OATHS) {
      const base = heroStats(freshSave(), c.id),
        before = { ...base },
        stats = adventureStats(base, oath.id, "");
      assert.deepEqual(base, before);
      assert.ok(stats.health >= 35);
      assert.ok(stats.armor >= 0);
    }
  const base = heroStats(freshSave());
  assert.equal(
    make({
      adventure: { difficulty: "adventurer", oath: "spellbinder", relic: "" },
    }).player.maxHp,
    base.health - 20,
  );
});
test("difficulty changes actual enemy health and incoming damage; heroic pays an explicit premium", () => {
  const normal = make(),
    easy = make({
      adventure: { difficulty: "explorer", oath: "balanced", relic: "" },
    }),
    hard = make({
      adventure: { difficulty: "heroic", oath: "balanced", relic: "" },
    });
  assert.equal(easy.enemies[0].maxHp, normal.enemies[0].maxHp * 0.85);
  assert.equal(hard.enemies[0].maxHp, normal.enemies[0].maxHp * 1.2);
  const start = normal.player.hp;
  hurt(normal, 10);
  hurt(easy, 10);
  hurt(hard, 10);
  const taken = start - normal.player.hp;
  assert.ok(Math.abs(start - easy.player.hp - taken * 0.7) < 0.00001);
  assert.ok(Math.abs(start - hard.player.hp - taken * 1.3) < 0.00001);
  for (const g of [normal, easy, hard]) {
    g.time = 80;
    g.kills = 10;
  }
  assert.equal(easy.result().gold, normal.result().gold);
  assert.equal(hard.result().gold, Math.floor(normal.result().gold * 1.25));
});
test("keystone turning points produce unique choices and advance exactly one run level", () => {
  const g = make();
  for (const level of [3, 7, 11]) {
    g.level = level;
    g.xp = g.xpNeeded;
    g.update(1 / 60);
    assert.equal(g.choosing, true);
    assert.equal(g.upgrades.length, 3);
    assert.ok(g.upgrades.every((u) => u.type === "keystone"));
    assert.equal(new Set(g.upgrades.map((u) => u.id)).size, 3);
    assert.ok(g.upgrades.every((u) => !g.keystones.includes(u.id as any)));
    const id = g.upgrades[0].id;
    assert.equal(g.chooseUpgrade(id), true);
    assert.equal(g.level, level + 1);
    assert.equal(g.chooseUpgrade(id), false);
  }
  assert.equal(g.keystones.length, 3);
  assert.ok(
    make({ adventure: undefined })
      .generateUpgrades()
      .every((u) => u.type !== "keystone"),
  );
});
test("rerolls spend only the run allowance, leave XP untouched and require a paused choice", () => {
  const g = make();
  assert.equal(g.rerollUpgrades(), false);
  g.xp = g.xpNeeded;
  g.update(1 / 60);
  const before = [g.time, g.xp, g.level];
  assert.equal(g.rerollUpgrades(), true);
  assert.equal(g.rerolls, 1);
  assert.equal(g.rerollUpgrades(), true);
  assert.equal(g.rerolls, 0);
  assert.equal(g.rerollUpgrades(), false);
  assert.deepEqual([g.time, g.xp, g.level], before);
});
test("momentum boosts damage in capped tiers, expires on simulation time and breaks on health damage", () => {
  const g = make();
  for (let i = 0; i < 30; i++) hit(g, foe(g, 1), 2);
  assert.equal(g.streak, 30);
  assert.equal(g.peakStreak, 30);
  const target = foe(g, 100);
  hit(g, target, 10);
  assert.equal(target.hp, 88.5);
  g.paused = true;
  g.update(0.05);
  assert.equal(g.streakTimer, 5);
  g.paused = false;
  g.enemies = [];
  g.spells = [];
  (g as any).spawnTimer = 1e6;
  g.xpNeeded = 1e6;
  for (let i = 0; i < 101; i++) g.update(0.05);
  assert.equal(g.streak, 0);
  hit(g, foe(g, 1), 2);
  g.player.shield = 100;
  hurt(g, 10);
  assert.equal(g.streak, 1);
  g.player.shield = 0;
  hurt(g, 10);
  assert.equal(g.streak, 0);
});
test("Storm Conduit arcs to two targets with exact secondary damage and no recursive criticals", () => {
  const g = make();
  g.enemies = [];
  g.keystones = ["storm"];
  g.stats.crit = 80;
  g.rng.next = () => 0;
  // Keep a creature template before clearing in a separate engine.
  g.enemies.push(make().enemies[0]);
  const main = foe(g, 100, 10),
    a = foe(g, 100, 40),
    b = foe(g, 100, 60),
    distant = foe(g, 100, 400);
  hit(g, main, 10, true);
  assert.equal(main.hp, 82);
  assert.equal(a.hp, 91.9);
  assert.equal(b.hp, 91.9);
  assert.equal(distant.hp, 100);
  hit(g, main, 10, true);
  assert.equal(a.hp, 91.9);
  assert.equal(g.effects.filter((e) => e.kind === "line").length, 2);
});
test("Crimson Harvest sustains only every fifth defeat and never heals beyond maximum", () => {
  const g = make();
  g.keystones = ["blood"];
  g.player.hp = 40;
  for (let i = 0; i < 4; i++) hit(g, foe(g, 1), 2);
  assert.equal(g.player.hp, 40);
  hit(g, foe(g, 1), 2);
  assert.equal(g.player.hp, 44);
});
test("Tempest Step deals real area damage and combines with Feather without bypassing cooldown", () => {
  const g = make({
    adventure: { difficulty: "adventurer", oath: "balanced", relic: "wind" },
  });
  g.keystones = ["windstep"];
  const target = foe(g, 100, 40),
    far = foe(g, 100, 500);
  g.setInput(1, 0);
  assert.equal(g.dash(), true);
  assert.equal(g.player.dashCooldown, 2);
  assert.ok(target.hp < 100);
  assert.equal(far.hp, 100);
  assert.equal(g.dash(), false);
  assert.equal(g.dashCount, 1);
});
test("Gravity Well pulls experience only and executioner rewards finishing low-health foes", () => {
  const g = make();
  g.keystones = ["gravity", "executioner"];
  g.pickups = [
    { x: 700, y: 600, kind: "xp", value: 2 },
    { x: 800, y: 700, kind: "gold", value: 1 },
  ];
  for (let i = 0; i < 10; i++) hit(g, foe(g, 1), 2);
  assert.ok(Math.hypot(g.pickups[0].x, g.pickups[0].y) < 40);
  assert.equal(g.pickups[1].x, 800);
  g.streak = 0;
  const target = foe(g, 100);
  target.hp = 25;
  hit(g, target, 10);
  assert.equal(target.hp, 11.5);
});
test("Second Wind prevents one lethal hit per hero and does not grant infinite rescue", () => {
  const g = make();
  g.keystones = ["reserve"];
  g.player.hp = 1;
  hurt(g, 1000);
  assert.equal(g.player.hp, g.player.maxHp * 0.35);
  assert.equal(g.player.invulnerable, 2);
  assert.ok(g.effects.some((e) => e.kind === "ring"));
  hurt(g, 1000);
  assert.ok(g.player.hp <= 0);
});
test("co-op applies one oath to each hero and reserves a separate Second Wind rescue", () => {
  const base = heroStats(freshSave(), "warrior");
  const g = make({
    adventure: { difficulty: "adventurer", oath: "vanguard", relic: "aegis" },
    partner: { classId: "warrior", stats: base, characterLevel: 1 },
  });
  assert.equal(g.partner!.player.maxHp, base.health + 25);
  assert.equal(g.partner!.stats.armor, base.armor + 4);
  assert.equal(g.partner!.player.shield, 30);
  assert.equal(base.health, heroStats(freshSave(), "warrior").health);
  g.keystones = ["reserve"];
  g.player.shield = 0;
  g.player.hp = 1;
  hurt(g, 1000);
  (g as any).withPartner(() => {
    g.player.shield = 0;
    g.player.hp = 1;
    hurt(g, 1000);
  });
  assert.equal(g.player.hp, g.player.maxHp * 0.35);
  assert.equal(g.partner!.player.hp, g.partner!.player.maxHp * 0.35);
  (g as any).withPartner(() => hurt(g, 1000));
  assert.ok(g.partner!.player.hp <= 0);
  assert.ok(g.player.hp > 0);
});
test("contracts settle partial expeditions once, include rewards once and persist mastery", () => {
  const g = make();
  g.kills = 60;
  g.adventureActives = 4;
  const r = g.result(),
    s = freshSave();
  assert.deepEqual(r.adventure?.contracts, ["hunt", "ability"]);
  assert.equal(r.gold, 40);
  assert.equal(r.xp, 90 + 80);
  assert.deepEqual(g.result().adventure, r.adventure);
  assert.equal(g.result().gold, r.gold);
  assert.equal(g.result().xp, r.xp);
  assert.equal(settleRun(s, r), true);
  assert.equal(s.adventure.contracts, 2);
  assert.equal(settleRun(s, r), false);
  assert.equal(s.adventure.contracts, 2);
  const loaded = validateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.adventure.contracts, 2);
  assert.deepEqual(loaded.history[0].adventure?.contracts, ["hunt", "ability"]);
});
test("milestone claims are atomic and relic access depends on earned progress", () => {
  const s = freshSave(),
    gold = s.gold;
  assert.equal(claimMilestone(s, "first_return"), false);
  assert.equal(relicUnlocked(s, "compass"), false);
  s.totals.runs = 1;
  assert.equal(relicUnlocked(s, "compass"), true);
  assert.equal(claimMilestone(s, "first_return"), true);
  assert.equal(s.gold, gold + 35);
  assert.equal(claimMilestone(s, "first_return"), false);
  assert.equal(claimMilestone(s, "__proto__"), false);
  s.adventure.relic = "compass";
  assert.equal(validateSave(s).adventure.relic, "compass");
  assert.equal(nextChapter(s).title, "A road to Westfall");
});
test("all classes can use all six keystones without missing spells or invalid stat values", () => {
  for (const c of CLASSES)
    for (const k of KEYSTONES) {
      const g = make({ classId: c.id, stats: heroStats(freshSave(), c.id) });
      g.keystones = [k.id];
      g.setInput(1, 0);
      g.dash();
      g.activate();
      for (let i = 0; i < 120; i++) g.update(1 / 60);
      assert.ok(Number.isFinite(g.totalDamage));
      assert.ok(Number.isFinite(g.player.hp));
    }
  assert.equal(CONTRACTS.length, 3);
});
