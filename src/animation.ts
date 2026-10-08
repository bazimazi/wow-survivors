import { combatKey, deformCombatVertex } from "./combat-animation";
import { deathKey, deformDeathVertex } from "./death-animation";

export type AnimationRig =
  | "biped"
  | "robe"
  | "quadruped"
  | "totem"
  | "heavy"
  | "arachnid"
  | "slither"
  | "hover";
export interface GaitKey {
  left: number;
  right: number;
  liftLeft: number;
  liftRight: number;
  bob: number;
  sway: number;
}
/** Contact, recoil, passing and high-point poses, followed by the opposite foot. */
export const WALK_KEYS: readonly GaitKey[] = [
  { left: 1, right: -1, liftLeft: 0, liftRight: 0, bob: 0, sway: 0 },
  {
    left: 0.65,
    right: -0.65,
    liftLeft: 0,
    liftRight: 0.45,
    bob: -0.5,
    sway: 0.5,
  },
  { left: 0, right: 0, liftLeft: 0, liftRight: 1, bob: 0.5, sway: 1 },
  { left: -0.65, right: 0.65, liftLeft: 0, liftRight: 0.45, bob: 1, sway: 0.5 },
  { left: -1, right: 1, liftLeft: 0, liftRight: 0, bob: 0, sway: 0 },
  {
    left: -0.65,
    right: 0.65,
    liftLeft: 0.45,
    liftRight: 0,
    bob: -0.5,
    sway: -0.5,
  },
  { left: 0, right: 0, liftLeft: 1, liftRight: 0, bob: 0.5, sway: -1 },
  {
    left: 0.65,
    right: -0.65,
    liftLeft: 0.45,
    liftRight: 0,
    bob: 1,
    sway: -0.5,
  },
];
export interface ActorPose {
  /** -1 is the original idle illustration. */
  frame: number;
  phase: number;
  mirror: boolean;
}
interface Motion extends ActorPose {
  x: number;
  y: number;
  time: number;
}

/** Renderer-only state: no gameplay fields, RNG or wall-clock sampling. */
export class ActorAnimator {
  private actors = new WeakMap<object, Motion>();
  sample(
    actor: object,
    position: { x: number; y: number },
    time: number,
    {
      enabled = true,
      frozen = false,
      stride = 44,
      mirror = false,
      phaseOffset = 0,
    } = {},
  ): ActorPose {
    const previous = this.actors.get(actor);
    if (
      ![position.x, position.y, time, stride].every(Number.isFinite) ||
      stride <= 0
    )
      return { frame: -1, phase: 0, mirror: previous?.mirror ?? mirror };
    const next: Motion = {
      x: position.x,
      y: position.y,
      time,
      frame: -1,
      phase:
        enabled && Number.isFinite(phaseOffset)
          ? ((phaseOffset % 1) + 1) % 1
          : 0,
      mirror: previous?.mirror ?? mirror,
    };
    if (previous && enabled) {
      const elapsed = time - previous.time;
      const dx = position.x - previous.x,
        dy = position.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (frozen || elapsed === 0) {
        next.frame = previous.frame;
        next.phase = previous.phase;
      } else if (
        elapsed > 0 &&
        elapsed <= 0.25 &&
        distance <= Math.max(100, stride * 3)
      ) {
        next.phase = previous.phase;
        if (distance > 0.025) {
          next.phase = (previous.phase + distance / stride) % 1;
          next.frame = Math.floor(next.phase * WALK_KEYS.length);
          if (Math.abs(dx) > 0.025) next.mirror = dx < 0;
        }
      }
    }
    this.actors.set(actor, next);
    return { frame: next.frame, phase: next.phase, mirror: next.mirror };
  }
}

const smooth = (value: number, low: number, high: number) => {
  const n = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return n * n * (3 - 2 * n);
};

/** Continuous skinning weights keep torso/limb joins connected through each pose. */
export function deformVertex(
  x: number,
  y: number,
  rig: AnimationRig,
  frame: number,
) {
  const death = deathKey(frame);
  if (death !== null) return deformDeathVertex(x, y, rig, death);
  const action = combatKey(frame);
  if (action) return deformCombatVertex(x, y, rig, action);
  const key = WALK_KEYS[frame];
  if (!key) return { x, y };
  const side = smooth(x, 0.43, 0.57);
  const swing = key.left * (1 - side) + key.right * side;
  const lift = key.liftLeft * (1 - side) + key.liftRight * side;
  if (rig === "totem")
    return { x: x + key.sway * 0.013 * (1 - y), y: y - key.bob * 0.008 };
  if (rig === "hover") {
    const trail = smooth(y, 0.35, 1);
    return {
      x: x + key.sway * (0.008 + trail * 0.025),
      y: y - key.bob * 0.018 + trail * swing * 0.008,
    };
  }
  if (rig === "slither") {
    const wave = Math.sin(x * Math.PI * 2 + (frame * Math.PI) / 4);
    return {
      x: x + key.sway * 0.012 * smooth(y, 0.3, 1),
      y: y + wave * 0.023 * smooth(y, 0.25, 0.85),
    };
  }
  if (rig === "arachnid") {
    const legs = smooth(Math.abs(x - 0.5), 0.12, 0.38) * smooth(y, 0.25, 0.8);
    const pair = Math.cos(y * Math.PI * 4);
    return {
      x: x + legs * key.left * pair * 0.028 + key.sway * (1 - legs) * 0.006,
      y:
        y -
        legs * Math.max(0, swing * pair) * 0.035 -
        key.bob * (1 - legs) * 0.008,
    };
  }
  if (rig === "quadruped") {
    const legs = smooth(y, 0.55, 0.91);
    const pairs = Math.cos(x * Math.PI * 4);
    return {
      x: x + legs * swing * 0.045 + key.sway * (1 - legs) * 0.008,
      y:
        y -
        legs * (lift * 0.04 + Math.max(0, pairs * key.left) * 0.018) -
        key.bob * (1 - legs) * 0.012,
    };
  }
  const feet = smooth(
    y,
    rig === "robe" ? 0.76 : rig === "heavy" ? 0.7 : 0.6,
    0.94,
  );
  const weight = rig === "heavy" ? 0.65 : 1;
  const arms =
    smooth(y, 0.25, 0.43) *
    (1 - smooth(y, 0.55, 0.72)) *
    smooth(Math.abs(x - 0.5), 0.14, 0.38);
  return {
    x: x + (feet * swing * 0.035 + key.sway * (1 - feet) * 0.012) * weight,
    y:
      y -
      (feet * lift * 0.055 +
        key.bob * (1 - feet) * 0.012 +
        arms * swing * 0.025) *
        weight,
  };
}

/** Small LRU also bounds browser canvas backing stores, including temporary cache churn. */
export class FrameCache<T> {
  private frames = new Map<string, T>();
  private remaining = 0;
  constructor(
    readonly capacity = 192,
    readonly budget = 2,
    private dispose: (frame: T) => void = () => {},
  ) {}
  get size() {
    return this.frames.size;
  }
  beginFrame() {
    this.remaining = this.budget;
  }
  peek(key: string): T | null {
    const existing = this.frames.get(key);
    if (existing !== undefined) {
      this.frames.delete(key);
      this.frames.set(key, existing);
      return existing;
    }
    return null;
  }
  get(key: string, create: () => T): T | null {
    const existing = this.peek(key);
    if (existing !== null) return existing;
    if (this.remaining <= 0) return null;
    this.remaining--;
    const frame = create();
    if (this.frames.size >= this.capacity) {
      const oldest = this.frames.keys().next().value!;
      this.dispose(this.frames.get(oldest)!);
      this.frames.delete(oldest);
    }
    this.frames.set(key, frame);
    return frame;
  }
}

/** FIFO misses share an LRU without letting earlier draw order monopolize construction. */
export class QueuedFrameCache<T> {
  private frames: FrameCache<T>;
  private pending = new Map<string, { create: () => T; priority: boolean }>();
  private priorityTurn = true;
  constructor(
    readonly capacity = 128,
    readonly budget = 1,
    dispose: (frame: T) => void = () => {},
  ) {
    this.frames = new FrameCache(capacity, budget, dispose);
  }
  get size() {
    return this.frames.size;
  }
  get pendingSize() {
    return this.pending.size;
  }
  beginFrame() {
    this.frames.beginFrame();
    let built = 0;
    while (built < this.budget && this.pending.size) {
      const entries = [...this.pending];
      const priority = entries.find(([, request]) => request.priority);
      const ordinary = entries.find(([, request]) => !request.priority);
      const [key, request] =
        priority && ordinary
          ? this.priorityTurn
            ? priority
            : ordinary
          : (priority || ordinary)!;
      if (priority && ordinary) this.priorityTurn = !this.priorityTurn;
      this.pending.delete(key);
      this.frames.get(key, request.create);
      built++;
    }
    if (!this.pending.size) this.priorityTurn = true;
  }
  cancelPending() {
    this.pending.clear();
    this.priorityTurn = true;
  }
  get(key: string, create: () => T, priority = false): T | null {
    const frame = this.frames.peek(key);
    if (frame !== null) return frame;
    const waiting = this.pending.get(key);
    if (waiting) waiting.priority ||= priority;
    if (!waiting && priority && this.pending.size >= this.capacity) {
      const newestOrdinary = [...this.pending]
        .reverse()
        .find(([, request]) => !request.priority);
      if (newestOrdinary) this.pending.delete(newestOrdinary[0]);
    }
    if (!this.pending.has(key) && this.pending.size < this.capacity)
      this.pending.set(key, { create, priority });
    return null;
  }
}
