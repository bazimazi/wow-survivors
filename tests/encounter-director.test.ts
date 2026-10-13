import test from "node:test";
import assert from "node:assert/strict";
import { encounterBeat } from "../src/encounter-director";
import { GameEngine } from "../src/engine";
import { ZONES } from "../src/content";
import { freshSave, heroStats } from "../src/progression";

const make = (events: string[] = []) => {
  const game = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    seed: 123,
    pacedEncounters: true,
    adventure: { difficulty: "adventurer", oath: "balanced", relic: "" },
    onEvent: (e) => events.push(e.type),
  });
  game.enemies = [];
  game.spells = [];
  game.pets = [];
  (game as any).spawnTimer = Infinity;
  game.xpNeeded = Infinity;
  game.player.invulnerable = 1000;
  return game;
};

test("horde warnings match their approach direction, alternate fronts and give recovery time", () => {
  assert.equal(encounterBeat(15.9, 360).warning, false);
  assert.equal(encounterBeat(16, 360).direction, "EAST");
  assert.equal(encounterBeat(16, 360).warning, true);
  assert.equal(encounterBeat(20, 360).wave, 1);
  assert.equal(encounterBeat(22, 360).pressure, 0.4);
  assert.equal(encounterBeat(51, 360).direction, "SOUTH");
  assert.equal(encounterBeat(86, 360).direction, "WEST");
  assert.equal(encounterBeat(121, 360).direction, "NORTH");
  assert.equal(encounterBeat(360, 360).active, false);
  assert.equal(encounterBeat(500, 360).progress, 1);
});

test("real directed waves warn once, spawn an arc once and hold during pause", () => {
  const events: string[] = [],
    g = make(events);
  g.time = 16;
  g.update(1 / 60);
  g.update(1 / 60);
  assert.equal(events.filter((e) => e === "horde").length, 1);
  g.time = 20;
  g.update(1 / 60);
  assert.equal(g.enemies.length, 11);
  assert.ok(g.enemies.every((e) => e.x > g.player.x + 250));
  g.update(1 / 60);
  assert.equal(g.enemies.length, 11);
  g.paused = true;
  const before = JSON.stringify([g.time, g.enemies]);
  g.update(4);
  assert.equal(JSON.stringify([g.time, g.enemies]), before);
  g.paused = false;
  g.enemies = [];
  g.time = 55;
  g.update(1 / 60);
  assert.equal(g.enemies.length, 14);
  assert.ok(g.enemies.every((e) => e.y > g.player.y + 250));
});

test("fifteen sustained real kills award temporary gem attraction without teleporting gems", () => {
  const events: string[] = [],
    g = make(events);
  for (let i = 0; i < 15; i++) {
    const e = (g as any).spawnEnemy(100);
    e.hp = 1;
    (g as any).damageEnemy(e, 10, "frostbolt", false);
  }
  assert.equal(g.streak, 15);
  assert.equal(events.filter((e) => e === "surge").length, 1);
  assert.equal(g.pickupSurgeUntil, 2.5);
  g.enemies = [];
  const gem = { x: 250, y: 0, kind: "xp" as const, value: 2 };
  g.pickups = [gem];
  g.update(1 / 60);
  assert.ok(gem.x < 250 && gem.x > 230);
  g.time = 3;
  gem.x = 250;
  g.update(1 / 60);
  assert.equal(gem.x, 250);
});

test("dungeon room spawning retains its guardian pacing", () => {
  const zone = ZONES.find((z) => z.id === "deadmines")!;
  const g = new GameEngine({
    classId: "mage",
    zone,
    stats: heroStats(freshSave()),
    professions: {},
    pacedEncounters: true,
    seed: 4,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.time = 20;
  (g as any).spawnTimer = Infinity;
  g.update(1 / 60);
  assert.equal(g.enemies.length, 0);
});
