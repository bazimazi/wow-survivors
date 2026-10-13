import type { ImpactAction } from "./engine";

interface Spark {
  x: number;
  y: number;
  angle: number;
  time: number;
  color: string;
  heavy: boolean;
}

/** Bounded, presentation-only effects: no combat mutation or simulation RNG. */
export class BattleFeedback {
  private sparks: Spark[] = [];
  private impulse = { time: -10, force: 0, facing: 0 };
  impact(action: ImpactAction, player: boolean) {
    if (action.damage <= 0 || !Number.isFinite(action.time + action.facing))
      return;
    const heavy = player || action.critical || !!action.battleArt;
    if (heavy)
      this.impulse = {
        time: action.time,
        force: player ? 6 : action.battleArt ? 4.4 : 2.8,
        facing: action.facing,
      };
    if (this.sparks.length >= 60) this.sparks.splice(0, 8);
    for (let i = 0; i < (heavy ? 7 : 3); i++)
      this.sparks.push({
        x: action.actor.x,
        y: action.actor.y - 12,
        angle: action.facing + (i - 3) * 0.65,
        time: action.time,
        color: player ? "#ff8868" : action.critical ? "#ffdd83" : "#e4eee1",
        heavy,
      });
  }
  shake(time: number, enabled: boolean) {
    const age = time - this.impulse.time;
    const power =
      enabled && age >= 0 && age < 0.22
        ? this.impulse.force * Math.exp(-age * 17)
        : 0;
    return {
      x: Math.cos(this.impulse.facing) * Math.sin(age * 140) * power,
      y: Math.sin(age * 120) * power * 0.65,
    };
  }
  draw(c: CanvasRenderingContext2D, time: number, enabled: boolean) {
    // Display interpolation can trail a newly received simulation impact.
    this.sparks = this.sparks.filter((s) => time - s.time < 0.28);
    if (!enabled) return;
    c.save();
    c.lineCap = "round";
    for (const s of this.sparks) {
      if (time < s.time) continue;
      const age = time - s.time,
        distance = age * (s.heavy ? 170 : 95),
        length = (s.heavy ? 9 : 5) * (1 - age / 0.28);
      c.globalAlpha = (1 - age / 0.28) ** 2;
      c.strokeStyle = s.color;
      c.lineWidth = s.heavy ? 2 : 1.3;
      const x = s.x + Math.cos(s.angle) * distance,
        y = s.y + Math.sin(s.angle) * distance * 0.7 + age * age * 180;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - Math.cos(s.angle) * length, y - Math.sin(s.angle) * length);
      c.stroke();
    }
    c.restore();
  }
}
