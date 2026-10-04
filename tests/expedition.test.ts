import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import type { EngineConfig } from "../src/engine";
import {
  BLESSINGS,
  BOSS_IDENTITIES,
  createLandmarks,
  telegraphContains,
} from "../src/expedition";
import { ZONES, GEAR_MAP, CLASSES } from "../src/content";
import {
  freshSave,
  heroStats,
  canEquip,
  settleRun,
  validateSave,
  claimQuest,
} from "../src/progression";

function make(
  zone = ZONES[0],
  classId = "mage" as (typeof CLASSES)[number]["id"],
  onEvent?: EngineConfig["onEvent"],
) {
  const g = new GameEngine({
    classId,
    zone,
    stats: { ...heroStats(freshSave(), classId), health: 10000 },
    professions: {},
    characterLevel: 1,
    seed: 42,
    onEvent,
  });
  g.enemies = [];
  g.spells = [];
  return g;
}
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60);
}

test("line, circle and annulus geometry includes the body and preserves safe centers", () => {
  const line = {
    x: 0,
    y: 0,
    shape: "line" as const,
    end: { x: 200, y: 100 },
    radius: 20,
  };
  assert.ok(telegraphContains(line, { x: 100, y: 50 }));
  assert.equal(telegraphContains(line, { x: 0, y: 100 }), false);
  assert.equal(telegraphContains(line, { x: 260, y: 130 }), false);
  assert.ok(
    telegraphContains({ ...line, end: { x: 0, y: 0 } }, { x: 30, y: 0 }),
  );
  const ring = {
    x: 0,
    y: 0,
    shape: "ring" as const,
    innerRadius: 100,
    radius: 200,
  };
  assert.equal(telegraphContains(ring, { x: 0, y: 0 }), false);
  assert.ok(telegraphContains(ring, { x: 90, y: 0 }));
  assert.ok(telegraphContains(ring, { x: 210, y: 0 }));
  assert.equal(telegraphContains(ring, { x: 215, y: 0 }), false);
  assert.ok(telegraphContains({ x: 0, y: 0, radius: 40 }, { x: 54, y: 0 }));
});

test("telegraphs warn before damage, resolve once, and freeze during pause and choices", () => {
  const g = make();
  g.stats.regen = 0;
  g.hazards = [{ x: 0, y: 0, radius: 60, warning: 1, life: 2.5, damage: 30 }];
  const hp = g.player.hp;
  advance(g, 0.5);
  assert.equal(g.player.hp, hp);
  g.paused = true;
  advance(g, 1);
  assert.ok(g.hazards[0].warning > 0.49);
  g.paused = false;
  g.choosing = true;
  advance(g, 1);
  assert.equal(g.player.hp, hp);
  g.choosing = false;
  advance(g, 0.6);
  assert.ok(g.player.hp < hp);
  const after = g.player.hp;
  advance(g, 0.8);
  assert.equal(g.player.hp, after);
  assert.ok(g.hazards[0].resolved);
});

test("the original three outdoor bosses have distinct identities, alternating attacks and stronger second phases", () => {
  for (const zone of ZONES.filter((z) =>
    ["elwynn", "westfall", "tirisfal"].includes(z.id),
  )) {
    const g = make({ ...zone, duration: 0.01 });
    g.update(1 / 60);
    const boss = g.boss!;
    assert.equal(boss.type, BOSS_IDENTITIES[zone.id].enemy);
    boss.x = -250;
    boss.y = 0;
    boss.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(g.hazards.length, zone.id === "westfall" ? 3 : 1);
    assert.equal(g.hazards[0].shape, zone.id === "tirisfal" ? "ring" : "line");
    const first = g.hazards[0];
    if (zone.id === "elwynn") {
      g.player.y = 300;
      advance(g, 1.4);
      assert.ok(
        Math.abs(boss.x - first.end!.x) < 20,
        "Hogger actually charges along the marked lane",
      );
    }
    g.hazards = [];
    boss.attackTimer = 0;
    g.player.x = boss.x + 250;
    g.player.y = boss.y;
    g.update(1 / 60);
    assert.ok(
      g.hazards.every((h) => !h.shape),
      "alternate attacks use circles",
    );
    assert.match(
      g.bossState.attackName,
      zone.id === "elwynn"
        ? /stomp/
        : zone.id === "westfall"
          ? /Dynamite/
          : /Grave/,
    );
    g.hazards = [];
    boss.hp = boss.maxHp * 0.4;
    boss.attackTimer = 0;
    g.bossState.attackIndex = 0;
    g.update(1 / 60);
    assert.equal(g.bossState.phase, 2);
    if (zone.id === "westfall") assert.equal(g.hazards.length, 5);
    else assert.ok(g.hazards[0].radius > first.radius);
    assert.ok(g.hazards.every((h) => h.warning > 1 && h.life > h.warning));
  }
});

test("a ring's safe center avoids damage while its annulus hurts", () => {
  for (const x of [0, 150]) {
    const g = make();
    g.stats.regen = 0;
    g.player.x = x;
    g.hazards = [
      {
        x: 0,
        y: 0,
        shape: "ring",
        radius: 200,
        innerRadius: 100,
        warning: 0.1,
        life: 0.6,
        damage: 50,
      },
    ];
    advance(g, 0.2);
    assert.equal(g.player.hp === g.player.maxHp, x === 0);
  }
});

test("all zones contain six reachable unique landmarks with two of each kind", () => {
  for (const z of ZONES.filter((z) => !z.dungeon)) {
    const list = createLandmarks(z.id);
    assert.equal(new Set(list.map((l) => l.id)).size, 6);
    for (const kind of ["shrine", "cache", "ritual"])
      assert.equal(list.filter((l) => l.kind === kind).length, 2);
    assert.ok(list.every((l) => Math.abs(l.x) < 2000 && Math.abs(l.y) < 2000));
  }
});

test("discovery happens once; far, paused and boss-phase interactions are rejected", () => {
  const events: string[] = [],
    g = make(ZONES[0], "mage", (e) => events.push(e.type));
  assert.equal(g.interact(), false);
  g.update(1 / 60);
  g.update(1 / 60);
  assert.equal(events.filter((e) => e === "discovery").length, 1);
  Object.assign(g.player, { x: g.landmarks[0].x, y: g.landmarks[0].y });
  g.paused = true;
  assert.equal(g.interact(), false);
  g.paused = false;
  g.choosing = true;
  assert.equal(g.interact(), false);
  g.choosing = false;
  g.time = ZONES[0].duration;
  g.update(1 / 60);
  assert.equal(g.interact(), false);
});

test("shrines freeze every action, cancellation preserves the choice, and blessings stack only once per shrine", () => {
  const g = make(),
    start = { ...g.stats };
  Object.assign(g.player, { x: g.landmarks[0].x, y: g.landmarks[0].y });
  assert.ok(g.interact());
  advance(g, 2);
  assert.equal(g.time, 0);
  g.setInput(1, 0);
  g.player.hp -= 50;
  assert.equal(g.activate(), false);
  assert.equal(g.dash(), false);
  assert.equal(g.usePotion(), false);
  assert.equal(g.useBomb(), false);
  assert.equal(g.chooseBlessing("invalid"), false);
  assert.ok(g.leaveShrine());
  assert.equal(g.landmarks[0].state, "ready");
  assert.ok(g.interact());
  assert.ok(g.chooseBlessing("might"));
  assert.equal(g.stats.power, start.power + 12);
  assert.equal(g.completedEncounters, 1);
  assert.equal(g.chooseBlessing("might"), false);
  assert.equal(g.interact(), false);
  Object.assign(g.player, { x: g.landmarks[3].x, y: g.landmarks[3].y });
  assert.ok(g.interact());
  assert.ok(g.chooseBlessing("might"));
  assert.equal(g.stats.power, start.power + 24);
  assert.deepEqual(g.blessings, ["might", "might"]);
  const other = make();
  assert.equal(other.stats.power, start.power);
});

test("all three blessings change their advertised stats", () => {
  for (const b of BLESSINGS) {
    const g = make(),
      before = { ...g.stats };
    Object.assign(g.player, { x: 340, y: 180 });
    g.interact();
    g.chooseBlessing(b.id);
    for (const [stat, n] of Object.entries(b.stats))
      assert.equal(
        g.stats[stat as keyof typeof g.stats],
        before[stat as keyof typeof before] + n!,
      );
  }
});

test("caches require all three guards and award eligible loot only once for every class", () => {
  for (const c of CLASSES) {
    const g = make(ZONES[0], c.id),
      l = g.landmarks[1];
    Object.assign(g.player, { x: l.x, y: l.y });
    assert.ok(g.interact());
    assert.equal(l.guardIds.length, 3);
    assert.equal(g.loot.length, 0);
    assert.equal(g.interact(), false);
    for (const id of l.guardIds.slice(0, 2))
      g.enemies.find((e) => e.id === id)!.dead = true;
    g.update(1 / 60);
    assert.equal(l.state, "active");
    assert.equal(g.loot.length, 0);
    g.enemies.find((e) => e.id === l.guardIds[2])!.dead = true;
    g.update(1 / 60);
    assert.equal(l.state, "complete");
    assert.equal(g.gold, 30);
    assert.equal(g.xp, 16);
    const loot = g.loot[0];
    assert.ok(canEquip(c.id, loot));
    assert.ok((GEAR_MAP[loot].level || 1) <= 1);
    assert.equal(
      Object.values(g.materials).reduce((sum, n) => sum + n!, 0),
      3,
    );
    g.choosing = false;
    g.xp = 0;
    advance(g, 0.1);
    assert.equal(g.gold, 30);
    assert.equal(g.loot.length, 1);
  }
});

test("a capped enemy scene cannot consume a cache or create missing guards", () => {
  const g = make(),
    l = g.landmarks[1];
  const template = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: heroStats(freshSave()),
    professions: {},
    seed: 42,
  }).enemies[0];
  g.enemies = Array.from({ length: 398 }, (_, id) => ({ ...template, id }));
  Object.assign(g.player, { x: l.x, y: l.y });
  assert.equal(g.interact(), false);
  assert.equal(l.state, "ready");
  assert.equal(l.guardIds.length, 0);
});

test("rituals progress in range, decay outside, freeze during choices, and reward once", () => {
  const g = make(),
    l = g.landmarks[2];
  Object.assign(g.player, { x: l.x, y: l.y });
  assert.ok(g.interact());
  advance(g, 5);
  assert.ok(l.progress > 4.9);
  assert.ok(g.enemies.length >= 3);
  g.player.x += 300;
  advance(g, 2);
  assert.ok(Math.abs(l.progress - 4) < 0.05);
  g.paused = true;
  advance(g, 3);
  assert.ok(Math.abs(l.progress - 4) < 0.05);
  g.paused = false;
  Object.assign(g.player, { x: 340, y: 180 });
  g.interact();
  advance(g, 2);
  assert.ok(Math.abs(l.progress - 4) < 0.05);
  g.leaveShrine();
  Object.assign(g.player, { x: l.x, y: l.y });
  g.player.hp = 100;
  l.progress = 19.95;
  advance(g, 0.1);
  assert.equal(l.state, "complete");
  assert.equal(g.gold, 40);
  assert.equal(g.xp, 24);
  assert.ok(g.player.hp > 120);
  assert.equal(
    Object.values(g.materials).reduce((sum, n) => sum + n!, 0),
    5,
  );
  g.choosing = false;
  g.xp = 0;
  advance(g, 0.2);
  assert.equal(g.gold, 40);
});

test("only one defended encounter starts at a time, and active rituals can finish during a boss fight", () => {
  const g = make(),
    l = g.landmarks[2];
  Object.assign(g.player, { x: l.x, y: l.y });
  g.interact();
  Object.assign(g.player, { x: g.landmarks[1].x, y: g.landmarks[1].y });
  assert.equal(g.interact(), false);
  Object.assign(g.player, { x: l.x, y: l.y });
  l.progress = 19.99;
  g.time = ZONES[0].duration;
  g.update(1 / 60);
  assert.ok(g.boss);
  assert.equal(l.state, "complete");
});

test("encounter history and exploration quests migrate old saves and settle once", () => {
  const old = freshSave();
  const { encounters, ...oldTotals } = old.totals;
  const s = validateSave({ ...old, totals: oldTotals });
  assert.equal(s.totals.encounters, 0);
  const g = make();
  for (const l of g.landmarks) l.state = "complete";
  const r = g.result();
  r.loot = ["lionheart", "lionheart"];
  assert.ok(settleRun(s, r));
  const gold = s.gold;
  assert.equal(s.totals.encounters, 6);
  assert.equal(s.inventory.filter((id) => id === "lionheart").length, 1);
  assert.equal(settleRun(s, r), false);
  assert.equal(s.gold, gold);
  assert.ok(claimQuest(s, "explorer"));
  assert.equal(claimQuest(s, "explorer"), false);
  const loaded = validateSave(s);
  assert.equal(loaded.totals.encounters, 6);
  assert.equal(loaded.history[0].encounters, 6);
  delete r.encounters;
  assert.equal(validateSave({ ...s, history: [r] }).history[0].encounters, 0);
});
