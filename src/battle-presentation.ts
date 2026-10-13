import { SPELLS } from "./content";
import type { CombatAction, ImpactAction, SpellState, Vec } from "./engine";
import { spellLook, glow } from "./spell-visuals";
import { combatStyle } from "./combat-animation";

export class HitReactions {
  private hits = new WeakMap<object, ImpactAction>();
  trigger(action: ImpactAction) {
    if (
      !Number.isFinite(action.time + action.facing + action.damage) ||
      action.damage <= 0
    )
      return;
    const previous = this.hits.get(action.actor);
    if (previous && action.time - previous.time < 0.06 && previous.critical)
      return;
    this.hits.set(action.actor, { ...action });
  }
  sample(actor: object, time: number, enabled: boolean) {
    const hit = enabled && this.hits.get(actor),
      age = hit ? time - hit.time : 1;
    if (!hit || age < 0 || age > 0.28)
      return { x: 0, y: 0, angle: 0, pulse: 0 };
    const pulse = Math.sin((age / 0.28) * Math.PI) * Math.exp(-age * 7);
    const heavy = "boss" in hit.actor && hit.actor.boss;
    const strength =
      (hit.battleArt ? 12 : hit.critical ? 8 : 4) * (heavy ? 0.28 : 1);
    return {
      x: Math.cos(hit.facing) * pulse * strength,
      y: Math.sin(hit.facing) * pulse * strength * 0.45,
      angle: Math.cos(hit.facing) * pulse * 0.045,
      pulse,
    };
  }
}

/** Successful releases and cooldown anticipation share actor identity and the combat clock. */
export class CastChoreography {
  private casts = new WeakMap<object, CombatAction>();
  private preparations = new WeakMap<object, SpellState>();
  tint(actor: object, time: number) {
    const action = this.casts.get(actor),
      age = action ? time - action.time : 1;
    const id =
      action && age >= 0 && age < 0.42
        ? action.spellId
        : this.preparations.get(actor)?.id;
    return id ? SPELLS[id]?.color : undefined;
  }
  preparation(actor: object) {
    return this.preparations.get(actor);
  }
  observe(action: CombatAction) {
    this.casts.set(action.actor, { ...action });
  }
  draw(
    c: CanvasRenderingContext2D,
    actor: object,
    spells: SpellState[],
    time: number,
    enabled: boolean,
    particles: boolean,
    canPrepare: boolean,
    held = false,
    emitter?: Vec,
  ) {
    if (!enabled) return;
    const action = this.casts.get(actor),
      age = action ? time - action.time : 1;
    const preparing = held
      ? this.preparations.get(actor)
      : canPrepare
        ? spells.find(
            (s) =>
              s.timer > 0 &&
              s.timer < 0.2 &&
              ["projectile", "chain", "nova", "ground", "melee"].includes(
                SPELLS[s.id]?.kind,
              ),
          )
        : undefined;
    if (!held) {
      if (preparing) this.preparations.set(actor, { ...preparing });
      else this.preparations.delete(actor);
    }
    const releasing = action && age >= 0 && age < 0.42;
    if (!preparing && !releasing) return;
    const id = releasing
        ? action.spellId ||
          (combatStyle(action) === "strike"
            ? "cleave"
            : combatStyle(action) === "shoot"
              ? "shot"
              : "arcane")
        : preparing!.id,
      color = SPELLS[id]?.color || "#eed498";
    const look = spellLook(id),
      p = Math.max(
        0,
        Math.min(1, releasing ? age / 0.42 : 1 - preparing!.timer / 0.2),
      );
    const facing = action?.facing || 0;
    c.save();
    c.translate(
      emitter?.x ?? Math.cos(facing) * 12,
      emitter?.y ?? -32 + Math.sin(facing) * 5,
    );
    if (["steel", "arrow"].includes(look)) {
      if (releasing) {
        c.rotate(facing);
        c.globalAlpha = (1 - p) * 0.65;
        c.strokeStyle = "#f5e6c2";
        c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          c.globalAlpha = (1 - p) * (0.65 - i * 0.16);
          c.lineWidth = 2.6 - i * 0.7;
          c.beginPath();
          c.moveTo(-12 - i * 3, -7 + i * 3);
          c.quadraticCurveTo(15, -23 + i * 4, 32 + p * 12, 1 + i * 2);
          c.stroke();
        }
      }
    } else {
      const r = releasing ? 5 + (1 - p) * 8 : 4 + p * 5;
      if (particles)
        glow(c, r * 2.7, color, releasing ? (1 - p) * 0.65 : p * 0.35);
      c.strokeStyle = color;
      c.fillStyle = "#fff5e2";
      c.globalAlpha = releasing ? (1 - p) * 0.9 : p * 0.6;
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(0, 0, r, time * 4, time * 4 + Math.PI * 1.6);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 2 + Math.sin(p * Math.PI) * 1.5, 0, Math.PI * 2);
      c.fill();
      if (particles)
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + time * 3,
            d = releasing ? r * (1 + p) : r * (1.8 - p * 0.6);
          c.beginPath();
          c.moveTo(Math.cos(a) * d, Math.sin(a) * d);
          c.lineTo(Math.cos(a - 0.2) * (d + 4), Math.sin(a - 0.2) * (d + 4));
          c.stroke();
        }
    }
    c.restore();
  }
}

interface Footprint extends Vec {
  time: number;
  angle: number;
  side: number;
}
export class Footfalls {
  private actors = new WeakMap<
    object,
    { x: number; y: number; distance: number; side: number }
  >();
  readonly prints: Footprint[] = [];
  observe(actor: object & Vec, time: number, enabled: boolean) {
    const old = this.actors.get(actor),
      distance = old ? Math.hypot(actor.x - old.x, actor.y - old.y) : 0;
    const next = {
      x: actor.x,
      y: actor.y,
      distance: old?.distance || 0,
      side: old?.side || 1,
    };
    if (enabled && old && distance > 0 && distance < 50) {
      next.distance += distance;
      if (next.distance >= 22) {
        next.distance %= 22;
        next.side = -next.side;
        if (this.prints.length >= 48) this.prints.shift();
        this.prints.push({
          x: actor.x,
          y: actor.y,
          time,
          angle: Math.atan2(actor.y - old.y, actor.x - old.x),
          side: next.side,
        });
      }
    } else if (!enabled || distance >= 50) next.distance = 0;
    this.actors.set(actor, next);
  }
  draw(
    c: CanvasRenderingContext2D,
    time: number,
    enabled: boolean,
    color: string,
  ) {
    while (this.prints.length && time - this.prints[0].time > 0.65)
      this.prints.shift();
    if (!enabled) return;
    c.save();
    for (const print of this.prints) {
      const p = Math.max(0, (time - print.time) / 0.65);
      c.save();
      c.translate(print.x, print.y);
      c.rotate(print.angle);
      c.globalAlpha = (1 - p) * 0.22;
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(
        -p * 8,
        print.side * 5,
        3 + p * 7,
        2 + p * 4,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.restore();
    }
    c.restore();
  }
}
