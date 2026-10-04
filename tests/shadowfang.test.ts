import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine";
import type { EngineConfig, Enemy } from "../src/engine";
import { CLASSES, GEAR, GEAR_MAP, RECIPES, SLOTS, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import { dungeonRoute } from "../src/dungeon";
import {
  SHADOWFANG_STAGES,
  SHADOWFANG_GEAR,
  SHADOWFANG_SOURCES,
  SHADOWFANG_SPRITES,
} from "../src/shadowfang";
import { WARDROBE_CATALOG } from "../src/wardrobe-ui";
import { telegraphContains } from "../src/expedition";
import { materialFor } from "../src/resources";
import {
  freshSave,
  heroStats,
  validateSave,
  settleRun,
  canEquip,
  expeditionRestriction,
  zoneUnlocked,
  claimQuest,
  questProgress,
  equip,
  acceptProfessionQuest,
  professionQuestSnapshots,
} from "../src/progression";
import type { RunRecord } from "../src/progression";

function make(
  classId: ClassId = "mage",
  seed = 42,
  overrides: Partial<EngineConfig> = {},
) {
  const s = freshSave();
  s.selectedClass = classId;
  s.heroes[classId].level = 15;
  const g = new GameEngine({
    classId,
    zone: ZONES.find((z) => z.id === "shadowfang")!,
    stats: { ...heroStats(s), health: 10000, crit: 0 },
    professions: {},
    characterLevel: 15,
    seed,
    onConsume: () => true,
    ...overrides,
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  return g;
}
function drain(g: GameEngine) {
  while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
}
function arrive(g: GameEngine) {
  drain(g);
  g.dungeonStageTime = g.dungeonStage!.duration - 0.001;
  g.update(1 / 60);
  drain(g);
  assert.ok(g.boss);
  g.enemies = [g.boss];
  Object.assign(g.boss, { x: 120, y: 0, speed: 0 });
  return g.boss;
}
function defeat(g: GameEngine) {
  const b = arrive(g);
  b.hp = 1;
  assert.ok(g.useBomb());
}
function frames(g: GameEngine, n: number) {
  for (let i = 0; i < n; i++) {
    drain(g);
    g.update(1 / 60);
  }
}
function record(id = "sfk", count = 4): RunRecord {
  return {
    id,
    classId: "mage",
    zoneId: "shadowfang",
    victory: true,
    dungeonBosses: count,
    time: 390,
    kills: 120,
    level: 15,
    gold: 100,
    xp: 100,
    materials: {},
    loot: [],
    date: "2026-10-04T00:00:00Z",
  };
}

test("Shadowfang entry requires a persistent Ragefire clear and the selected hero at level fifteen", () => {
  const s = freshSave();
  s.heroes.mage.level = 15;
  s.clearedZones = ["westfall", "tirisfal", "deadmines"];
  assert.equal(zoneUnlocked(s, "shadowfang"), false);
  assert.equal(
    expeditionRestriction(s, "shadowfang"),
    "Clear Ragefire Chasm to unlock",
  );
  s.clearedZones.push("ragefire");
  assert.equal(expeditionRestriction(s, "shadowfang"), null);
  s.selectedClass = "warrior";
  assert.equal(
    expeditionRestriction(s, "shadowfang"),
    "Requires character level 15",
  );
  assert.equal(
    dungeonRoute("shadowfang")!.stages.reduce((n, r) => n + r.duration, 0),
    390,
  );
});
test("legacy Ragefire history opens entry while malformed Shadowfang victories never become clears", () => {
  const s = freshSave();
  s.heroes.mage.level = 15;
  const loaded = validateSave({
    ...s,
    selectedZone: "shadowfang",
    clearedZones: undefined,
    history: [
      { ...record("rfc"), zoneId: "ragefire" },
      record("partial", 3),
      record("excess", 99),
    ],
  });
  assert.equal(loaded.selectedZone, "shadowfang");
  assert.ok(loaded.clearedZones.includes("ragefire"));
  assert.ok(!loaded.clearedZones.includes("shadowfang"));
  assert.deepEqual(
    loaded.history.map((r) => r.victory),
    [true, false, false],
  );
  assert.equal(
    validateSave({ ...s, selectedZone: "shadowfang" }).selectedZone,
    "elwynn",
  );
});
test("four ordered guardian deaths preserve recovery, clear entities and grant victory only at Arugal", () => {
  const g = make();
  assert.equal(g.landmarks.length, 0);
  assert.equal(g.nodes.length, 0);
  g.finish(true);
  assert.equal(g.ended, false);
  for (let stage = 0; stage < 4; stage++) {
    assert.equal(g.dungeonStage, SHADOWFANG_STAGES[stage]);
    defeat(g);
    assert.equal(g.dungeonBosses, stage + 1);
    assert.equal(g.hazards.length, 0);
    assert.equal(g.enemies.length, 0);
    if (stage < 3) {
      const t = g.time;
      frames(g, 60);
      assert.equal(g.time, t);
      assert.ok(g.checkpoint);
      assert.equal(g.useBomb(), false);
      g.player.hp = 100;
      g.player.resource = 0;
      assert.ok(g.continueDungeon("guard"));
      assert.equal(g.player.hp, 3100);
      assert.equal(g.player.resource, 100);
      assert.equal(g.nodes.length, 0);
      assert.equal(g.dungeonStageTime, 0);
      assert.equal(g.continueDungeon("guard"), false);
    }
  }
  assert.ok(g.ended && g.victory);
  assert.equal(g.dungeonBoons.length, 3);
  assert.equal(g.loot.length, 4);
});
test("partial and full settlement keep secured loot, isolate Journal credit and remain one-time after reload", () => {
  const s = freshSave(),
    g = make();
  s.heroes.mage.level = 15;
  s.reputation.argent = 23;
  defeat(g);
  g.finish(false);
  assert.ok(settleRun(s, g.result()));
  assert.equal(s.reputation.argent, 23);
  assert.ok(s.inventory.includes(g.loot[0]));
  assert.equal(questProgress(s, "shadowfang-clear"), 0);
  assert.equal(settleRun(s, record("early", 3)), false);
  assert.ok(settleRun(s, record()));
  assert.equal(questProgress(s, "ragefire-clear"), 0);
  assert.equal(questProgress(s, "deadmines-clear"), 0);
  assert.ok(claimQuest(s, "shadowfang-clear"));
  assert.equal(claimQuest(s, "shadowfang-clear"), false);
  const loaded = validateSave(s);
  assert.ok(loaded.clearedZones.includes("shadowfang"));
  assert.ok(loaded.claimedQuests.includes("shadowfang-clear"));
  assert.equal(settleRun(loaded, record()), false);
});
test("sixteen rare rewards cover every slot, remain guardian-only and extend the guide by five exact sources", () => {
  assert.equal(GEAR.length, 189);
  assert.equal(RECIPES.length, 75);
  assert.equal(SHADOWFANG_GEAR.length, 16);
  assert.equal(WARDROBE_CATALOG.length, 52);
  assert.deepEqual(new Set(SHADOWFANG_GEAR.map((g) => g.slot)), new Set(SLOTS));
  assert.equal(Object.keys(SHADOWFANG_SPRITES).length, 9);
  for (const g of SHADOWFANG_GEAR) {
    const source = SHADOWFANG_SOURCES[g.id];
    assert.equal(source.type, "dungeon");
    if (source.type === "dungeon")
      assert.ok(SHADOWFANG_STAGES[source.stage].loot.includes(g.id));
    assert.equal(g.rarity, "rare");
    assert.equal(g.level, 15);
    assert.equal(g.dropZones, undefined);
    assert.ok(!RECIPES.some((r) => r.output === g.id));
  }
});
test("every class has eligible loot in every room and real kills cover all sixteen trophies", () => {
  const seen = new Set<string>();
  for (const c of CLASSES)
    for (let seed = 1; seed <= 20; seed++) {
      const g = make(c.id, seed * 7919);
      for (let stage = 0; stage < 4; stage++) {
        defeat(g);
        const id = g.lastDungeonReward!;
        assert.ok(canEquip(c.id, id));
        assert.ok(SHADOWFANG_STAGES[stage].loot.includes(id));
        seen.add(id);
        if (stage < 3) assert.ok(g.continueDungeon("edge"));
      }
    }
  assert.equal(seen.size, 16);
});
test("level-fifteen equipment waits in the shared satchel until eligible and survives save migration", () => {
  const s = freshSave();
  s.inventory.push(...SHADOWFANG_GEAR.map((g) => g.id));
  assert.equal(equip(s, "haunted_mantle"), false);
  s.heroes.mage.level = 15;
  assert.ok(equip(s, "haunted_mantle"));
  assert.equal(equip(s, "watchguard_gauntlets"), false);
  assert.equal(equip(s, "moonhowl_longbow"), false);
  const loaded = validateSave(s);
  assert.equal(loaded.heroes.mage.equipment.shoulders, "haunted_mantle");
  assert.ok(SHADOWFANG_GEAR.every((g) => loaded.inventory.includes(g.id)));
});
for (const [stage, first, second] of [
  [0, "Veil of shadow", "Haunted hall"],
  [1, "Hammer of justice", "Holy watch"],
  [2, "Devourer's lunge", "Toxic saliva"],
  [3, "Void bolts", "Shadow Port"],
] as const) {
  test(`${SHADOWFANG_STAGES[stage].boss} alternates two warning patterns and strengthens both in phase two`, () => {
    const g = make();
    g.dungeonStageIndex = stage;
    const b = arrive(g);
    b.attackTimer = 0;
    frames(g, 1);
    assert.ok(g.bossState.attackName.startsWith(first));
    const firstCount = g.hazards.length,
      firstRadius = g.hazards[0].radius;
    assert.ok(g.hazards.every((h) => h.warning > 1 && h.damage > 0));
    if (stage === 0) assert.equal(telegraphContains(g.hazards[0], b), false);
    if (stage === 2) assert.equal(g.hazards[0].chargeId, b.id);
    g.hazards = [];
    b.attackTimer = 0;
    frames(g, 1);
    assert.ok(g.bossState.attackName.startsWith(second));
    const secondCount = g.hazards.length,
      secondRadius = g.hazards[0].radius;
    if (stage === 0)
      assert.equal(
        g.enemies.filter((e) => e.type === "keep_servitor").length,
        2,
      );
    g.hazards = [];
    b.hp = b.maxHp * 0.49;
    b.attackTimer = 0;
    frames(g, 1);
    assert.equal(g.bossState.phase, 2);
    assert.ok(g.bossState.attackName.startsWith(first));
    assert.ok(
      g.hazards.length > firstCount || g.hazards[0].radius > firstRadius,
    );
    g.hazards = [];
    b.attackTimer = 0;
    frames(g, 1);
    assert.ok(g.bossState.attackName.startsWith(second));
    assert.ok(
      g.hazards.length > secondCount || g.hazards[0].radius > secondRadius,
    );
    assert.ok(
      g.hazards.every(
        (h) =>
          Number.isFinite(h.x + h.y + h.radius) &&
          Math.abs(h.x) <= g.movementBounds.x &&
          Math.abs(h.y) <= g.movementBounds.y,
      ),
    );
  });
}
function port() {
  const g = make();
  g.dungeonStageIndex = 3;
  const b = arrive(g);
  g.bossState.attackIndex = 1;
  b.attackTimer = 0;
  frames(g, 1);
  return { g, b, h: g.hazards.find((h) => h.teleportId !== undefined)! };
}
test("Shadow Port moves only after its warning, damages the landing once and freezes with pause or upgrades", () => {
  const { g, b, h } = port(),
    before = { x: b.x, y: b.y };
  assert.ok(h);
  assert.deepEqual({ x: b.x, y: b.y }, before);
  const t = g.time,
    warning = h.warning;
  g.paused = true;
  frames(g, 120);
  assert.equal(h.warning, warning);
  assert.equal(g.time, t);
  g.paused = false;
  g.choosing = true;
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  assert.equal(h.warning, warning);
  g.choosing = false;
  g.player.x = h.x;
  g.player.y = h.y;
  g.player.invulnerable = 0;
  const hp = g.player.hp;
  frames(g, 101);
  assert.deepEqual({ x: b.x, y: b.y }, { x: h.x, y: h.y });
  assert.ok(g.player.hp < hp);
  b.damage = 0;
  const after = g.player.hp;
  frames(g, 10);
  assert.equal(g.player.hp, after);
});
test("an abandoned or slain teleport guardian cannot leave a damaging stale landing", () => {
  const { g, b, h } = port();
  g.player.x = h.x;
  g.player.y = h.y;
  g.player.invulnerable = 0;
  b.dead = true;
  const hp = g.player.hp;
  frames(g, 110);
  assert.equal(g.player.hp, hp);
  assert.equal(g.hazards.length, 0);
  const live = port();
  live.b.hp = 1;
  live.b.x = live.g.player.x + 25;
  live.b.y = live.g.player.y;
  live.g.useBomb();
  assert.equal(live.g.dungeonBosses, 1);
  assert.equal(live.g.hazards.length, 0);
});
test("Fenrus resolves a bounded charge and a sidestepped lane leaves health untouched", () => {
  const g = make();
  g.dungeonStageIndex = 2;
  const b = arrive(g);
  b.x = g.movementBounds.x - 40;
  b.attackTimer = 0;
  g.player.x = b.x - 100;
  frames(g, 1);
  const h = g.hazards[0];
  assert.ok(h.end);
  g.player.y = 250;
  const hp = g.player.hp;
  frames(g, 86);
  assert.equal(g.player.hp, hp);
  assert.equal(b.x, h.end.x);
  assert.equal(b.y, h.end.y);
  assert.ok(Math.abs(b.x) <= g.movementBounds.x - b.radius);
});
test("all four arenas use their own rosters and solid player bounds without gathering nodes", () => {
  for (let stage = 0; stage < 4; stage++) {
    const g = make();
    g.dungeonStageIndex = stage;
    g.dungeonStageTime = 36;
    g.setInput(1, 1);
    frames(g, 350);
    assert.ok(
      Math.abs(g.player.x) <= g.movementBounds.x &&
        Math.abs(g.player.y) <= g.movementBounds.y,
    );
    assert.ok(
      g.enemies.every((e) =>
        SHADOWFANG_STAGES[stage].enemies!.includes(e.type),
      ),
    );
    assert.equal(g.nodes.length, 0);
  }
});
function corpse(g: GameEngine, type: string): Enemy {
  const base = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: { ...g.stats },
    professions: {},
    seed: 1,
  }).enemies[0];
  return {
    ...base,
    id: 9000,
    type,
    x: 0,
    y: 0,
    hp: 1,
    maxHp: 1,
    speed: 0,
    damage: 0,
  };
}
test("castle worgs and worgen use existing Skinning grade, level and practice caps", () => {
  for (const type of ["keep_worg", "keep_worgen", "fenrus"])
    for (const [skill, cap, level, tier, practice] of [
      [1, 75, 15, 1, 1],
      [125, 150, 15, 3, 1],
      [150, 150, 15, 3, 0],
      [225, 300, 15, 3, 0],
      [225, 300, 5, 2, 0],
    ]) {
      const g = make("mage", 42, {
        professions: { skinning: skill },
        gatheringCaps: { skinning: cap },
        characterLevel: level,
      });
      g.time = 280;
      g.rng.next = () => 0;
      g.enemies = [corpse(g, type)];
      assert.ok(g.useBomb());
      assert.equal(g.materials[materialFor("leather", tier)], 1);
      assert.equal(g.professionGains.skinning || 0, practice);
      assert.equal(g.materials.cloth, undefined);
    }
});
test("unlearned Skinning yields no hides; spectral humanoids yield grade-three cloth without gathering proof", () => {
  const g = make();
  g.rng.next = () => 0;
  g.enemies = [corpse(g, "keep_worg")];
  g.useBomb();
  assert.deepEqual(g.materials, {});
  g.enemies = [corpse(g, "keep_guard")];
  g.useBomb();
  assert.equal(g.materials[materialFor("cloth", 3)], 1);
  assert.deepEqual(g.professionGains, {});
});
test("castle hides practice Skinning without advancing projects assigned to a different destination", () => {
  const s = freshSave();
  s.heroes.mage.level = 15;
  s.professions.skinning = 125;
  s.training.skinning = 3;
  s.professionQuests.skinning.chapter = 2;
  acceptProfessionQuest(s, "skinning");
  const g = make("mage", 42, {
    professions: s.professions,
    gatheringCaps: { skinning: 225 },
    professionQuests: professionQuestSnapshots(s),
  });
  g.time = 280;
  g.rng.next = () => 0;
  g.enemies = [corpse(g, "keep_worgen")];
  g.useBomb();
  assert.equal(g.professionGains.skinning, 1);
  assert.equal(g.result().professionProof![0].gathered, 0);
  g.finish(false);
  settleRun(s, g.result(), g.professionGains);
  assert.equal(s.professions.skinning, 126);
  assert.equal(s.professionQuests.skinning.progress.gathered, 0);
});
test("each guardian supplies level-appropriate grade-three material rewards without node or profession evidence", () => {
  const g = make();
  for (let stage = 0; stage < 4; stage++) {
    defeat(g);
    for (const [family, amount] of Object.entries(
      SHADOWFANG_STAGES[stage].materials,
    ))
      assert.ok(
        (g.materials[materialFor(family as "cloth" | "leather" | "dust", 3)] ||
          0) >= amount!,
      );
    assert.deepEqual(g.professionGains, {});
    if (stage < 3) g.continueDungeon("edge");
  }
});
test("all nine core class attacks can defeat each castle guardian through real automatic combat", () => {
  for (const c of CLASSES)
    for (let stage = 0; stage < 4; stage++) {
      const g = make(c.id);
      g.dungeonStageIndex = stage;
      const b = arrive(g);
      b.hp = 60;
      b.maxHp = 60;
      b.damage = 0;
      b.x = 45;
      g.spells = [
        { id: c.spells[0], rank: 3, timer: 0, orbitTimer: 0, evolved: false },
      ];
      frames(g, 480);
      assert.ok(b.dead, `${c.id} could not kill ${b.type}`);
      assert.equal(g.dungeonBosses, 1);
    }
});
