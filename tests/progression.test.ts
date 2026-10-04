import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, GEAR_MAP, PROFESSIONS, QUESTS } from "../src/content";
import {
  availableTalents,
  canCraft,
  canEquip,
  canLearnTalent,
  claimQuest,
  craft,
  equip,
  freshSave,
  grantXp,
  heroStats,
  learnProfession,
  learnTalent,
  respec,
  sellGear,
  settleRun,
  validateSave,
  zoneUnlocked,
} from "../src/progression";
import type { RunRecord } from "../src/progression";

test("every class has three valid trees, legal starter gear and a unique active skill", () => {
  const s = freshSave();
  assert.equal(new Set(CLASSES.map((c) => c.active)).size, 9);
  for (const c of CLASSES) {
    assert.equal(c.trees.length, 3);
    const stats = heroStats(s, c.id);
    assert.ok(stats.health >= 100);
    for (const id of Object.values(s.heroes[c.id].equipment))
      assert.ok(canEquip(c.id, id));
  }
});
test("talent allocation enforces point budget, ranks and prerequisite rows", () => {
  const s = freshSave();
  const c = CLASSES.find((c) => c.id === "mage")!;
  const [first, second, capstone] = c.trees[0].nodes;
  assert.equal(canLearnTalent(s, "mage", second.id), false);
  assert.equal(canLearnTalent(s, "mage", capstone.id), false);
  assert.equal(learnTalent(s, first.id), true);
  assert.equal(availableTalents(s.heroes.mage), 0);
  assert.equal(learnTalent(s, first.id), false);
  s.heroes.mage.level = 7;
  assert.equal(learnTalent(s, first.id), true);
  assert.equal(learnTalent(s, first.id), true);
  assert.equal(learnTalent(s, first.id), false);
  for (let i = 0; i < 3; i++) assert.equal(learnTalent(s, second.id), true);
  assert.equal(learnTalent(s, capstone.id), true);
  assert.equal(availableTalents(s.heroes.mage), 0);
  assert.ok(heroStats(s).power >= 40);
  assert.equal(respec(s), true);
  assert.equal(availableTalents(s.heroes.mage), 7);
});
test("XP grants levels and does not overflow the level cap", () => {
  const s = freshSave();
  assert.equal(grantXp(s, "mage", 500), 2);
  assert.equal(s.heroes.mage.level, 3);
  assert.equal(s.heroes.mage.xp, 90);
  grantXp(s, "mage", 1_000_000);
  assert.equal(s.heroes.mage.level, 60);
  assert.ok(s.heroes.mage.xp < 4300);
});
test("armor and weapon restrictions hold across the roster", () => {
  assert.equal(canEquip("mage", "warden_plate"), false);
  assert.equal(canEquip("mage", "defias_blade"), false);
  assert.equal(canEquip("warrior", "mooncloth"), true);
  assert.equal(canEquip("hunter", "longbow"), true);
  assert.equal(canEquip("rogue", "longbow"), false);
  const s = freshSave();
  s.inventory.push("warden_plate");
  assert.equal(equip(s, "warden_plate"), false);
  s.selectedClass = "warrior";
  assert.equal(equip(s, "warden_plate"), true);
  assert.ok(heroStats(s).armor >= 27);
});
test("all professions are learnable and the two-profession limit is enforced", () => {
  for (const p of PROFESSIONS) {
    const s = freshSave();
    assert.ok(learnProfession(s, p.id));
    assert.equal(s.professions[p.id], 1);
  }
  const s = freshSave();
  assert.ok(learnProfession(s, "alchemy"));
  assert.ok(learnProfession(s, "herbalism"));
  assert.equal(learnProfession(s, "mining"), false);
});
test("crafting is atomic, requires a learned trade and produces usable supplies or gear", () => {
  const s = freshSave();
  assert.equal(canCraft(s, "healing"), false);
  assert.equal(craft(s, "healing"), null);
  learnProfession(s, "alchemy");
  const gold = s.gold,
    herbs = s.materials.herbs;
  assert.ok(craft(s, "healing"));
  assert.equal(s.supplies.potions, 6);
  assert.equal(s.gold, gold - 5);
  assert.equal(s.materials.herbs, herbs - 2);
  assert.equal(s.professions.alchemy, 6);
  s.materials.herbs = 0;
  const before = JSON.stringify(s);
  assert.equal(craft(s, "healing"), null);
  assert.equal(JSON.stringify(s), before);
  assert.ok(craft(s, "bandage"));
  assert.equal(s.secondary.firstaid, 6);
});
test("equipped gear cannot be sold or disenchanted and starters are protected", () => {
  const s = freshSave();
  assert.equal(sellGear(s, "starter_mage"), false);
  s.inventory.push("ember_staff");
  equip(s, "ember_staff");
  assert.equal(sellGear(s, "ember_staff"), false);
  delete s.heroes.mage.equipment.weapon;
  const gold = s.gold;
  assert.equal(sellGear(s, "ember_staff"), true);
  assert.equal(s.gold, gold + GEAR_MAP.ember_staff.value);
  s.inventory.push("gnoll_claw");
  assert.equal(sellGear(s, "gnoll_claw", true), false);
  learnProfession(s, "enchanting");
  assert.equal(sellGear(s, "gnoll_claw", true), true);
  assert.equal(s.materials.dust, 4);
});
test("run settlement is idempotent and unlocks appropriate zones", () => {
  const s = freshSave();
  const r: RunRecord = {
    id: "test-run",
    classId: "mage",
    zoneId: "elwynn",
    victory: true,
    time: 360,
    kills: 180,
    level: 14,
    gold: 100,
    xp: 500,
    materials: { herbs: 4 },
    loot: ["lionheart"],
    date: new Date().toISOString(),
  };
  assert.equal(zoneUnlocked(s, "westfall"), false);
  assert.ok(settleRun(s, r));
  const after = JSON.stringify(s);
  assert.equal(settleRun(s, r), false);
  assert.equal(JSON.stringify(s), after);
  assert.equal(s.totals.wins, 1);
  assert.equal(s.materials.herbs, 10);
  assert.ok(s.inventory.includes("lionheart"));
  assert.ok(zoneUnlocked(s, "westfall"));
  assert.ok(zoneUnlocked(s, "tirisfal"));
});
test("quest rewards cannot be claimed early or twice", () => {
  const s = freshSave(),
    q = QUESTS[0];
  assert.equal(claimQuest(s, q.id), false);
  s.totals.kills = 50;
  const gold = s.gold;
  assert.ok(claimQuest(s, q.id));
  assert.equal(s.gold, gold + q.gold);
  assert.equal(claimQuest(s, q.id), false);
});
test("save validation rejects foreign files and repairs corrupt or impossible fields", () => {
  assert.throws(() => validateSave({ gold: 10 }));
  const raw = freshSave() as any;
  raw.gold = -90;
  raw.selectedClass = "<script>";
  raw.materials.herbs = Infinity;
  raw.heroes.mage.talents = { m_power: 1, m_focus: 99 };
  raw.heroes.mage.equipment = { chest: "warden_plate" };
  raw.inventory.push("warden_plate", "not-real");
  raw.professions = { mining: 1, herbalism: 1, alchemy: 1 };
  raw.history = [{ id: "bad", classId: "<script>", zoneId: "elwynn" }];
  const s = validateSave(raw);
  assert.equal(s.gold, 0);
  assert.equal(s.selectedClass, "mage");
  assert.equal(s.materials.herbs, 0);
  assert.equal(s.heroes.mage.talents.m_power, undefined);
  assert.equal(s.heroes.mage.equipment.chest, undefined);
  assert.equal(s.inventory.includes("not-real"), false);
  assert.equal(Object.keys(s.professions).length, 2);
  assert.equal(s.history.length, 0);
  // Built-in object property names are not class or equipment identifiers.
  raw.selectedClass = "constructor";
  raw.inventory.push("__proto__", "toString");
  raw.history = [{ id: "prototype", classId: "__proto__", zoneId: "elwynn" }];
  const sanitized = validateSave(raw);
  assert.equal(sanitized.selectedClass, "mage");
  assert.equal(sanitized.inventory.includes("__proto__"), false);
  assert.equal(sanitized.inventory.includes("toString"), false);
  assert.equal(sanitized.history.length, 0);
  assert.equal(canEquip("mage", "constructor"), false);
});
