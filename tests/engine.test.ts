import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, SPELLS, ZONES } from "../src/content";
import { GameEngine, Random, WORLD_SIZE } from "../src/engine";
import { freshSave, heroStats } from "../src/progression";

const make = () =>
  new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: { herbalism: 1, mining: 1 },
    seed: 123,
  });
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
}
test("seeded random generator is deterministic", () => {
  const a = new Random(123),
    b = new Random(123);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});
test("pause and upgrade selection freeze all simulation clocks", () => {
  const g = make();
  g.paused = true;
  const before = JSON.stringify([g.player, g.time, g.enemies, g.projectiles]);
  advance(g, 3);
  assert.equal(
    JSON.stringify([g.player, g.time, g.enemies, g.projectiles]),
    before,
  );
  g.paused = false;
  g.choosing = true;
  advance(g, 3);
  assert.equal(g.time, 0);
});
test("movement is normalized, dash requires movement and respects world limits", () => {
  const g = make();
  g.setInput(1, 1);
  assert.ok(Math.abs(Math.hypot(g.input.x, g.input.y) - 1) < 0.0001);
  assert.ok(g.dash());
  assert.equal(g.dash(), false);
  advance(g, 0.2);
  assert.ok(g.player.x > 80);
  g.player.x = WORLD_SIZE;
  g.setInput(1, 0);
  advance(g, 0.5);
  assert.equal(g.player.x, WORLD_SIZE);
});
test("every class deals damage, levels up and has a functional cooldown-bound active ability", () => {
  for (const c of CLASSES) {
    const stats = heroStats(freshSave(), c.id);
    stats.health = 5000;
    stats.power += 80;
    const g = new GameEngine({
      classId: c.id,
      zone: ZONES[0],
      stats,
      professions: {},
      seed: 42,
    });
    assert.ok(g.activate(), `${c.name} active`);
    assert.equal(g.activate(), false);
    for (let i = 0; i < 65 * 60; i++) {
      if (g.choosing)
        g.chooseUpgrade(
          g.upgrades.find((u) => u.type === "spell")?.id || g.upgrades[0].id,
        );
      const target =
        g.pickups.find((p) => p.kind === "xp") ||
        g.enemies.find((e) => !e.dead);
      if (target) g.setInput(target.x - g.player.x, target.y - g.player.y);
      g.update(1 / 60);
    }
    assert.ok(g.totalDamage > 200, `${c.name} deals damage`);
    assert.ok(g.kills > 5, `${c.name} kills enemies`);
    assert.ok(g.level > 1, `${c.name} levels up`);
    assert.ok(g.spells.every((s) => s.rank <= 5));
    assert.ok(g.spells.every((s) => !!SPELLS[s.id]));
  }
});
test("level choices consume XP once, evolve rank-five spells and cannot exceed max rank", () => {
  const g = make();
  g.xp = 100;
  g.update(1 / 60);
  assert.ok(g.choosing);
  const up = g.upgrades.find((u) => u.type === "spell")!;
  assert.ok(up);
  const level = g.level;
  assert.ok(g.chooseUpgrade(up.id));
  assert.equal(g.level, level + 1);
  assert.equal(g.chooseUpgrade(up.id), false);
  g.spells = [
    { id: "frostbolt", rank: 4, timer: 0, orbitTimer: 0 },
    { id: "blizzard", rank: 5, timer: 0, orbitTimer: 0 },
    { id: "arcane", rank: 5, timer: 0, orbitTimer: 0 },
    { id: "fireball", rank: 5, timer: 0, orbitTimer: 0 },
  ];
  const choices = g.generateUpgrades();
  assert.ok(
    choices.some(
      (u) => u.id === "frostbolt" && u.evolution && u.name === "Glacial Lance",
    ),
  );
  g.spells[0].rank = 5;
  assert.ok(g.generateUpgrades().every((u) => u.id !== "frostbolt"));
});
test("only trained gathering professions collect their nodes; fishing is always available", () => {
  const g = make();
  g.enemies = [];
  g.nodes = [
    { id: 0, kind: "herbs", x: 0, y: 0, depleted: false },
    { id: 1, kind: "ore", x: 0, y: 0, depleted: false },
    { id: 2, kind: "fish", x: 0, y: 0, depleted: false },
  ];
  g.update(1 / 60);
  assert.equal(g.materials.herbs, 2);
  assert.equal(g.materials.ore, 2);
  assert.equal(g.materials.fish, 2);
  const other = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    seed: 1,
  });
  other.enemies = [];
  other.nodes = [{ id: 0, kind: "herbs", x: 0, y: 0, depleted: false }];
  other.update(1 / 60);
  assert.equal(other.materials.herbs, undefined);
});
test("healing and bombs only consume supplies when used; paused actions do not spend them", () => {
  let potions = 1,
    bombs = 1;
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    onConsume: (type) => (type === "potions" ? potions-- > 0 : bombs-- > 0),
  });
  assert.equal(g.usePotion(), false);
  assert.equal(potions, 1);
  g.player.hp -= 50;
  assert.ok(g.usePotion());
  assert.equal(potions, 0);
  g.paused = true;
  assert.equal(g.useBomb(), false);
  assert.equal(bombs, 1);
  g.paused = false;
  assert.ok(g.useBomb());
  assert.equal(bombs, 0);
});
test("elapsed duration spawns the final boss; victory requires killing it; finish emits once", () => {
  let ends = 0;
  const g = new GameEngine({
    classId: "mage",
    zone: { ...ZONES[0], duration: 1 },
    stats: { ...heroStats(freshSave()), power: 100000 },
    professions: {},
    seed: 123,
    onEvent: (e) => {
      if (e.type === "end") ends++;
    },
  });
  advance(g, 1.1);
  assert.ok(g.boss);
  assert.equal(g.ended, false);
  g.boss!.x = g.player.x + 20;
  g.boss!.y = g.player.y;
  g.activate();
  assert.ok(g.victory);
  assert.equal(ends, 1);
  g.finish(false);
  assert.equal(ends, 1);
  assert.ok(g.result().loot.includes("lionheart"));
});
test("death ends the run and freezes subsequent updates", () => {
  const g = make();
  g.player.hp = 0;
  g.update(1 / 60);
  assert.ok(g.ended);
  assert.equal(g.victory, false);
  const t = g.time;
  advance(g, 1);
  assert.equal(g.time, t);
});

test("spell costs gate casts and resource regeneration restores access", () => {
  const g = make();
  g.player.resource = 0;
  g.spells[0].timer = 0;
  g.update(1 / 60);
  assert.equal(g.projectiles.length, 0);
  advance(g, 0.3);
  assert.ok(g.projectiles.length > 0);
  assert.ok(g.player.resource < 3);
  const idle = make();
  idle.enemies = [];
  idle.player.resource = 60;
  idle.spells = [{ id: "arcane", rank: 1, timer: 0, orbitTimer: 0 }];
  advance(idle, 0.3);
  assert.ok(idle.player.resource > 60);
  assert.equal(idle.effects.length, 0);
});

test("every class has four valid attack options and a full loadout cannot grow", () => {
  for (const c of CLASSES) {
    assert.equal(c.spells.length, 4);
    assert.equal(new Set(c.spells).size, 4);
    for (const id of c.spells) assert.ok(SPELLS[id]);
  }
  const g = make();
  g.spells = CLASSES.find((c) => c.id === "mage")!.spells.map((id) => ({
    id,
    rank: 5,
    timer: 0,
    orbitTimer: 0,
  }));
  assert.ok(g.generateUpgrades().every((u) => u.type === "stat"));
});
