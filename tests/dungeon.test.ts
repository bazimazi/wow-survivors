import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import { DEADMINES_STAGES, DUNGEON_BOONS } from "../src/dungeon";
import { CLASSES, GEAR, GEAR_MAP, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import {
  freshSave,
  heroStats,
  validateSave,
  zoneUnlocked,
  expeditionRestriction,
  settleRun,
  claimQuest,
  canEquip,
} from "../src/progression";
import type { RunRecord } from "../src/progression";

const zone = ZONES.find((z) => z.id === "deadmines")!;
function make(classId: ClassId = "mage", events: string[] = []) {
  const s = freshSave();
  s.selectedClass = classId;
  s.heroes[classId].level = 10;
  const g = new GameEngine({
    classId,
    zone,
    stats: { ...heroStats(s), health: 10000 },
    professions: { mining: 1 },
    characterLevel: 10,
    seed: 42,
    onConsume: () => true,
    onEvent: (e) => events.push(e.type),
  });
  g.spells = [];
  g.enemies = [];
  return g;
}
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60);
}
function arrive(g: GameEngine) {
  g.dungeonStageTime = g.dungeonStage!.duration - 0.01;
  g.update(1 / 60);
  assert.ok(g.boss);
  if (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
  g.boss.x = g.player.x + 40;
  g.boss.y = g.player.y;
  return g.boss;
}
function defeat(g: GameEngine) {
  const b = arrive(g);
  b.hp = 1;
  assert.ok(g.useBomb());
}
const record = (
  id: string,
  zoneId = "westfall",
  victory = true,
): RunRecord => ({
  id,
  classId: "mage",
  zoneId,
  victory,
  time: 420,
  kills: 120,
  level: 10,
  gold: 50,
  xp: 100,
  materials: {},
  loot: [],
  date: "2026-10-03T00:00:00Z",
});

test("Deadmines unlock requires a Westfall clear and entry checks the selected hero level", () => {
  const s = freshSave();
  s.totals.wins = 99;
  s.totals.kills = 500;
  assert.equal(zoneUnlocked(s, "deadmines"), false);
  settleRun(s, record("elwynn", "elwynn"));
  assert.equal(zoneUnlocked(s, "deadmines"), false);
  settleRun(s, record("westfall"));
  assert.equal(zoneUnlocked(s, "deadmines"), true);
  assert.equal(
    expeditionRestriction(s, "deadmines"),
    "Requires character level 10",
  );
  s.heroes.mage.level = 10;
  assert.equal(expeditionRestriction(s, "deadmines"), null);
  s.selectedClass = "warrior";
  assert.equal(
    expeditionRestriction(s, "deadmines"),
    "Requires character level 10",
  );
  assert.equal(expeditionRestriction(s, "unknown"), "Unknown expedition");
});

test("cleared destinations survive history trimming and migrate from retained older victories", () => {
  const s = freshSave();
  settleRun(s, record("clear"));
  for (let i = 0; i < 25; i++)
    settleRun(s, record(`later-${i}`, "elwynn", false));
  assert.equal(s.history.length, 20);
  assert.ok(!s.history.some((r) => r.id === "clear"));
  assert.ok(zoneUnlocked(validateSave(s), "deadmines"));
  const old = {
    ...freshSave(),
    clearedZones: undefined,
    history: [record("legacy")],
  };
  const loaded = validateSave(old);
  assert.deepEqual(loaded.clearedZones, ["westfall"]);
  assert.equal(loaded.totals.dungeonBosses, 0);
  assert.equal(loaded.totals.dungeonWins, 0);
});

test("malformed dungeon history and clear fields are bounded without inventing victory", () => {
  const s = validateSave({
    ...freshSave(),
    clearedZones: ["westfall", "westfall", "bad", "__proto__"],
    history: [
      { ...record("partial", "deadmines"), dungeonBosses: -4 },
      { ...record("full", "deadmines"), dungeonBosses: 3 },
    ],
  });
  assert.deepEqual(s.clearedZones.sort(), ["deadmines", "westfall"]);
  assert.equal(s.history[0].dungeonBosses, 0);
  assert.equal(s.history[0].victory, false);
  assert.equal(s.history[1].victory, true);
  assert.equal(
    validateSave({ ...freshSave(), selectedZone: "deadmines" }).selectedZone,
    "elwynn",
  );
  const valid = freshSave();
  valid.clearedZones = ["westfall"];
  valid.selectedZone = "deadmines";
  assert.equal(
    validateSave(valid).selectedZone,
    "deadmines",
    "low-level heroes may preview an unlocked dungeon",
  );
});

test("each room schedules one boss using its own active clock and never completes on the first guardian", () => {
  const events: string[] = [];
  const g = make("mage", events);
  assert.equal(g.landmarks.length, 0);
  assert.equal(g.nodes.length, 8);
  g.dungeonStageTime = 88;
  g.update(0.05);
  assert.equal(g.boss, null);
  const b = arrive(g);
  assert.equal(g.bossName, "Sneed's Shredder");
  assert.equal(b.type, "golem");
  const count = g.enemies.length;
  advance(g, 1);
  assert.equal(g.enemies.length, count);
  b.hp = 1;
  g.useBomb();
  assert.equal(g.checkpoint, true);
  assert.equal(g.ended, false);
  assert.equal(g.dungeonBosses, 1);
  assert.equal(g.loot.length, 1);
  assert.equal(g.gold, 50);
  assert.equal(g.materials.ore, 4);
  assert.equal(events.filter((e) => e === "boss").length, 1);
  assert.equal(events.filter((e) => e === "checkpoint").length, 1);
  g.finish(true);
  assert.equal(g.ended, false);
});

test("recovery freezes simulation and all combat/consumption actions, then carries the run build", () => {
  const g = make("hunter");
  const b = arrive(g);
  b.hp = 1;
  g.useBomb();
  g.player.hp = 2000;
  g.player.resource = 12;
  g.xp = 3;
  g.level = 5;
  g.spells = [{ id: "autoshot", rank: 3, timer: 0.4, orbitTimer: 0 }];
  const time = g.time,
    hp = g.player.hp,
    power = g.stats.power;
  g.setInput(1, 1);
  advance(g, 5);
  assert.equal(g.time, time);
  assert.equal(g.player.hp, hp);
  assert.equal(g.activate(), false);
  assert.equal(g.dash(), false);
  assert.equal(g.useBomb(), false);
  assert.equal(g.usePotion(), false);
  assert.equal(g.interact(), false);
  assert.equal(g.continueDungeon("invalid"), false);
  assert.equal(g.dungeonStageIndex, 0);
  assert.ok(g.continueDungeon("edge"));
  assert.equal(g.dungeonStageIndex, 1);
  assert.equal(g.dungeonStageTime, 0);
  assert.equal(g.time, time);
  assert.equal(g.player.hp, 5000);
  assert.equal(g.player.resource, 100);
  assert.equal(g.stats.power, power + 10);
  assert.equal(g.level, 5);
  assert.equal(g.spells[0].rank, 3);
  assert.equal(g.player.x, 0);
  assert.equal(g.player.y, 0);
  assert.equal(g.input.x, 0);
  assert.equal(g.loot.length, 1);
  assert.equal(g.continueDungeon("edge"), false, "recovery cannot be replayed");
  assert.equal(g.bossState.attackIndex, 0);
  assert.equal(g.hazards.length, 0);
});

test("dungeon victory needs three ordered guardians and recovery boons stack once per transition", () => {
  const g = make();
  const power = g.stats.power;
  for (let stage = 0; stage < 3; stage++) {
    defeat(g);
    assert.equal(g.dungeonBosses, stage + 1);
    if (stage < 2) assert.ok(g.continueDungeon("edge"));
  }
  assert.equal(g.ended, true);
  assert.equal(g.victory, true);
  assert.equal(g.loot.length, 3);
  assert.equal(g.stats.power, power + 20);
  assert.ok(g.gold >= 200);
  assert.equal(g.result().dungeonBosses, 3);
  assert.equal(g.continueDungeon("guard"), false);
  const loot = [...g.loot];
  g.useBomb();
  g.finish(true);
  assert.deepEqual(g.loot, loot);
});

test("partial returns settle secured boss loot and progress once without outdoor reputation", () => {
  const g = make();
  defeat(g);
  g.finish(false);
  const run = g.result(),
    s = freshSave();
  s.heroes.mage.level = 10;
  assert.equal(run.victory, false);
  assert.equal(run.dungeonBosses, 1);
  assert.ok(settleRun(s, run));
  assert.equal(s.totals.dungeonBosses, 1);
  assert.equal(s.totals.dungeonWins, 0);
  assert.ok(s.inventory.includes(run.loot[0]));
  assert.equal(s.materials.ore, 10);
  const gold = s.gold;
  assert.equal(settleRun(s, run), false);
  assert.equal(s.gold, gold);
  assert.deepEqual(s.reputation, { timbermaw: 0, thorium: 0, argent: 0 });
  assert.equal(claimQuest(s, "deadmines-clear"), false);
});

test("a full dungeon settles clear/journal credit once and rejects premature victory records", () => {
  const s = freshSave();
  assert.equal(
    settleRun(s, { ...record("invalid", "deadmines"), dungeonBosses: 1 }),
    false,
  );
  const g = make();
  for (let i = 0; i < 3; i++) {
    defeat(g);
    if (i < 2) g.continueDungeon("guard");
  }
  assert.ok(settleRun(s, g.result()));
  assert.equal(s.totals.dungeonWins, 1);
  assert.equal(s.totals.dungeonBosses, 3);
  assert.ok(s.clearedZones.includes("deadmines"));
  assert.ok(claimQuest(s, "deadmines-clear"));
  assert.equal(claimQuest(s, "deadmines-clear"), false);
  assert.equal(settleRun(s, g.result()), false);
});

test("all classes receive usable level-10 dungeon gear from every stage across seeds", () => {
  for (const c of CLASSES)
    for (const seed of [42, 123, 2026]) {
      const g = make(c.id);
      g.rng.state = seed;
      const s = freshSave();
      s.selectedClass = c.id;
      s.heroes[c.id].level = 10;
      for (let stage = 0; stage < 3; stage++) {
        defeat(g);
        const id = g.loot.at(-1)!;
        s.inventory.push(id);
        assert.ok(DEADMINES_STAGES[stage].loot.includes(id));
        assert.ok(canEquip(c.id, id), `${c.id} can use ${id}`);
        if (stage < 2) g.continueDungeon("stride");
      }
    }
  assert.equal(GEAR.length, 353);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.ok(
    DEADMINES_STAGES.flatMap((s) => s.loot).every(
      (id) => GEAR_MAP[id].rarity === "rare",
    ),
  );
});

test("rectangular arena boundaries constrain movement, dash, active movement and enemy spawns", () => {
  for (const classId of ["warrior", "hunter"] as const) {
    const g = make(classId);
    g.dungeonStageIndex = 2;
    const bounds = g.movementBounds;
    g.player.x = bounds.x;
    g.player.y = bounds.y;
    g.player.facing = classId === "hunter" ? Math.PI * 1.25 : Math.PI / 4;
    g.setInput(1, 1);
    assert.ok(g.dash());
    g.update(0.05);
    assert.ok(g.activate());
    assert.ok(g.player.x <= bounds.x);
    assert.ok(g.player.y <= bounds.y);
    g.player.resource = 100;
    g.player.activeCooldown = 0;
    g.player.x = -bounds.x;
    g.player.y = -bounds.y;
    g.player.facing += Math.PI;
    g.activate();
    assert.ok(g.player.x >= -bounds.x);
    assert.ok(g.player.y >= -bounds.y);
    assert.ok(
      g.enemies.every(
        (e) => Math.abs(e.x) < bounds.x && Math.abs(e.y) < bounds.y,
      ),
    );
  }
});

test("each dungeon boss uses two readable geometries, strengthens phase two and bounds entities", () => {
  const geometries = [
    ["line", "circle"],
    ["circle", "ring"],
    ["line", "circle"],
  ];
  for (let i = 0; i < 3; i++) {
    const g = make();
    g.dungeonStageIndex = i;
    const b = arrive(g);
    b.x = -250;
    b.y = 0;
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(g.hazards[0].shape || "circle", geometries[i][0]);
    const count = g.hazards.length;
    g.hazards = [];
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(g.hazards[0].shape || "circle", geometries[i][1]);
    g.hazards = [];
    b.hp = b.maxHp * 0.4;
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(g.bossState.phase, 2);
    assert.ok(g.hazards.length >= count);
    if (i === 2) assert.ok(g.enemies.some((e) => e.type === "blackguard"));
    assert.ok(g.hazards.length <= 48);
    assert.ok(g.enemies.length <= 400);
  }
});

test("stage survival clocks and hazards freeze in pause and level-up choices", () => {
  const g = make();
  const b = arrive(g);
  b.x = -250;
  b.attackTimer = 0;
  g.update(1 / 60);
  const time = g.dungeonStageTime,
    warning = g.hazards[0].warning;
  g.paused = true;
  advance(g, 2);
  assert.equal(g.dungeonStageTime, time);
  assert.equal(g.hazards[0].warning, warning);
  g.paused = false;
  g.choosing = true;
  advance(g, 2);
  assert.equal(g.dungeonStageTime, time);
  assert.equal(g.hazards[0].warning, warning);
  assert.equal(DUNGEON_BOONS.length, 3);
});

test("each class's automatic attacks can defeat a dungeon guardian and open recovery", () => {
  for (const c of CLASSES) {
    const g = make(c.id),
      boss = arrive(g);
    boss.x = 70;
    boss.y = 0;
    boss.hp = 60;
    const ids = [
      c.spells[0],
      ...(["hunter", "warlock"].includes(c.id) ? [c.spells[2]] : []),
    ];
    g.spells = ids.map((id) => ({ id, rank: 1, timer: 0.1, orbitTimer: 0 }));
    advance(g, 8);
    assert.ok(
      g.checkpoint,
      `${c.name}'s automatic attacks defeated the guardian`,
    );
    assert.equal(g.dungeonBosses, 1);
    assert.equal(g.ended, false);
  }
});
