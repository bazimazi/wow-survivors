import type { ActorPose, AnimationRig } from "./animation";

export const DEATH_DURATION = 0.75;
/** Recoil, buckle, fall, land, settle and fade. */
export const DEATH_KEYS = [0.04, 0.18, 0.42, 0.7, 0.92, 1] as const;
export const DEATH_FRAME = 26;
export function deathKey(frame: number): number | null {
  const index = frame - DEATH_FRAME;
  return Number.isInteger(index) && index >= 0 && index < DEATH_KEYS.length
    ? DEATH_KEYS[index]
    : null;
}

/** Local droop keeps the texture connected; the ground-anchored fall is drawn separately. */
export function deformDeathVertex(
  x: number,
  y: number,
  rig: AnimationRig,
  key: number,
) {
  const upper = (1 - y) ** 2;
  const wide = ["quadruped", "arachnid", "slither"].includes(rig);
  const weight = rig === "heavy" ? 0.7 : 1;
  return {
    x: x + key * weight * (wide ? (x - 0.5) * 0.025 : upper * 0.035),
    y:
      y + key * weight * upper * (rig === "hover" ? 0.045 : wide ? 0.04 : 0.03),
  };
}

export interface DeathScene<T> {
  data: T;
  age: number;
  mirror: boolean;
  priority: boolean;
}
export interface DeathVisual extends ActorPose {
  alpha: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  drop: number;
}

export function deathVisual(
  age: number,
  rig: AnimationRig,
  mirror = false,
  hero = false,
): DeathVisual {
  const progress = Math.max(0, Math.min(1, age / DEATH_DURATION));
  const frame = Math.min(5, Math.floor(progress * 6));
  const fall = DEATH_KEYS[frame];
  const low = ["quadruped", "arachnid", "slither"].includes(rig);
  const spirit = rig === "hover" || rig === "totem";
  return {
    frame: DEATH_FRAME + frame,
    phase: progress,
    mirror,
    alpha: hero ? 1 - progress * 0.25 : 1 - Math.max(0, (progress - 0.4) / 0.6),
    rotation: spirit
      ? fall * 0.08
      : low
        ? fall * 0.12
        : fall * 1.15 * (mirror ? -1 : 1),
    scaleX: spirit ? 1 - fall * 0.15 : 1 + (low ? fall * 0.08 : 0),
    scaleY: 1 - fall * (spirit ? 0.4 : low ? 0.55 : 0.18),
    drop: fall * (spirit ? -8 : low ? 4 : 6),
  };
}

/** Explicit presentation delta: never reads a wall clock or mutates gameplay actors. */
export class DeathAnimator<T> {
  readonly capacity = 64;
  enemies: DeathScene<T>[] = [];
  hero: DeathScene<T> | null = null;
  private seen = new WeakSet<object>();
  private time = 0;
  private stage = 0;
  trigger(
    actor: object,
    data: T,
    { mirror = false, priority = false, hero = false, enabled = true } = {},
  ): boolean {
    if (this.seen.has(actor)) return false;
    this.seen.add(actor);
    const scene = { data, mirror, priority, age: enabled ? 0 : DEATH_DURATION };
    if (hero) {
      this.hero = scene;
      return true;
    }
    if (!enabled) return false;
    if (this.enemies.length >= this.capacity) {
      const ordinary = this.enemies.findIndex((entry) => !entry.priority);
      if (ordinary < 0 && !priority) return false;
      this.enemies.splice(ordinary < 0 ? 0 : ordinary, 1);
    }
    this.enemies.push(scene);
    return true;
  }
  clear() {
    this.enemies = [];
    this.hero = null;
  }
  advance(
    delta: number,
    { enabled = true, held = false, time = this.time, stage = this.stage } = {},
  ) {
    if (!Number.isFinite(time) || time < this.time || stage !== this.stage)
      this.clear();
    this.time = Number.isFinite(time) ? time : 0;
    this.stage = stage;
    if (!enabled) {
      this.enemies = [];
      if (this.hero) this.hero.age = DEATH_DURATION;
      return;
    }
    if (held || !Number.isFinite(delta) || delta <= 0) return;
    const step = Math.min(delta, 0.05);
    for (const entry of this.enemies) entry.age += step;
    this.enemies = this.enemies.filter((entry) => entry.age < DEATH_DURATION);
    if (this.hero)
      this.hero.age = Math.min(DEATH_DURATION, this.hero.age + step);
  }
}
