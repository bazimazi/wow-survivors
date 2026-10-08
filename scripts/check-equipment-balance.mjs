import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("output", { recursive: true });
const profiles = [
  ["gun-practice", ["--weapon-type=gun"]],
  ["crossbow-practice", ["--weapon-type=crossbow"]],
  ["fist-practice", ["--weapon-type=fist"]],
  ["greataxe-practice", ["--weapon-type=greataxe"]],
  ["gun-mastered-attuned", ["--weapon-type=gun", "--practiced", "--attuned"]],
];
const reports = [];
for (const [name, flags] of profiles) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/balance.ts",
        "--equipment-progression",
        ...flags,
      ],
      { windowsHide: true },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (value) => (stdout += value));
    child.stderr.on("data", (value) => (stderr += value));
    child.on("error", reject);
    child.on("close", (code) =>
      code ? reject(new Error(stderr)) : resolve(stdout),
    );
  });
  const rows = output.trim().split(/\r?\n/).map(JSON.parse),
    outcomes = rows.flatMap((row) => row.outcomes);
  assert.equal(outcomes.length, 27);
  for (const outcome of outcomes) {
    assert.ok(outcome.ammunitionUsed >= 0 && outcome.ammunitionUsed <= 9999);
    assert.ok(
      outcome.conditions.every(
        (item) => item.condition >= 80 && item.condition <= 100,
      ),
    );
    assert.ok(
      Object.values(outcome.weaponSkills).every(
        (skill) => Number.isInteger(skill) && skill >= 1 && skill <= 300,
      ),
    );
  }
  const wins = outcomes.filter((outcome) => outcome.victory),
    shots = outcomes.reduce((sum, outcome) => sum + outcome.ammunitionUsed, 0);
  const report = {
    name,
    attempts: outcomes.length,
    victories: wins.length,
    timeouts: outcomes.filter((outcome) => outcome.timedOut).length,
    ammunitionUsed: shots,
    practicedFamilies: [
      ...new Set(
        outcomes.flatMap((outcome) => Object.keys(outcome.weaponHits)),
      ),
    ],
    successfulSeconds: wins.length
      ? [
          Math.min(...wins.map((outcome) => outcome.seconds)),
          Math.max(...wins.map((outcome) => outcome.seconds)),
        ]
      : null,
  };
  reports.push(report);
  await writeFile(`output/balance-0.30-${name}.jsonl`, output);
  console.log(JSON.stringify(report));
}
await writeFile(
  "output/equipment-balance-0.30.json",
  JSON.stringify(reports, null, 2) + "\n",
);
