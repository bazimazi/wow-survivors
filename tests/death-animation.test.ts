import test from "node:test";
import assert from "node:assert/strict";
import {
  DeathAnimator,
  deathVisual,
  deathKey,
  DEATH_DURATION,
  DEATH_FRAME,
  DEATH_KEYS,
} from "../src/death-animation";
import { deformVertex } from "../src/animation";
import type { AnimationRig } from "../src/animation";
import { GameEngine } from "../src/engine";
import type { DeathAction, EngineConfig } from "../src/engine";
import { ZONES, CLASSES } from "../src/content";
import { CREATURE_ART } from "../src/creature-animation";
import { DUNGEONS } from "../src/dungeon";
import { BOSS_IDENTITIES } from "../src/expedition";

function make(
  onDeath?: EngineConfig["onDeath"],
  zone = "elwynn",
  classId: EngineConfig["classId"] = "warrior",
  onEvent?: EngineConfig["onEvent"],
) {
  const g = new GameEngine({
    classId,
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
    professions: {},
    onDeath,
    onEvent,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  g.nodes = [];
  g.landmarks = [];
  g.pickups = [];
  g.xpNeeded = 1e9;
  (g as any).spawnTimer = 1e6;
  return g;
}
function spawn(g: GameEngine, type = "wolf", boss = false) {
  const e = (g as any).spawnEnemy(180, false, 0, boss, type);
  e.hp = e.maxHp = 100;
  e.speed = 0;
  e.attackTimer = 1e6;
  if (boss) g.boss = e;
  return e;
}
const kill = (g: GameEngine, e: GameEngine["enemies"][number]) =>
  (g as any).damageEnemy(e, 1000, "melee", false);

test("death keys are separate from walk/combat and all eight rigs keep finite padded non-folding geometry", () => {
  assert.equal(DEATH_KEYS.length, 6);
  for (const frame of [-1, 0, 8, 25, 32, 26.5, NaN])
    assert.equal(deathKey(frame), null);
  const rigs: AnimationRig[] = [
    "biped",
    "robe",
    "heavy",
    "quadruped",
    "arachnid",
    "slither",
    "hover",
    "totem",
  ];
  for (const rig of rigs)
    for (let frame = 26; frame < 32; frame++)
      for (let iy = 0; iy <= 12; iy++)
        for (let ix = 0; ix <= 8; ix++) {
          const x = ix / 8,
            y = iy / 12,
            p = deformVertex(x, y, rig, frame),
            dx = deformVertex(x + 1e-5, y, rig, frame),
            dy = deformVertex(x, y + 1e-5, rig, frame);
          assert.ok([p.x, p.y].every(Number.isFinite));
          assert.ok(p.x >= -0.06 && p.x <= 1.06 && p.y >= -0.06 && p.y <= 1.06);
          assert.ok(
            ((dx.x - p.x) * (dy.y - p.y) - (dy.x - p.x) * (dx.y - p.y)) /
              1e-10 >
              0.8,
          );
        }
});

test("six death stages collapse each silhouette and fade enemies while keeping a fallen hero", () => {
  for (const rig of [
    "biped",
    "quadruped",
    "arachnid",
    "slither",
    "hover",
  ] as const) {
    for (let i = 0; i < 6; i++)
      assert.equal(
        deathVisual(((i + 0.1) / 6) * DEATH_DURATION, rig).frame,
        DEATH_FRAME + i,
      );
    const end = deathVisual(DEATH_DURATION, rig);
    assert.equal(end.alpha, 0);
    assert.ok(end.scaleY > 0 && end.scaleX > 0);
    assert.ok(deathVisual(DEATH_DURATION, rig, true, true).alpha > 0.5);
  }
  assert.equal(
    deathVisual(DEATH_DURATION, "biped", true).rotation,
    -deathVisual(DEATH_DURATION, "biped").rotation,
  );
  assert.ok(deathVisual(DEATH_DURATION, "quadruped").scaleY < 0.5);
  assert.ok(deathVisual(DEATH_DURATION, "hover").drop < 0);
});

test("death presentation advances only explicit bounded delta and holds pause/choices/focus", () => {
  const a = new DeathAnimator<number>(),
    actor = {};
  assert.equal(a.trigger(actor, 1), true);
  assert.equal(a.trigger(actor, 2), false);
  for (const delta of [0, -1, NaN, Infinity]) a.advance(delta);
  assert.equal(a.enemies[0].age, 0);
  a.advance(10);
  assert.equal(a.enemies[0].age, 0.05);
  a.advance(0.05, { held: true, time: 10 });
  assert.equal(a.enemies[0].age, 0.05);
  for (let i = 0; i < 20; i++) a.advance(0.05, { time: 10 });
  assert.equal(a.enemies.length, 0);
});

test("mass casualties stay bounded, retain guardians, expire independently and keep one hero", () => {
  const a = new DeathAnimator<number>(),
    boss = {};
  a.trigger(boss, -1, { priority: true });
  for (let i = 0; i < 400; i++) a.trigger({}, i);
  assert.equal(a.enemies.length, 64);
  assert.equal(a.enemies[0].data, -1);
  assert.equal(a.enemies[1].data, 337);
  a.trigger({}, -2, { priority: true });
  assert.ok(
    a.enemies.some((e) => e.data === -1) &&
      a.enemies.some((e) => e.data === -2),
  );
  a.trigger({}, 500, { hero: true });
  for (let i = 0; i < 20; i++) a.advance(0.05);
  assert.equal(a.enemies.length, 0);
  assert.equal(a.hero!.age, DEATH_DURATION);
});

test("motion disabling never replays deaths and stage changes/clock rewinds remove old scenes", () => {
  const a = new DeathAnimator<number>(),
    actor = {};
  a.trigger(actor, 1);
  a.trigger({}, 2, { hero: true });
  a.advance(0.05, { enabled: false, time: 3 });
  assert.equal(a.enemies.length, 0);
  assert.equal(a.hero!.age, DEATH_DURATION);
  a.advance(0.05, { time: 3 });
  assert.equal(a.hero!.age, DEATH_DURATION);
  assert.equal(a.trigger(actor, 1), false);
  a.advance(0, { time: 2 });
  assert.equal(a.hero, null);
  a.trigger({}, 4);
  a.advance(0, { time: 2, stage: 1 });
  assert.equal(a.enemies.length, 0);
  const disabled = {};
  assert.equal(a.trigger(disabled, 6, { enabled: false }), false);
  assert.equal(a.trigger(disabled, 6), false);
  assert.equal(a.trigger({}, 7, { hero: true, enabled: false }), true);
  assert.equal(a.hero!.age, DEATH_DURATION);
});

test("every creature identity notifies once on lethal damage before pickup/removal, including frozen elites", () => {
  for (const type of [...Object.keys(CREATURE_ART), "smite"]) {
    const actions: DeathAction[] = [],
      g = make((action) => {
        actions.push(action);
        assert.equal(action.kind, "enemy");
        assert.equal(g.kills, 0);
        assert.equal(g.pickups.length, 0);
        assert.equal((action.actor as any).dead, true);
      });
    const e = spawn(g, type);
    e.elite = true;
    e.frozenUntil = 10;
    (g as any).damageEnemy(e, 1, "melee", false);
    assert.equal(actions.length, 0);
    kill(g, e);
    kill(g, e);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].actor, e);
    assert.equal(g.kills, 1);
    assert.ok(g.pickups.some((p) => p.kind === "xp"));
    g.update(1 / 60);
    assert.ok(!g.enemies.includes(e));
    assert.equal(actions.length, 1);
  }
});

const guardians = [
  ...ZONES.filter((z) => !z.dungeon).map((z) => ({
    zone: z.id,
    stage: 0,
    type: BOSS_IDENTITIES[z.id].enemy,
  })),
  ...DUNGEONS.flatMap((route) =>
    route.stages.map((s, stage) => ({ zone: route.id, stage, type: s.enemy })),
  ),
];
test("all fifteen guardian deaths precede room cleanup, checkpoint/victory events and rewards", () => {
  assert.equal(guardians.length, 15);
  for (const guardian of guardians) {
    const order: string[] = [],
      g = make(
        (action) => {
          order.push(action.kind);
          assert.ok(g.enemies.includes(action.actor as any));
        },
        guardian.zone,
        "warrior",
        (event) => {
          if (["end", "checkpoint"].includes(event.type))
            order.push(event.type);
        },
      );
    g.dungeonStageIndex = guardian.stage;
    g.dungeonBosses = guardian.stage;
    const e = spawn(g, guardian.type, true);
    kill(g, e);
    assert.equal(order[0], "enemy");
    assert.equal(order.length, 2);
    assert.ok(g.ended || g.checkpoint);
    assert.ok(g.gold > 0 && g.loot.length > 0);
    if (g.dungeonRoute) assert.equal(g.enemies.length, 0);
    kill(g, e);
    assert.equal(order.length, 2);
  }
});

test("all nine actual hero defeats notify once before end; healthy returns and victories do not", () => {
  for (const c of CLASSES) {
    const order: string[] = [],
      actions: DeathAction[] = [],
      g = make(
        (action) => {
          order.push(action.kind);
          actions.push(action);
        },
        "elwynn",
        c.id,
        (event) => {
          if (event.type === "end") order.push("end");
        },
      );
    g.player.hp = 1;
    g.player.activeBuff = 1;
    const attacker = spawn(g);
    attacker.x = g.player.x;
    attacker.y = g.player.y;
    attacker.damage = 1e6;
    g.update(1 / 60);
    g.finish(false);
    assert.deepEqual(order, ["player", "end"]);
    assert.equal(actions[0].actor, g.player);
    assert.equal(
      (actions[0] as Extract<DeathAction, { kind: "player" }>).bear,
      c.id === "druid",
    );
    const healthy = make(() => assert.fail("healthy return"), "elwynn", c.id);
    healthy.finish(false);
    const victory = make(() => assert.fail("victory"), "elwynn", c.id);
    victory.finish(true);
    assert.ok(healthy.ended && victory.ended);
  }
});

test("lethal observation leaves RNG, rewards, existing events and every guardian's simulation identical", () => {
  for (const guardian of guardians) {
    const plainEvents: unknown[] = [],
      observedEvents: unknown[] = [],
      snapshots: unknown[] = [];
    const plain = make(undefined, guardian.zone, "mage", (e) =>
      plainEvents.push(e),
    );
    const observed = make(
      (action) => snapshots.push({ ...action, actor: { ...action.actor } }),
      guardian.zone,
      "mage",
      (e) => observedEvents.push(e),
    );
    for (const g of [plain, observed]) {
      g.dungeonStageIndex = guardian.stage;
      g.dungeonBosses = guardian.stage;
      for (let i = 0; i < 20; i++) kill(g, spawn(g));
      kill(g, spawn(g, guardian.type, true));
      g.update(1 / 60);
    }
    const state = (g: GameEngine) =>
      JSON.stringify({
        rng: g.rng.state,
        player: g.player,
        enemies: g.enemies,
        pickups: g.pickups,
        hazards: g.hazards,
        projectiles: g.projectiles,
        effects: g.effects,
        kills: g.kills,
        damage: g.totalDamage,
        gold: g.gold,
        loot: g.loot,
        materials: g.materials,
        ended: g.ended,
        victory: g.victory,
        checkpoint: g.checkpoint,
      });
    assert.equal(state(plain), state(observed));
    assert.deepEqual(plainEvents, observedEvents);
    assert.equal(snapshots.length, 21);
  }
});
