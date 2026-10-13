import type { ActorPose } from "./animation";
import type { ClassId } from "./content";
import { combatKey } from "./combat-animation";
import { spriteIslands } from "./sprite-islands";

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
): boolean {
  const sheet = sheets.get(id);
  if (!sheet?.ready) return false;
  const back = Math.sin(facing) < -0.35;
  const frame = heroMotionFrame(pose, back, charge);
  const moving = pose.frame >= 0 && pose.frame < 8;
  const action = combatKey(pose.frame);
  const idle = !moving && !action && charge < 0;
  c.save();
  c.scale(Math.cos(facing) < 0 ? -1 : 1, 1);
  const bob = moving
    ? Math.sin(pose.phase * Math.PI * 4) * 2.2
    : idle
      ? Math.sin(time * 2.6) * 0.65
      : 0;
  c.translate(action ? action.reach * 4 : dash ? 7 : 0, bob);
  c.rotate(dash ? 0.18 : action ? action.lean * 0.035 : 0);
  if (idle) c.scale(1, 1 + Math.sin(time * 2.6) * 0.009);
  c.imageSmoothingEnabled = true;
  c.drawImage(sheet.frames[frame], -64, -100);
  c.restore();
  return true;
}
