import test from "node:test";
import assert from "node:assert/strict";
import { CombatLabels } from "../src/combat-text";
import type { DamageText } from "../src/engine";

const hit = (value: string, x = 0, color = "#e8ce80"): DamageText => ({
  x,
  y: 0,
  value,
  color,
  life: 0.6,
});

test("overlapping damage packets merge while criticals, healing and statuses stay distinct", () => {
  const labels = new CombatLabels();
  const texts = [
    hit("20"),
    hit("35", 10),
    hit("50!"),
    hit("10", 0, "#90d78e"),
    hit("BLOCK"),
  ];
  const before = JSON.stringify(texts);
  labels.observe(texts, 1);
  assert.equal(labels.labels.length, 4);
  assert.deepEqual(
    labels.labels.map((l) => l.value),
    ["55", "50!", "10", "BLOCK"],
  );
  assert.equal(new Set(labels.labels.map((l) => l.lane)).size, 4);
  labels.observe(texts, 1);
  assert.equal(labels.labels[0].value, "55");
  assert.equal(JSON.stringify(texts), before);
});

test("separate attack beats keep their values, stale labels expire and clock resets cannot replay them", () => {
  const labels = new CombatLabels();
  const a = hit("21"),
    b = hit("33");
  labels.observe([a], 1);
  labels.observe([a, b], 1.2);
  assert.equal(labels.labels.length, 2);
  labels.observe([], 2);
  assert.equal(labels.labels.length, 0);
  labels.observe([hit("100!")], 2.1);
  labels.observe([], 0);
  assert.equal(labels.labels.length, 0);
});

test("dense combat is bounded and keeps fresh critical feedback when ordinary labels fill the budget", () => {
  const labels = new CombatLabels();
  const texts = Array.from({ length: 100 }, (_, i) => hit("20", i * 100));
  labels.observe(texts, 1);
  labels.observe([hit("999!", -100)], 1.01);
  assert.equal(labels.labels.length, 64);
  assert.ok(labels.labels.some((l) => l.value === "999!"));
});
