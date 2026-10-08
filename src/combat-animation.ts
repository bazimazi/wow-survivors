import type { AnimationRig } from "./animation";
import type { CombatAction } from "./engine";

export type CombatStyle = "cast" | "strike" | "shoot";
export const COMBAT_STYLES: readonly CombatStyle[] = [
  "cast",
  "strike",
  "shoot",
];
export const COMBAT_DURATION = 0.42;
export const COMBAT_POSES = 6;
export interface CombatKey {
  reach: number;
  raise: number;
  lean: number;
}
/** Gather, draw back, release, follow-through, recover and settle. */
export const COMBAT_KEYS: Readonly<Record<CombatStyle, readonly CombatKey[]>> =
  {
    cast: [
      { reach: -0.4, raise: 0.15, lean: -0.1 },
      { reach: -0.2, raise: 0.65, lean: -0.2 },
      { reach: 1, raise: 1, lean: 0.8 },
      { reach: 0.4, raise: 0.75, lean: 0.3 },
      { reach: 0.1, raise: 0.3, lean: 0.1 },
      { reach: 0, raise: 0.05, lean: 0 },
    ],
    strike: [
      { reach: -0.35, raise: 0.2, lean: -0.1 },
      { reach: -0.85, raise: 0.45, lean: -0.25 },
      { reach: 1, raise: 0.7, lean: 1 },
      { reach: 0.55, raise: 0.35, lean: 0.5 },
      { reach: 0.22, raise: 0.15, lean: 0.2 },
      { reach: 0.03, raise: 0.02, lean: 0.03 },
    ],
    shoot: [
      { reach: -0.2, raise: 0.25, lean: -0.12 },
      { reach: -0.9, raise: 0.55, lean: -0.2 },
      { reach: 0.9, raise: 0.6, lean: 0.65 },
      { reach: 0.4, raise: 0.35, lean: 0.3 },
      { reach: 0.15, raise: 0.15, lean: 0.1 },
      { reach: 0.03, raise: 0.02, lean: 0.02 },
    ],
  };

export function combatFrame(style: CombatStyle, pose: number) {
  return 8 + COMBAT_STYLES.indexOf(style) * COMBAT_POSES + pose;
}
export function combatKey(frame: number): CombatKey | null {
  const index = frame - 8;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= COMBAT_STYLES.length * COMBAT_POSES
  )
    return null;
  return COMBAT_KEYS[COMBAT_STYLES[Math.floor(index / COMBAT_POSES)]][
    index % COMBAT_POSES
  ];
}

/** Presentation classification; the engine only describes an accepted gameplay action. */
export function combatStyle(action: CombatAction): CombatStyle {
  if (action.ability)
    return action.ability === "hunter"
      ? "shoot"
      : ["warrior", "rogue", "druid"].includes(action.ability)
        ? "strike"
        : "cast";
  if (
    action.spellKind === "melee" ||
    ["beast", "rend", "rupture"].includes(action.spellId || "")
  )
    return "strike";
  if (
    ["shot", "multishot", "serpentsting", "throw", "volley"].includes(
      action.spellId || "",
    )
  )
    return "shoot";
  return "cast";
}

export interface CombatPose {
  frame: number;
  mirror: boolean;
  style: CombatStyle;
  progress: number;
}
interface Gesture {
  style: CombatStyle;
  age: number;
  time: number;
  mirror: boolean;
  priority: number;
  frozen: boolean;
}

/** Weak renderer-only state; co-occurring casts cannot continually restart the release pose. */
export class CombatAnimator {
  private actors = new WeakMap<object, Gesture>();
  trigger(
    actor: object,
    style: CombatStyle,
    time: number,
    facing: number,
    priority = 0,
  ): boolean {
    if (
      ![time, facing, priority].every(Number.isFinite) ||
      !COMBAT_STYLES.includes(style)
    )
      return false;
    const previous = this.actors.get(actor);
    if (previous && time >= previous.time) {
      const age = previous.age + (previous.frozen ? 0 : time - previous.time);
      if (age < COMBAT_DURATION && priority <= previous.priority) return false;
    }
    this.actors.set(actor, {
      style,
      time,
      age: 0,
      mirror: Math.cos(facing) < -0.2,
      priority,
      frozen: false,
    });
    return true;
  }
  clear(actor: object) {
    this.actors.delete(actor);
  }
  sample(
    actor: object,
    time: number,
    { enabled = true, frozen = false } = {},
  ): CombatPose | null {
    const gesture = this.actors.get(actor);
    if (!gesture) return null;
    if (!enabled || !Number.isFinite(time) || time < gesture.time) {
      this.clear(actor);
      return null;
    }
    if (!frozen) gesture.age += time - gesture.time;
    gesture.time = time;
    gesture.frozen = frozen;
    if (gesture.age >= COMBAT_DURATION) {
      this.clear(actor);
      return null;
    }
    const progress = gesture.age / COMBAT_DURATION;
    return {
      frame: combatFrame(gesture.style, Math.floor(progress * COMBAT_POSES)),
      mirror: gesture.mirror,
      style: gesture.style,
      progress,
    };
  }
}

const smooth = (value: number, low: number, high: number) => {
  const n = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return n * n * (3 - 2 * n);
};
/** Continuous upper-body/weapon weights keep braced feet and texture joins connected. */
export function deformCombatVertex(
  x: number,
  y: number,
  rig: AnimationRig,
  key: CombatKey,
) {
  if (rig === "totem") {
    const flame = 1 - smooth(y, 0.2, 0.9);
    return {
      x: x + flame * key.reach * 0.009,
      y: y - flame * key.raise * 0.02,
    };
  }
  if (rig === "quadruped") {
    const body = 1 - smooth(y, 0.65, 0.95),
      head = smooth(x, 0.45, 0.9) * body;
    return {
      x: x + body * key.lean * 0.019 + head * key.reach * 0.023,
      y: y - body * key.lean * 0.008 - head * key.raise * 0.008,
    };
  }
  if (rig === "arachnid") {
    const upper = 1 - smooth(y, 0.75, 1),
      front = smooth(x, 0.35, 0.75),
      abdomen = 1 - smooth(Math.abs(x - 0.5), 0.1, 0.4);
    return {
      x: x + upper * (key.lean * 0.012 + front * key.reach * 0.014),
      y: y - upper * (abdomen * key.lean * 0.008 + front * key.raise * 0.014),
    };
  }
  if (rig === "slither") {
    const body = 1 - smooth(y, 0.8, 1),
      head = smooth(x, 0.45, 0.95) * (1 - smooth(y, 0.65, 1));
    return {
      x: x + head * key.reach * 0.024 + body * key.lean * 0.012,
      y: y - head * key.raise * 0.02 - body * key.lean * 0.006,
    };
  }
  if (rig === "hover") {
    const upper = 1 - smooth(y, 0.55, 1),
      side = smooth(x, 0.35, 0.75);
    return {
      x: x + upper * (key.lean * 0.019 + side * key.reach * 0.012),
      y: y - upper * key.raise * 0.02,
    };
  }
  const upper = 1 - smooth(y, 0.55, 0.88);
  const arms =
    smooth(y, 0.15, 0.35) * upper * smooth(Math.abs(x - 0.5), 0.12, 0.35);
  const side = smooth(x, 0.35, 0.65);
  const weight = rig === "heavy" ? 0.65 : 1;
  return {
    x:
      x +
      (upper * key.lean * 0.016 + arms * key.reach * (0.018 + side * 0.012)) *
        weight,
    y: y - (upper * key.lean * 0.005 + arms * key.raise * 0.032) * weight,
  };
}
