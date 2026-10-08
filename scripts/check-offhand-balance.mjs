import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("output", { recursive: true });
const profiles = [
  ["fourteen-slot-heroic", ["--necklaces"]],
  ["offhand-heroic", ["--offhands"]],
  ["offhand-deadmines-entry", ["--offhands", "--dungeon", "--entry"]],
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
  for (const row of rows) {
    const slots =
      name === "fourteen-slot-heroic" || ["Rogue", "Hunter"].includes(row.class)
        ? 14
        : 15;
    assert(
      row.outcomes.every((o) => Object.keys(o.equipment).length === slots),
    );
    if (slots === 15)
      assert(
        row.outcomes.every(
          (o) =>
            o.equipment.offhand &&
            o.equipment.weapon.endsWith(
              name.includes("entry")
                ? ["Warrior", "Paladin", "Shaman"].includes(row.class)
                  ? "westfall_mace"
                  : "westfall_spellblade"
                : ["Warrior", "Paladin", "Shaman"].includes(row.class)
                  ? "duskwood_mace"
                  : "duskwood_spellblade",
            ),
        ),
      );
  }
  // Retain timeouts as diagnostic outcomes: this simple movement policy can stall.
  assert(
    outcomes.every((o) => Object.values(o.campStats).every(Number.isFinite)),
  );
  if (name === "fourteen-slot-heroic") {
    const baseline = (
      await readBalanceBaseline("balance-0.25-fourteen-slot-heroic.jsonl")
    )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
    assert.deepEqual(
      rows,
      baseline,
      "Existing fourteen-slot combat remains unchanged",
    );
  }
  await fs.writeFile(`output/balance-0.26-${name}.jsonl`, output);
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
  "output/offhand-balance-0.26.json",
  JSON.stringify(summary, null, 2) + "\n",
);
