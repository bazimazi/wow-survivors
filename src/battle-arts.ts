import type { ClassId } from "./content";
import type { CombatAction, Effect, Enemy, Projectile, Vec } from "./engine";

export type ArtShape =
  "cone" | "lunge" | "missile" | "blast" | "beam" | "chain";
export interface BattleArt {
  name: string;
  shape: ArtShape;
  spell: string;
  color: string;
  damage: number;
  range: number;
  radius: number;
  cooldown: number;
  description: string;
}
export const BATTLE_ARTS: Record<ClassId, BattleArt> = {
  warrior: {
    name: "Sundering Strike",
    shape: "cone",
    spell: "cleave",
    color: "#efbd75",
    damage: 52,
    range: 180,
    radius: 0.85,
    cooldown: 3.8,
    description: "A frontal sweep that knocks a path through the horde.",
  },
  mage: {
    name: "Ice Lance",
    shape: "missile",
    spell: "frostbolt",
    color: "#82dfff",
    damage: 48,
    range: 760,
    radius: 13,
    cooldown: 4.2,
    description:
      "Aim a piercing lance. A full charge freezes ordinary enemies.",
  },
  rogue: {
    name: "Shadow Lunge",
    shape: "lunge",
    spell: "sinister",
    color: "#c1a3fa",
    damage: 48,
    range: 170,
    radius: 0.65,
    cooldown: 3.6,
    description: "Surge forward and cut through enemies in front of you.",
  },
  hunter: {
    name: "Piercing Shot",
    shape: "missile",
    spell: "shot",
    color: "#d8ee9c",
    damage: 62,
    range: 900,
    radius: 9,
    cooldown: 4,
    description: "Line up a shot that pierces an entire column of enemies.",
  },
  paladin: {
    name: "Dawn Hammer",
    shape: "blast",
    spell: "holystrike",
    color: "#ffe19b",
    damage: 55,
    range: 310,
    radius: 90,
    cooldown: 5,
    description: "Call a hammer of light onto the targeted ground.",
  },
  priest: {
    name: "Purifying Ray",
    shape: "beam",
    spell: "smite",
    color: "#fff1c2",
    damage: 42,
    range: 560,
    radius: 23,
    cooldown: 4.5,
    description: "Burn a line through foes; each hit restores a little health.",
  },
  shaman: {
    name: "Storm Surge",
    shape: "chain",
    spell: "lightning",
    color: "#85d6ff",
    damage: 42,
    range: 480,
    radius: 210,
    cooldown: 4.5,
    description: "Aim at a foe and arc lightning through nearby enemies.",
  },
  warlock: {
    name: "Soul Implosion",
    shape: "blast",
    spell: "shadowbolt",
    color: "#c497f9",
    damage: 58,
    range: 360,
    radius: 110,
    cooldown: 5,
    description: "Collapse a shadow vortex, pulling its victims together.",
  },
  druid: {
    name: "Thorn Spear",
    shape: "missile",
    spell: "wrath",
    color: "#b7ec85",
    damage: 44,
    range: 650,
    radius: 15,
    cooldown: 4,
    description: "Send a piercing thorn through foes; full charge roots them.",
  },
};
export const ART_CHARGE_TIME = 0.7;
export interface ArtWorld {
  id: ClassId;
  player: Vec & {
    facing: number;
    hp: number;
    maxHp: number;
    invulnerable: number;
  };
  time: number;
  power: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  allowed: boolean;
  bounds: Vec;
  damage(enemy: Enemy, damage: number, spell: string, charged?: boolean): void;
  effect(effect: Omit<Effect, "maxLife">): void;
  action(action: CombatAction): void;
}
export function segmentDistance(point: Vec, from: Vec, to: Vec) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = dx * dx + dy * dy;
  const t = length
    ? Math.max(
        0,
        Math.min(
          1,
          ((point.x - from.x) * dx + (point.y - from.y) * dy) / length,
        ),
      )
    : 0;
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}

/** An aimed, charged attack available from the first second of every expedition. */
export class BattleArtState {
  charging = false;
  charge = 0;
  cooldown = 0;
  aim: Vec | null = null;
  releasedAt = -10;
  releasedPower = 0;
  begin(world: ArtWorld): boolean {
    if (!world.allowed || this.cooldown > 0 || this.charging) return false;
    this.charge = 0;
    this.charging = true;
    return true;
  }
  cancel() {
    this.charging = false;
    this.charge = 0;
  }
  update(world: ArtWorld, dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!world.allowed) {
      this.cancel();
      return;
    }
    if (this.charging) {
      this.charge = Math.min(ART_CHARGE_TIME, this.charge + dt);
      world.player.facing = this.angle(world.player);
    }
  }
  angle(player: Vec & { facing: number }) {
    return this.aim &&
      Math.hypot(this.aim.x - player.x, this.aim.y - player.y) > 3
      ? Math.atan2(this.aim.y - player.y, this.aim.x - player.x)
      : player.facing;
  }
  target(player: Vec & { facing: number }, art: BattleArt): Vec {
    const angle = this.angle(player);
    const range =
      this.aim && (art.shape === "blast" || art.shape === "chain")
        ? Math.min(
            art.range,
            Math.hypot(this.aim.x - player.x, this.aim.y - player.y),
          )
        : art.range;
    return {
      x: player.x + Math.cos(angle) * range,
      y: player.y + Math.sin(angle) * range,
    };
  }
  release(world: ArtWorld): boolean {
    if (!this.charging) return false;
    if (!world.allowed) {
      this.cancel();
      return false;
    }
    const art = BATTLE_ARTS[world.id],
      p = world.player;
    const power = this.charge / ART_CHARGE_TIME;
    const angle = this.angle(p),
      origin = { x: p.x, y: p.y };
    const target = this.target(p, art);
    const damage = art.damage * (0.65 + power * 1.15) * (1 + world.power / 100);
    this.cancel();
    this.cooldown = art.cooldown;
    this.releasedAt = world.time;
    this.releasedPower = power;
    p.facing = angle;
    const hit = (e: Enemy) => {
      world.damage(e, damage, art.spell, power >= 0.95);
      if (!e.boss && !e.dead) {
        const a =
          art.shape === "blast" && world.id === "warlock"
            ? Math.atan2(target.y - e.y, target.x - e.x)
            : angle;
        const force =
          art.shape === "blast" || art.shape === "cone" ? 25 + power * 35 : 12;
        e.x = Math.max(
          -world.bounds.x,
          Math.min(world.bounds.x, e.x + Math.cos(a) * force),
        );
        e.y = Math.max(
          -world.bounds.y,
          Math.min(world.bounds.y, e.y + Math.sin(a) * force),
        );
        if (power >= 0.95)
          e.frozenUntil = Math.max(e.frozenUntil, world.time + 0.5);
      }
    };
    if (art.shape === "missile") {
      if (world.projectiles.length < 500)
        world.projectiles.push({
          ...origin,
          vx: Math.cos(angle) * 820,
          vy: Math.sin(angle) * 820,
          damage,
          radius: art.radius + power * 4,
          color: art.color,
          life: art.range / 820,
          pierce: 2 + Math.floor(power * 4),
          slow: world.id === "hunter" ? 1 : 0.35,
          hit: new Set(),
          spellId: art.spell,
          battleArt: world.id,
          charged: power >= 0.95,
        });
    } else if (art.shape === "cone" || art.shape === "lunge") {
      const victims = world.enemies.filter(
        (e) =>
          !e.dead &&
          Math.hypot(e.x - p.x, e.y - p.y) < art.range + e.radius &&
          Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - angle) >
            Math.cos(art.radius),
      );
      if (art.shape === "lunge") {
        p.x = Math.max(
          -world.bounds.x,
          Math.min(world.bounds.x, p.x + Math.cos(angle) * (70 + power * 65)),
        );
        p.y = Math.max(
          -world.bounds.y,
          Math.min(world.bounds.y, p.y + Math.sin(angle) * (70 + power * 65)),
        );
        p.invulnerable = Math.max(p.invulnerable, 0.2);
      }
      victims.forEach(hit);
    } else if (art.shape === "blast") {
      world.enemies
        .filter(
          (e) =>
            !e.dead &&
            Math.hypot(e.x - target.x, e.y - target.y) < art.radius + e.radius,
        )
        .forEach(hit);
    } else if (art.shape === "beam") {
      let count = 0;
      for (const e of world.enemies)
        if (
          !e.dead &&
          segmentDistance(e, origin, target) < art.radius + e.radius
        ) {
          hit(e);
          count++;
        }
      p.hp = Math.min(p.maxHp, p.hp + Math.min(12, count * 3));
    } else {
      let from = origin;
      const used = new Set<number>();
      for (let i = 0; i < 3 + Math.floor(power * 3); i++) {
        const next = world.enemies
          .filter(
            (e) =>
              !e.dead &&
              !used.has(e.id) &&
              Math.hypot(e.x - from.x, e.y - from.y) <
                (i ? art.radius : art.range),
          )
          .sort((a, b) =>
            i
              ? Math.hypot(a.x - from.x, a.y - from.y) -
                Math.hypot(b.x - from.x, b.y - from.y)
              : Math.hypot(a.x - target.x, a.y - target.y) -
                Math.hypot(b.x - target.x, b.y - target.y),
          )[0];
        if (!next) break;
        const end = { x: next.x, y: next.y };
        hit(next);
        used.add(next.id);
        world.effect({
          ...from,
          end,
          kind: "line",
          spellId: art.spell,
          battleArt: world.id,
          radius: 20,
          life: 0.42,
          color: art.color,
        });
        from = end;
      }
    }
    world.effect({
      ...(art.shape === "blast" ? target : origin),
      end: target,
      kind: art.shape === "beam" ? "line" : "ring",
      spellId: art.spell,
      battleArt: world.id,
      radius: art.shape === "blast" ? art.radius : art.range,
      facing: angle,
      color: art.color,
      life: 0.6,
    });
    world.action({
      actor: p,
      time: world.time,
      facing: angle,
      spellId: art.spell,
      spellKind:
        art.shape === "cone" || art.shape === "lunge" ? "melee" : "projectile",
      battleArt: world.id,
    });
    return true;
  }
}
