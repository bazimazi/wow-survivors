import test from "node:test";
import assert from "node:assert/strict";
import {
  CombatAnimator,
  COMBAT_DURATION,
  COMBAT_STYLES,
  COMBAT_POSES,
  combatFrame,
  combatKey,
  combatStyle,
} from "../src/combat-animation";
import { deformVertex } from "../src/animation";
import type { AnimationRig } from "../src/animation";
import { CLASSES, CLASS_MAP, SPELLS, ZONES } from "../src/content";
import { TRAVEL_OPTIONS } from "../src/travel";
import type { ClassId } from "../src/content";
import { GameEngine } from "../src/engine";
import type { CombatAction, EngineConfig } from "../src/engine";

function make(
  classId: ClassId = "mage",
  onAction?: EngineConfig["onAction"],
  onEvent?: EngineConfig["onEvent"],
) {
  const game = new GameEngine({
    classId,
    zone: ZONES[0],
    seed: 421,
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
    travelId: TRAVEL_OPTIONS.find(
      (option) => option.race === CLASS_MAP[classId].race && option.rank === 1,
    )?.id,
    onAction,
    onEvent,
  });
  game.enemies = [];
  game.spells = [];
  game.pets = [];
  game.pickups = [];
  game.nodes = [];
  game.landmarks = [];
  (game as any).spawnTimer = 1e6;
  game.xpNeeded = 1e9;
  game.player.resource = game.player.maxResource;
  return game;
}
function target(g: GameEngine, x = 65) {
  const enemy = (g as any).spawnEnemy(
    Math.abs(x),
    false,
    x < 0 ? Math.PI : 0,
    false,
    "wolf",
  );
  enemy.speed = 0;
  enemy.hp = enemy.maxHp = 10000;
  enemy.attackTimer = 1e6;
  (g as any).grid.rebuild(g.enemies);
  return enemy;
}

test("combat frame IDs remain distinct from gait and each authored style has six poses", () => {
  const frames = COMBAT_STYLES.flatMap((style) =>
    Array.from({ length: COMBAT_POSES }, (_, i) => combatFrame(style, i)),
  );
  assert.equal(new Set(frames).size, 18);
  assert.equal(Math.min(...frames), 8);
  assert.equal(Math.max(...frames), 25);
  frames.forEach((frame) => assert.ok(combatKey(frame)));
  for (const invalid of [-1, 0, 7, 8.5, 26, NaN, Infinity])
    assert.equal(combatKey(invalid), null);
});

test("all combat texture rigs retain braced feet, bounded finite geometry and non-folding joins", () => {
  const rigs: AnimationRig[] = [
    "biped",
    "robe",
    "quadruped",
    "totem",
    "heavy",
    "arachnid",
    "slither",
    "hover",
  ];
  for (const rig of rigs)
    for (const style of COMBAT_STYLES)
      for (let pose = 0; pose < COMBAT_POSES; pose++) {
        const frame = combatFrame(style, pose);
        let altered = 0;
        for (let row = 0; row <= 24; row++)
          for (let col = 0; col <= 16; col++) {
            const x = col / 16,
              y = row / 24;
            const v = deformVertex(x, y, rig, frame);
            assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
            assert.ok(
              v.x >= -0.06 && v.x <= 1.06 && v.y >= -0.06 && v.y <= 1.06,
            );
            if (v.x !== x || v.y !== y) altered++;
            const right = deformVertex(x + 0.001, y, rig, frame),
              down = deformVertex(x, y + 0.001, rig, frame);
            const area =
              (right.x - v.x) * (down.y - v.y) -
              (right.y - v.y) * (down.x - v.x);
            assert.ok(area > 0, `${rig}/${style}/${pose} at ${x},${y}`);
          }
        assert.ok(altered > 0);
        assert.deepEqual(deformVertex(0.3, 1, rig, frame), { x: 0.3, y: 1 });
      }
});

test("gesture classification follows actual spell identities and all nine class abilities", () => {
  const cue = (id: string): CombatAction => ({
    actor: { x: 0, y: 0 },
    time: 0,
    facing: 0,
    spellId: id,
    spellKind: SPELLS[id].kind,
  });
  for (const id of [
    "cleave",
    "sinister",
    "holystrike",
    "rend",
    "rupture",
    "beast",
  ])
    assert.equal(combatStyle(cue(id)), "strike", id);
  for (const id of ["shot", "multishot", "serpentsting", "throw", "volley"])
    assert.equal(combatStyle(cue(id)), "shoot", id);
  for (const id of [
    "frostbolt",
    "holylight",
    "renew",
    "imp",
    "totem",
    "flamestrike",
  ])
    assert.equal(combatStyle(cue(id)), "cast", id);
  for (const hero of CLASSES) {
    assert.ok(
      COMBAT_STYLES.includes(
        combatStyle({
          actor: {},
          time: 0,
          facing: 0,
          ability: hero.id,
        } as CombatAction),
      ),
    );
    hero.spells.forEach((id) =>
      assert.ok(COMBAT_STYLES.includes(combatStyle(cue(id)))),
    );
  }
});

test("combat gestures complete each pose on simulation time, retain aim and isolate actor objects", () => {
  const animator = new CombatAnimator(),
    actor = {},
    pet = {};
  assert.equal(animator.trigger(actor, "cast", 0, Math.PI), true);
  animator.trigger(pet, "strike", 0, 0);
  for (let i = 0; i < COMBAT_POSES; i++) {
    const pose = animator.sample(
      actor,
      (i * COMBAT_DURATION) / COMBAT_POSES + 0.00001,
    )!;
    assert.equal(pose.frame, combatFrame("cast", i));
    assert.equal(pose.mirror, true);
  }
  assert.equal(animator.sample(actor, COMBAT_DURATION), null);
  assert.equal(animator.sample(pet, 0.1)?.style, "strike");
  assert.equal(animator.sample(pet, 0.1)?.mirror, false);
});

test("overlapping automatic casts finish their release and successful class abilities can interrupt them", () => {
  const animator = new CombatAnimator(),
    actor = {};
  animator.trigger(actor, "cast", 0, 0);
  for (let i = 1; i < 21; i++)
    assert.equal(animator.trigger(actor, "shoot", i / 50, Math.PI), false);
  assert.equal(animator.sample(actor, 0.2)?.frame, combatFrame("cast", 2));
  assert.equal(animator.trigger(actor, "strike", 0.21, Math.PI, 1), true);
  assert.equal(animator.trigger(actor, "cast", 0.4, 0), false);
  assert.equal(animator.sample(actor, 0.5)?.style, "strike");
  assert.equal(animator.trigger(actor, "shoot", 0.64, 0), true);
  assert.equal(animator.sample(actor, 0.64)?.frame, combatFrame("shoot", 0));
});

test("pause/freeze holds combat poses, while disabling, invalid time, jumps and rewinds clear them", () => {
  const animator = new CombatAnimator(),
    actor = {};
  animator.trigger(actor, "cast", 0, 0);
  const held = animator.sample(actor, 0.12);
  assert.deepEqual(animator.sample(actor, 20, { frozen: true }), held);
  assert.deepEqual(animator.sample(actor, 20, { frozen: true }), held);
  assert.ok(animator.sample(actor, 20.1)!.progress > held!.progress);
  assert.equal(animator.sample(actor, 20.11, { enabled: false }), null);
  assert.equal(animator.sample(actor, 20.12), null);
  animator.trigger(actor, "cast", 30, 0);
  assert.equal(animator.sample(actor, 29), null);
  animator.trigger(actor, "cast", 30, 0);
  assert.equal(animator.sample(actor, 32), null);
  animator.trigger(actor, "cast", 30, 0);
  assert.equal(animator.sample(actor, NaN), null);
  assert.equal(animator.trigger(actor, "cast", Infinity, 0), false);
  assert.equal(animator.trigger(actor, "cast", 0, NaN), false);
});

test("failed target, resource, healing and active guards do not announce a combat gesture", () => {
  const actions: CombatAction[] = [],
    game = make("mage", (action) => actions.push(action));
  assert.equal((game as any).castSpell(SPELLS.frostbolt, 1), false);
  target(game);
  game.player.resource = 0;
  assert.equal((game as any).castSpell(SPELLS.frostbolt, 1), false);
  assert.equal(game.activate(), false);
  game.player.resource = game.player.maxResource;
  assert.equal((game as any).castSpell(SPELLS.holylight, 1), false);
  game.paused = true;
  assert.equal(game.activate(), false);
  assert.equal(actions.length, 0);
  game.paused = false;
  game.player.hp -= 100;
  assert.equal((game as any).castSpell(SPELLS.renew, 1), true);
  assert.equal((game as any).castSpell(SPELLS.renew, 1), false);
  for (let i = 0; i < 150; i++) game.update(1 / 60);
  assert.equal(
    actions.length,
    1,
    "periodic healing ticks do not repeat the cast gesture",
  );
});

test("all nine successful starter casts and abilities announce exact actor, simulation time and aim", () => {
  for (const hero of CLASSES) {
    const actions: CombatAction[] = [],
      events: string[] = [];
    const game = make(
      hero.id,
      (action) => actions.push(action),
      (event) => events.push(event.type),
    );
    target(game, -65);
    const id = hero.spells[0];
    assert.equal((game as any).castSpell(SPELLS[id], 1), true, hero.id);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].actor, game.player);
    assert.equal(actions[0].spellId, id);
    assert.equal(actions[0].spellKind, SPELLS[id].kind);
    assert.equal(actions[0].time, game.time);
    assert.ok(Math.abs(Math.abs(actions[0].facing) - Math.PI) < 1e-9);
    assert.deepEqual(events, ["cast"]);
    assert.equal(game.trialCasts, 1);
    game.player.resource = game.player.maxResource;
    game.player.facing = -0.8;
    assert.equal(game.activate(), true);
    assert.equal(actions.at(-1)!.ability, hero.id);
    assert.equal(actions.at(-1)!.facing, -0.8);
    const count = actions.length;
    assert.equal(game.activate(), false);
    assert.equal(actions.length, count);
  }
});

test("companion gestures require an in-range bite or launched projectile and wait while travelling", () => {
  for (const id of ["beast", "imp", "totem"]) {
    const actions: CombatAction[] = [],
      game = make("hunter", (action) => actions.push(action));
    const enemy = target(game, 400);
    (game as any).addSpell(id);
    const pet = game.pets[0];
    pet.x = -200;
    pet.y = 0;
    pet.timer = 0;
    game.update(1 / 60);
    assert.equal(actions.length, id === "beast" ? 0 : 1);
    if (id !== "beast") {
      assert.equal(actions[0].actor, pet);
      assert.equal(actions[0].spellId, id);
      assert.ok(game.projectiles.length > 0);
    }
    actions.length = 0;
    pet.x = enemy.x - 20;
    pet.y = 0;
    pet.timer = 0;
    game.update(1 / 60);
    assert.equal(actions.length, 1);
    actions.length = 0;
    pet.timer = 0;
    game.travel.active = true;
    game.update(1 / 60);
    assert.equal(actions.length, 0);
  }
  const actions: CombatAction[] = [],
    game = make("warlock", (action) => actions.push(action));
  target(game, 400);
  (game as any).addSpell("imp");
  game.pets[0].timer = 0;
  game.projectiles = Array.from({ length: 500 }, () => ({
    x: 10000,
    y: 10000,
    vx: 0,
    vy: 0,
    damage: 0,
    radius: 1,
    color: "#000",
    life: 1000,
    pierce: 0,
    slow: 1,
    hit: new Set<number>(),
  }));
  game.update(1 / 60);
  assert.equal(
    actions.length,
    0,
    "a saturated projectile pool cannot announce a companion shot",
  );
});

test("optional combat observation leaves deterministic simulation, random stream and existing events identical", () => {
  for (const hero of CLASSES) {
    const plainEvents: string[] = [],
      observedEvents: string[] = [],
      animator = new CombatAnimator();
    const config = {
      classId: hero.id,
      zone: ZONES[0],
      seed: 912,
      stats: {
        health: 10000,
        power: 10,
        armor: 10,
        haste: 10,
        crit: 12,
        speed: 5,
        regen: 1,
        magnet: 10,
      },
    };
    const plain = new GameEngine({
      ...config,
      onEvent: (event) => plainEvents.push(event.type),
    });
    const observed = new GameEngine({
      ...config,
      onEvent: (event) => observedEvents.push(event.type),
      onAction: (action) =>
        animator.trigger(
          action.actor,
          combatStyle(action),
          action.time,
          action.facing,
          action.ability ? 1 : 0,
        ),
    });
    for (let i = 0; i < 240; i++) {
      const x = Math.sin(i / 35),
        y = Math.cos(i / 35);
      for (const game of [plain, observed]) {
        game.setInput(x, y);
        if (i === 90) game.activate();
        game.update(1 / 60);
      }
      animator.sample(observed.player, observed.time);
      observed.pets.forEach((pet) => animator.sample(pet, observed.time));
    }
    const snapshot = (game: GameEngine) => {
      const { id, date, ...result } = game.result();
      return JSON.stringify({
        time: game.time,
        rng: (game as any).rng.state,
        player: game.player,
        enemies: game.enemies,
        spells: game.spells,
        pets: game.pets,
        projectiles: game.projectiles,
        pickups: game.pickups,
        hazards: game.hazards,
        effects: game.effects,
        result,
      });
    };
    assert.equal(snapshot(observed), snapshot(plain), hero.id);
    assert.deepEqual(observedEvents, plainEvents);
  }
});
