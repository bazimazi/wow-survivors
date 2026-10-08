import test from "node:test";
import assert from "node:assert/strict";
import { ControllerInput, controllerStick } from "../src/controller";
import type { ControllerDevice } from "../src/controller";
import { GameEngine } from "../src/engine";
import { ZONES } from "../src/content";
import { freshSave, heroStats } from "../src/progression";

function pad(index = 0): ControllerDevice {
  return {
    index,
    id: `pad-${index}`,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}
function press(p: ControllerDevice, ...indices: number[]) {
  p.buttons = p.buttons.map((_, i) => ({
    pressed: indices.includes(i),
    value: indices.includes(i) ? 1 : 0,
  }));
}
function ready(p = pad()) {
  const input = new ControllerInput();
  press(p, 0);
  assert.deepEqual(input.sample([p], 0).pressed, []);
  press(p);
  input.sample([p], 16);
  return { input, p };
}

test("radial dead zone removes drift and preserves analog direction and strength", () => {
  assert.deepEqual(controllerStick(0.12, -0.12), { x: 0, y: 0 });
  assert.deepEqual(controllerStick(0.2, 0), { x: 0, y: 0 });
  const half = controllerStick(0.6, 0);
  assert.ok(Math.abs(half.x - 0.5) < 1e-12);
  const diagonal = controllerStick(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.equal(diagonal.x, diagonal.y);
});
test("missing, nonfinite and out-of-range axes cannot produce invalid movement", () => {
  assert.deepEqual(controllerStick(NaN, Infinity), { x: 0, y: 0 });
  assert.deepEqual(controllerStick(undefined, undefined), { x: 0, y: 0 });
  assert.deepEqual(controllerStick(10, 0), { x: 1, y: 0 });
  const { input, p } = ready();
  p.axes = [];
  assert.deepEqual(input.sample([p], 32).movement, { x: 0, y: 0 });
});
test("sparse device indices are selected by activity and ownership stays with one controller", () => {
  const p = pad(3),
    other = pad(0),
    input = new ControllerInput();
  input.sample([other, null, null, p], 0);
  assert.equal(input.index, null);
  press(p, 0);
  input.sample([other, null, null, p], 16);
  assert.equal(input.index, 3);
  press(p);
  input.sample([other, null, null, p], 32);
  press(other, 3);
  assert.deepEqual(input.sample([other, null, null, p], 48).pressed, []);
  assert.equal(input.index, 3);
});
test("nonstandard and disconnected controllers never supply actions", () => {
  const p = pad(),
    input = new ControllerInput();
  press(p, 0);
  p.mapping = "";
  assert.equal(input.sample([p], 0).activity, false);
  p.mapping = "standard";
  p.connected = false;
  assert.equal(input.sample([p], 16).activity, false);
  assert.equal(input.index, null);
});
test("held buttons produce exactly one action and release permits another", () => {
  const { input, p } = ready();
  press(p, 2, 3);
  assert.deepEqual(input.sample([p], 32).pressed, [2, 3]);
  for (let t = 48; t < 1000; t += 16)
    assert.deepEqual(input.sample([p], t).pressed, []);
  press(p);
  input.sample([p], 1000);
  press(p, 3);
  assert.deepEqual(input.sample([p], 1016).pressed, [3]);
});
test("analog triggers use a deliberate threshold and ignore nonfinite values", () => {
  const { input, p } = ready();
  p.buttons[6].value = 0.4;
  p.buttons[7].value = NaN;
  assert.deepEqual(input.sample([p], 32).pressed, []);
  p.buttons[6].value = 0.7;
  assert.deepEqual(input.sample([p], 48).pressed, [6]);
});
test("D-pad diagonals are normalized and take precedence over a drifting stick", () => {
  const { input, p } = ready();
  p.axes = [-1, 0, 0, 0];
  press(p, 12, 15);
  const sample = input.sample([p], 32);
  assert.ok(sample.movement.x > 0 && sample.movement.y < 0);
  assert.ok(
    Math.abs(Math.hypot(sample.movement.x, sample.movement.y) - 1) < 1e-12,
  );
});
test("menu direction repeats after delay without catch-up bursts", () => {
  const { input, p } = ready();
  p.axes = [1, 0, 0, 0];
  assert.equal(input.sample([p], 32).direction, "right");
  assert.equal(input.sample([p], 300).direction, null);
  assert.equal(input.sample([p], 382).direction, "right");
  assert.equal(input.sample([p], 400).direction, null);
  assert.equal(input.sample([p], 502).direction, "right");
  assert.equal(input.sample([p], 10000).direction, "right");
  assert.equal(input.sample([p], 10001).direction, null);
  p.axes = [0, -1, 0, 0];
  assert.equal(input.sample([p], 10016).direction, "up");
});
test("screen transitions require neutral buttons and both sticks before any new action", () => {
  const { input, p } = ready();
  press(p, 0);
  assert.deepEqual(input.sample([p], 32).pressed, [0]);
  input.requireNeutral();
  press(p, 1);
  assert.deepEqual(input.sample([p], 48).pressed, []);
  press(p);
  p.axes = [0, 0, 0, 1];
  assert.equal(input.sample([p], 64).scroll, 0);
  p.axes = [0, 0, 0, 0];
  input.sample([p], 80);
  press(p, 1);
  assert.deepEqual(input.sample([p], 96).pressed, [1]);
});
test("background sampling cannot resume with held input", () => {
  const { input, p } = ready();
  press(p, 9);
  assert.deepEqual(input.sample([p], 32, false).pressed, []);
  assert.deepEqual(input.sample([p], 48, true).pressed, []);
  press(p);
  input.sample([p], 64);
  press(p, 9);
  assert.deepEqual(input.sample([p], 80).pressed, [9]);
});
test("disconnect zeros movement once and does not transfer an expedition to another pad", () => {
  const { input, p } = ready();
  p.axes = [1, 0, 0, 0];
  assert.equal(input.sample([p], 32).movement.x, 1);
  const other = pad(2);
  press(other, 9);
  const lost = input.sample([null, null, other], 48);
  assert.equal(lost.disconnected, true);
  assert.deepEqual(lost.movement, { x: 0, y: 0 });
  assert.equal(input.index, null);
  assert.equal(input.sample([null, null, other], 64).disconnected, false);
  assert.deepEqual(input.sample([null, null, other], 80).pressed, []);
});
test("replacing a controller at the same index still requires safe reconnection", () => {
  const { input } = ready();
  const replacement = pad();
  replacement.id = "replacement";
  press(replacement, 0);
  assert.equal(input.sample([replacement], 32).disconnected, true);
  assert.deepEqual(input.sample([replacement], 48).pressed, []);
});
test("controller analog movement feeds real combat without changing keyboard normalization", () => {
  const { input, p } = ready();
  const game = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    seed: 1,
  });
  game.enemies = [];
  p.axes = [0.6, 0, 0, 0];
  const sample = input.sample([p], 32);
  game.setInput(sample.movement.x, sample.movement.y);
  game.update(1 / 60);
  const half = game.player.x;
  game.player.x = 0;
  game.setInput(1, 0);
  game.update(1 / 60);
  assert.ok(Math.abs(game.player.x - half * 2) < 1e-12);
});
