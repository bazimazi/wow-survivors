import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, CLASS_MAP, ZONES } from "../src/content";
import type { ClassId } from "../src/content";
import { GameEngine } from "../src/engine";
import type { Enemy } from "../src/engine";
import { TRAVEL_OPTIONS } from "../src/travel";
import {
  claimClassTrial,
  freshSave,
  heroStats,
  purchaseTravel,
  ridingRestriction,
  selectTravel,
  selectedTravel,
  trainRiding,
  travelPurchaseRestriction,
  travelSelectionRestriction,
  validateSave,
} from "../src/progression";

function prepared(id: ClassId = "mage") {
  const s = freshSave();
  s.selectedClass = id;
  for (const c of CLASSES) s.heroes[c.id].level = 20;
  s.gold = 5000;
  return s;
}
function make(id: ClassId = "mage", travelId = "horse", supplies = true) {
  const g = new GameEngine({
    classId: id,
    zone: ZONES[0],
    stats: { ...heroStats(freshSave(), id), health: 10000, crit: 0, speed: 20 },
    professions: { herbalism: 1, mining: 1 },
    seed: 123,
    travelId,
    onConsume: () => supplies,
  });
  g.enemies = [];
  return g;
}
function advance(g: GameEngine, seconds: number, clear = true) {
  for (let i = 0; i < seconds * 60; i++) {
    if (clear) g.enemies = [];
    g.update(1 / 60);
  }
}
function mount(g: GameEngine) {
  assert.ok(g.toggleTravel());
  advance(g, 1.3);
  assert.ok(g.travel.active);
}
function enemy(x = 200, y = 0): Enemy {
  return {
    id: 9000,
    type: "wolf",
    x,
    y,
    hp: 100000,
    maxHp: 100000,
    radius: 15,
    speed: 0,
    damage: 10,
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
function hit(g: GameEngine) {
  g.player.invulnerable = 0;
  g.projectiles.push({
    x: g.player.x,
    y: g.player.y,
    vx: 0,
    vy: 0,
    damage: 10,
    radius: 5,
    color: "red",
    life: 1,
    pierce: 0,
    slow: 1,
    hit: new Set(),
    enemy: true,
  });
  g.update(1 / 60);
}

test("every hero trains personal riding through both level gates with exact fees", () => {
  for (const c of CLASSES) {
    const s = prepared(c.id),
      h = s.heroes[c.id];
    h.level = 11;
    const before = JSON.stringify(s);
    assert.match(ridingRestriction(s)!, /12/);
    assert.equal(trainRiding(s), false);
    assert.equal(JSON.stringify(s), before);
    h.level = 12;
    assert.ok(trainRiding(s));
    assert.equal(h.travel.riding, 1);
    assert.equal(s.gold, 4900);
    assert.equal(
      s.heroes[c.id === "mage" ? "warrior" : "mage"].travel.riding,
      0,
    );
    assert.equal(trainRiding(s), false);
    h.level = 20;
    assert.ok(trainRiding(s));
    assert.equal(h.travel.riding, 2);
    assert.equal(s.gold, 4550);
    assert.equal(trainRiding(s), false);
    assert.equal(s.gold, 4550);
  }
});
test("all ten purchasable steeds enforce race, training, affordability and one-time atomic costs", () => {
  assert.equal(TRAVEL_OPTIONS.filter((t) => t.kind === "mount").length, 10);
  for (const t of TRAVEL_OPTIONS.filter((t) => t.kind === "mount")) {
    const id = CLASSES.find((c) => c.race === t.race)!.id,
      s = prepared(id);
    let before = JSON.stringify(s);
    assert.equal(purchaseTravel(s, t.id), false);
    assert.equal(JSON.stringify(s), before);
    trainRiding(s);
    if (t.rank === 2) trainRiding(s);
    s.gold = t.price - 1;
    before = JSON.stringify(s);
    assert.equal(purchaseTravel(s, t.id), false);
    assert.equal(JSON.stringify(s), before);
    s.gold = t.price;
    assert.ok(purchaseTravel(s, t.id));
    assert.equal(s.gold, 0);
    assert.deepEqual(s.mounts, [t.id]);
    assert.equal(selectedTravel(s)?.id, t.id);
    assert.equal(purchaseTravel(s, t.id), false);
    s.selectedClass = id === "shaman" ? "mage" : "shaman";
    assert.equal(selectTravel(s, t.id), false);
  }
  const s = prepared();
  assert.equal(purchaseTravel(s, "toString"), false);
  assert.equal(purchaseTravel(s, "oathbound"), false);
});
test("shared horse ownership still requires each Human's riding rank and stores independent selections", () => {
  const s = prepared();
  trainRiding(s);
  purchaseTravel(s, "horse");
  const remaining = s.gold;
  s.selectedClass = "warrior";
  assert.equal(selectTravel(s, "horse"), false);
  trainRiding(s);
  assert.ok(selectTravel(s, "horse"));
  assert.equal(s.gold, remaining - 100);
  assert.equal(s.mounts.length, 1);
  selectTravel(s, null);
  assert.equal(selectedTravel(s), null);
  assert.equal(s.heroes.mage.travel.selected, "horse");
  s.selectedClass = "mage";
  trainRiding(s);
  purchaseTravel(s, "swift_horse");
  assert.equal(selectedTravel(s)?.id, "horse");
  assert.ok(selectTravel(s, "swift_horse"));
});
test("final class trial claims unlock class steeds, including completed older trials, without riding fees", () => {
  for (const [id, mountId] of [
    ["paladin", "oathbound"],
    ["warlock", "emberbound"],
  ] as const) {
    const s = prepared(id);
    s.heroes[id].level = 10;
    assert.match(travelSelectionRestriction(s, mountId)!, /three class trials/);
    s.heroes[id].classTrial = {
      chapter: 2,
      active: true,
      progress: { evolutions: 1, bosses: 1 },
    };
    assert.ok(claimClassTrial(s));
    const before = s.gold;
    assert.ok(selectTravel(s, mountId));
    assert.equal(s.gold, before);
    assert.equal(s.heroes[id].travel.riding, 0);
    assert.equal(selectedTravel(validateSave(s))?.id, mountId);
    const old = JSON.parse(JSON.stringify(s));
    delete old.heroes[id].travel;
    delete old.mounts;
    const migrated = validateSave(old);
    assert.ok(selectTravel(migrated, mountId));
    assert.equal(migrated.mounts.length, 0);
    migrated.selectedClass = "mage";
    assert.equal(selectTravel(migrated, mountId), false);
  }
});
test("class forms have independent level and gold gates with no riding requirement", () => {
  for (const [id, form] of [
    ["druid", "travel_form"],
    ["shaman", "ghost_wolf"],
  ] as const) {
    const s = prepared(id);
    s.heroes[id].level = 7;
    assert.equal(purchaseTravel(s, form), false);
    s.heroes[id].level = 8;
    s.gold = 39;
    const before = JSON.stringify(s);
    assert.equal(purchaseTravel(s, form), false);
    assert.equal(JSON.stringify(s), before);
    s.gold = 40;
    assert.ok(purchaseTravel(s, form));
    assert.equal(s.gold, 0);
    assert.equal(selectedTravel(s)?.speed, 40);
    assert.equal(s.heroes[id].travel.riding, 0);
    assert.deepEqual(s.mounts, []);
    assert.equal(purchaseTravel(s, form), false);
    s.selectedClass = "mage";
    assert.equal(purchaseTravel(s, form), false);
  }
});
test("validated saves clear unknown, unowned, wrong-race and under-level selections and malformed training", () => {
  const s = prepared();
  s.mounts = ["horse", "horse", "bogus", "oathbound", "__proto__"];
  s.heroes.mage.travel = { riding: 2, form: true, selected: "swift_horse" };
  s.heroes.warrior.travel = { riding: 1, form: false, selected: "wolf" };
  s.heroes.druid.level = 7;
  s.heroes.druid.travel = { riding: 2, form: true, selected: "travel_form" };
  let clean = validateSave(s);
  assert.deepEqual(clean.mounts, ["horse"]);
  assert.deepEqual(clean.heroes.mage.travel, {
    riding: 2,
    form: false,
    selected: null,
  });
  assert.equal(clean.heroes.warrior.travel.selected, null);
  assert.deepEqual(clean.heroes.druid.travel, {
    riding: 0,
    form: false,
    selected: null,
  });
  s.heroes.mage.travel.selected = "horse";
  clean = validateSave(s);
  assert.equal(clean.heroes.mage.travel.selected, "horse");
  const raw = JSON.parse(JSON.stringify(s));
  raw.heroes.mage.travel.riding = "2";
  raw.heroes.mage.travel.selected = "horse";
  assert.equal(validateSave(raw).heroes.mage.travel.selected, null);
  raw.heroes.mage.travel.riding = Infinity;
  assert.equal(validateSave(raw).heroes.mage.travel.riding, 0);
});
test("mount selection changes no camp combat stats and the engine snapshots a class-valid option", () => {
  const s = prepared(),
    before = heroStats(s);
  trainRiding(s);
  purchaseTravel(s, "horse");
  assert.deepEqual(heroStats(s), before);
  const g = make();
  s.heroes.mage.travel.selected = null;
  assert.equal(g.travelOption?.id, "horse");
  assert.equal(make("mage", "wolf").travelOption, null);
  assert.equal(make("mage", "ghost_wolf").travelOption, null);
  assert.equal(make("mage", "constructor").travelOption, null);
});
test("normal, swift and form movement multiply the upgraded walking speed exactly", () => {
  for (const [id, t, speed] of [
    ["mage", "horse", 60],
    ["mage", "swift_horse", 100],
    ["druid", "travel_form", 40],
    ["shaman", "ghost_wolf", 40],
  ] as const) {
    const g = make(id, t);
    mount(g);
    g.player.x = 0;
    g.setInput(1, 0);
    advance(g, 1);
    assert.ok(
      Math.abs(g.player.x - CLASS_MAP[id].speed * 1.2 * (1 + speed / 100)) <
        0.001,
    );
    g.toggleTravel();
    g.player.x = 0;
    advance(g, 1);
    assert.ok(Math.abs(g.player.x - CLASS_MAP[id].speed * 1.2) < 0.001);
  }
});
test("summoning freezes during pause or upgrades and cancels on movement or an approaching enemy", () => {
  const g = make();
  assert.ok(g.toggleTravel());
  advance(g, 0.2);
  const remaining = g.travel.channel;
  g.paused = true;
  advance(g, 2);
  assert.equal(g.travel.channel, remaining);
  assert.equal(g.toggleTravel(), false);
  g.paused = false;
  g.choosing = true;
  advance(g, 2);
  assert.equal(g.travel.channel, remaining);
  g.choosing = false;
  g.setInput(1, 0);
  advance(g, 0.1);
  assert.equal(g.travelling, false);
  g.setInput(0, 0);
  assert.ok(g.toggleTravel());
  g.enemies = [enemy(g.player.x + 100, g.player.y)];
  advance(g, 0.1, false);
  assert.equal(g.travelling, false);
  assert.equal(g.toggleTravel(), false);
  g.enemies[0].dead = true;
  assert.ok(g.toggleTravel());
  assert.ok(g.toggleTravel());
  assert.equal(g.travelling, false);
});
test("accepted projectile hits dismount even through a shield and lock remounting for four simulation seconds", () => {
  const g = make();
  mount(g);
  g.player.shield = 100;
  const hp = g.player.hp;
  hit(g);
  assert.equal(g.travel.active, false);
  assert.equal(g.player.hp, hp);
  assert.equal(g.travel.lock, 4);
  assert.equal(g.toggleTravel(), false);
  g.paused = true;
  advance(g, 10);
  assert.equal(g.travel.lock, 4);
  g.paused = false;
  advance(g, 3.9);
  assert.equal(g.toggleTravel(), false);
  advance(g, 0.12);
  assert.ok(g.toggleTravel());
});
test("invulnerability rejects a hit without dismissing a steed", () => {
  const g = make();
  mount(g);
  g.player.invulnerable = 1;
  g.enemies = [enemy(0, 0)];
  advance(g, 0.1, false);
  assert.equal(g.travel.active, true);
  assert.equal(g.travel.lock, 0);
});
test("successful combat actions dismiss travel while failed actions preserve it", () => {
  const g = make("mage", "horse", false);
  mount(g);
  assert.equal(g.usePotion(), false);
  assert.equal(g.useBomb(), false);
  assert.equal(g.dash(), false);
  assert.equal(g.travel.active, true);
  g.player.resource = 0;
  assert.equal(g.activate(), false);
  assert.equal(g.travel.active, true);
  g.player.resource = 100;
  assert.ok(g.activate());
  assert.equal(g.travelling, false);
  const dash = make();
  mount(dash);
  dash.setInput(1, 0);
  assert.ok(dash.dash());
  assert.equal(dash.travel.active, false);
  const supply = make();
  mount(supply);
  supply.player.hp -= 50;
  assert.ok(supply.usePotion());
  assert.equal(supply.travel.active, false);
  mount(supply);
  assert.ok(supply.useBomb());
  assert.equal(supply.travel.active, false);
});
test("automatic ranged, orbit and pet attacks stop while travelling and resume on foot", () => {
  for (const [id, t] of [
    ["mage", "horse"],
    ["rogue", "horse"],
    ["hunter", "ram"],
    ["warlock", "skeletal"],
  ] as const) {
    const g = make(id, t);
    if (id === "rogue")
      g.spells.push({ id: "flurry", rank: 1, timer: 0, orbitTimer: 0 });
    mount(g);
    g.enemies = [enemy(70)];
    advance(g, 1, false);
    assert.equal(g.totalDamage, 0, `${id} mounted offense`);
    assert.equal(g.projectiles.length, 0);
    g.toggleTravel();
    advance(g, 1.5, false);
    assert.ok(g.totalDamage > 0, `${id} walking offense`);
  }
});
test("existing projectiles resolve while mounted without generating new spell casts", () => {
  const g = make();
  mount(g);
  g.enemies = [enemy(200)];
  g.projectiles.push({
    x: 190,
    y: 0,
    vx: 100,
    vy: 0,
    damage: 10,
    radius: 5,
    color: "blue",
    life: 1,
    pierce: 0,
    slow: 1,
    hit: new Set(),
  });
  advance(g, 0.2, false);
  assert.ok(g.totalDamage > 0);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.travel.active, true);
});
test("gathering waits for dismount and successful landmark interaction ends travel", () => {
  const g = make();
  g.nodes = [{ id: 1, kind: "herbs", x: 0, y: 0, depleted: false }];
  mount(g);
  assert.equal(g.nodes[0].depleted, false);
  g.toggleTravel();
  advance(g, 0.1);
  assert.equal(g.nodes[0].depleted, true);
  assert.equal(g.materials.herbs, 2);
  mount(g);
  assert.equal(g.interact(), false);
  assert.equal(g.travel.active, true);
  const shrine = g.landmarks.find((l) => l.kind === "shrine")!;
  g.player.x = shrine.x;
  g.player.y = shrine.y;
  assert.ok(g.interact());
  assert.equal(g.travelling, false);
  assert.ok(g.shrineChoice);
});
test("boss arrival dismisses travel and dungeon arenas prohibit summoning", () => {
  const g = make();
  mount(g);
  g.time = g.zone.duration;
  g.update(1 / 60);
  assert.ok(g.boss);
  assert.equal(g.travelling, false);
  assert.match(g.travelRestriction!, /final boss/);
  assert.equal(g.toggleTravel(), false);
  const d = new GameEngine({
    classId: "mage",
    zone: ZONES.find((z) => z.id === "deadmines")!,
    stats: heroStats(prepared()),
    professions: {},
    travelId: "horse",
  });
  assert.equal(d.toggleTravel(), false);
  assert.match(d.travelRestriction!, /dungeons/);
});
