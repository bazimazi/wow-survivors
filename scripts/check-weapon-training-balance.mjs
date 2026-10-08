import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("output", { recursive: true });
const profiles = [
  ["ranged-heroic", ["--ranged"]],
  ["axe-heroic", ["--weapon-type=axe"]],
  ["polearm-heroic", ["--weapon-type=polearm"]],
  ["axe-deadmines-entry", ["--weapon-type=axe", "--dungeon", "--entry"]],
  [
    "polearm-deadmines-entry",
    ["--weapon-type=polearm", "--dungeon", "--entry"],
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
  for (const row of rows) {
    const type = name.startsWith("axe")
      ? "axe"
      : name.startsWith("polearm")
        ? "polearm"
        : null;
    const trained =
      type &&
      (type === "axe"
        ? ["Warrior", "Hunter", "Paladin", "Shaman"]
        : ["Warrior", "Hunter", "Paladin"]
      ).includes(row.class);
    const ranged = [
      "Warrior",
      "Rogue",
      "Hunter",
      "Mage",
      "Priest",
      "Warlock",
    ].includes(row.class);
    const pair = ["Warrior", "Hunter"].includes(row.class);
    const slots = (ranged ? 16 : 15) - (trained && type === "polearm" ? 1 : 0);
    for (const o of row.outcomes) {
      assert.equal(Object.keys(o.equipment).length, slots);
      if (type) assert.deepEqual(o.weaponTraining, trained ? [type] : []);
      if (trained) {
        const tier = name.includes("entry") ? "expert" : "artisan";
        assert.equal(
          o.equipment.weapon,
          type === "axe" && pair
            ? `${name.includes("entry") ? "westfall" : "duskwood"}_axe`
            : `${tier}_${type}`,
        );
        if (type === "axe" && pair)
          assert.equal(o.equipment.offhand, `${tier}_axe`);
        if (type === "polearm") assert.equal(o.equipment.offhand, undefined);
      }
      assert.equal(o.ranged, ranged);
    }
  }
  // Retain timeouts as diagnostic outcomes: this simple movement policy can stall.
  assert(
    outcomes.every((o) => Object.values(o.campStats).every(Number.isFinite)),
  );
  if (name === "ranged-heroic") {
    const baseline = (
      await readBalanceBaseline("balance-0.28-ranged-heroic.jsonl")
    )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
    assert.deepEqual(
      rows,
      baseline,
      "Existing ranged combat remains unchanged",
    );
  }
  await fs.writeFile(`output/balance-0.29-${name}.jsonl`, output);
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
  "output/weapon-training-balance-0.29.json",
  JSON.stringify(summary, null, 2) + "\n",
);
