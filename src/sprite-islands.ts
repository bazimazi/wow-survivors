/** Recover complete silhouettes when a raised weapon crosses an atlas cell edge.
 * Connected pixels belong to their actor, rather than to whichever rectangle they overlap. */
export function spriteIslands(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  columns = 4,
  rows = 4,
) {
  const labels = new Int32Array(width * height),
    queue = new Int32Array(width * height);
  const selected: (
    | {
        id: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
        count: number;
      }
    | undefined
  )[] = Array(columns * rows).fill(undefined);
  let id = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || pixels[start * 4 + 3] < 12) continue;
    id++;
    labels[start] = id;
    queue[0] = start;
    let head = 0,
      tail = 1,
      left = width,
      right = 0,
      top = height,
      bottom = 0,
      sumX = 0,
      sumY = 0;
    while (head < tail) {
      const at = queue[head++],
        x = at % width,
        y = Math.floor(at / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      sumX += x;
      sumY += y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const n = ny * width + nx;
          if (!labels[n] && pixels[n * 4 + 3] >= 12) {
            labels[n] = id;
            queue[tail++] = n;
          }
        }
    }
    const cell =
      Math.min(rows - 1, Math.floor((sumY / tail / height) * rows)) * columns +
      Math.min(columns - 1, Math.floor((sumX / tail / width) * columns));
    if (!selected[cell] || selected[cell]!.count < tail)
      selected[cell] = { id, left, right, top, bottom, count: tail };
  }
  return selected.map((island, index) => {
    const left = island
      ? Math.max(0, island.left - 1)
      : Math.floor(((index % columns) * width) / columns);
    const top = island
      ? Math.max(0, island.top - 1)
      : Math.floor((Math.floor(index / columns) * height) / rows);
    const right = island
      ? Math.min(width - 1, island.right + 1)
      : Math.floor((((index % columns) + 1) * width) / columns) - 1;
    const bottom = island
      ? Math.min(height - 1, island.bottom + 1)
      : Math.floor(((Math.floor(index / columns) + 1) * height) / rows) - 1;
    const w = right - left + 1,
      h = bottom - top + 1,
      data = new Uint8ClampedArray(w * h * 4);
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const at = y * width + x;
        let belongs = !island || labels[at] === island.id;
        if (!belongs && pixels[at * 4 + 3] > 0)
          for (let dy = -1; dy <= 1 && !belongs; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              if (
                x + dx >= 0 &&
                x + dx < width &&
                y + dy >= 0 &&
                y + dy < height &&
                labels[(y + dy) * width + x + dx] === island!.id
              ) {
                belongs = true;
                break;
              }
            }
        if (belongs)
          data.set(
            pixels.subarray(at * 4, at * 4 + 4),
            ((y - top) * w + x - left) * 4,
          );
      }
    return { x: left, y: top, width: w, height: h, data };
  });
}
