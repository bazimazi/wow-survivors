import test from "node:test";
import assert from "node:assert/strict";
import {
  CreatureCombatAnimator,
  creatureCombatStyle,
  CREATURE_RECOVERY,
} from "../src/creature-combat";
import { combatFrame } from "../src/combat-animation";
import { QueuedFrameCache } from "../src/animation";
import { CREATURE_ART } from "../src/creature-animation";
import { GameEngine } from "../src/engine";
import type { Enemy, EnemyAction, EngineConfig } from "../src/engine";
import { ZONES } from "../src/content";
import { DUNGEONS } from "../src/dungeon";
import { BOSS_IDENTITIES } from "../src/expedition";

const guardians = [
  ...ZONES.filter(
    (zone) => !DUNGEONS.some((route) => route.id === zone.id),
  ).map((zone) => ({
    zone: zone.id,
    stage: 0,
    type: BOSS_IDENTITIES[zone.id].enemy,
  })),
  ...DUNGEONS.flatMap((route) =>
    route.stages.map((stage, index) => ({
      zone: route.id,
      stage: index,
      type: stage.enemy,
    })),
  ),
];
function make(
  zone = "elwynn",
  onEnemyAction?: EngineConfig["onEnemyAction"],
  onEvent?: EngineConfig["onEvent"],
) {
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES.find((z) => z.id === zone)!,
    seed: 927,
    characterLevel: 20,
    stats: {
      health: 10000,
      power: 0,
      armor: 0,
      haste: 0,
      crit: 0,
      speed: 0,
      regen: 0,
      magnet: 0,
    },
    onEnemyAction,
    onEvent,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.landmarks = [];
  g.nodes = [];
  g.pickups = [];
  g.xpNeeded = 1e9;
  (g as any).spawnTimer = 1e6;
  return g;
}
function enemy(g: GameEngine, type = "wolf", x = 300, boss = false): Enemy {
  const e = (g as any).spawnEnemy(
    Math.abs(x),
    false,
    x < 0 ? Math.PI : 0,
    boss,
    type,
  );
  e.speed = 0;
  e.hp = e.maxHp = 1e6;
  e.attackTimer = 1e6;
  if (boss) g.boss = e;
  return e;
}
function cue(
  actor: Enemy,
  kind: EnemyAction["kind"] = "contact",
  time = 0,
  warning = 0,
): EnemyAction {
  return {
    actor,
    kind,
    time,
    warning,
    facing: Math.PI,
    zoneId: "elwynn",
    pattern: 0,
  };
}

test("every creature contacts with a strike and every existing guardian pattern has a presentation style", () => {
  const g = make();
  for (const type of Object.keys(CREATURE_ART))
    assert.equal(creatureCombatStyle(cue(enemy(g, type))), "strike");
  for (const type of ["wraith", "defias", "cultist", "dusk_mage"])
    assert.equal(
      creatureCombatStyle(cue(enemy(g, type), "projectile")),
      type === "defias" ? "shoot" : "cast",
    );
  assert.equal(guardians.length, 20);
  const styles = new Set();
  for (const guardian of guardians)
    for (const pattern of [0, 1]) {
      const style = creatureCombatStyle({
        ...cue(enemy(g, guardian.type), "telegraph"),
        zoneId: guardian.zone,
        pattern,
      });
      assert.ok(["strike", "cast", "shoot"].includes(style));
      styles.add(style);
    }
  assert.equal(styles.size, 3);
  assert.equal(
    creatureCombatStyle({
      ...cue(enemy(g, "springvale"), "telegraph"),
      pattern: 0,
    }),
    "strike",
  );
  assert.equal(
    creatureCombatStyle({
      ...cue(enemy(g, "springvale"), "telegraph"),
      pattern: 1,
    }),
    "cast",
  );
});

test("ordinary enemy responses use six stages, retain aim and actor identity, and allow telegraph interruption", () => {
  const g = make(),
    a = enemy(g),
    b = enemy(g),
    animator = new CreatureCombatAnimator();
  assert.equal(animator.trigger(cue(a)), true);
  for (let i = 0; i < 6; i++) {
    const pose = animator.sample(a, i * 0.07 + 0.001)!;
    assert.equal(pose.frame, combatFrame("strike", i));
    assert.equal(pose.mirror, true);
  }
  assert.equal(animator.sample(b, 0.4), null);
  assert.equal(animator.trigger(cue(a, "projectile", 0.4)), false);
  assert.equal(animator.trigger(cue(a, "telegraph", 0.4, 1.4)), true);
  assert.equal(animator.trigger(cue(a, "contact", 0.5)), false);
  assert.equal(animator.sample(a, 0.5)!.frame, combatFrame("cast", 0));
  assert.equal(animator.sample(a, 2.1), null);
});

test("boss warning preparation releases at the combat deadline, freeze holds and thaw skips expired warnings", () => {
  const g = make(),
    actor = enemy(g),
    animator = new CreatureCombatAnimator();
  animator.trigger(cue(actor, "telegraph", 10, 1.6));
  assert.equal(animator.sample(actor, 10.1)!.frame, combatFrame("cast", 0));
  const held = animator.sample(actor, 10.9)!;
  assert.equal(held.frame, combatFrame("cast", 1));
  assert.deepEqual(animator.sample(actor, 11.5, { frozen: true }), held);
  assert.equal(animator.sample(actor, 11.61)!.frame, combatFrame("cast", 2));
  assert.equal(animator.sample(actor, 11.61 + CREATURE_RECOVERY), null);
  animator.trigger(cue(actor, "telegraph", 20, 1.4));
  const frozen = animator.sample(actor, 20.2)!;
  assert.deepEqual(animator.sample(actor, 30, { frozen: true }), frozen);
  assert.equal(animator.sample(actor, 30.01), null);
  for (const reset of ["disable", "rewind", "invalid", "death"]) {
    actor.dead = false;
    animator.trigger(cue(actor, "contact", 40));
    if (reset === "death") actor.dead = true;
    assert.equal(
      animator.sample(
        actor,
        reset === "rewind" ? 39 : reset === "invalid" ? NaN : 40.1,
        { enabled: reset !== "disable" },
      ),
      null,
    );
    assert.equal(animator.sample(actor, 40.2), null);
  }
  actor.dead = false;
  animator.trigger(cue(actor, "contact", 50));
  animator.sample(actor, 50.2);
  actor.frozenUntil = 60;
  const frozenAgain = animator.sample(actor, 50.25, { frozen: true });
  assert.equal(animator.trigger(cue(actor, "telegraph", 50.3, 1.4)), false);
  assert.deepEqual(animator.sample(actor, 50.3, { frozen: true }), frozenAgain);
  actor.frozenUntil = 0;
  assert.equal(animator.trigger(cue(actor, "projectile", 50.1)), true);
  assert.equal(animator.sample(actor, 50.1)!.frame, combatFrame("cast", 0));
  assert.equal(animator.trigger(cue(actor, "telegraph", 0, -1)), false);
  assert.equal(animator.trigger({ ...cue(actor), facing: Infinity }), false);
});

test("boss queue admission and alternating FIFO service retain old ordinary work and fixed budgets", () => {
  const built: string[] = [],
    disposed: string[] = [],
    cache = new QueuedFrameCache<string>(4, 1, (value) => disposed.push(value));
  const request = (key: string, priority = false) =>
    cache.get(
      key,
      () => {
        built.push(key);
        return key;
      },
      priority,
    );
  ["old", "middle", "new", "newest"].forEach((key) => request(key));
  request("boss", true);
  assert.equal(cache.pendingSize, 4);
  cache.beginFrame();
  assert.deepEqual(built, ["boss"]);
  request("boss-2", true);
  cache.beginFrame();
  assert.deepEqual(built, ["boss", "old"]);
  cache.beginFrame();
  cache.beginFrame();
  cache.beginFrame();
  assert.deepEqual(built, ["boss", "old", "boss-2", "middle", "new"]);
  assert.ok(!built.includes("newest"));
  assert.equal(cache.size, 4);
  assert.deepEqual(disposed, ["boss"]);
  request("upgrade");
  request("upgrade", true);
  request("ordinary");
  cache.beginFrame();
  assert.equal(built.at(-1), "upgrade");
  assert.ok(cache.size <= 4 && cache.pendingSize <= 4);
  cache.cancelPending();
  cache.beginFrame();
  assert.equal(built.at(-1), "upgrade");
});

test("contact gestures require accepted hits, including shield absorption, and respect immunity and dead actors", () => {
  const actions: EnemyAction[] = [],
    events: any[] = [],
    g = make(
      "elwynn",
      (a) => actions.push(a),
      (e) => events.push(e),
    );
  const e = enemy(g, "wolf", 10);
  g.player.shield = 500;
  const hp = g.player.hp;
  g.update(1 / 60);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].actor, e);
  assert.equal(actions[0].kind, "contact");
  assert.equal(g.player.hp, hp);
  assert.ok(g.player.shield < 500);
  assert.equal(events.find((e) => e.type === "hit").amount, 0);
  for (let i = 0; i < 15; i++) g.update(1 / 60);
  assert.equal(actions.length, 1);
  g.player.invulnerable = 0;
  e.x = 100;
  g.update(1 / 60);
  assert.equal(actions.length, 1);
  e.x = 10;
  e.dead = true;
  g.update(1 / 60);
  assert.equal(actions.length, 1);
});

test("all four ranged creatures notify only for real launches inside range and below the projectile cap", () => {
  for (const type of ["wraith", "defias", "cultist", "dusk_mage"]) {
    const actions: EnemyAction[] = [],
      g = make("elwynn", (a) => actions.push(a)),
      e = enemy(g, type, 700);
    e.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(actions.length, 0);
    e.x = 300;
    g.update(1 / 60);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, "projectile");
    assert.equal(actions[0].actor, e);
    assert.ok(g.projectiles.some((p) => p.enemy));
    g.update(1 / 60);
    assert.equal(actions.length, 1);
    g.projectiles = Array.from({ length: 500 }, () => ({
      ...g.projectiles[0],
      x: 10000,
      y: 10000,
      vx: 0,
      vy: 0,
      life: 1000,
      hit: new Set<number>(),
    }));
    e.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(actions.length, 1);
  }
});

test("all fifteen guardians and both phases/patterns report actual warning duration once without hazard tick cues", () => {
  for (const guardian of guardians)
    for (const phase of [1, 2])
      for (const pattern of [0, 1]) {
        const actions: EnemyAction[] = [],
          g = make(guardian.zone, (a) => actions.push(a));
        g.dungeonStageIndex = guardian.stage;
        const e = enemy(g, guardian.type, 300, true);
        e.attackTimer = 0;
        if (phase === 2) e.hp *= 0.4;
        g.bossState.attackIndex = pattern;
        g.update(1 / 60);
        const action = actions.find((a) => a.kind === "telegraph")!;
        assert.ok(
          action,
          `${guardian.zone}/${guardian.type}/${phase}/${pattern}`,
        );
        assert.equal(action.actor, e);
        assert.equal(action.pattern, pattern);
        assert.equal(action.zoneId, guardian.zone);
        assert.ok(
          Math.abs(action.warning - (g.bossState.attackUntil - action.time)) <
            1e-9,
        );
        assert.ok(action.warning >= 1.15 && action.warning <= 1.8);
        assert.ok(g.hazards.length > 0);
        const count = actions.filter((a) => a.kind === "telegraph").length;
        for (let i = 0; i < 130; i++) g.update(1 / 60);
        assert.equal(
          actions.filter((a) => a.kind === "telegraph").length,
          count,
        );
      }
});

test("saturated warning pools do not report a new boss gesture and existing clouds do not repeat one", () => {
  const actions: EnemyAction[] = [],
    g = make("duskwood", (a) => actions.push(a)),
    e = enemy(g, "stitches", 300, true);
  g.hazards = Array.from({ length: 48 }, () => ({
    x: 10000,
    y: 10000,
    radius: 20,
    damage: 1,
    warning: 1000,
    life: 1001,
  }));
  e.attackTimer = 0;
  g.update(1 / 60);
  assert.equal(actions.length, 0);
  g.hazards = [];
  g.bossState.attackIndex = 1;
  e.attackTimer = 0;
  g.update(1 / 60);
  assert.equal(actions.length, 1);
  for (let i = 0; i < 220; i++) g.update(1 / 60);
  assert.equal(actions.filter((a) => a.kind === "telegraph").length, 1);
});

test("enemy observation leaves simulation, hazards, RNG and existing events identical across all guardian patterns", () => {
  for (const guardian of guardians)
    for (const pattern of [0, 1]) {
      const plainEvents: any[] = [],
        observedEvents: any[] = [],
        animator = new CreatureCombatAnimator();
      const plain = make(guardian.zone, undefined, (e) => plainEvents.push(e)),
        observed = make(
          guardian.zone,
          (a) => animator.trigger(a),
          (e) => observedEvents.push(e),
        );
      for (const g of [plain, observed]) {
        g.dungeonStageIndex = guardian.stage;
        const e = enemy(g, guardian.type, 300, true);
        e.hp *= 0.4;
        e.attackTimer = 0;
        g.bossState.attackIndex = pattern;
      }
      for (let i = 0; i < 150; i++) {
        for (const g of [plain, observed]) {
          g.setInput(Math.sin(i / 25), Math.cos(i / 25));
          g.update(1 / 60);
        }
        observed.enemies.forEach((e) =>
          animator.sample(e, observed.time, {
            frozen: e.frozenUntil > observed.time,
          }),
        );
      }
      const snapshot = (g: GameEngine) =>
        JSON.stringify({
          time: g.time,
          rng: (g as any).rng.state,
          player: g.player,
          enemies: g.enemies,
          projectiles: g.projectiles,
          hazards: g.hazards,
          effects: g.effects,
          pickups: g.pickups,
          bossState: g.bossState,
          gold: g.gold,
          loot: g.loot,
        });
      assert.equal(
        snapshot(observed),
        snapshot(plain),
        `${guardian.type}/${pattern}`,
      );
      assert.deepEqual(observedEvents, plainEvents);
    }
});
