import test from "node:test";
import assert from "node:assert/strict";
import { spriteIslands } from "../src/sprite-islands";

test("sprite extraction keeps a weapon crossing a cell edge and excludes disconnected fragments", () => {
  const width = 40,
    height = 20;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const paint = (x: number, y: number) =>
    pixels.set([220, 110, 40, 255], (y * width + x) * 4);
  for (let y = 5; y <= 15; y++) for (let x = 8; x <= 14; x++) paint(x, y);
  for (let x = 14; x <= 23; x++) paint(x, 6);
  paint(20, 10);
  for (let y = 5; y <= 15; y++) for (let x = 28; x <= 34; x++) paint(x, y);
  const [left, right] = spriteIslands(pixels, width, height, 2, 1);
  const alpha = (x: number, y: number) =>
    left.data[((y - left.y) * left.width + x - left.x) * 4 + 3];
  assert.equal(
    alpha(23, 6),
    255,
    "connected weapon survives beyond the grid boundary",
  );
  assert.equal(alpha(20, 10), 0, "unconnected fragment is masked out");
  assert.equal(right.x, 27, "neighbor retains its own silhouette");
});

test("empty atlas cells retain a complete transparent fallback frame", () => {
  const cells = spriteIslands(new Uint8ClampedArray(16 * 16 * 4), 16, 16);
  assert.equal(cells.length, 16);
  for (const cell of cells) {
    assert.ok(cell);
    assert.equal(cell.width, 4);
    assert.equal(cell.height, 4);
    assert.ok(cell.data.every((channel) => channel === 0));
  }
});
