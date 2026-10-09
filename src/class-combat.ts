import type { ClassId } from "./content";
import type { Enemy, Vec } from "./engine";

export const CLASS_KITS: Record<
  ClassId,
  {
    title: string;
    action: string;
    dash: string;
    loop: string;
    cooldown: number;
  }
> = {
  warrior: {
    title: "Rage & resolve",
    action: "Rage Cleave",
    dash: "Charge",
    loop: "Fight up close to earn rage. C spends it on a frontal cleave. Space charges through foes and earns rage; standing your ground reduces incoming damage.",
    cooldown: 5,
  },
  mage: {
    title: "Frostfire resonance",
    action: "Shatter",
    dash: "Blink",
    loop: "Plant your feet to build Focus and empower spells. C freezes enemies; cast it again on frozen foes for a shatter burst. Space instantly blinks through danger.",
    cooldown: 4,
  },
  rogue: {
    title: "One target. Five points.",
    action: "Eviscerate",
    dash: "Vanish Step",
    loop: "Melee hits build up to five combo points on one target. C spends them to execute it. Changing targets loses points. Space grants two seconds of concealment and an empowered opener.",
    cooldown: 1.5,
  },
  hunter: {
    title: "The perfect hunting ground",
    action: "Trap & Command",
    dash: "Disengage",
    loop: "Stay beyond melee range and pause to aim for stronger shots. C marks your nearest prey, sends your pet, and plants a frost trap at your feet. Kite foes over the trap.",
    cooldown: 7,
  },
  paladin: {
    title: "Seal, judge, consecrate",
    action: "Judgement",
    dash: "Radiant Advance",
    loop: "Attacks build three seals. C spends them to consecrate the ground, damaging enemies and healing allies. Hold your holy ground to empower your attacks.",
    cooldown: 6,
  },
  priest: {
    title: "Damage becomes protection",
    action: "Grace Sanctuary",
    dash: "Feather Step",
    loop: "Attacks build five Grace. C turns Grace into party shields and a healing sanctuary, repelling nearby foes. Absorbing damage restores Grace. Space leaves a brief healing prayer.",
    cooldown: 7,
  },
  shaman: {
    title: "Build your elemental circle",
    action: "Plant Totem",
    dash: "Spirit Walk",
    loop: "C cycles Earth (slow and protection), Fire (area damage), and Storm (chained lightning) totems. Up to three persist for twelve seconds. Fight inside your totem territory.",
    cooldown: 2,
  },
  warlock: {
    title: "Life for power. Souls for life.",
    action: "Life Tap / Harvest",
    dash: "Fel Step",
    loop: "Shadow hits curse foes. C trades health for mana and empowered curses; kills of cursed foes earn three soul shards. C spends shards to harvest cursed enemies and heal you.",
    cooldown: 4,
  },
  druid: {
    title: "Three shapes, three roles",
    action: "Change Form",
    dash: "Wild Leap",
    loop: "C cycles Moonkin, Cat, and Bear. Moonkin casts at range; Cat uses Energy for fast claws; Bear uses Rage for armored swipes and pack control. Choose a shape for the situation.",
    cooldown: 1.2,
  },
};
export type DruidForm = "moonkin" | "cat" | "bear";
export interface ClassAnchor extends Vec {
  kind: "earth" | "fire" | "storm" | "holy" | "sanctuary" | "trap" | "prayer";
  until: number;
  pulse: number;
  strength: number;
}
export interface ClassState {
  points: number;
  target: number | null;
  focus: number;
  concealedUntil: number;
  decoy: Vec | null;
  empoweredUntil: number;
  form: DruidForm;
  reserves: Record<DruidForm, number>;
  element: number;
  anchors: ClassAnchor[];
  curses: Map<number, number>;
  pulseAt: number;
  builderAt: number;
  dashX: number;
  dashY: number;
  dashHits: Set<number>;
  motionAt: number;
  motionFacing: number;
}
export function createClassState(): ClassState {
  return {
    points: 0,
    target: null,
    focus: 0,
    concealedUntil: 0,
    decoy: null,
    empoweredUntil: 0,
    form: "moonkin",
    reserves: { moonkin: 100, cat: 100, bear: 30 },
    element: 0,
    anchors: [],
    curses: new Map(),
    pulseAt: 0,
    builderAt: -1,
    dashX: 1,
    dashY: 0,
    dashHits: new Set(),
    motionAt: -10,
    motionFacing: 0,
  };
}
export interface ClassActor extends Vec {
  hp: number;
  maxHp: number;
  resource: number;
  shield: number;
  shieldTimer: number;
  invulnerable: number;
  facing: number;
  activeCooldown: number;
  dashTimer: number;
  kit: ClassState;
}
export interface ClassWorld {
  id: ClassId;
  actor: ClassActor;
  time: number;
  power: number;
  enemies: Enemy[];
  allies: ClassActor[];
  damage: (enemy: Enemy, amount: number, source: string) => void;
  visual: (
    at: Vec,
    radius: number,
    motif: "cast" | "signature" | "dash",
    facing?: number,
  ) => void;
}
const near = (a: Vec, b: Vec, range: number) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= range;
const closest = (w: ClassWorld, range: number) =>
  w.enemies
    .filter((e) => !e.dead && near(e, w.actor, range))
    .sort(
      (a, b) =>
        Math.hypot(a.x - w.actor.x, a.y - w.actor.y) -
        Math.hypot(b.x - w.actor.x, b.y - w.actor.y),
    )[0];
const heal = (p: ClassActor, amount: number) => {
  if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + amount);
};
export function classSpeed(id: ClassId, k: ClassState): number {
  return id === "druid"
    ? k.form === "cat"
      ? 1.28
      : k.form === "bear"
        ? 0.82
        : 1
    : 1;
}
export function classResource(
  id: ClassId,
  k: ClassState,
): "Mana" | "Energy" | "Rage" {
  return id === "warrior" || (id === "druid" && k.form === "bear")
    ? "Rage"
    : id === "rogue" || (id === "druid" && k.form === "cat")
      ? "Energy"
      : "Mana";
}
export function classDamage(
  w: ClassWorld,
  enemy: Enemy,
  source: string,
): number {
  const k = w.actor.kit;
  if (source.startsWith("class_")) return 1;
  switch (w.id) {
    case "mage":
      return 1 + k.focus * 0.18;
    case "rogue":
      return w.time < k.concealedUntil ? 1.65 : 1;
    case "hunter":
      return source === "beast"
        ? k.target === enemy.id
          ? 1.5
          : 1
        : (near(enemy, w.actor, 150) ? 0.65 : 1.15) * (1 + k.focus * 0.12);
    case "paladin":
      return k.anchors.some((a) => a.kind === "holy" && near(a, w.actor, 165))
        ? 1.2
        : 1;
    case "warlock":
      return w.time < k.empoweredUntil ? 1.35 : 1;
    default:
      return 1;
  }
}
export function recordClassHit(
  w: ClassWorld,
  enemy: Enemy,
  source: string,
  primary: string,
) {
  const k = w.actor.kit;
  if (w.id === "warlock" && source === primary)
    k.curses.set(enemy.id, w.time + 8);
  if (source !== primary || w.time < k.builderAt) return;
  k.builderAt = w.time + 0.35;
  if (w.id === "rogue") {
    if (k.target !== enemy.id) k.points = 0;
    k.target = enemy.id;
    k.points = Math.min(5, k.points + 1);
    k.concealedUntil = 0;
  }
  if (w.id === "paladin") k.points = Math.min(3, k.points + 1);
  if (w.id === "priest") k.points = Math.min(5, k.points + 1);
}
export function recordClassKill(w: ClassWorld, enemy: Enemy) {
  const k = w.actor.kit;
  if (
    w.id === "warlock" &&
    w.actor.hp > 0 &&
    (k.curses.get(enemy.id) || 0) > w.time
  )
    k.points = Math.min(3, k.points + 1);
  k.curses.delete(enemy.id);
  if (w.id === "rogue" && k.target === enemy.id) {
    k.target = null;
    k.points = 0;
  }
  if (w.id === "hunter" && k.target === enemy.id) k.target = null;
}
export function classSignature(w: ClassWorld): boolean {
  const p = w.actor,
    k = p.kit,
    scale = 1 + w.power / 100;
  const target =
    w.id === "rogue"
      ? w.enemies.find((e) => !e.dead && e.id === k.target && near(e, p, 170))
      : closest(w, 700);
  if (
    w.id === "rogue" &&
    (!target || target.id !== k.target || !k.points || p.resource < 20)
  )
    return false;
  if (w.id === "warrior" && p.resource < 25) return false;
  if (w.id === "warlock" && !k.points && p.hp <= p.maxHp * 0.15 + 1)
    return false;
  p.activeCooldown = CLASS_KITS[w.id].cooldown;
  k.motionAt = w.time;
  k.motionFacing = p.facing;
  if (w.id === "warrior") {
    const rage = Math.min(60, p.resource);
    p.resource -= rage;
    for (const e of w.enemies)
      if (!e.dead && near(e, p, 210)) {
        const angle = Math.atan2(e.y - p.y, e.x - p.x) - p.facing;
        if (Math.cos(angle) > -0.15) {
          w.damage(e, (35 + rage * 1.5) * scale, "class_cleave");
          e.x += Math.cos(p.facing) * 45;
          e.y += Math.sin(p.facing) * 45;
        }
      }
    p.invulnerable = Math.max(p.invulnerable, 0.4);
  } else if (w.id === "mage") {
    for (const e of w.enemies)
      if (!e.dead && near(e, p, 270)) {
        w.damage(
          e,
          (e.frozenUntil > w.time ? 100 : 28) * scale * (1 + k.focus * 0.2),
          "class_shatter",
        );
        e.frozenUntil = w.time + (e.boss ? 0.6 : 5); // A second Shatter can exploit the first freeze.
      }
    k.focus = 0;
  } else if (w.id === "rogue" && target) {
    const points = k.points,
      opener = w.time < k.concealedUntil ? 1.65 : 1;
    k.points = 0;
    k.concealedUntil = 0;
    p.resource -= 20;
    w.damage(target, (25 + points * 32) * scale * opener, "class_eviscerate");
    w.visual(target, 70, "signature", p.facing);
    p.invulnerable = Math.max(p.invulnerable, 0.25);
  } else if (w.id === "hunter") {
    k.target = target?.id ?? null;
    k.anchors = [
      {
        x: p.x,
        y: p.y,
        kind: "trap",
        until: w.time + 12,
        pulse: w.time,
        strength: 1,
      },
    ];
  } else if (w.id === "paladin" || w.id === "priest") {
    const strength = k.points;
    k.points = 0;
    k.anchors = [
      {
        x: p.x,
        y: p.y,
        kind: w.id === "paladin" ? "holy" : "sanctuary",
        until: w.time + 6,
        pulse: w.time,
        strength,
      },
    ];
    if (w.id === "priest") {
      for (const ally of w.allies)
        if (ally.hp > 0 && near(ally, p, 450)) {
          ally.shield = Math.max(ally.shield, 20 + strength * 10);
          ally.shieldTimer = Math.max(ally.shieldTimer, 8);
        }
      for (const e of w.enemies)
        if (!e.dead && near(e, p, 220)) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(a) * 100;
          e.y += Math.sin(a) * 100;
        }
    }
  } else if (w.id === "shaman") {
    const angle = (k.element * Math.PI * 2) / 3 - Math.PI / 2;
    const kind = (["earth", "fire", "storm"] as const)[k.element];
    k.element = (k.element + 1) % 3;
    k.anchors = k.anchors.filter((a) => a.kind !== kind);
    k.anchors.push({
      x: p.x + Math.cos(angle) * 55,
      y: p.y + Math.sin(angle) * 55,
      kind,
      until: w.time + 12,
      pulse: w.time,
      strength: 1,
    });
  } else if (w.id === "warlock") {
    if (k.points) {
      const shards = k.points;
      k.points = 0;
      for (const e of w.enemies)
        if (!e.dead && k.curses.has(e.id) && near(e, p, 800)) {
          w.damage(e, (35 + shards * 30) * scale, "class_harvest");
          w.visual(e, 55, "signature");
        }
      heal(p, 12 + shards * 12);
    } else {
      p.hp -= p.maxHp * 0.15;
      p.resource = Math.min(100, p.resource + 45);
      k.empoweredUntil = w.time + 6;
    }
  } else if (w.id === "druid") {
    k.reserves[k.form] = p.resource;
    k.form =
      k.form === "moonkin" ? "cat" : k.form === "cat" ? "bear" : "moonkin";
    p.resource = k.reserves[k.form];
  }
  w.visual(p, w.id === "warrior" ? 210 : 100, "signature", p.facing);
  return true;
}
export function updateClass(w: ClassWorld, dt: number, moving: boolean) {
  const p = w.actor,
    k = p.kit;
  if (p.hp <= 0) {
    k.anchors = [];
    k.curses.clear();
    return;
  }
  k.focus = Math.max(0, Math.min(3, k.focus + dt * (moving ? -3 : 1)));
  if (
    w.id === "rogue" &&
    !w.enemies.some((e) => !e.dead && e.id === k.target)
  ) {
    k.points = 0;
    k.target = null;
  }
  if (w.id === "hunter" && !w.enemies.some((e) => !e.dead && e.id === k.target))
    k.target = null;
  if (
    p.dashTimer > 0 &&
    (w.id === "warrior" || (w.id === "druid" && k.form !== "moonkin"))
  )
    for (const e of w.enemies)
      if (!e.dead && !k.dashHits.has(e.id) && near(e, p, 70 + e.radius)) {
        k.dashHits.add(e.id);
        w.damage(e, 32 * (1 + w.power / 100), "class_charge");
        if (w.id === "warrior") p.resource = Math.min(100, p.resource + 10);
      }
  k.anchors = k.anchors.filter((a) => a.until > w.time);
  for (const a of k.anchors) {
    if (w.time < a.pulse) continue;
    a.pulse = w.time + 0.75;
    const foes = w.enemies.filter(
      (e) => !e.dead && near(e, a, a.kind === "trap" ? 90 : 165),
    );
    if (a.kind === "earth" || a.kind === "trap") {
      for (const e of foes) {
        e.slow = 0.4;
        e.slowUntil = w.time + 1.5;
        if (a.kind === "trap") {
          e.frozenUntil = w.time + (e.boss ? 0.5 : 2.5);
          w.damage(e, 28 * (1 + w.power / 100), "class_trap");
        }
      }
      if (a.kind === "trap" && foes.length) {
        a.until = w.time;
        w.visual(a, 100, "signature");
      }
    }
    if (a.kind === "fire" || a.kind === "holy")
      for (const e of foes)
        w.damage(
          e,
          (a.kind === "fire" ? 18 : 10 + a.strength * 5) * (1 + w.power / 100),
          `class_${a.kind}`,
        );
    if (a.kind === "storm")
      for (const e of foes.slice(0, 3)) {
        w.damage(e, 24 * (1 + w.power / 100), "class_storm");
        w.visual(e, 35, "cast");
      }
    if (["holy", "sanctuary", "prayer"].includes(a.kind))
      for (const ally of w.allies)
        if (near(ally, a, 165))
          heal(ally, a.kind === "holy" ? 2 + a.strength : 3 + a.strength * 1.5);
  }
  if (w.id === "warlock" && w.time >= k.pulseAt) {
    k.pulseAt = w.time + 1;
    for (const [id, until] of k.curses) {
      const e = w.enemies.find((e) => e.id === id && !e.dead);
      if (!e || until <= w.time) {
        k.curses.delete(id);
        continue;
      }
      w.damage(
        e,
        12 * (1 + w.power / 100) * (w.time < k.empoweredUntil ? 1.5 : 1),
        "class_curse",
      );
    }
  }
}
export function classStatus(
  id: ClassId,
  p: ClassActor,
  time: number,
): { meter: number; text: string; action: string } {
  const k = p.kit,
    base = CLASS_KITS[id];
  switch (id) {
    case "warrior":
      return {
        meter: p.resource,
        text: `${Math.floor(p.resource)} Rage · ${p.resource >= 25 ? "Cleave ready" : "Charge or strike to build"}`,
        action: base.action,
      };
    case "mage":
      return {
        meter: (k.focus / 3) * 100,
        text: `Focus ${k.focus.toFixed(1)} / 3 · ${k.focus >= 2 ? "Empowered" : "Stand still to channel"}`,
        action: base.action,
      };
    case "rogue":
      return {
        meter: (k.points / 5) * 100,
        text: `${"◆".repeat(k.points)}${"◇".repeat(5 - k.points)} · ${time < k.concealedUntil ? "Concealed" : "Combo points on marked prey"}`,
        action: base.action,
      };
    case "hunter":
      return {
        meter: (k.focus / 3) * 100,
        text: `Aim ${k.focus.toFixed(1)} / 3 · ${k.target === null ? "Keep your distance" : "Pet attacking marked prey"}`,
        action: base.action,
      };
    case "paladin":
      return {
        meter: (k.points / 3) * 100,
        text: `Seals ${k.points} / 3 · Judge to consecrate`,
        action: base.action,
      };
    case "priest":
      return {
        meter: (k.points / 5) * 100,
        text: `Grace ${k.points} / 5 · Release to protect allies`,
        action: base.action,
      };
    case "shaman":
      return {
        meter: (k.anchors.length / 3) * 100,
        text: `${k.anchors.length} / 3 totems · Next: ${["Earth", "Fire", "Storm"][k.element]}`,
        action: `${["Earth", "Fire", "Storm"][k.element]} Totem`,
      };
    case "warlock":
      return {
        meter: (k.points / 3) * 100,
        text: `Souls ${k.points} / 3 · ${time < k.empoweredUntil ? "Fel empowered" : k.points ? "Harvest to heal" : "Life Tap costs 15% health"}`,
        action: k.points ? "Soul Harvest" : "Life Tap",
      };
    case "druid":
      return {
        meter: 100,
        text: `${k.form.toUpperCase()} · ${k.form === "cat" ? "Speed & claws" : k.form === "bear" ? "Armor & pack control" : "Ranged nature magic"}`,
        action: `Become ${k.form === "moonkin" ? "Cat" : k.form === "cat" ? "Bear" : "Moonkin"}`,
      };
  }
}
