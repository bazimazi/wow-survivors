import test from "node:test";
import assert from "node:assert/strict";
import { ActorAnimator, FrameCache, QueuedFrameCache } from "../src/animation";
import { CREATURE_ART } from "../src/creature-animation";
import { creatureCrop } from "../src/animation-canvas";
import { ZONES } from "../src/content";
import { DUNGEONS } from "../src/dungeon";
import { DUSKWOOD_SPRITES } from "../src/duskwood";
import { SHADOWFANG_SPRITES } from "../src/shadowfang";

test("every existing creature roster and illustrated guardian has valid animation metadata", () => {
  const types = new Set(ZONES.flatMap((zone) => zone.enemies));
  for (const route of DUNGEONS)
    for (const stage of route.stages) {
      types.add(stage.enemy);
      stage.enemies?.forEach((type) => types.add(type));
    }
  Object.keys(DUSKWOOD_SPRITES).forEach((type) => types.add(type));
  Object.keys(SHADOWFANG_SPRITES).forEach((type) => types.add(type));
  for (const type of types) {
    if (type === "smite") continue;
    const art = CREATURE_ART[type];
    assert.ok(art, type);
    assert.ok(Number.isInteger(art.index) && art.index >= 0);
    assert.ok(art.stride > 0 && art.size > 0);
  }
  assert.equal(Object.keys(CREATURE_ART).length, 36);
  assert.equal(
    new Set(Object.values(CREATURE_ART).map((a) => `${a.atlas}:${a.index}`))
      .size,
    35,
  );
  for (const [type, index] of Object.entries(DUSKWOOD_SPRITES))
    assert.equal(CREATURE_ART[type].index, index);
  for (const [type, index] of Object.entries(SHADOWFANG_SPRITES))
    assert.equal(CREATURE_ART[type].index, index);
});

test("measured creature crops fit their atlas and scale consistently at different resolutions", () => {
  for (const art of Object.values(CREATURE_ART)) {
    const crop = creatureCrop(art.atlas, art.index, 1254, 1254);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0);
    assert.ok(
      crop.x + crop.width <= 1254.000001 && crop.y + crop.height <= 1254.000001,
    );
    const double = creatureCrop(art.atlas, art.index, 2508, 2508);
    for (const key of ["x", "y", "width", "height"] as const)
      assert.equal(double[key], crop[key] * 2);
  }
  assert.equal(creatureCrop("shadowfang", 7, 1254, 1254).width, 482);
  assert.equal(creatureCrop("duskwood", 1, 1254, 1254).width, 374);
});

test("identity offsets stagger movement without altering distance timing or idle/freeze behavior", () => {
  const a = new ActorAnimator(),
    first = {},
    second = {};
  const options = { stride: 40, phaseOffset: 3 / 8 };
  assert.equal(a.sample(first, { x: 0, y: 0 }, 0, options).frame, -1);
  a.sample(second, { x: 0, y: 0 }, 0, { stride: 40 });
  const moving = a.sample(first, { x: -5, y: 0 }, 0.1, options);
  assert.equal(moving.frame, 4);
  assert.equal(moving.mirror, true);
  assert.equal(a.sample(second, { x: -5, y: 0 }, 0.1, { stride: 40 }).frame, 1);
  assert.deepEqual(
    a.sample(first, { x: -5, y: 0 }, 0.2, { ...options, frozen: true }),
    moving,
  );
  assert.equal(a.sample(first, { x: -5, y: 0 }, 0.3, options).frame, -1);
  const teleported = a.sample(first, { x: 500, y: 0 }, 0.4, options);
  assert.equal(teleported.frame, -1);
  assert.equal(teleported.phase, 3 / 8);
});

test("queued creature misses are fair, duplicate requests are shared and construction is budgeted", () => {
  const cache = new QueuedFrameCache<object>(8, 1);
  const built: string[] = [];
  const request = (key: string) =>
    cache.get(key, () => {
      built.push(key);
      return { key };
    });
  request("background");
  request("background");
  request("middle");
  request("foreground");
  assert.equal(cache.pendingSize, 3);
  for (let i = 0; i < 3; i++) {
    request(`new-front-${i}`);
    cache.beginFrame();
    assert.equal(built.length, i + 1);
  }
  assert.deepEqual(built, ["background", "middle", "foreground"]);
  const frame = request("background");
  assert.equal(request("background"), frame);
});

test("queued work and retained frames stay bounded, eviction disposes storage and cancel stops builds", () => {
  const disposed: number[] = [],
    built: number[] = [];
  const cache = new QueuedFrameCache<number>(3, 2, (value) =>
    disposed.push(value),
  );
  const request = (id: number) =>
    cache.get(String(id), () => {
      built.push(id);
      return id;
    });
  for (let i = 1; i <= 1000; i++) request(i);
  assert.equal(cache.pendingSize, 3);
  assert.equal(cache.size, 0);
  cache.beginFrame();
  assert.deepEqual(built, [1, 2]);
  assert.equal(cache.pendingSize, 1);
  cache.beginFrame();
  request(1);
  request(4);
  cache.beginFrame();
  assert.equal(cache.size, 3);
  assert.deepEqual(disposed, [2]);
  request(5);
  cache.cancelPending();
  cache.beginFrame();
  assert.deepEqual(built, [1, 2, 3, 4]);
  assert.equal(cache.pendingSize, 0);
});

test("crowd frame construction cannot spend the hero's independent frame budget", () => {
  const creatures = new QueuedFrameCache<object>(128, 1),
    heroes = new FrameCache<object>(192, 2);
  for (let i = 0; i < 400; i++) creatures.get(String(i), () => ({ i }));
  creatures.beginFrame();
  heroes.beginFrame();
  assert.ok(heroes.get("hero", () => ({})));
  assert.ok(heroes.get("pet", () => ({})));
  assert.equal(
    heroes.get("third", () => ({})),
    null,
  );
  assert.equal(creatures.size, 1);
  assert.equal(creatures.pendingSize, 127);
});
