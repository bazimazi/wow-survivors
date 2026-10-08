import test from "node:test";
import assert from "node:assert/strict";
import {
  ActorAnimator,
  FrameCache,
  WALK_KEYS,
  deformVertex,
} from "../src/animation";
import type { AnimationRig } from "../src/animation";
import { freshSave, validateSave } from "../src/progression";

test("gaits follow actual distance, retain idle facing and do not animate blocked movement", () => {
  const animator = new ActorAnimator(),
    actor = {};
  assert.equal(animator.sample(actor, { x: 0, y: 0 }, 0).frame, -1);
  for (let i = 1; i <= 8; i++) {
    const pose = animator.sample(actor, { x: i * 5.5, y: 0 }, i / 60);
    assert.equal(pose.frame, i % 8);
    assert.equal(pose.mirror, false);
  }
  assert.equal(animator.sample(actor, { x: 44, y: 0 }, 0.2).frame, -1);
  const left = animator.sample(actor, { x: 38.5, y: 0 }, 0.22);
  assert.equal(left.mirror, true);
  const idle = animator.sample(actor, { x: 38.5, y: 0 }, 0.24);
  assert.equal(idle.mirror, true);
  assert.equal(idle.frame, -1);
});

test("different frame rates and actor identities preserve distance-based gait timing", () => {
  const a = new ActorAnimator(),
    b = new ActorAnimator(),
    actor = {},
    pet = {};
  a.sample(actor, { x: 0, y: 0 }, 0);
  b.sample(actor, { x: 0, y: 0 }, 0);
  for (let i = 1; i <= 12; i++) a.sample(actor, { x: i * 2, y: i }, i / 60);
  for (let i = 1; i <= 6; i++) b.sample(actor, { x: i * 4, y: i * 2 }, i / 30);
  assert.equal(
    a.sample(actor, { x: 26, y: 13 }, 13 / 60).frame,
    b.sample(actor, { x: 26, y: 13 }, 13 / 60).frame,
  );
  assert.equal(a.sample(pet, { x: 100, y: 0 }, 0.22).frame, -1);
  a.sample(pet, { x: 95, y: 0 }, 0.24);
  assert.equal(a.sample(actor, { x: 28, y: 14 }, 0.24).mirror, false);
});

test("paused and frozen poses hold through repeated renders and resume from their retained phase", () => {
  const a = new ActorAnimator(),
    actor = {};
  a.sample(actor, { x: 0, y: 0 }, 0);
  const held = a.sample(actor, { x: 8, y: 0 }, 0.1);
  for (let i = 0; i < 100; i++)
    assert.deepEqual(a.sample(actor, { x: 8, y: 0 }, 0.1), held);
  assert.deepEqual(a.sample(actor, { x: 8, y: 0 }, 50, { frozen: true }), held);
  const resumed = a.sample(actor, { x: 13.5, y: 0 }, 50.1);
  assert.ok(Math.abs(resumed.phase - held.phase - 0.125) < 1e-9);
});

test("teleports, long frame gaps, clock resets and invalid positions cannot create spurious strides", () => {
  const a = new ActorAnimator(),
    actor = {};
  a.sample(actor, { x: 0, y: 0 }, 0);
  a.sample(actor, { x: 5, y: 0 }, 0.1);
  assert.equal(a.sample(actor, { x: 500, y: 0 }, 0.2).frame, -1);
  assert.equal(a.sample(actor, { x: 501, y: 0 }, 10).frame, -1);
  assert.equal(a.sample(actor, { x: 502, y: 0 }, 0).frame, -1);
  assert.equal(a.sample(actor, { x: NaN, y: Infinity }, 0.1).frame, -1);
  assert.equal(a.sample(actor, { x: 503, y: 0 }, 0.1, { stride: 0 }).frame, -1);
  assert.ok(a.sample(actor, { x: 503, y: 0 }, 0.1).frame >= 0);
});

test("disabling motion resets to the neutral illustration and re-enabling starts from a valid baseline", () => {
  const a = new ActorAnimator(),
    actor = {};
  a.sample(actor, { x: 0, y: 0 }, 0);
  a.sample(actor, { x: 8, y: 0 }, 0.1);
  assert.equal(
    a.sample(actor, { x: 16, y: 0 }, 0.2, { enabled: false }).frame,
    -1,
  );
  assert.equal(
    a.sample(actor, { x: 24, y: 0 }, 0.3, { enabled: false }).phase,
    0,
  );
  assert.equal(a.sample(actor, { x: 29.5, y: 0 }, 0.4).frame, 1);
});

test("all authored rigs retain finite continuous, non-folding geometry inside padded frame bounds", () => {
  assert.equal(WALK_KEYS.length, 8);
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
    for (let frame = 0; frame < 8; frame++) {
      let altered = 0;
      for (let row = 0; row <= 24; row++)
        for (let col = 0; col <= 16; col++) {
          const x = col / 16,
            y = row / 24,
            v = deformVertex(x, y, rig, frame);
          assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
          assert.ok(v.x >= -0.06 && v.x <= 1.06 && v.y >= -0.06 && v.y <= 1.06);
          if (v.x !== x || v.y !== y) altered++;
          const right = deformVertex(x + 0.001, y, rig, frame),
            down = deformVertex(x, y + 0.001, rig, frame);
          const area =
            (right.x - v.x) * (down.y - v.y) - (right.y - v.y) * (down.x - v.x);
          assert.ok(
            area > 0,
            `${rig} frame ${frame} must not fold at ${x},${y}`,
          );
        }
      if (rig !== "totem" || frame % 4 !== 0) assert.ok(altered > 0);
    }
  assert.deepEqual(deformVertex(0.5, 0.8, "biped", -1), { x: 0.5, y: 0.8 });
  const contact = deformVertex(0.3, 0.9, "biped", 0),
    passing = deformVertex(0.7, 0.9, "biped", 2);
  assert.ok(
    passing.y < contact.y - 0.025,
    "one foot lifts while the supporting foot stays down",
  );
});

test("frame cache limits construction per render, shares hits and evicts least recently used frames", () => {
  const disposed: object[] = [];
  const cache = new FrameCache<object>(3, 2, (frame) => disposed.push(frame));
  let built = 0;
  const create = () => ({ id: ++built });
  assert.equal(cache.get("a", create), null);
  cache.beginFrame();
  const a = cache.get("a", create),
    b = cache.get("b", create);
  assert.equal(cache.get("c", create), null);
  assert.equal(cache.get("a", create), a);
  cache.beginFrame();
  cache.get("c", create);
  cache.get("d", create);
  assert.equal(cache.size, 3);
  assert.deepEqual(disposed, [b]);
  assert.equal(cache.get("a", create), a);
  assert.equal(cache.get("b", create), null);
  cache.beginFrame();
  assert.notEqual(cache.get("b", create), b);
  assert.equal(cache.size, 3);
});

test("older saves enable animation safely, validate booleans and preserve all other settings", () => {
  const s = freshSave() as any;
  delete s.settings.animation;
  s.settings.sound = false;
  s.settings.music = true;
  s.settings.musicVolume = 75;
  assert.equal(validateSave(s).settings.animation, true);
  s.settings.animation = "false";
  assert.equal(validateSave(s).settings.animation, true);
  s.settings.animation = false;
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))).settings, {
    animation: false,
    sound: false,
    particles: true,
    screenShake: true,
    music: true,
    musicVolume: 75,
  });
});
