import test from "node:test";
import assert from "node:assert/strict";
import { SPELLS, ZONES } from "../src/content";
import { GameEngine } from "../src/engine";
import { freshSave, heroStats } from "../src/progression";

function make(classId: "mage" | "warlock" = "mage") {
  const g = new GameEngine({
    classId,
    zone: ZONES[0],
    stats: heroStats(freshSave(), classId),
    professions: {},
    seed: 123,
  });
  g.spawnTimer = 1e6;
  g.xpNeeded = 1e9;
  g.enemies = g.enemies.slice(0, 1);
  Object.assign(g.enemies[0], {
    x: 100,
    y: 0,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
  });
  return g;
}

test("projectiles and their impacts retain the rank released before an evolution", () => {
  const g = make();
  g.spells[0].rank = 4;
  g.spells[0].timer = 0;
  g.update(1 / 60);
  assert.ok(g.projectiles.length);
  assert.ok(g.projectiles.every((shot) => shot.spellRank === 4));
  assert.equal(g.effects.find((fx) => fx.motif === "cast")?.spellRank, 4);
  g.spells[0].rank = 5;
  g.spells[0].timer = 999;
  Object.assign(g.enemies[0], { x: g.projectiles[0].x, y: g.projectiles[0].y });
  g.update(1 / 60);
  assert.equal(g.effects.find((fx) => fx.kind === "burst")?.spellRank, 4);
});

test("lingering AoEs keep their rank while new casts use the evolved form", () => {
  const g = make();
  g.spells = [{ id: "blizzard", rank: 4, timer: 0, orbitTimer: 0 }];
  g.update(1 / 60);
  assert.equal(g.areas[0]?.spellRank, 4);
  g.spells[0].rank = 5;
  g.spells[0].timer = 0;
  g.player.resource = 100;
  g.update(1 / 60);
  assert.deepEqual(
    g.areas.map((area) => area.spellRank),
    [4, 5],
  );
});

test("choosing Infernal emits a transformation at the actual summon and evolves its next attack", () => {
  const g = make("warlock");
  const state = g.spells.find((spell) => spell.id === "imp")!;
  state.rank = 4;
  g.choosing = true;
  g.upgrades = [
    {
      id: "imp",
      type: "spell",
      name: SPELLS.imp.evolution,
      description: "",
      icon: "flame",
      color: SPELLS.imp.color,
      rank: 5,
      evolution: true,
    },
  ];
  assert.equal(g.chooseUpgrade("imp"), true);
  assert.equal(state.rank, 5);
  const fx = g.effects.find((fx) => fx.motif === "evolution")!;
  assert.equal(fx.spellRank, 5);
  assert.equal(fx.x, g.pets[0].x);
  assert.equal(fx.y, g.pets[0].y);
  g.pets[0].timer = 0;
  g.update(1 / 60);
  assert.equal(
    g.projectiles.find((shot) => shot.spellId === "imp")?.spellRank,
    5,
  );
  const before = JSON.stringify([g.time, g.pets, g.effects, g.projectiles]);
  g.paused = true;
  g.update(1);
  assert.equal(
    JSON.stringify([g.time, g.pets, g.effects, g.projectiles]),
    before,
  );
});

test("co-op summon releases carry the partner's rank rather than the leader's", () => {
  const stats = heroStats(freshSave());
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats,
    professions: {},
    seed: 123,
    partner: {
      classId: "warlock",
      stats: heroStats(freshSave(), "warlock"),
      characterLevel: 20,
    },
  });
  g.spawnTimer = 1e6;
  g.enemies = g.enemies.slice(0, 1);
  Object.assign(g.enemies[0], {
    x: 180,
    y: 0,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
  });
  g.level = 17;
  g.partner!.spells.forEach((state) => (state.timer = 0));
  g.update(1 / 60);
  assert.equal(g.partner!.spells.find((state) => state.id === "imp")?.rank, 5);
  assert.equal(
    g.projectiles.find((shot) => shot.spellId === "imp")?.spellRank,
    5,
  );
  assert.equal(
    g.effects.find((fx) => fx.spellId === "imp" && fx.motif === "cast")
      ?.spellRank,
    5,
  );
});
