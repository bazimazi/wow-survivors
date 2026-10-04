import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import { CLASSES, ZONES, GEAR_MAP, MATERIALS } from "../src/content";
import type { ClassId } from "../src/content";
import {
  RAGEFIRE_STAGES,
  DEADMINES_STAGES,
  dungeonRoute,
} from "../src/dungeon";
import { RAGEFIRE_GEAR } from "../src/ragefire";
import {
  freshSave,
  heroStats,
  validateSave,
  settleRun,
  claimQuest,
  questProgress,
  canEquip,
  zoneUnlocked,
  expeditionRestriction,
} from "../src/progression";
import type { RunRecord } from "../src/progression";
import { telegraphContains } from "../src/expedition";

function make(classId: ClassId = "mage", seed = 42) {
  const s = freshSave();
  s.selectedClass = classId;
  s.heroes[classId].level = 10;
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === "ragefire")!,
    stats: { ...heroStats(s), health: 10000 },
    professions: { mining: 1 },
    seed,
    characterLevel: 10,
    onConsume: () => true,
  });
  g.spells = [];
  g.enemies = [];
  return g;
}
function arrive(g: GameEngine) {
  g.dungeonStageTime = g.dungeonStage!.duration - 0.001;
  g.update(1 / 60);
  assert.ok(g.boss);
  g.boss.x = g.player.x + 120;
  g.boss.y = g.player.y;
  if (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
  return g.boss;
}
function defeat(g: GameEngine) {
  const b = arrive(g);
  b.hp = 1;
  assert.ok(g.useBomb());
}
function record(id: string, zoneId = "ragefire", count = 4): RunRecord {
  return {
    id,
    classId: "mage",
    zoneId,
    victory: true,
    dungeonBosses: count,
    time: 315,
    kills: 120,
    level: 10,
    gold: 200,
    xp: 100,
    materials: {},
    loot: [],
    date: "2026-10-03T00:00:00Z",
  };
}
test("Ragefire requires its own outdoor clear and checks each selected hero", () => {
  const s = freshSave();
  s.clearedZones = ["westfall"];
  s.heroes.mage.level = 10;
  assert.equal(zoneUnlocked(s, "ragefire"), false);
  assert.equal(
    expeditionRestriction(s, "ragefire"),
    "Defeat the Tirisfal boss to unlock",
  );
  s.clearedZones.push("tirisfal");
  assert.equal(expeditionRestriction(s, "ragefire"), null);
  s.selectedClass = "warlock";
  assert.equal(
    expeditionRestriction(s, "ragefire"),
    "Requires character level 10",
  );
  assert.equal(dungeonRoute("__proto__"), undefined);
});
test("Ragefire legacy clears migrate and four-guardian records validate independently", () => {
  const s = freshSave();
  const loaded = validateSave({
    ...s,
    clearedZones: undefined,
    history: [
      {
        ...record("rfc"),
        classProof: {
          chapter: 2,
          casts: 0,
          actives: 0,
          mastery: 0,
          elites: 0,
          evolutions: 0,
          bosses: 4,
        },
      },
      record("dm", "deadmines", 3),
      record("partial", "ragefire", 3),
    ],
  });
  assert.ok(loaded.clearedZones.includes("ragefire"));
  assert.ok(loaded.clearedZones.includes("deadmines"));
  assert.deepEqual(
    loaded.history.map((r) => r.victory),
    [true, true, false],
  );
  assert.deepEqual(
    loaded.history.map((r) => r.dungeonBosses),
    [4, 3, 3],
  );
  assert.equal(loaded.history[0].classProof?.bosses, 4);
  assert.equal(
    validateSave({ ...s, selectedZone: "ragefire" }).selectedZone,
    "elwynn",
  );
  assert.equal(
    validateSave({ ...s, clearedZones: ["tirisfal"], selectedZone: "ragefire" })
      .selectedZone,
    "ragefire",
  );
});
test("corrupt Ragefire counts are bounded without creating a victory", () => {
  const loaded = validateSave({
    ...freshSave(),
    history: [
      record("negative", "ragefire", -1),
      record("excess", "ragefire", 99),
    ],
  });
  assert.deepEqual(
    loaded.history.map((r) => r.dungeonBosses),
    [0, 4],
  );
  assert.deepEqual(
    loaded.history.map((r) => r.victory),
    [false, false],
  );
});
test("route settlement and Journal milestones never cross-credit the other dungeon", () => {
  const s = freshSave();
  assert.equal(settleRun(s, record("early", "ragefire", 3)), false);
  assert.ok(settleRun(s, record("rfc")));
  assert.equal(s.totals.dungeonBosses, 4);
  assert.equal(s.totals.dungeonWins, 1);
  assert.equal(questProgress(s, "deadmines-clear"), 0);
  assert.equal(claimQuest(s, "deadmines-clear"), false);
  assert.ok(claimQuest(s, "ragefire-clear"));
  assert.equal(claimQuest(s, "ragefire-clear"), false);
  assert.equal(settleRun(s, record("rfc")), false);
  assert.ok(settleRun(s, record("dm", "deadmines", 3)));
  assert.ok(claimQuest(s, "deadmines-clear"));
  assert.equal(s.totals.dungeonBosses, 7);
  assert.equal(s.totals.dungeonWins, 2);
  for (let i = 0; i < 25; i++)
    settleRun(s, { ...record(`later${i}`, "elwynn", 0), victory: false });
  assert.equal(questProgress(validateSave(s), "ragefire-clear"), 1);
});
test("partial return secures one guardian but gives neither a clear nor outdoor reputation", () => {
  const g = make();
  defeat(g);
  g.finish(false);
  const s = freshSave();
  s.reputation.argent = 25;
  const before = { ...s.reputation };
  assert.ok(settleRun(s, g.result(), g.professionGains));
  assert.equal(s.totals.dungeonBosses, 1);
  assert.equal(s.totals.dungeonWins, 0);
  assert.equal(s.inventory.includes(g.loot[0]), true);
  assert.equal(s.clearedZones.includes("ragefire"), false);
  assert.deepEqual(s.reputation, before);
});
test("four stages preserve the build, pause recovery, reset hazards and finish only at Bazzalan", () => {
  const g = make();
  assert.equal(g.landmarks.length, 0);
  assert.ok(g.nodes.every((n) => n.kind === "ore"));
  g.finish(true);
  assert.equal(g.ended, false);
  for (let stage = 0; stage < 4; stage++) {
    assert.equal(g.dungeonStage, RAGEFIRE_STAGES[stage]);
    defeat(g);
    assert.equal(g.dungeonBosses, stage + 1);
    if (stage < 3) {
      assert.ok(g.checkpoint);
      assert.equal(g.ended, false);
      const t = g.time,
        gold = g.gold;
      const looseGold = g.pickups
        .filter((p) => p.kind === "gold")
        .reduce((sum, p) => sum + p.value, 0);
      g.update(0.05);
      assert.equal(g.time, t);
      g.player.hp = 200;
      g.player.resource = 0;
      g.hazards.push({
        x: 0,
        y: 0,
        radius: 20,
        warning: 1,
        maxWarning: 1,
        life: 2,
        damage: 30,
      });
      assert.ok(g.continueDungeon("guard"));
      assert.equal(g.player.hp, 3200);
      assert.equal(g.player.resource, 100);
      assert.equal(g.gold, gold + looseGold);
      assert.equal(g.hazards.length, 0);
      assert.equal(g.dungeonStageTime, 0);
      assert.ok(g.nodes.every((n) => MATERIALS[n.kind].family === "ore"));
    }
  }
  assert.ok(g.ended && g.victory);
  assert.equal(g.dungeonBoons.length, 3);
  assert.equal(g.loot.length, 4);
  assert.equal(g.continueDungeon("guard"), false);
  assert.equal(DEADMINES_STAGES.length, 3);
});
for (const [index, first, second] of [
  [0, "Stone cleave", "Cave-in"],
  [1, "Fire nova", "Molten uppercut"],
  [2, "Shadow volley", "Void summons"],
  [3, "Blade dash", "Venom burst"],
] as const) {
  test(`${RAGEFIRE_STAGES[index].boss} alternates distinct attacks and strengthens phase two`, () => {
    const g = make();
    g.dungeonStageIndex = index;
    const b = arrive(g);
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.ok(g.bossState.attackName.startsWith(first));
    const count = g.hazards.length;
    assert.ok(count > 0);
    assert.ok(g.hazards.every((h) => h.warning > 1 && h.damage > 0));
    if (index === 1) {
      const h = g.hazards[0];
      assert.equal(h.shape, "ring");
      assert.equal(telegraphContains(h, b), false);
    }
    const beforeMinions = g.enemies.filter(
      (e) => e.type === "voidwalker",
    ).length;
    g.hazards = [];
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.ok(g.bossState.attackName.startsWith(second));
    if (index === 2)
      assert.equal(
        g.enemies.filter((e) => e.type === "voidwalker").length - beforeMinions,
        2,
      );
    const initialSecond = g.hazards.length;
    g.hazards = [];
    b.hp = b.maxHp * 0.49;
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.equal(g.bossState.phase, 2);
    assert.ok(g.hazards.length >= count);
    assert.ok(g.bossState.attackName.startsWith(first));
    g.hazards = [];
    b.attackTimer = 0;
    g.update(1 / 60);
    assert.ok(g.hazards.length > initialSecond);
    assert.ok(!g.enemies.some((e) => e.type === "blackguard"));
  });
}
test("all nine classes receive usable guardian loot in all four stages across three seeds", () => {
  for (const c of CLASSES)
    for (const seed of [42, 123, 2026]) {
      const g = make(c.id, seed),
        s = freshSave();
      s.selectedClass = c.id;
      s.heroes[c.id].level = 10;
      for (let stage = 0; stage < 4; stage++) {
        defeat(g);
        const id = g.loot.at(-1)!;
        s.inventory.push(id);
        assert.ok(RAGEFIRE_STAGES[stage].loot.includes(id));
        assert.ok(canEquip(c.id, id), `${c.id} cannot use ${id}`);
        assert.equal(GEAR_MAP[id].level, 10);
        if (stage < 3) g.continueDungeon("edge");
      }
    }
  assert.equal(RAGEFIRE_GEAR.length, 11);
  assert.ok(RAGEFIRE_GEAR.every((g) => g.rarity === "rare" && !g.dropZones));
});
test("stage-local enemy rosters and solid bounds apply to every Ragefire arena", () => {
  for (let stage = 0; stage < 4; stage++) {
    const g = make();
    g.dungeonStageIndex = stage;
    g.dungeonStageTime = 36;
    g.setInput(1, 1);
    for (let i = 0; i < 400; i++) {
      g.update(0.05);
      if (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
    }
    assert.ok(
      Math.abs(g.player.x) <= g.movementBounds.x &&
        Math.abs(g.player.y) <= g.movementBounds.y,
    );
    assert.ok(
      g.enemies.every((e) => RAGEFIRE_STAGES[stage].enemies!.includes(e.type)),
    );
  }
});
