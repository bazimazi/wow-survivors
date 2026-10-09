import { deformVertex } from "./animation";
import type { AnimationRig } from "./animation";
import type { CreatureAtlas } from "./creature-animation";

export const FRAME_CONTENT = 128;
export const FRAME_PADDING = 8;
export const FRAME_SIZE = FRAME_CONTENT + FRAME_PADDING * 2;
export interface SpriteCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  cutout?: { x: number; y: number; width: number; height: number };
}

/** Original atlas measurements shared by neutral sprites and their deformed frames. */
export function creatureCrop(
  atlas: CreatureAtlas,
  index: number,
  width: number,
  height: number,
): SpriteCrop {
  const columns = atlas === "world" ? 4 : 3;
  const row = Math.floor(index / columns),
    column = index % columns;
  const rows =
    atlas === "world"
      ? [0, 0.27, 0.486, 0.727, 1]
      : atlas === "shadowfang"
        ? [0, 395 / 1254, 820 / 1254, 1]
        : atlas === "duskwood"
          ? [0, 385 / 1254, 771 / 1254, 1]
          : [0, 402 / 1254, 802 / 1254, 1];
  const edges =
    atlas === "duskwood"
      ? [0, 440, 814, 1254]
      : atlas === "shadowfang"
        ? [0, 418, row === 2 ? 900 : row === 1 ? 880 : 836, 1254]
        : atlas === "ragefire" && row === 2
          ? [0, 432, 820, 1254]
          : null;
  const worldBoundary = [918, 916, 924, 915][column] / 1254;
  const top =
    atlas === "world" && row >= 2
      ? row === 2
        ? 614 / 1254
        : worldBoundary
      : atlas === "ragefire" && row === 2 && column === 2
        ? 820 / 1254
        : rows[row];
  const bottom =
    atlas === "world" && row === 2
      ? worldBoundary
      : atlas === "ragefire" && row === 1 && column === 2
        ? 820 / 1254
        : rows[row + 1];
  return {
    x: edges ? (edges[column] * width) / 1254 : (column * width) / columns,
    y: top * height,
    width: edges
      ? ((edges[column + 1] - edges[column]) * width) / 1254
      : width / columns,
    height: (bottom - top) * height,
  };
}

/** Measured boundaries; the Paladin boots and Warlock staff overlap in atlas Y. */
export function heroCrop(
  index: number,
  width: number,
  height: number,
): SpriteCrop {
  const row = Math.floor(index / 3),
    column = index % 3;
  const top = row === 0 ? 0 : row === 1 ? 421 : [824, 822, 831][column];
  const bottom = row === 0 ? 421 : row === 1 ? [824, 829, 831][column] : 1254;
  return {
    x: (column * width) / 3,
    y: (top * height) / 1254,
    width: width / 3,
    height: ((bottom - top) * height) / 1254,
    ...(index === 4
      ? {
          cutout: {
            x: 0,
            y: (821 - top) / (bottom - top),
            width: 0.43,
            height: 8 / (bottom - top),
          },
        }
      : index === 7
        ? { cutout: { x: 0.43, y: 0, width: 0.57, height: 8 / (bottom - top) } }
        : {}),
  };
}
export function backHeroCrop(
  index: number,
  width: number,
  height: number,
): SpriteCrop {
  const column = index % 3,
    row = Math.floor(index / 3);
  const top = row === 0 ? 0 : row === 1 ? 428 : column === 1 ? 800 : 824;
  const bottom = row === 0 ? 428 : row === 1 ? 828 : 1254;
  return {
    x:
      ((index === 1
        ? 440
        : index === 5
          ? 858
          : index === 7
            ? 432
            : column * 418) *
        width) /
      1254,
    y: (top * height) / 1254,
    width:
      ((index === 1 ? 380 : index === 5 ? 396 : index === 7 ? 404 : 418) *
        width) /
      1254,
    height: ((bottom - top) * height) / 1254,
    ...(index === 4
      ? { cutout: { x: 0.67, y: 0.92, width: 0.33, height: 0.08 } }
      : index === 7
        ? { cutout: { x: 0, y: 0, width: 0.73, height: 28 / (bottom - top) } }
        : {}),
  };
}

/** Rasterize an authored texture rig once; the game then draws a single cached image. */
export function createAnimationFrame(
  atlas: HTMLImageElement,
  crop: SpriteCrop,
  rig: AnimationRig,
  frame: number,
) {
  const source = document.createElement("canvas"),
    output = document.createElement("canvas");
  source.width = source.height = output.width = output.height = FRAME_SIZE;
  source
    .getContext("2d")!
    .drawImage(
      atlas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      FRAME_PADDING,
      FRAME_PADDING,
      FRAME_CONTENT,
      FRAME_CONTENT,
    );
  const c = output.getContext("2d")!;
  if (crop.cutout) {
    const mask = crop.cutout;
    source
      .getContext("2d")!
      .clearRect(
        FRAME_PADDING + mask.x * FRAME_CONTENT,
        FRAME_PADDING + mask.y * FRAME_CONTENT,
        mask.width * FRAME_CONTENT,
        mask.height * FRAME_CONTENT,
      );
  }
  c.imageSmoothingEnabled = true;
  const columns = 8,
    rows = 12;
  const point = (x: number, y: number) => ({
    x: FRAME_PADDING + x * FRAME_CONTENT,
    y: FRAME_PADDING + y * FRAME_CONTENT,
  });
  const triangle = (
    original: { x: number; y: number }[],
    warped: { x: number; y: number }[],
  ) => {
    const [a, b, d] = original,
      [p, q, r] = warped;
    const sx1 = b.x - a.x,
      sy1 = b.y - a.y,
      sx2 = d.x - a.x,
      sy2 = d.y - a.y;
    const determinant = sx1 * sy2 - sx2 * sy1;
    const ax = ((q.x - p.x) * sy2 - (r.x - p.x) * sy1) / determinant;
    const bx = (sx1 * (r.x - p.x) - sx2 * (q.x - p.x)) / determinant;
    const ay = ((q.y - p.y) * sy2 - (r.y - p.y) * sy1) / determinant;
    const by = (sx1 * (r.y - p.y) - sx2 * (q.y - p.y)) / determinant;
    c.save();
    // A subpixel overlap avoids antialiased hairline gaps between adjoining triangles.
    const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 };
    c.beginPath();
    for (const [i, v] of warped.entries()) {
      const length = Math.hypot(v.x - center.x, v.y - center.y);
      const x = v.x + ((v.x - center.x) * 0.35) / length,
        y = v.y + ((v.y - center.y) * 0.35) / length;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.clip();
    c.setTransform(
      ax,
      ay,
      bx,
      by,
      p.x - ax * a.x - bx * a.y,
      p.y - ay * a.x - by * a.y,
    );
    c.drawImage(source, 0, 0);
    c.restore();
  };
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const coords = [
        [column / columns, row / rows],
        [(column + 1) / columns, row / rows],
        [(column + 1) / columns, (row + 1) / rows],
        [column / columns, (row + 1) / rows],
      ];
      const original = coords.map(([x, y]) => point(x, y));
      const warped = coords.map(([x, y]) => {
        const v = deformVertex(x, y, rig, frame);
        return point(v.x, v.y);
      });
      triangle(
        [original[0], original[1], original[2]],
        [warped[0], warped[1], warped[2]],
      );
      triangle(
        [original[0], original[2], original[3]],
        [warped[0], warped[2], warped[3]],
      );
    }
  return output;
}
