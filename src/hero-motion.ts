import type { ActorPose } from "./animation";
import type { ClassId } from "./content";
import { combatKey } from "./combat-animation";
import { spriteIslands } from "./sprite-islands";
import { createAnimationFrame, FRAME_SIZE } from "./animation-canvas";
import { IDLE_FRAME, IDLE_PERIOD } from "./painted-rig";

export const HERO_MOTION_PATHS: Record<ClassId, string> = {
  warrior: "/art/warrior-motion.webp",
  mage: "/art/mage-motion.webp",
  rogue: "/art/rogue-motion.webp",
  hunter: "/art/hunter-motion.webp",
  paladin: "/art/paladin-motion.webp",
  priest: "/art/priest-motion.webp",
  shaman: "/art/shaman-motion.webp",
  warlock: "/art/warlock-motion.webp",
  druid: "/art/druid-motion.webp",
};

/** Four authored run poses and four authored action poses in each facing. */
export function heroMotionFrame(pose: ActorPose, back: boolean, charge = -1) {
  let row = back ? 1 : 0;
  let column = 0;
  if (charge >= 0) {
    row += 2;
    column = charge < 0.28 ? 0 : 1;
  } else if (combatKey(pose.frame)) {
    row += 2;
    column = [0, 1, 2, 2, 3, 0][(pose.frame - 8) % 6];
  } else if (pose.frame >= 0 && pose.frame < 8) {
    column = Math.floor(pose.phase * 4) % 4;
  } else row += 2;
  return row * 4 + column;
}

interface Sheet {
  image: HTMLImageElement;
  frames: HTMLCanvasElement[];
  height: number;
  ready: boolean;
  pending: Promise<void>;
}
const sheets = new Map<ClassId, Sheet>();
const skins = new WeakMap<
  object,
  {
    image: HTMLCanvasElement;
    signature: string;
    bucket: number;
    texture: string;
  }
>();

/** Continuous joint motion layered over the authored silhouettes, with running feet
 * retained during casts. The same surface is reused for each actor. */
export function heroJointPose(
  pose: ActorPose,
  time: number,
  charge = -1,
  id?: ClassId,
) {
  const idlePhase = ((((time / IDLE_PERIOD) % 1) + 1) % 1) * 8;
  const gait = pose.frame >= 0 && pose.frame < 8 ? pose.frame : pose.gaitFrame;
  const frame =
    charge >= 0
      ? 8 + (charge < 0.28 ? 0 : 1)
      : pose.frame >= 0
        ? pose.frame
        : (pose.settleFrame ?? IDLE_FRAME + Math.floor(idlePhase));
  const gaitPose = frame >= 0 && frame < 8;
  return {
    frame,
    gait: gait !== undefined && gait >= 0 ? gait : undefined,
    blend: {
      motionScale: gaitPose
        ? ["mage", "priest", "warlock", "druid"].includes(id || "")
          ? 1.3
          : 1.8
        : frame >= IDLE_FRAME
          ? 1.4
          : 0.65,
      nextFrame:
        charge >= 0
          ? frame
          : gaitPose
            ? (frame + 1) % 8
            : pose.frame < 0 && pose.settleFrame === undefined
              ? IDLE_FRAME + ((Math.floor(idlePhase) + 1) % 8)
              : pose.nextFrame,
      mix:
        charge >= 0
          ? 0
          : gaitPose
            ? (pose.phase * 8) % 1
            : pose.frame < 0
              ? idlePhase % 1
              : (pose.blend ?? (pose.phase * 8) % 1),
      gaitNext: gait !== undefined && gait >= 0 ? (gait + 1) % 8 : undefined,
      gaitMix: (pose.phase * 8) % 1,
      strideWeight: pose.strideWeight ?? 1,
      restFrame: IDLE_FRAME + Math.floor(idlePhase),
      restNext: IDLE_FRAME + ((Math.floor(idlePhase) + 1) % 8),
      restMix: idlePhase % 1,
    },
  };
}

export function prepareHeroMotion(id: ClassId): Promise<void> {
  const existing = sheets.get(id);
  if (existing) return existing.pending;
  const image = new Image();
  const sheet: Sheet = {
    image,
    frames: [],
    height: 1,
    ready: false,
    pending: Promise.resolve(),
  };
  sheets.set(id, sheet);
  image.src = HERO_MOTION_PATHS[id];
  sheet.pending = image
    .decode()
    .then(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const c = canvas.getContext("2d")!;
      c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
      const cells = spriteIslands(pixels, canvas.width, canvas.height);
      sheet.height = Math.max(...cells.map((cell) => cell.height));
      const scale = 82 / sheet.height;
      for (const crop of cells) {
        const source = document.createElement("canvas");
        source.width = crop.width;
        source.height = crop.height;
        source
          .getContext("2d")!
          .putImageData(
            new ImageData(crop.data, crop.width, crop.height),
            0,
            0,
          );
        const cell = document.createElement("canvas");
        cell.width = cell.height = 128;
        cell.dataset.heroMotion = id;
        const columnCenter =
          ((Math.floor((crop.x + crop.width / 2) / (canvas.width / 4)) + 0.5) *
            canvas.width) /
          4;
        cell
          .getContext("2d")!
          .drawImage(
            source,
            64 + (crop.x - columnCenter) * scale,
            104 - crop.height * scale,
            crop.width * scale,
            crop.height * scale,
          );
        sheet.frames.push(cell);
        source.width = source.height = 0;
      }
      sheet.ready = true;
      canvas.width = canvas.height = 0;
    })
    .catch(() => {
      /* The original painted rig remains available while art loads. */
    });
  return sheet.pending;
}

export function drawHeroMotion(
  c: CanvasRenderingContext2D,
  id: ClassId,
  pose: ActorPose,
  time: number,
  facing: number,
  charge = -1,
  dash = false,
  {
    owner = c,
    enabled = true,
    frozen = false,
    reaction,
    sampleRate,
  }: {
    owner?: object;
    enabled?: boolean;
    frozen?: boolean;
    reaction?: { x: number; y: number; angle: number };
    sampleRate?: number;
  } = {},
): boolean {
  const sheet = sheets.get(id);
  if (!sheet?.ready) return false;
  const back = Math.sin(facing) < -0.35;
  const moving = pose.frame >= 0 && pose.frame < 8;
  // One run texture supplies a coherent body; its hips, knees, arms and cloth
  // move continuously instead of swapping four nearly identical illustrations.
  const frame =
    moving || (pose.frame < 0 && pose.strideWeight)
      ? back
        ? 4
        : 0
      : heroMotionFrame(pose, back, charge);
  const key = combatKey(pose.frame);
  const nextKey = combatKey(pose.nextFrame ?? pose.frame);
  const action = key
    ? {
        reach:
          key.reach +
          ((nextKey?.reach ?? key.reach) - key.reach) * (pose.blend ?? 0),
        lean:
          key.lean +
          ((nextKey?.lean ?? key.lean) - key.lean) * (pose.blend ?? 0),
      }
    : null;
  const idle = !moving && !action && charge < 0;
  c.save();
  if (enabled && reaction) {
    c.translate(reaction.x, reaction.y);
    c.rotate(reaction.angle);
  }
  c.scale(Math.cos(facing) < 0 ? -1 : 1, 1);
  const bob = moving
    ? Math.sin(pose.phase * Math.PI * 4) * 2.2
    : idle
      ? Math.sin(time * 2.6) * 0.65
      : 0;
  c.translate(action ? action.reach * 4 : dash ? 7 : 0, bob);
  c.rotate(dash ? 0.18 : action ? action.lean * 0.035 : 0);
  c.imageSmoothingEnabled = true;
  if (enabled) {
    const joints = heroJointPose(pose, time, charge, id);
    const signature = `${id}:${frame}:${JSON.stringify(joints)}`;
    const texture = `${id}:${frame}`;
    const bucket = sampleRate ? Math.floor(time * sampleRate) : time;
    let skin = skins.get(owner);
    if (
      !skin ||
      (!frozen &&
        skin.signature !== signature &&
        (skin.texture !== texture || skin.bucket !== bucket))
    ) {
      const target = skin?.image || document.createElement("canvas");
      createAnimationFrame(
        sheet.frames[frame],
        { x: 0, y: 16, width: 128, height: 88 },
        ["mage", "priest", "warlock", "druid"].includes(id) ? "robe" : "biped",
        joints.frame,
        joints.gait,
        id,
        back,
        { ...joints.blend, detailed: !sampleRate },
        target,
      );
      target.dataset.heroMotion = id;
      skin = { image: target, signature, bucket, texture };
      skins.set(owner, skin);
    }
    c.drawImage(skin.image, -80, -95, FRAME_SIZE, 110);
  } else c.drawImage(sheet.frames[frame], -64, -100);
  c.restore();
  return true;
}
