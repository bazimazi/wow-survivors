import test from "node:test";
import assert from "node:assert/strict";
import { FollowCamera, RenderPositions } from "../src/presentation";

test("120 Hz presentation fills intermediate positions between authoritative 60 Hz ticks", () => {
  const positions = new RenderPositions(),
    actor = { x: 0, y: 0 };
  const samples: number[] = [];
  for (let step = 0; step < 12; step++) {
    positions.capture([actor]);
    actor.x += 4;
    const authoritative = JSON.stringify(actor);
    for (const alpha of [0, 0.5]) {
      positions.alpha = alpha;
      samples.push(positions.at(actor).x);
      assert.equal(JSON.stringify(actor), authoritative);
    }
  }
  assert.ok(samples.every((x, i) => i === 0 || x - samples[i - 1] === 2));
  positions.alpha = 1;
  assert.deepEqual(positions.at(actor), actor);
});

test("new actors and teleports snap rather than streaking across the battlefield", () => {
  const positions = new RenderPositions(),
    actor = { x: 0, y: 0 };
  positions.alpha = 0.5;
  assert.deepEqual(positions.at(actor), actor);
  positions.capture([actor]);
  actor.x = 1000;
  assert.deepEqual(positions.at(actor), actor);
});

test("follow camera converges consistently at different render rates and holds while paused", () => {
  const at = (fps: number) => {
    const camera = new FollowCamera();
    camera.sample({ x: 0, y: 0 }, 0, false, true);
    for (let i = 0; i < fps; i++)
      camera.sample({ x: 100, y: 50 }, 1 / fps, false, true);
    return camera;
  };
  const a = at(60),
    b = at(144),
    target = { x: 100, y: 50 };
  assert.ok(
    Math.abs(
      a.sample(target, 0.00001, false, true).x -
        b.sample(target, 0.00001, false, true).x,
    ) < 1e-8,
  );
  const before = a.sample(target, 1 / 60, true, true);
  assert.deepEqual(a.sample({ x: 120, y: 60 }, 1, true, true), before);
  assert.deepEqual(a.sample({ x: 1200, y: 800 }, 1 / 60, false, true), {
    x: 1200,
    y: 800,
  });
  assert.deepEqual(a.sample(target, 1 / 60, false, false), target);
});
