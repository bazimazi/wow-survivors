import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import { BATTLE_ARTS, segmentDistance } from "../src/battle-arts";
import { ZONES, SPELLS } from "../src/content";
import type { ClassId } from "../src/content";
import { freshSave, heroStats } from "../src/progression";
import { heroMotionFrame } from "../src/hero-motion";

function make(id: ClassId = "mage") {
  const g = new GameEngine({
    classId: id,
    zone: ZONES[0],
    professions: {},
    seed: 123,
    stats: { ...heroStats(freshSave(), id), crit: 0, regen: 0 },
  });
  g.spells = [];
  g.pets = [];
  g.enemies = [];
  g.xpNeeded = 1e9;
  (g as any).spawnTimer = 1e9;
  return g;
}
function foe(g: GameEngine, x: number, y: number, boss = false) {
  const e = (g as any).spawnEnemy(200);
  Object.assign(e, {
    x,
    y,
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    damage: 0,
    radius: 14,
    boss,
  });
  return e;
}
function step(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60);
}

test("all Battle Arts use valid spell identities and available authored animation rows", () => {
  for (const art of Object.values(BATTLE_ARTS))
    assert.ok(SPELLS[art.spell], art.spell);
  assert.deepEqual(
    [0, 0.26, 0.51, 0.76].map((phase) =>
      heroMotionFrame({ frame: 0, phase, mirror: false }, false),
    ),
    [0, 1, 2, 3],
  );
  assert.equal(
    heroMotionFrame({ frame: 10, phase: 0, mirror: false }, true),
    14,
  );
  assert.equal(
    heroMotionFrame({ frame: -1, phase: 0, mirror: false }, false, 1),
    9,
  );
});
test("a charged lance follows the player's aim, pierces, freezes ordinary targets, and respects cooldown", () => {
  const g = make();
  const a = foe(g, 100, 0),
    b = foe(g, 210, 0),
    c = foe(g, 110, 90),
    boss = foe(g, 300, 0, true);
  g.battleArt.aim = { x: 500, y: 0 };
  assert.equal(g.beginBattleArt(), true);
  step(g, 0.72);
  assert.equal(g.releaseBattleArt(), true);
  assert.equal(g.beginBattleArt(), false);
  step(g, 0.42);
  assert.ok(a.hp < 1000 && b.hp < 1000 && boss.hp < 1000);
  assert.equal(c.hp, 1000);
  assert.ok(a.frozenUntil > g.time && b.frozenUntil > g.time);
  assert.equal(boss.frozenUntil, 0);
  assert.equal(g.releaseBattleArt(), false);
});
test("charging trades movement speed for damage; dash cancels without spending the cooldown", () => {
  const charged = make(),
    normal = make();
  charged.setInput(1, 0);
  normal.setInput(1, 0);
  charged.beginBattleArt();
  step(charged, 0.4);
  step(normal, 0.4);
  assert.ok(charged.player.x < normal.player.x * 0.6);
  assert.equal(charged.dash(), true);
  assert.equal(charged.battleArt.charging, false);
  assert.equal(charged.battleArt.cooldown, 0);
  assert.equal(charged.releaseBattleArt(), false);
});
test("pause holds charge and cooldown, and a release during pause cannot deal damage", () => {
  const g = make("warrior"),
    e = foe(g, 80, 0);
  g.beginBattleArt();
  step(g, 0.3);
  const charge = g.battleArt.charge;
  g.paused = true;
  step(g, 1);
  assert.equal(g.battleArt.charge, charge);
  assert.equal(g.releaseBattleArt(), false);
  assert.equal(e.hp, 1000);
  assert.equal(g.battleArt.cooldown, 0);
  g.paused = false;
  g.beginBattleArt();
  g.releaseBattleArt();
  const cooldown = g.battleArt.cooldown;
  g.paused = true;
  step(g, 1);
  assert.equal(g.battleArt.cooldown, cooldown);
});
test("cleave hits only its front; placed blast respects target range; healing beam rewards alignment", () => {
  const warrior = make("warrior"),
    front = foe(warrior, 90, 0),
    back = foe(warrior, -90, 0);
  warrior.battleArt.aim = { x: 300, y: 0 };
  warrior.beginBattleArt();
  warrior.releaseBattleArt();
  assert.ok(front.hp < 1000);
  assert.equal(back.hp, 1000);
  const paladin = make("paladin"),
    inside = foe(paladin, 310, 0),
    far = foe(paladin, 800, 0);
  paladin.battleArt.aim = { x: 1000, y: 0 };
  paladin.beginBattleArt();
  paladin.releaseBattleArt();
  assert.ok(inside.hp < 1000);
  assert.equal(far.hp, 1000);
  const priest = make("priest");
  priest.player.hp = 20;
  foe(priest, 150, 0);
  foe(priest, 250, 0);
  const off = foe(priest, 180, 100);
  priest.battleArt.aim = { x: 500, y: 0 };
  priest.beginBattleArt();
  priest.releaseBattleArt();
  assert.equal(priest.player.hp, 26);
  assert.equal(off.hp, 1000);
});
test("chain lightning visits each enemy once; a lunge stays in bounds", () => {
  const shaman = make("shaman");
  const foes = [80, 180, 280, 380, 480, 580, 1000].map((x) =>
    foe(shaman, x, 0),
  );
  shaman.battleArt.aim = { x: 80, y: 0 };
  shaman.beginBattleArt();
  step(shaman, 0.72);
  shaman.releaseBattleArt();
  assert.equal(foes.filter((e) => e.hp < 1000).length, 6);
  assert.equal(shaman.effects.filter((e) => e.kind === "line").length, 6);
  const rogue = make("rogue");
  rogue.player.x = 1399;
  rogue.battleArt.aim = { x: 1e4, y: 0 };
  rogue.beginBattleArt();
  rogue.releaseBattleArt();
  assert.ok(rogue.player.x < 2000);
  assert.ok(rogue.player.invulnerable > 0);
});
test("swept missile collision catches enemies between samples", () => {
  assert.equal(
    segmentDistance({ x: 25, y: 2 }, { x: 0, y: 0 }, { x: 50, y: 0 }),
    2,
  );
  const g = make();
  const e = foe(g, 20, 0);
  g.battleArt.aim = { x: 500, y: 0 };
  g.beginBattleArt();
  g.releaseBattleArt();
  g.update(0.05);
  assert.ok(e.hp < 1000);
});

test("a cooperative partner's dash leaves the primary hero's charge intact", () => {
  const save = freshSave();
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    professions: {},
    seed: 123,
    stats: heroStats(save, "mage"),
    partner: {
      classId: "warrior",
      stats: heroStats(save, "warrior"),
      characterLevel: 1,
    },
  });
  assert.ok(g.beginBattleArt());
  g.update(0.05);
  const charge = g.battleArt.charge;
  assert.ok(g.dashPartner());
  assert.equal(g.battleArt.charging, true);
  assert.equal(g.battleArt.charge, charge);
  assert.ok(g.releaseBattleArt());
  assert.ok(g.projectiles.some((p) => p.battleArt === "mage"));
});

test("Whitemane's resurrection and protection apply after class damage multipliers", () => {
  for (const id of ["mage", "rogue", "hunter", "warlock"] as const) {
    const g = new GameEngine({
      classId: id,
      classCombat: true,
      zone: ZONES.find((z) => z.id === "scarlet")!,
      professions: {},
      seed: 123,
      stats: { ...heroStats(freshSave(), id), crit: 0 },
    });
    g.dungeonStageIndex = 3;
    g.dungeonBosses = 3;
    g.dungeonStageTime = g.dungeonStage!.duration;
    g.update(1 / 60);
    const boss = g.boss!;
    g.player.kit.focus = 3;
    g.player.kit.concealedUntil = g.time + 5;
    g.player.kit.empoweredUntil = g.time + 5;
    const hit = (target: typeof boss) =>
      (g as any).damageEnemy(target, 1e9, g.classDef.spells[0], false);
    hit(boss);
    assert.equal(boss.hp, boss.maxHp / 2, `${id}: resurrection threshold`);
    const commander = (g as any).revivedCommander;
    assert.ok(commander && !commander.dead);
    hit(boss);
    assert.equal(boss.hp, 1, `${id}: protected final stand`);
    assert.equal(g.ended, false);
    hit(commander);
    hit(boss);
    assert.equal(g.victory, true);
  }
});
