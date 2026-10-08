import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("output", { recursive: true });
const profiles = [
  ["thirteen-slot-heroic", ["--accessories"]],
  ["fourteen-slot-heroic", ["--necklaces"]],
  ["fourteen-slot-heroic-enchanted", ["--necklaces", "--wrist-enchant"]],
  [
    "fourteen-slot-deadmines-entry-enchanted",
    ["--necklaces", "--wrist-enchant", "--dungeon", "--entry"],
  ],
];
const summary = [];
for (const [name, flags] of profiles) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/balance.ts", ...flags],
      { windowsHide: true },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("close", (code) =>
      code ? reject(Error(stderr)) : resolve(stdout),
    );
  });
  const rows = output.trim().split(/\r?\n/).map(JSON.parse),
    outcomes = rows.flatMap((row) => row.outcomes),
    successful = outcomes.filter((o) => o.victory);
  assert.equal(rows.length, 9, `${name}: all nine classes`);
  assert.equal(outcomes.length, 27, `${name}: three seeds per class`);
  const slots = name === "thirteen-slot-heroic" ? 13 : 14;
  assert(outcomes.every((o) => Object.keys(o.equipment).length === slots));
  // Retain timeouts as diagnostic outcomes: this simple movement policy can stall.
  assert(
    outcomes.every((o) => Object.values(o.campStats).every(Number.isFinite)),
  );
  if (name === "thirteen-slot-heroic") {
    const baseline = (
      await readBalanceBaseline("balance-0.24-thirteen-slot-heroic.jsonl")
    )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
    assert.deepEqual(
      rows,
      baseline,
      "Existing thirteen-slot combat remains unchanged",
    );
  }
  if (name.endsWith("enchanted"))
    assert(
      outcomes.every(
        (o) =>
          o.enchantments[o.equipment.wrists] ===
          (name.includes("entry") ? "wrists_focus" : "wrists_recovery"),
      ),
    );
  await fs.writeFile(`output/balance-0.25-${name}.jsonl`, output);
  const result = {
    name,
    attempts: outcomes.length,
    victories: successful.length,
    timeouts: outcomes.filter((o) => o.timedOut).length,
    slots: [...new Set(outcomes.map((o) => Object.keys(o.equipment).length))],
    firstLevelSeconds: [
      Math.min(...rows.flatMap((r) => r.firstLevelSeconds)),
      Math.max(...rows.flatMap((r) => r.firstLevelSeconds)),
    ],
    successfulSeconds: successful.length
      ? [
          Math.min(...successful.map((o) => o.seconds)),
          Math.max(...successful.map((o) => o.seconds)),
        ]
      : null,
  };
  summary.push(result);
  process.stdout.write(JSON.stringify(result) + "\n");
}
await fs.writeFile(
  "output/necklace-balance-0.25.json",
  JSON.stringify(summary, null, 2) + "\n",
);
