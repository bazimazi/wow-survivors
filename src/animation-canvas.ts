import { paintedVertex } from "./painted-rig";
import type { PaintedProfile } from "./painted-rig";
import type { AnimationRig } from "./animation";
import type { CreatureAtlas } from "./creature-animation";

export const FRAME_CONTENT = 128;
export const FRAME_PADDING = 16;
export const FRAME_SIZE = FRAME_CONTENT + FRAME_PADDING * 2;
export interface SpriteCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  cutout?: { x: number; y: number; width: number; height: number };
}
const sources = new WeakMap<
  HTMLImageElement | HTMLCanvasElement,
  Map<string, HTMLCanvasElement>
>();
const occupiedCells = new WeakMap<HTMLCanvasElement, Map<string, Uint8Array>>();
// Joint geometry depends on the rig/pose, not the actor or source texture.
// Share the finite key poses; live frames only interpolate their vertices.
const jointTemplates = new Map<string, Float64Array>();
export interface PaintedBlend {
  detailed?: boolean;
  motionScale?: number;
  nextFrame?: number;
  mix: number;
  gaitNext?: number;
  gaitMix: number;
  strideWeight: number;
  restFrame: number;
  restNext: number;
  restMix: number;
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

/** Rasterize the painted texture joints into a cached or reusable animation surface. */
export function createAnimationFrame(
  atlas: HTMLImageElement | HTMLCanvasElement,
  crop: SpriteCrop,
  rig: AnimationRig,
  frame: number,
  gaitFrame?: number,
  profile?: PaintedProfile,
  back = false,
  blend?: PaintedBlend,
  target?: HTMLCanvasElement,
  contentSize = FRAME_CONTENT,
) {
  const paddingSize = contentSize / 8;
  const surfaceSize = contentSize + paddingSize * 2;
  const key = `${crop.x}:${crop.y}:${crop.width}:${crop.height}:${JSON.stringify(crop.cutout)}:${contentSize}`;
  let crops = sources.get(atlas);
  if (!crops) {
    crops = new Map();
    sources.set(atlas, crops);
  }
  let source = crops.get(key);
  if (!source) {
    source = document.createElement("canvas");
    source.width = source.height = surfaceSize;
    source
      .getContext("2d")!
      .drawImage(
        atlas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        paddingSize,
        paddingSize,
        contentSize,
        contentSize,
      );
    if (crop.cutout) {
      const mask = crop.cutout;
      source
        .getContext("2d")!
        .clearRect(
          paddingSize + mask.x * contentSize,
          paddingSize + mask.y * contentSize,
          mask.width * contentSize,
          mask.height * contentSize,
        );
    }
    // Crop textures are shared by every pose, including front/back and mounted riders.
    if (crops.size >= 32) {
      const oldest = crops.keys().next().value!;
      const retired = crops.get(oldest)!;
      crops.delete(oldest);
      retired.width = retired.height = 0;
    }
    crops.set(key, source);
  }
  const output = target || document.createElement("canvas");
  if (output.width !== surfaceSize || output.height !== surfaceSize)
    output.width = output.height = surfaceSize;
  const c = output.getContext("2d")!;
  c.clearRect(0, 0, surfaceSize, surfaceSize);
  c.imageSmoothingEnabled = true;
  const detailed =
    blend?.detailed ??
    (!blend ||
      [
        "warrior",
        "mage",
        "rogue",
        "hunter",
        "paladin",
        "priest",
        "shaman",
        "warlock",
        "druid",
      ].includes(profile || ""));
  const columns = detailed ? 8 : 6,
    rows = detailed ? 12 : 10;
  const grid = `${columns}:${rows}`;
  let masks = occupiedCells.get(source);
  if (!masks) {
    masks = new Map();
    occupiedCells.set(source, masks);
  }
  let occupied = masks.get(grid);
  if (!occupied) {
    // Empty texture cells have no pixels to skin. Include a one-pixel margin
    // so antialiased outlines and triangle overlap retain every painted edge.
    const pixels = source
      .getContext("2d")!
      .getImageData(0, 0, surfaceSize, surfaceSize).data;
    occupied = new Uint8Array(columns * rows);
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const x0 =
          Math.floor(paddingSize + (column * contentSize) / columns) - 1;
        const x1 =
          Math.ceil(paddingSize + ((column + 1) * contentSize) / columns) + 1;
        const y0 = Math.floor(paddingSize + (row * contentSize) / rows) - 1;
        const y1 =
          Math.ceil(paddingSize + ((row + 1) * contentSize) / rows) + 1;
        scan: for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++)
            if (pixels[(y * surfaceSize + x) * 4 + 3]) {
              occupied[row * columns + column] = 1;
              break scan;
            }
      }
    masks.set(grid, occupied);
  }
  const point = (x: number, y: number) => ({
    x: paddingSize + x * contentSize,
    y: paddingSize + y * contentSize,
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
  const templates = new Map<number, Float64Array>();
  for (const at of new Set([
    frame,
    blend?.nextFrame,
    gaitFrame,
    blend?.gaitNext,
    blend?.restFrame,
    blend?.restNext,
  ])) {
    if (at === undefined) continue;
    const key = `${grid}:${rig}:${profile}:${back}:${at}`;
    let values = jointTemplates.get(key);
    if (!values) {
      values = new Float64Array((columns + 1) * (rows + 1) * 2);
      for (let row = 0; row <= rows; row++)
        for (let column = 0; column <= columns; column++) {
          const v = paintedVertex(
            column / columns,
            row / rows,
            rig,
            at,
            profile,
            back,
          );
          const index = (row * (columns + 1) + column) * 2;
          values[index] = v.x;
          values[index + 1] = v.y;
        }
      if (jointTemplates.size >= 512)
        jointTemplates.delete(jointTemplates.keys().next().value!);
      jointTemplates.set(key, values);
    }
    templates.set(at, values);
  }
  // Evaluate a joint only once per vertex; adjacent triangles share the same result.
  const vertices = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => {
      const x = column / columns,
        y = row / rows;
      const index = (row * (columns + 1) + column) * 2;
      const sample = (at: number, next?: number, mix = 0) => {
        const points = templates.get(at)!;
        const v = { x: points[index], y: points[index + 1] };
        if (next !== undefined && next !== at && mix > 0) {
          const other = templates.get(next)!;
          v.x += (other[index] - v.x) * mix;
          v.y += (other[index + 1] - v.y) * mix;
        }
        return v;
      };
      const v = sample(frame, blend?.nextFrame, blend?.mix);
      if (blend && frame < 8 && blend.strideWeight < 1) {
        const rest = sample(blend.restFrame, blend.restNext, blend.restMix);
        v.x = rest.x + (v.x - rest.x) * blend.strideWeight;
        v.y = rest.y + (v.y - rest.y) * blend.strideWeight;
      }
      if (
        gaitFrame !== undefined &&
        gaitFrame >= 0 &&
        frame >= 8 &&
        frame < 26
      ) {
        const gait = sample(gaitFrame, blend?.gaitNext, blend?.gaitMix);
        const lower = Math.max(0, Math.min(1, (y - 0.45) / 0.4));
        const weight =
          lower * lower * (3 - 2 * lower) * (blend?.strideWeight ?? 1);
        v.x += (gait.x - x) * weight;
        v.y += (gait.y - y) * weight;
      }
      const scale = blend?.motionScale ?? 1;
      return {
        original: point(x, y),
        warped: point(x + (v.x - x) * scale, y + (v.y - y) * scale),
      };
    }),
  );
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      if (!occupied[row * columns + column]) continue;
      const corners = [
        vertices[row][column],
        vertices[row][column + 1],
        vertices[row + 1][column + 1],
        vertices[row + 1][column],
      ];
      const original = corners.map((v) => v.original),
        warped = corners.map((v) => v.warped);
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
