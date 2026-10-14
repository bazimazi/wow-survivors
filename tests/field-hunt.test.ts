import test from "node:test";
import assert from "node:assert/strict";
import { FieldHunt, HUNT_EXPOSURE } from "../src/field-hunt";
import { GameEngine } from "../src/engine";
import { CLASSES, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import { freshSave, heroStats, validateSave } from "../src/progression";
import { heroJointPose } from "../src/hero-motion";
import { paintedVertex } from "../src/painted-rig";

function make(id: ClassId = "mage", fieldHunts = true, partner?: ClassId) {
  const events: string[] = [];
  const g = new GameEngine({
    classId: id,
    zone: ZONES[0],
    professions: {},
    seed: 237,
    fieldHunts,
    ...(partner
      ? {
          partner: {
            classId: partner,
            stats: heroStats(freshSave(), partner),
            characterLevel: 1,
          },
        }
      : {}),
    stats: { ...heroStats(freshSave(), id), crit: 0, regen: 0 },
    onEvent: (e) => events.push(e.type),
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.nodes = [];
  g.landmarks = [];
  g.xpNeeded = 1e9;
  g.player.invulnerable = 1000;
  (g as any).spawnTimer = 1e9;
  return { g, events };
}
function step(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60);
}
function awaken(g: GameEngine) {
  g.time = 40;
  g.update(1 / 60);
  assert.equal(g.interact(), false, "distant hunts require approaching first");
  g.player.x = g.hunt.x;
  g.player.y = g.hunt.y;
  assert.equal(g.interact(), true);
  const enemy = g.enemies.find((e) => e.id === g.hunt.enemyId)!;
  enemy.x = g.player.x + 65;
  enemy.y = g.player.y;
  enemy.hp = enemy.maxHp = 10000;
  enemy.speed = 0;
  enemy.damage = 0;
  return enemy;
}

test("optional hunt offers are bounded, expire without rewards and never replace the final boss", () => {
  const h = new FieldHunt(),
    p = { x: 990, y: -990 },
    bounds = { x: 1000, y: 1000 };
  assert.equal(h.update(39, 360, p, bounds, false), null);
  assert.equal(h.update(40, 360, p, bounds, false), "offered");
  assert.ok(Math.abs(h.x) <= 850 && Math.abs(h.y) <= 850);
  assert.equal(h.update(41, 360, p, bounds, false), null);
  assert.equal(h.update(65, 360, p, bounds, false), "expired");
  assert.equal(h.completed, 0);
  h.update(70, 360, p, bounds, false);
  assert.equal(h.update(135, 360, p, bounds, false), "offered");
  assert.equal(h.begin(1, 135), true);
  assert.equal(h.update(136, 360, p, bounds, true), "expired");
  assert.equal(h.state, "idle");
});

test("all nine actual Battle Arts break a ward only at full charge, including delayed missiles", () => {
  for (const hero of CLASSES) {
    const { g } = make(hero.id),
      e = awaken(g);
    assert.equal(g.hunt.damageMultiplier(e.id, g.time, false), 0.35);
    g.battleArt.aim = { x: e.x, y: e.y };
    assert.ok(g.beginBattleArt());
    step(g, 0.15);
    assert.ok(g.releaseBattleArt());
    step(g, 0.2);
    assert.equal(
      g.hunt.exposedUntil,
      0,
      hero.id + " quick attacks retain the ward",
    );
    g.battleArt.cooldown = 0;
    g.battleArt.aim = { x: e.x, y: e.y };
    assert.ok(g.beginBattleArt());
    step(g, 0.72);
    assert.ok(g.releaseBattleArt());
    step(g, 0.2);
    assert.ok(g.hunt.exposedUntil > g.time, hero.id);
    assert.equal(g.hunt.damageMultiplier(e.id, g.time, false), 1.65);
    step(g, HUNT_EXPOSURE + 0.1);
    assert.equal(g.hunt.damageMultiplier(e.id, g.time, false), 0.35);
  }
});

test("champions telegraph attacks, full-charge breaks interrupt them and defeat pays exactly once", () => {
  const { g } = make("warrior"),
    e = awaken(g);
  e.attackTimer = 0;
  step(g, 0.02);
  assert.equal(g.hazards.length, 1);
  assert.equal(g.hazards[0].shape, "line");
  (g as any).damageEnemy(e, 1, "cleave", false, undefined, "warrior", true);
  assert.equal(g.hazards.length, 0);
  g.player.hp = g.player.maxHp * 0.5;
  g.player.activeCooldown = 10;
  g.player.dashCooldown = 4;
  (g as any).damageEnemy(e, 100000, "cleave", false);
  const gold = g.gold;
  assert.equal(g.hunt.completed, 1);
  assert.equal(g.hunt.state, "complete");
  assert.ok(Math.abs(g.player.hp - g.player.maxHp * 0.65) < 1e-9);
  assert.equal(g.player.activeCooldown, 0);
  assert.equal(g.player.dashCooldown, 0);
  assert.ok(g.pickups.some((p) => p.kind === "xp" && p.value === 24));
  (g as any).damageEnemy(e, 100000, "cleave", false);
  assert.equal(g.gold, gold);
  assert.equal(g.hunt.completed, 1);
  assert.equal(g.result().hunts, 1);
});

test("pause and choices freeze hunt time; an expired champion cannot drop treasure", () => {
  const { g } = make(),
    e = awaken(g);
  g.paused = true;
  const expires = g.hunt.expiresAt,
    time = g.time;
  step(g, 3);
  assert.equal(g.time, time);
  assert.equal(g.hunt.expiresAt, expires);
  g.paused = false;
  g.choosing = true;
  step(g, 3);
  assert.equal(g.time, time);
  g.choosing = false;
  g.time = expires;
  g.update(1 / 60);
  assert.equal(e.dead, true);
  assert.equal(g.kills, 0);
  assert.equal(g.gold, 0);
  assert.equal(g.pickups.length, 0);
  const plain = make("mage", false).g;
  plain.time = 40;
  plain.update(1 / 60);
  assert.equal(plain.hunt.state, "idle");
  const dungeon = new GameEngine({
    classId: "mage",
    zone: ZONES.find((z) => z.id === "deadmines")!,
    stats: heroStats(freshSave()),
    professions: {},
    fieldHunts: true,
  });
  dungeon.time = 40;
  dungeon.update(1 / 60);
  assert.equal(dungeon.hunt.state, "idle");
});

test("continuous hero joint sampling preserves running feet under attacks and settles frame zero", () => {
  const walk = heroJointPose(
    { frame: 0, phase: 0.05, mirror: false, strideWeight: 0.5 },
    1,
  );
  assert.equal(walk.blend.nextFrame, 1);
  assert.equal(walk.blend.mix, 0.4);
  const cast = heroJointPose(
    {
      frame: 10,
      phase: 0.35,
      gaitFrame: 2,
      mirror: false,
      blend: 0.5,
      nextFrame: 11,
    },
    1,
  );
  assert.equal(cast.gait, 2);
  assert.equal(cast.blend.gaitNext, 3);
  assert.equal(cast.blend.mix, 0.5);
  const settle = heroJointPose(
    {
      frame: -1,
      phase: 0.05,
      mirror: false,
      settleFrame: 0,
      strideWeight: 0.2,
    },
    1,
  );
  assert.equal(settle.frame, 0);
  assert.equal(settle.blend.nextFrame, 1);
  assert.notDeepEqual(
    heroJointPose({ frame: -1, phase: 0, mirror: false }, 0.1),
    heroJointPose({ frame: -1, phase: 0, mirror: false }, 0.2),
  );
});

test("older history remains compatible and hunt results survive save normalization", () => {
  const s = freshSave(),
    { g } = make();
  s.history = [{ ...g.result(), hunts: 2 }];
  assert.equal(validateSave(s).history[0].hunts, 2);
  delete s.history[0].hunts;
  assert.equal(validateSave(s).history[0].hunts, 0);
});

test("a partner's killing blow pays once and restores each living hero exactly once", () => {
  const { g } = make("mage", true, "warrior"),
    e = awaken(g);
  const p1 = g.player,
    p2 = g.partner!.player;
  p1.hp = p1.maxHp * 0.5;
  p2.hp = p2.maxHp * 0.5;
  p1.activeCooldown = p2.activeCooldown = 10;
  (g as any).damageEnemy(e, 100000, "cleave", false);
  assert.ok(Math.abs(p1.hp - p1.maxHp * 0.65) < 1e-9);
  assert.ok(Math.abs(p2.hp - p2.maxHp * 0.65) < 1e-9);
  assert.equal(p1.activeCooldown, 0);
  assert.equal(p2.activeCooldown, 0);
  assert.equal(g.hunt.completed, 1);
  const other = make("mage", true, "warrior").g,
    target = awaken(other);
  other.partner!.player.hp = 0;
  (other as any).damageEnemy(target, 100000, "frostbolt", false);
  assert.equal(
    other.partner!.player.hp,
    0,
    "hunt rewards never revive a fallen ally",
  );
});

test("stronger hero strides stay inside texture padding and never fold their joints", () => {
  for (const hero of CLASSES)
    for (const back of [false, true])
      for (let frame = 0; frame < 8; frame++) {
        const rig = ["mage", "priest", "warlock", "druid"].includes(hero.id)
          ? "robe"
          : "biped";
        const point = (x: number, y: number) => {
          const v = paintedVertex(x, y, rig, frame, hero.id, back);
          const scale = heroJointPose(
            { frame, phase: 0, mirror: false },
            0,
            -1,
            hero.id,
          ).blend.motionScale;
          return { x: x + (v.x - x) * scale, y: y + (v.y - y) * scale };
        };
        for (let row = 0; row <= 20; row++)
          for (let col = 0; col <= 20; col++) {
            const x = col / 20,
              y = row / 20,
              v = point(x, y),
              r = point(x + 0.001, y),
              d = point(x, y + 0.001);
            assert.ok(
              v.x >= -0.125 && v.x <= 1.125 && v.y >= -0.125 && v.y <= 1.125,
              hero.id,
            );
            assert.ok(
              (r.x - v.x) * (d.y - v.y) - (r.y - v.y) * (d.x - v.x) > 0,
              `${hero.id}/${back}/${frame}/${x},${y}`,
            );
          }
      }
});
