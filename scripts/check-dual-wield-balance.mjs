import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("output", { recursive: true });
const profiles = [
  ["offhand-heroic", ["--offhands"]],
  ["dual-wield-heroic", ["--dual-wield"]],
  ["dual-wield-deadmines-entry", ["--dual-wield", "--dungeon", "--entry"]],
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
    const eligible = ["Warrior", "Rogue", "Hunter"].includes(row.class);
    const baseline = name === "offhand-heroic";
    const slots = baseline && ["Rogue", "Hunter"].includes(row.class) ? 14 : 15;
    assert(
      row.outcomes.every((o) => Object.keys(o.equipment).length === slots),
    );
    if (!baseline) {
      assert.equal(row.dualWield, eligible);
      assert(row.outcomes.every((o) => o.dualWield === eligible));
      if (eligible)
        assert(
          row.outcomes.every(
            (o) =>
              o.equipment.weapon ===
                `${name.includes("entry") ? "westfall" : "duskwood"}_duelist_blade` &&
              o.equipment.offhand ===
                `${name.includes("entry") ? "expert" : "artisan"}_duelist_blade` &&
              o.equipment.weapon !== o.equipment.offhand,
          ),
        );
    }
  }
  // Retain timeouts as diagnostic outcomes: this simple movement policy can stall.
  assert(
    outcomes.every((o) => Object.values(o.campStats).every(Number.isFinite)),
  );
  if (name === "offhand-heroic") {
    const baseline = (
      await readBalanceBaseline("balance-0.26-offhand-heroic.jsonl")
    )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
    assert.deepEqual(
      rows,
      baseline,
      "Existing off-hand combat remains unchanged",
    );
  }
  await fs.writeFile(`output/balance-0.27-${name}.jsonl`, output);
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
  "output/dual-wield-balance-0.27.json",
  JSON.stringify(summary, null, 2) + "\n",
);
