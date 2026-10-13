import test from "node:test";
import assert from "node:assert/strict";
import { HitReactions, Footfalls } from "../src/battle-presentation";
import { BattleFeedback } from "../src/battle-feedback";
import { GameEngine } from "../src/engine";
import type { ImpactAction } from "../src/engine";
import { ZONES } from "../src/content";
import { freshSave, heroStats } from "../src/progression";

test("impact sparks survive display interpolation until their first visible frame", () => {
  const feedback = new BattleFeedback();
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    seed: 8,
  });
  feedback.impact(
    {
      actor: g.enemies[0],
      time: 1,
      facing: 0,
      damage: 30,
      critical: true,
      source: "frostbolt",
    },
    false,
  );
  let strokes = 0;
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {
      strokes++;
    },
  } as unknown as CanvasRenderingContext2D;
  feedback.draw(context, 0.99, true);
  assert.equal(strokes, 0);
  feedback.draw(context, 1.05, true);
  assert.equal(strokes, 7);
  feedback.draw(context, 1.3, true);
  assert.equal(strokes, 7);
});

test("damage observations do not change seeded combat or consume gameplay RNG", () => {
  const impacts: ImpactAction[] = [];
  const make = (observe: boolean) =>
    new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats: heroStats(freshSave()),
      professions: {},
      seed: 8,
      onImpact: observe ? (hit) => impacts.push(hit) : undefined,
    });
  const a = make(false),
    b = make(true);
  for (const g of [a, b]) {
    g.spawnTimer = 999;
    g.xpNeeded = 999;
    g.enemies.forEach((e) => {
      e.x = 70;
      e.y = 0;
      e.hp = e.maxHp = 10000;
      e.damage = 3;
    });
  }
  for (let i = 0; i < 120; i++) {
    a.update(1 / 60);
    b.update(1 / 60);
  }
  const state = (g: GameEngine) =>
    JSON.stringify([
      g.rng.state,
      g.player,
      g.enemies,
      g.projectiles,
      g.effects,
      g.totalDamage,
    ]);
  assert.equal(state(a), state(b));
  assert.ok(impacts.length > 0);
  assert.ok(
    impacts.every(
      (hit) => hit.damage > 0 && Number.isFinite(hit.facing + hit.time),
    ),
  );
});

test("hit reactions recoil and settle on the combat clock, hold on repeated renders, and respect reduced motion", () => {
  const reactions = new HitReactions(),
    g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats: heroStats(freshSave()),
      professions: {},
      seed: 8,
    });
  const actor = g.enemies[0],
    before = JSON.stringify(actor);
  reactions.trigger({
    actor,
    time: 1,
    facing: 0,
    damage: 30,
    critical: true,
    source: "frostbolt",
  });
  const hit = reactions.sample(actor, 1.08, true);
  assert.ok(hit.x > 0 && hit.pulse > 0);
  assert.deepEqual(reactions.sample(actor, 1.08, true), hit);
  assert.equal(reactions.sample(actor, 1.08, false).x, 0);
  assert.equal(reactions.sample(actor, 1.4, true).x, 0);
  assert.equal(JSON.stringify(actor), before);
});

test("footfalls follow actual travel distance, remain bounded, expire, and skip teleports", () => {
  const feet = new Footfalls(),
    actor = { x: 0, y: 0 };
  feet.observe(actor, 0, true);
  for (let i = 1; i <= 100; i++) {
    actor.x += 22;
    feet.observe(actor, i / 60, true);
  }
  assert.equal(feet.prints.length, 48);
  assert.notEqual(feet.prints[0].side, feet.prints[1].side);
  actor.x += 1000;
  feet.observe(actor, 2, true);
  assert.equal(feet.prints.length, 48);
  feet.draw({} as CanvasRenderingContext2D, 4, false, "#ffffff");
  assert.equal(feet.prints.length, 0);
});
