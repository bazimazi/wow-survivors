import test from "node:test";
import assert from "node:assert/strict";
import { CLASS_MAP, SPELLS, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import { GameEngine } from "../src/engine";
import { freshSave, heroStats } from "../src/progression";
import { CLASS_KITS, classStatus } from "../src/class-combat";

function make(id: ClassId, partner?: ClassId) {
  const save = freshSave();
  const g = new GameEngine({
    classCombat: true,
    classId: id,
    zone: ZONES[0],
    stats: { ...heroStats(save, id), crit: 0, health: 2000 },
    professions: {},
    seed: 42,
    ...(partner
      ? {
          partner: {
            classId: partner,
            stats: { ...heroStats(save, partner), crit: 0, health: 2000 },
            characterLevel: 1,
          },
        }
      : {}),
  });
  g.enemies = [];
  g.spells = [];
  g.pets = [];
  if (g.partner) {
    g.partner.prepared = [];
    g.partner.spells = [];
  }
  g.spawnTimer = 1e6;
  g.xpNeeded = 1e6;
  return g;
}
function foe(g: GameEngine, x = 70, y = 0) {
  const e = (g as any).spawnEnemy(200, false, 0);
  e.x = x;
  e.y = y;
  e.hp = e.maxHp = 10000;
  e.speed = 0;
  e.damage = 0;
  (g as any).grid.rebuild(g.enemies);
  return e;
}
function advance(g: GameEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60);
}
function cast(g: GameEngine, id = CLASS_MAP[g.classDef.id].spells[0]) {
  (g as any).grid.rebuild(g.enemies);
  return (g as any).castSpell(SPELLS[id], 1);
}
function hit(g: GameEngine, e: ReturnType<typeof foe>, amount = 10) {
  (g as any).damageEnemy(e, amount, g.classDef.spells[0], false);
}

test("Space's dash supports standing facing, fixed movement direction, invulnerability and cooldown", () => {
  const g = make("warrior");
  g.player.facing = Math.PI / 2;
  assert.ok(g.dash());
  assert.equal(g.dash(), false);
  assert.ok(g.player.invulnerable > 0);
  g.setInput(-1, 0);
  advance(g, 0.18);
  assert.ok(g.player.y > 80);
  assert.ok(Math.abs(g.player.x) < 1e-8);
  g.paused = true;
  const before = JSON.stringify(g.player);
  advance(g, 2);
  assert.equal(JSON.stringify(g.player), before);
  assert.equal(g.dash(), false);
});
test("Mage Blink teleports immediately, clamps bounds and does not continue sliding", () => {
  const g = make("mage");
  assert.ok(g.dash());
  assert.equal(g.player.x, 190);
  assert.equal(g.player.dashTimer, 0);
  advance(g, 0.2);
  assert.equal(g.player.x, 190);
  g.player.dashCooldown = 0;
  g.player.x = 3190;
  g.setInput(1, 0);
  assert.ok(g.dash());
  assert.ok(g.player.x <= 3200);
});
test("Warrior cleave spends rage, only hits its frontal arc, and Charge earns rage by crossing foes", () => {
  const g = make("warrior"),
    front = foe(g, 100),
    back = foe(g, -100);
  g.player.resource = 60;
  assert.ok(g.activate());
  assert.equal(g.player.resource, 2);
  assert.ok(front.hp < front.maxHp);
  assert.equal(back.hp, back.maxHp);
  g.player.resource = 0;
  front.x = 50;
  g.setInput(1, 0);
  assert.ok(g.dash());
  advance(g, 0.18);
  assert.ok(g.player.resource >= 10);
  assert.equal(g.player.kit.dashHits.size, 1);
});
test("Mage stationary Focus empowers spells and a second Shatter exploits frozen foes", () => {
  const g = make("mage"),
    e = foe(g, 200);
  advance(g, 3);
  assert.ok(g.player.kit.focus > 2.9);
  hit(g, e, 100);
  assert.ok(e.maxHp - e.hp > 150);
  const before = e.hp;
  assert.ok(g.activate());
  const first = before - e.hp;
  assert.ok(e.frozenUntil > g.time);
  advance(g, 4.05);
  const next = e.hp;
  assert.ok(g.activate());
  assert.ok(next - e.hp > first * 2);
  g.setInput(1, 0);
  advance(g, 1);
  assert.equal(g.player.kit.focus, 0);
});
test("Rogue combo points belong to one enemy and Eviscerate spends them once", () => {
  const g = make("rogue"),
    a = foe(g, 50),
    b = foe(g, 150);
  assert.equal(g.activate(), false);
  for (let i = 0; i < 5; i++) {
    hit(g, a);
    advance(g, 0.4);
  }
  assert.equal(g.player.kit.points, 5);
  const before = a.hp;
  assert.ok(g.activate());
  assert.ok(before - a.hp >= 185);
  assert.equal(g.player.kit.points, 0);
  assert.equal(g.activate(), false);
  advance(g, 1.6);
  hit(g, a);
  advance(g, 0.4);
  hit(g, b);
  assert.equal(g.player.kit.points, 1);
  assert.equal(g.player.kit.target, b.id);
  assert.ok(g.dash());
  assert.ok(g.player.kit.concealedUntil > g.time);
  advance(g, 0.4);
  hit(g, b);
  assert.equal(g.player.kit.concealedUntil, 0);
});
test("Hunter rewards range and steady aim; commands mark prey and traps trigger once", () => {
  const g = make("hunter"),
    close = foe(g, 60),
    far = foe(g, 300);
  hit(g, close, 100);
  hit(g, far, 100);
  assert.ok(far.maxHp - far.hp > close.maxHp - close.hp);
  advance(g, 3);
  const before = far.hp;
  hit(g, far, 100);
  assert.ok(before - far.hp > 150);
  assert.ok(g.activate());
  assert.equal(g.player.kit.target, close.id);
  assert.equal(g.player.kit.anchors[0].kind, "trap");
  advance(g, 0.05);
  assert.ok(close.frozenUntil > g.time);
  advance(g, 0.05);
  assert.equal(g.player.kit.anchors.length, 0);
});
test("Paladin seals empower a stationary consecration zone rather than an instant generic nova", () => {
  const g = make("paladin"),
    e = foe(g, 100);
  for (let i = 0; i < 3; i++) {
    hit(g, e);
    advance(g, 0.4);
  }
  assert.equal(g.player.kit.points, 3);
  g.player.hp = 1000;
  assert.ok(g.activate());
  assert.equal(g.player.kit.points, 0);
  assert.equal(g.player.kit.anchors[0].strength, 3);
  const before = e.hp;
  advance(g, 0.8);
  assert.ok(e.hp < before);
  assert.ok(g.player.hp > 1000);
  g.setInput(1, 0);
  advance(g, 1.5);
  assert.equal(g.player.kit.anchors[0].x, 0);
});
test("Priest Grace shields both heroes, absorption restores Grace, and sanctuary heals allies", () => {
  const g = make("priest", "rogue"),
    e = foe(g, 100);
  for (let i = 0; i < 5; i++) {
    hit(g, e);
    advance(g, 0.4);
  }
  g.player.kit.points = 5;
  g.partner!.player.hp = 1000;
  assert.ok(g.activate());
  assert.equal(g.player.shield, 70);
  assert.equal(g.partner!.player.shield, 70);
  g.player.invulnerable = 0;
  (g as any).hurtPlayer(20);
  assert.equal(g.player.kit.points, 1);
  advance(g, 0.8);
  assert.ok(g.partner!.player.hp > 1000);
  assert.notEqual(g.player.kit, g.partner!.player.kit);
  assert.equal(g.partner!.player.kit.points, 0);
});
test("Shaman Earth, Fire and Storm are independent anchored territories with bounded lifetime", () => {
  const g = make("shaman"),
    inside = foe(g, 100),
    outside = foe(g, 400);
  assert.ok(g.activate());
  advance(g, 2.1);
  assert.ok(inside.slowUntil > g.time);
  assert.ok(g.activate());
  advance(g, 2.1);
  assert.ok(g.activate());
  advance(g, 0.8);
  assert.deepEqual(
    g.player.kit.anchors.map((a) => a.kind),
    ["earth", "fire", "storm"],
  );
  assert.ok(g.damageBySpell.class_fire > 0);
  assert.ok(g.damageBySpell.class_storm > 0);
  assert.equal(outside.hp, outside.maxHp);
  advance(g, 2);
  assert.ok(g.activate());
  assert.equal(g.player.kit.anchors.length, 3);
  advance(g, 13);
  assert.equal(g.player.kit.anchors.length, 0);
});
test("Warlock Life Tap has a real health cost and cursed kills fuel a healing Soul Harvest", () => {
  const g = make("warlock"),
    e = foe(g, 200);
  g.player.resource = 0;
  const hp = g.player.hp;
  assert.ok(g.activate());
  assert.equal(g.player.hp, hp - g.player.maxHp * 0.15);
  assert.equal(g.player.resource, 45);
  advance(g, 4.1);
  hit(g, e, 20000);
  assert.equal(g.player.kit.points, 1);
  const next = foe(g, 250);
  hit(g, next);
  const before = next.hp,
    health = g.player.hp;
  assert.ok(g.activate());
  assert.ok(next.hp < before);
  assert.ok(g.player.hp > health);
  assert.equal(g.player.kit.points, 0);
  g.player.activeCooldown = 0;
  g.player.hp = g.player.maxHp * 0.1;
  assert.equal(g.activate(), false);
});
test("Druid Cat and Bear replace ranged Wrath with different real attacks and defenses", () => {
  const g = make("druid"),
    e = foe(g, 400);
  assert.ok(cast(g));
  g.projectiles = [];
  assert.ok(g.activate());
  assert.equal(g.player.kit.form, "cat");
  assert.equal(cast(g), false);
  e.x = 80;
  assert.ok(cast(g));
  assert.equal(g.projectiles.length, 0);
  advance(g, 1.3);
  assert.ok(g.activate());
  assert.equal(g.player.kit.form, "bear");
  const b = foe(g, -80);
  assert.ok(cast(g));
  assert.ok(b.hp < b.maxHp);
  assert.ok(b.slowUntil > g.time);
  g.player.invulnerable = 0;
  const hp = g.player.hp;
  (g as any).hurtPlayer(100);
  assert.ok(hp - g.player.hp < 50);
  advance(g, 1.3);
  assert.ok(g.activate());
  assert.equal(g.player.kit.form, "moonkin");
});
test("Co-op keeps form, combo, territory and dash direction state independent", () => {
  const g = make("shaman", "druid");
  assert.ok(g.activate());
  assert.ok(g.activatePartner());
  assert.equal(g.partner!.player.kit.form, "cat");
  assert.equal(g.player.kit.form, "moonkin");
  assert.equal(g.partner!.player.kit.anchors.length, 0);
  g.setPartnerInput(0, -1);
  assert.ok(g.dashPartner());
  advance(g, 0.18);
  assert.ok(g.partner!.player.y < -80);
  assert.equal(g.player.y, 0);
});

test("Druid forms use separate Mana, Energy and Rage reserves and gate caster spells", () => {
  const g = make("druid"),
    e = foe(g, 80);
  g.player.resource = 42;
  assert.equal(g.resourceKind, "Mana");
  assert.ok(g.activate());
  assert.equal(g.resourceKind, "Energy");
  assert.equal(g.player.resource, 100);
  assert.equal(cast(g, "moonfire"), false);
  assert.ok(cast(g));
  assert.equal(g.player.resource, 85);
  advance(g, 1.3);
  assert.ok(g.activate());
  assert.equal(g.resourceKind, "Rage");
  assert.equal(g.player.resource, 30);
  assert.ok(cast(g));
  assert.ok(g.player.resource < 30);
  assert.ok(e.hp < e.maxHp);
  advance(g, 1.3);
  assert.ok(g.activate());
  assert.equal(g.resourceKind, "Mana");
  assert.equal(g.player.resource, 42);
});
test("All nine kits expose distinct feedback and reject actions during every blocking game state", () => {
  assert.equal(new Set(Object.values(CLASS_KITS).map((k) => k.title)).size, 9);
  for (const id of Object.keys(CLASS_KITS) as ClassId[]) {
    const g = make(id);
    assert.ok(classStatus(id, g.player, g.time).text);
    for (const flag of ["paused", "choosing", "checkpoint", "ended"] as const) {
      g[flag] = true;
      assert.equal(g.activate(), false);
      assert.equal(g.dash(), false);
      g[flag] = false;
    }
    assert.ok(g.effects.length <= 100);
  }
});

test("Vanish breaks enemy pursuit and ranged casts without creating phantom contact hits", () => {
  const g = make("rogue"),
    e = foe(g, 200);
  e.speed = 100;
  e.type = "cultist";
  e.attackTimer = 0;
  g.player.facing = Math.PI / 2;
  const hp = g.player.hp;
  assert.ok(g.dash());
  advance(g, 0.5);
  assert.ok(g.player.y > 100);
  assert.equal(e.y, 0);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.player.hp, hp);
  e.x = 0;
  e.y = 0;
  advance(g, 0.1);
  assert.equal(g.player.hp, hp);
});
test("Downed partners leave no active totem territories behind", () => {
  const g = make("mage", "shaman");
  assert.ok(g.activatePartner());
  assert.equal(g.partner!.player.kit.anchors.length, 1);
  g.partner!.player.hp = 0;
  advance(g, 0.1);
  assert.equal(g.partner!.player.kit.anchors.length, 0);
});

test("Sinister Strike and Eviscerate follow the combo victim even when another enemy is closer", () => {
  const g = make("rogue"),
    a = foe(g, 90),
    b = foe(g, 40);
  assert.ok(cast(g));
  assert.equal(a.hp, a.maxHp);
  assert.ok(b.hp < b.maxHp);
  assert.equal(g.player.kit.target, b.id);
  advance(g, 0.4);
  a.x = 20;
  assert.ok(cast(g));
  assert.equal(a.hp, a.maxHp);
  assert.equal(g.player.kit.points, 2);
  const before = b.hp;
  assert.ok(g.activate());
  assert.ok(b.hp < before);
  assert.equal(a.hp, a.maxHp);
});
test("Party kills award active cursed souls and immediately clear the other hunter's mark", () => {
  for (const owner of ["primary", "partner"]) {
    const g = make(
        owner === "primary" ? "warlock" : "warrior",
        owner === "primary" ? "warrior" : "warlock",
      ),
      e = foe(g, 90);
    if (owner === "primary") {
      hit(g, e);
      (g as any).withPartner(() => hit(g, e, 20000));
      assert.equal(g.player.kit.points, 1);
      assert.equal(g.player.kit.curses.size, 0);
    } else {
      (g as any).withPartner(() => hit(g, e));
      hit(g, e, 20000);
      assert.equal(g.partner!.player.kit.points, 1);
      assert.equal(g.partner!.player.kit.curses.size, 0);
    }
  }
  const g = make("hunter", "warrior"),
    e = foe(g, 90);
  assert.ok(g.activate());
  assert.equal(g.player.kit.target, e.id);
  (g as any).withPartner(() => hit(g, e, 20000));
  assert.equal(g.player.kit.target, null);
});
