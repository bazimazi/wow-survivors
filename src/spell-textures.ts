type PaintedSchool =
  "fire" | "frost" | "arcane" | "holy" | "shadow" | "storm" | "nature";

const paths: Record<PaintedSchool, string> = {
  fire: "/art/fire-burst.webp",
  frost: "/art/frost-burst.webp",
  arcane: "/art/arcane-burst.webp",
  holy: "/art/elemental-impacts.webp",
  shadow: "/art/elemental-impacts.webp",
  storm: "/art/elemental-impacts.webp",
  nature: "/art/elemental-impacts.webp",
};
let sheets: Record<PaintedSchool, HTMLImageElement> | undefined;
let pending: Promise<boolean> | undefined;
// Keep immutable blended cells: rewriting one shared canvas for every burst
// forces the browser to flush queued draws in a crowded fight.
const blendedCells = new Map<string, HTMLCanvasElement>();
// A short impact lasts about twenty display frames. More blend surfaces only churn GPU uploads.
const BLEND_STEPS = 30;
const BLEND_CAPACITY = 128;

/** Lazy loading keeps pure animation modules usable outside the browser. */
export function prepareSpellTextures(): Promise<boolean> {
  if (pending) return pending;
  sheets = Object.fromEntries(
    Object.entries(paths).map(([school, src]) => {
      const image = new Image();
      image.src = src;
      return [school, image];
    }),
  ) as Record<PaintedSchool, HTMLImageElement>;
  pending = Promise.allSettled(
    Object.values(sheets).map((image) => image.decode()),
  ).then(() => Object.values(sheets!).every((image) => image.naturalWidth > 0));
  return pending;
}

/** Two neighboring atlas cells blend into one continuous painted burst. */
export function drawSpellTexture(
  c: CanvasRenderingContext2D,
  school: string,
  progress: number,
  radius: number,
  opacity = 1,
): boolean {
  const image = sheets?.[school as PaintedSchool];
  if (!image?.complete || !image.naturalWidth) return false;
  const step = Math.round(Math.max(0, Math.min(1, progress)) * BLEND_STEPS);
  const schoolRow = ["holy", "shadow", "storm", "nature"].indexOf(school);
  const phase = (step / BLEND_STEPS) * (schoolRow >= 0 ? 3 : 15);
  const frame = Math.floor(phase),
    mix = phase - frame;
  // The transparent gutter prevents neighboring cells bleeding when scaled.
  const size = radius * 2.46;
  let source: CanvasImageSource = image;
  const cw = image.naturalWidth / 4,
    ch = image.naturalHeight / 4;
  let cropWidth = cw,
    cropHeight = ch;
  let sx = (frame % 4) * cw,
    sy = (schoolRow >= 0 ? schoolRow : Math.floor(frame / 4)) * ch;
  if (frame < (schoolRow >= 0 ? 3 : 15) && mix > 0) {
    const key = `${school}:${step}`;
    let blend = blendedCells.get(key);
    if (blend) {
      blendedCells.delete(key);
      blendedCells.set(key, blend);
    } else {
      blend = document.createElement("canvas");
      blend.width = blend.height = 256;
      const b = blend.getContext("2d")!;
      b.globalAlpha = 1 - mix;
      b.drawImage(image, sx, sy, cw, ch, 0, 0, 256, 256);
      b.globalCompositeOperation = "lighter";
      b.globalAlpha = mix;
      const next = frame + 1;
      b.drawImage(
        image,
        (next % 4) * cw,
        (schoolRow >= 0 ? schoolRow : Math.floor(next / 4)) * ch,
        cw,
        ch,
        0,
        0,
        256,
        256,
      );
      blendedCells.set(key, blend);
      if (blendedCells.size > BLEND_CAPACITY)
        blendedCells.delete(blendedCells.keys().next().value!);
    }
    source = blend;
    sx = sy = 0;
    cropWidth = cropHeight = 256;
  }
  c.save();
  c.imageSmoothingEnabled = true;
  c.globalAlpha *= opacity;
  c.drawImage(
    source,
    sx,
    sy,
    cropWidth,
    cropHeight,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  c.restore();
  return true;
}
