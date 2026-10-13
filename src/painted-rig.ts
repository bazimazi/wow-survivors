import { deformVertex, WALK_KEYS } from "./animation";
import type { AnimationRig } from "./animation";
import { combatKey, COMBAT_STYLES } from "./combat-animation";
import type { ClassId } from "./content";

export type PaintedProfile =
  | ClassId
  | "beast-front"
  | "imp"
  | "totem"
  | "elemental"
  | "mount"
  | "bear"
  | "cat"
  | "moonkin";
export const IDLE_FRAME = 32;
export const IDLE_PERIOD = 2.8;
/** Measured hand/weapon positions in the retained front and back illustrations. */
const EMITTERS: Record<ClassId, readonly [number, number, number, number]> = {
  warrior: [0.25, 0.6, 0.78, 0.59],
  mage: [0.82, 0.57, 0.18, 0.5],
  rogue: [0.79, 0.69, 0.2, 0.68],
  hunter: [0.76, 0.6, 0.24, 0.6],
  paladin: [0.26, 0.51, 0.77, 0.53],
  priest: [0.82, 0.52, 0.2, 0.47],
  shaman: [0.75, 0.78, 0.2, 0.71],
  warlock: [0.84, 0.57, 0.15, 0.52],
  druid: [0.24, 0.67, 0.26, 0.68],
};
export function paintedEmitter(profile: ClassId, back: boolean) {
  const point = EMITTERS[profile];
  return { x: point[back ? 2 : 0], y: point[back ? 3 : 1] };
}
const smooth = (v: number, a: number, b: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const rotate = (
  x: number,
  y: number,
  px: number,
  py: number,
  angle: number,
) => {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    dx = x - px,
    dy = y - py;
  return { x: px + dx * c - dy * s - x, y: py + dx * s + dy * c - y };
};

/** Texture joints, never replacement geometry: every pixel comes from the painted atlas. */
export function paintedVertex(
  x: number,
  y: number,
  rig: AnimationRig,
  frame: number,
  profile?: PaintedProfile,
  back = false,
) {
  const idle = frame >= IDLE_FRAME && frame < IDLE_FRAME + 8;
  const wave = idle ? Math.sin(((frame - IDLE_FRAME) * Math.PI) / 4) : 0;
  const gait = WALK_KEYS[frame],
    action = combatKey(frame);
  const v = deformVertex(x, y, rig, frame);
  if (!gait && !action && !idle) return v;
  const joint = (px: number, py: number, angle: number, weight: number) => {
    if (!weight || !angle) return;
    const d = rotate(x, y, px, py, angle);
    v.x += d.x * weight;
    v.y += d.y * weight;
  };
  const lower = smooth(y, 0.57, 0.91),
    upper = 1 - smooth(y, 0.54, 0.87);
  if (rig === "totem") {
    // The trunk is planted. Only its flame, feathers and dangling charms move.
    const flame = 1 - smooth(y, 0.22, 0.57);
    const energy = action ? action.raise : gait ? gait.sway : wave;
    v.x += flame * energy * 0.026;
    v.y -= flame * (action ? action.raise * 0.035 : Math.abs(energy) * 0.012);
    joint(
      0.5,
      0.69,
      (gait?.sway ?? wave) * 0.045,
      smooth(Math.abs(x - 0.5), 0.19, 0.4) * smooth(y, 0.55, 0.8),
    );
    return v;
  }
  if (rig === "hover" || rig === "slither" || rig === "arachnid") {
    const beat = gait?.sway ?? wave;
    if (rig === "hover") {
      v.x += smooth(y, 0.45, 1) * beat * 0.03;
      v.y += (idle ? wave * 0.018 : 0) * (1 - smooth(y, 0.85, 1));
      joint(0.5, 0.46, (action?.reach ?? beat) * 0.055, upper);
    } else if (rig === "slither") {
      v.y +=
        Math.sin(
          x * Math.PI * 3 + ((idle ? frame - IDLE_FRAME : frame) * Math.PI) / 4,
        ) *
        0.017 *
        smooth(y, 0.4, 0.8);
      joint(
        0.66,
        0.48,
        (action?.reach ?? beat) * 0.08,
        smooth(x, 0.44, 0.87) * upper,
      );
    } else {
      const legs = smooth(Math.abs(x - 0.5), 0.13, 0.4) * smooth(y, 0.31, 0.86);
      v.x += legs * beat * Math.cos(y * Math.PI * 5) * 0.023;
      v.y -= legs * Math.max(0, beat * Math.cos(y * Math.PI * 5)) * 0.012;
    }
    return v;
  }
  if (rig === "quadruped") {
    const front = profile === "beast-front" || profile === "bear";
    const side = smooth(x, 0.43, 0.59);
    const lift = gait ? gait.liftLeft * (1 - side) + gait.liftRight * side : 0;
    v.x = x + (v.x - x) * 0.45;
    joint(
      front ? 0.35 : 0.25,
      0.67,
      (gait?.left ?? 0) * 0.1,
      lower * (1 - side),
    );
    joint(front ? 0.7 : 0.77, 0.67, (gait?.right ?? 0) * 0.1, lower * side);
    v.y -= lower * lift * 0.023;
    const head = front
      ? (1 - smooth(Math.abs(x - 0.54), 0.2, 0.43)) *
        (1 - smooth(y, 0.38, 0.67))
      : smooth(x, 0.48, 0.86) * (1 - smooth(y, 0.49, 0.79));
    joint(
      front ? 0.54 : 0.69,
      front ? 0.44 : 0.51,
      action ? action.reach * 0.09 : (gait?.sway ?? wave) * 0.028,
      head,
    );
    joint(
      0.29,
      0.51,
      (gait?.sway ?? wave) * 0.055,
      (1 - smooth(x, 0.13, 0.31)) *
        smooth(y, 0.24, 0.48) *
        (1 - smooth(y, 0.75, 0.94)),
    );
    if (idle) v.y -= wave * 0.007 * (1 - lower);
    return v;
  }

  const heavy = rig === "heavy" ? 0.72 : 1;
  const left = 1 - smooth(x, 0.4, 0.6),
    right = 1 - left;
  const feet = smooth(y, rig === "robe" ? 0.69 : 0.62, 0.9);
  if (gait) {
    // Hip rotation, knee flex and foot lift; the opposite arm counter-swings.
    joint(0.36, 0.66, gait.left * 0.18 * heavy, feet * left);
    joint(0.65, 0.66, gait.right * 0.18 * heavy, feet * right);
    joint(
      0.36,
      0.83,
      -gait.liftLeft * 0.15 * heavy,
      smooth(y, 0.8, 0.96) * left,
    );
    joint(
      0.65,
      0.83,
      gait.liftRight * 0.15 * heavy,
      smooth(y, 0.8, 0.96) * right,
    );
    v.y -=
      feet * (gait.liftLeft * left + gait.liftRight * right) * 0.028 * heavy;
    joint(0.5, 0.67, gait.sway * 0.025 * heavy, upper);
  }
  const frontWeaponLeft =
    profile !== "hunter" && profile !== "rogue" && profile !== "druid";
  const weaponLeft = back ? profile === "hunter" : frontWeaponLeft;
  const weaponRight = back
    ? frontWeaponLeft || profile === "druid"
    : profile === "hunter" || profile === "druid";
  const armBand = smooth(y, 0.18, 0.49) * (1 - smooth(y, 0.62, 0.94));
  const armLeft = (1 - smooth(x, 0.16, 0.5)) * armBand;
  const armRight = smooth(x, 0.5, 0.84) * armBand;
  // Exterior weapons retain a rigid rotation with their hand, including staff tops.
  const heldLeft = weaponLeft
    ? (1 - smooth(x, 0.1, 0.43)) * (1 - smooth(y, 0.63, 0.84))
    : 0;
  const heldRight = weaponRight
    ? smooth(x, 0.57, 0.9) * (1 - smooth(y, 0.68, 0.88))
    : 0;
  const style = action ? COMBAT_STYLES[Math.floor((frame - 8) / 6)] : undefined;
  let leftAngle = gait ? -gait.left * 0.095 : wave * 0.025;
  let rightAngle = gait ? -gait.right * 0.095 : -wave * 0.03;
  if (action) {
    if (style === "strike") {
      leftAngle = action.reach * (profile === "rogue" ? 0.4 : 0.5);
      rightAngle = -action.reach * (profile === "rogue" ? 0.42 : 0.18);
    } else if (style === "shoot") {
      leftAngle = -action.reach * 0.28;
      rightAngle = -action.raise * 0.18 + action.lean * 0.055;
    } else {
      leftAngle = -action.raise * 0.055 + action.reach * 0.025;
      rightAngle = -action.raise * 0.32 + action.reach * 0.09;
    }
    joint(0.5, 0.67, action.lean * 0.04 * heavy, upper);
  }
  // Back-facing silhouettes use the same local joints with their arm roles swapped.
  if (back) [leftAngle, rightAngle] = [-rightAngle, -leftAngle];
  joint(0.32, 0.46, leftAngle * heavy, armLeft);
  joint(0.72, 0.46, rightAngle * heavy, armRight);
  joint(0.32, 0.46, leftAngle * heavy * 0.55, heldLeft * (1 - armLeft));
  joint(0.72, 0.46, rightAngle * heavy * 0.55, heldRight * (1 - armRight));
  if (action && style === "cast") {
    joint(0.79, 0.59, -action.raise * 0.12, armRight * smooth(y, 0.5, 0.7));
    v.y -= armRight * action.raise * 0.017;
  }
  if (idle) {
    const chest =
      (1 - smooth(Math.abs(x - 0.5), 0.15, 0.4)) *
      smooth(y, 0.27, 0.44) *
      upper;
    v.x += (x - 0.5) * chest * wave * 0.012;
    v.y -= chest * wave * 0.009;
    joint(
      0.5,
      0.38,
      wave * 0.017,
      (1 - smooth(y, 0.3, 0.48)) * (1 - smooth(Math.abs(x - 0.5), 0.18, 0.38)),
    );
    const cloth = smooth(Math.abs(x - 0.5), 0.15, 0.38) * smooth(y, 0.65, 0.89);
    v.x += cloth * wave * 0.012;
  }
  if (profile === "imp") {
    const wings =
      smooth(Math.abs(x - 0.5), 0.24, 0.43) * (1 - smooth(y, 0.52, 0.8));
    v.y += wings * (gait?.sway ?? wave) * 0.025;
  }
  return v;
}
