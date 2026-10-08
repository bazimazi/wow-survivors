import test from "node:test";
import assert from "node:assert/strict";
import { RECIPES, ZONES, GEAR, GEAR_MAP } from "../src/content";
import { ENCHANTMENTS } from "../src/enchanting";
import { GameEngine, WORLD_SIZE } from "../src/engine";
import type { EngineConfig, Enemy, Node } from "../src/engine";
import {
  MATERIALS,
  RESOURCE_IDS,
  RESOURCE_FAMILIES,
  RESOURCE_TIERS,
  FAMILY_INFO,
  materialFor,
  tierForSkill,
  zoneResourceTier,
  distanceTier,
  gatheringRestriction,
  gatheringPractice,
} from "../src/resources";
import type { Material, NodeFamily } from "../src/resources";
import {
  freshSave,
  heroStats,
  validateSave,
  craft,
  canCraft,
  sellGear,
  disenchantMaterial,
  settleRun,
  tradeSkill,
  trainingInfo,
  trainProfession,
} from "../src/progression";

function make(options: Partial<EngineConfig> = {}) {
  const g = new GameEngine({
    classId: "mage",
    zone: ZONES[0],
    stats: { ...heroStats(freshSave()), health: 10000 },
    professions: { herbalism: 1, mining: 1, skinning: 1 },
    fishingSkill: 1,
    gatheringCaps: { herbalism: 300, mining: 300, skinning: 300, fishing: 300 },
    characterLevel: 20,
    seed: 77,
    onConsume: () => true,
    ...options,
  });
  g.enemies = [];
  g.spells = [];
  return g;
}
function node(kind: Material, id = 0, x = 0): Node {
  return { id, kind, x, y: 0, depleted: false };
}
function beast(type = "wolf"): Enemy {
  return {
    id: 9000,
    type,
    x: 0,
    y: 0,
    hp: 1,
    maxHp: 1,
    radius: 15,
    speed: 0,
    damage: 0,
    elite: false,
    boss: false,
    slowUntil: 0,
    slow: 1,
    frozenUntil: 0,
    flash: 0,
    attackTimer: 100,
    dead: false,
  };
}

test("24 named resources preserve all six legacy keys and every recipe/formula consumes its skill grade", () => {
  assert.equal(Object.keys(MATERIALS).length, 24);
  assert.equal(
    new Set(RESOURCE_FAMILIES.flatMap((f) => [...RESOURCE_IDS[f]])).size,
    24,
  );
  assert.deepEqual(
    RESOURCE_FAMILIES.map((f) => RESOURCE_IDS[f][0]),
    ["herbs", "ore", "leather", "cloth", "dust", "fish"],
  );
  assert.deepEqual(
    RESOURCE_FAMILIES.map((f) => MATERIALS[f].name),
    [
      "Peacebloom",
      "Copper Ore",
      "Light Leather",
      "Linen Cloth",
      "Strange Dust",
      "Smallfish",
    ],
  );
  assert.equal(RECIPES.length, 127);
  assert.equal(ENCHANTMENTS.length, 24);
  for (const r of [...RECIPES, ...ENCHANTMENTS]) {
    const costs = "cost" in r ? r.cost : r.costs;
    assert.ok(Object.keys(costs).length);
    for (const [id, amount] of Object.entries(costs)) {
      assert.equal(MATERIALS[id as Material].tier, tierForSkill(r.skill), r.id);
      assert.ok(Number.isInteger(amount) && amount! > 0);
    }
  }
});

test("legacy six-stock saves retain quantity, skill, equipment and enchants without free advanced stock", () => {
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.professions.enchanting = 130;
  s.training.enchanting = 3;
  s.enchantments.starter_mage = "weapon_force";
  const raw = JSON.parse(JSON.stringify(s));
  raw.materials = {
    herbs: 11,
    ore: 22,
    leather: 33,
    cloth: 44,
    dust: 55,
    fish: 66,
    fake: 999,
  };
  const loaded = validateSave(raw);
  assert.deepEqual(
    RESOURCE_FAMILIES.map((f) => loaded.materials[f]),
    [11, 22, 33, 44, 55, 66],
  );
  for (const f of RESOURCE_FAMILIES)
    for (const id of RESOURCE_IDS[f].slice(1))
      assert.equal(loaded.materials[id], 0);
  assert.equal(loaded.professions.enchanting, 130);
  assert.equal(loaded.training.enchanting, 3);
  assert.equal(loaded.enchantments.starter_mage, "weapon_force");
  assert.deepEqual(loaded.heroes.mage.equipment, s.heroes.mage.equipment);
  assert.equal(Object.keys(loaded.materials).length, 24);
  raw.materials.sungrass = -4;
  raw.materials.tin_ore = Infinity;
  raw.materials.yellowtail = 1e30;
  const bounded = validateSave(raw);
  assert.equal(bounded.materials.sungrass, 0);
  assert.equal(bounded.materials.tin_ore, 0);
  assert.equal(bounded.materials.yellowtail, 1_000_000);
});

test("seeded outdoor maps guarantee all supported node grades with stable starter positions", () => {
  for (const zone of ZONES.filter((z) => !z.dungeon)) {
    const g = make({ zone });
    assert.equal(g.nodes.length, 170);
    assert.equal(new Set(g.nodes.map((n) => n.id)).size, 170);
    assert.deepEqual(
      g.nodes.slice(0, 3).map((n) => [n.kind, n.x, n.y]),
      [
        ["herbs", 180, 100],
        ["ore", -210, -100],
        ["fish", 100, -245],
      ],
    );
    for (const f of ["herbs", "ore", "fish"] as NodeFamily[])
      for (let t = 1; t <= zoneResourceTier(zone.id); t++)
        assert.ok(g.nodes.some((n) => n.kind === materialFor(f, t)));
    for (const n of g.nodes) {
      assert.ok(Math.abs(n.x) <= WORLD_SIZE && Math.abs(n.y) <= WORLD_SIZE);
      assert.equal(
        MATERIALS[n.kind].tier,
        Math.min(zoneResourceTier(zone.id), distanceTier(Math.hypot(n.x, n.y))),
      );
    }
    assert.deepEqual(g.nodes, make({ zone }).nodes);
  }
});

test("gathering gates deny collection atomically for missing trade, skill and hero level", () => {
  for (const config of [
    { professions: {}, characterLevel: 20 },
    { professions: { mining: 49 }, characterLevel: 20 },
    { professions: { mining: 50 }, characterLevel: 4 },
  ]) {
    const g = make(config);
    g.nodes = [node("tin_ore")];
    assert.ok(g.nodeRestriction(g.nodes[0]));
    g.update(1 / 60);
    assert.equal(g.nodes[0].depleted, false);
    assert.deepEqual(g.materials, {});
    assert.deepEqual(g.professionGains, {});
  }
  assert.match(gatheringRestriction("tin_ore", 0, 20)!, /Learn Mining/);
  assert.match(gatheringRestriction("tin_ore", 49, 20)!, /50/);
  assert.match(gatheringRestriction("tin_ore", 50, 4)!, /5/);
});

for (const family of ["herbs", "ore", "fish"] as NodeFamily[]) {
  test(`${family} gathers all four grades once, practices to the exact boundary and keeps trivial stock`, () => {
    const trade = FAMILY_INFO[family].trade;
    for (const tier of RESOURCE_TIERS) {
      const start = tier.trivial - 1;
      const g = make({ professions: { [trade]: start }, fishingSkill: start });
      const material = materialFor(family, tier.tier);
      g.nodes = [node(material, 1), node(material, 2)];
      g.update(1 / 60);
      assert.equal(g.materials[material], 4);
      assert.equal(g.professionGains[trade], 1);
      assert.equal(g.gatheringSkill(trade), tier.trivial);
      g.update(1 / 60);
      assert.equal(g.materials[material], 4);
      assert.equal(g.professionGains[trade], 1);
      assert.equal(gatheringPractice(material, tier.trivial, 300), 0);
    }
  });
}

test("practice inside a run unlocks the next grade and settlement credits only the accepted run", () => {
  const s = freshSave();
  s.heroes.mage.level = 5;
  s.professions.herbalism = 49;
  const g = make({
    professions: s.professions,
    characterLevel: 5,
    gatheringCaps: { herbalism: 75 },
  });
  g.nodes = [node("herbs", 1), node("briarthorn", 2)];
  assert.ok(g.nodeRestriction(g.nodes[1]));
  g.update(1 / 60);
  assert.deepEqual(g.materials, { herbs: 2, briarthorn: 2 });
  assert.equal(g.gatheringSkill("herbalism"), 51);
  g.finish(false);
  assert.equal(settleRun(s, g.result(), g.professionGains), true);
  assert.equal(s.professions.herbalism, 51);
  assert.equal(s.materials.briarthorn, 2);
  const after = structuredClone(s);
  assert.equal(settleRun(s, g.result(), g.professionGains), false);
  assert.deepEqual(s, after);
});

test("all four gathering trades reach 300 through real collection, settlement and paid training", () => {
  for (const family of ["herbs", "ore", "leather", "fish"] as const) {
    const trade = FAMILY_INFO[family].trade;
    const s = freshSave();
    s.heroes.mage.level = 20;
    s.gold = 10000;
    if (trade !== "fishing") s.professions[trade] = 1;
    for (let rank = 1; rank <= 4; rank++) {
      const cap = trainingInfo(s, trade).cap;
      const g = make({
        zone: ZONES.find(
          (z) => z.id === (trade === "skinning" ? "westfall" : "tirisfal"),
        )!,
        professions: s.professions,
        fishingSkill: s.secondary.fishing,
        gatheringCaps: { [trade]: cap },
      });
      g.rng.next = () => 0;
      if (trade === "skinning") g.time = 280;
      let collections = 0;
      while (g.gatheringSkill(trade) < cap && collections < 300) {
        if (trade === "skinning") {
          g.enemies = [beast()];
          assert.equal(g.useBomb(), true);
        } else {
          g.enemies = [];
          g.nodes = [
            node(
              materialFor(family, tierForSkill(g.gatheringSkill(trade))),
              collections,
            ),
          ];
          g.update(1 / 60);
        }
        collections++;
      }
      assert.equal(g.gatheringSkill(trade), cap, trade);
      assert.ok(collections < 300);
      g.finish(false);
      assert.equal(settleRun(s, g.result(), g.professionGains), true);
      assert.equal(tradeSkill(s, trade), cap);
      if (rank < 4) {
        const gold = s.gold;
        assert.equal(trainProfession(s, trade), true);
        assert.ok(s.gold < gold);
        assert.equal(tradeSkill(s, trade), cap);
      }
    }
    assert.equal(tradeSkill(s, trade), 300);
    for (const id of RESOURCE_IDS[family]) assert.ok(s.materials[id] > 0);
  }
});

test("run skills and caps are snapshots; paused, upgrading and mounted heroes leave nodes intact", () => {
  const professions = { mining: 74 },
    gatheringCaps = { mining: 75 };
  const g = make({ professions, gatheringCaps, travelId: "horse" });
  professions.mining = 300;
  gatheringCaps.mining = 300;
  g.nodes = [node("tin_ore")];
  g.paused = true;
  g.update(1 / 60);
  assert.equal(g.nodes[0].depleted, false);
  g.paused = false;
  g.choosing = true;
  g.update(1 / 60);
  assert.equal(g.nodes[0].depleted, false);
  g.choosing = false;
  assert.equal(g.toggleTravel(), true);
  for (let i = 0; i < 85; i++) {
    g.enemies = [];
    g.update(1 / 60);
  }
  assert.equal(g.travel.active, true);
  assert.equal(g.nodes[0].depleted, false);
  g.toggleTravel();
  g.update(1 / 60);
  assert.equal(g.materials.tin_ore, 2);
  assert.equal(g.gatheringSkill("mining"), 75);
  g.nodes = [node("tin_ore", 1)];
  g.update(1 / 60);
  assert.equal(g.materials.tin_ore, 4);
  assert.equal(g.professionGains.mining, 1);
});

test("the compass filters eligible, locked, family and depleted targets without mutating nodes", () => {
  const g = make({ professions: { herbalism: 50 }, fishingSkill: 1 });
  g.nodes = [
    node("ore", 1, 10),
    node("kingsblood", 2, 20),
    node("briarthorn", 3, 30),
    node("fish", 4, 40),
  ];
  assert.equal(g.gatheringTarget?.id, 3);
  g.gatheringLocked = true;
  assert.equal(g.gatheringTarget?.id, 1);
  g.gatheringFocus = "herbs";
  assert.equal(g.gatheringTarget?.id, 2);
  g.gatheringLocked = false;
  assert.equal(g.gatheringTarget?.id, 3);
  g.nodes[2].depleted = true;
  assert.equal(g.gatheringTarget, null);
  g.gatheringFocus = "fish";
  assert.equal(g.gatheringTarget?.id, 4);
  assert.equal(g.nodes.filter((n) => n.depleted).length, 1);
  g.gatheringOpen = true;
  g.time = g.zone.duration - 0.001;
  g.update(1 / 60);
  assert.ok(g.boss);
  assert.equal(g.gatheringOpen, false);
});

test("Skinning can reach grade IV in late Elwynn while lower-skilled and lower-level heroes retain usable hides", () => {
  for (const [skill, level, tier, practice] of [
    [1, 20, 1, 1],
    [124, 20, 2, 1],
    [125, 20, 3, 1],
    [225, 20, 4, 1],
    [300, 20, 4, 0],
    [225, 5, 2, 0],
  ]) {
    const g = make({ professions: { skinning: skill }, characterLevel: level });
    g.time = 280;
    g.rng.next = () => 0;
    g.enemies = [beast()];
    assert.equal(g.useBomb(), true);
    assert.equal(g.materials[materialFor("leather", tier)], 1);
    assert.equal(g.professionGains.skinning || 0, practice);
  }
  const unlearned = make({ professions: {} });
  unlearned.rng.next = () => 0;
  unlearned.enemies = [beast()];
  unlearned.useBomb();
  assert.deepEqual(unlearned.materials, {});
});

test("cloth drops use elapsed time, zone and hero gates with no unrelated profession practice", () => {
  for (const [zoneId, time, level, tier] of [
    ["elwynn", 280, 20, 2],
    ["westfall", 280, 20, 3],
    ["tirisfal", 280, 20, 4],
    ["tirisfal", 280, 4, 1],
    ["tirisfal", 95, 20, 2],
  ] as const) {
    const g = make({
      zone: ZONES.find((z) => z.id === zoneId)!,
      characterLevel: level,
    });
    g.time = time;
    g.rng.next = () => 0;
    g.enemies = [beast("gnoll")];
    g.useBomb();
    assert.equal(g.materials[materialFor("cloth", tier)], 1);
    assert.deepEqual(g.professionGains, {});
  }
});

test("dungeon rooms preserve node identity and guardian rewards follow route and hero level", () => {
  for (const zone of ZONES.filter((z) => z.dungeon)) {
    const g = make({ zone, characterLevel: 20 });
    for (let stage = 0; stage < g.dungeonRoute!.stages.length; stage++) {
      const tier = zone.id === "shadowfang" ? 3 : Math.min(3, stage + 1);
      assert.equal(g.nodes.length, zone.id === "shadowfang" ? 0 : 8);
      assert.ok(g.nodes.every((n) => MATERIALS[n.kind].tier === tier));
      assert.ok(
        g.nodes.every(
          (n) => zone.id !== "ragefire" || MATERIALS[n.kind].family === "ore",
        ),
      );
      g.dungeonStageTime = g.dungeonStage!.duration;
      g.update(1 / 60);
      while (g.choosing) g.chooseUpgrade(g.upgrades[0].id);
      const boss = g.enemies.find((e) => e.boss)!;
      assert.ok(boss);
      boss.hp = 1;
      boss.x = g.player.x;
      boss.y = g.player.y;
      assert.equal(g.useBomb(), true);
      for (const [id, amount] of Object.entries(g.dungeonStage!.materials)) {
        const key = materialFor(MATERIALS[id as Material].family, tier);
        assert.ok((g.materials[key] || 0) >= amount!);
      }
      if (!g.ended) assert.equal(g.continueDungeon("edge"), true);
    }
    assert.equal(g.victory, true);
  }
});

test("advanced crafts require their named grade and deduct it atomically without spending legacy supplies", () => {
  const recipe = RECIPES.find(
    (r) => r.profession === "tailoring" && r.skill === 50,
  )!;
  const s = freshSave();
  s.heroes.mage.level = 20;
  s.professions.tailoring = 75;
  s.gold = 1000;
  for (const f of RESOURCE_FAMILIES) s.materials[f] = 1000;
  const before = structuredClone(s);
  assert.equal(canCraft(s, recipe.id), false);
  assert.equal(craft(s, recipe.id), null);
  assert.deepEqual(s, before);
  for (const [id, amount] of Object.entries(recipe.cost))
    s.materials[id as Material] = amount!;
  assert.equal(canCraft(s, recipe.id), true);
  assert.ok(craft(s, recipe.id));
  for (const id of Object.keys(recipe.cost))
    assert.equal(s.materials[id as Material], 0);
  for (const f of RESOURCE_FAMILIES) assert.equal(s.materials[f], 1000);
});

test("disenchanting recovers equipment-grade dust while only qualified, nontrivial items grant capped practice", () => {
  for (const tier of RESOURCE_TIERS) {
    const gear = GEAR.find(
      (g) =>
        (g.level || 1) === (tier.tier === 4 ? 18 : tier.level) &&
        !g.id.startsWith("starter_") &&
        !freshSave().inventory.includes(g.id),
    )!;
    assert.ok(gear);
    assert.equal(disenchantMaterial(gear.id), materialFor("dust", tier.tier));
    for (const [skill, gain] of [
      [tier.skill, 3],
      [tier.trivial - 1, 1],
      [tier.trivial, 0],
      [tier.skill - 1, 0],
    ]) {
      const s = freshSave();
      s.professions.enchanting = Math.max(1, skill);
      s.training.enchanting = 4;
      if (skill === 0) continue; // A learned primary starts at 1.
      s.inventory.push(gear.id);
      const dust = disenchantMaterial(gear.id),
        stock = s.materials[dust];
      assert.equal(sellGear(s, gear.id, true), true);
      assert.equal(
        s.materials[dust],
        stock + (GEAR_MAP[gear.id].rarity === "epic" ? 4 : 2),
      );
      assert.equal(s.professions.enchanting, skill + gain);
    }
  }
  const capped = freshSave();
  capped.professions.enchanting = 149;
  capped.training.enchanting = 2;
  for (let i = 0; i < 2; i++) {
    capped.inventory.push("lantern_hood");
    assert.equal(sellGear(capped, "lantern_hood", true), true);
    assert.equal(capped.professions.enchanting, 150);
  }
  assert.equal(capped.materials.vision_dust, 4);
});
