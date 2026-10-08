import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("output", { recursive: true });
const profiles = [
  ["dual-wield-heroic", ["--dual-wield"]],
  ["ranged-heroic", ["--ranged"]],
  ["ranged-deadmines-entry", ["--ranged", "--dungeon", "--entry"]],
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
    const baseline = name === "dual-wield-heroic";
    const rangedEligible = [
      "Warrior",
      "Rogue",
      "Hunter",
      "Mage",
      "Priest",
      "Warlock",
    ].includes(row.class);
    const slots = !baseline && rangedEligible ? 16 : 15;
    assert(
      row.outcomes.every((o) => Object.keys(o.equipment).length === slots),
    );
    if (!baseline) {
      assert.equal(row.ranged, rangedEligible);
      assert(row.outcomes.every((o) => o.ranged === rangedEligible));
      if (rangedEligible)
        assert(
          row.outcomes.every(
            (o) =>
              o.equipment.ranged ===
              `${name.includes("entry") ? "expert" : "artisan"}_${eligible ? "thrown" : "wand"}`,
          ),
        );
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
  if (name === "dual-wield-heroic") {
    const baseline = (
      await readBalanceBaseline("balance-0.27-dual-wield-heroic.jsonl")
    )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
    assert.deepEqual(
      rows,
      baseline,
      "Existing dual-wield combat remains unchanged",
    );
  }
  await fs.writeFile(`output/balance-0.28-${name}.jsonl`, output);
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
  "output/ranged-balance-0.28.json",
  JSON.stringify(summary, null, 2) + "\n",
);
