import test from "node:test";
import assert from "node:assert/strict";
import { paintedVertex, IDLE_FRAME } from "../src/painted-rig";
import type { PaintedProfile } from "../src/painted-rig";
import type { AnimationRig } from "../src/animation";
import { CLASSES } from "../src/content";
import {
  combatFrame,
  CombatAnimator,
  COMBAT_DURATION,
} from "../src/combat-animation";

test("painted texture joints remain connected and non-folding for every rig, class and facing", () => {
  const profiles: [AnimationRig, PaintedProfile | undefined, boolean][] = [];
  for (const hero of CLASSES)
    for (const back of [false, true])
      profiles.push([
        ["mage", "priest", "warlock", "druid"].includes(hero.id)
          ? "robe"
          : "biped",
        hero.id,
        back,
      ]);
  for (const rig of [
    "quadruped",
    "heavy",
    "arachnid",
    "slither",
    "hover",
    "totem",
  ] as const)
    profiles.push([rig, undefined, false]);
  for (const profile of ["beast-front", "bear", "mount", "cat"] as const)
    profiles.push(["quadruped", profile, false]);
  profiles.push(["biped", "imp", false], ["heavy", "moonkin", false]);
  for (const [rig, profile, back] of profiles)
    for (const frame of [
      ...Array.from({ length: 26 }, (_, i) => i),
      ...Array.from({ length: 8 }, (_, i) => IDLE_FRAME + i),
    ])
      for (let row = 0; row <= 20; row++)
        for (let col = 0; col <= 20; col++) {
          const x = col / 20,
            y = row / 20,
            v = paintedVertex(x, y, rig, frame, profile, back);
          assert.ok(
            v.x >= -0.125 && v.x <= 1.125 && v.y >= -0.125 && v.y <= 1.125,
          );
          const right = paintedVertex(x + 0.001, y, rig, frame, profile, back),
            down = paintedVertex(x, y + 0.001, rig, frame, profile, back);
          const area =
            (right.x - v.x) * (down.y - v.y) - (right.y - v.y) * (down.x - v.x);
          assert.ok(
            area > 0,
            `${rig}/${profile}/${back}/${frame} folds at ${x},${y}`,
          );
        }
});

test("feet lift independently, sword/casting arms move visibly and neutral art stays exact", () => {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  assert.deepEqual(paintedVertex(0.3, 0.8, "biped", -1, "warrior"), {
    x: 0.3,
    y: 0.8,
  });
  const support = paintedVertex(0.3, 0.94, "biped", 2, "warrior"),
    lift = paintedVertex(0.7, 0.94, "biped", 2, "warrior");
  assert.ok(lift.y < support.y - 0.055);
  const windup = paintedVertex(
    0.15,
    0.38,
    "biped",
    combatFrame("strike", 1),
    "warrior",
  );
  const strike = paintedVertex(
    0.15,
    0.38,
    "biped",
    combatFrame("strike", 2),
    "warrior",
  );
  assert.ok(
    distance(windup, strike) > 0.09,
    "weapon draw-back and release must be visible at gameplay scale",
  );
  const hand = paintedVertex(
    0.83,
    0.59,
    "robe",
    combatFrame("cast", 2),
    "mage",
  );
  assert.ok(distance(hand, { x: 0.83, y: 0.59 }) > 0.04);
  const idle = paintedVertex(0.7, 0.5, "biped", IDLE_FRAME + 2, "warrior");
  assert.notDeepEqual(idle, { x: 0.7, y: 0.5 });
});

test("accepted attacks begin at release and recover without delaying gameplay or restarting", () => {
  const animator = new CombatAnimator(),
    actor = {};
  assert.equal(animator.trigger(actor, "strike", 1, 0, 0, true), true);
  assert.equal(animator.sample(actor, 1)?.frame, combatFrame("strike", 2));
  assert.equal(animator.trigger(actor, "strike", 1.01, 0, 0, true), false);
  assert.equal(
    animator.sample(actor, 1 + COMBAT_DURATION * 0.5)?.frame,
    combatFrame("strike", 4),
  );
  assert.equal(animator.sample(actor, 1 + COMBAT_DURATION + 0.001), null);
});
